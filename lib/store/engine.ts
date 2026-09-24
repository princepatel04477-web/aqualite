import "server-only";

import fs from "node:fs";
import path from "node:path";

import {
  products as seedProducts,
  reviews as seedReviews,
  type CatalogProduct,
  type CatalogVariant,
} from "@/content/catalog";
import { errorCopy } from "@/content/errors";
import type {
  Address,
  CartSummary,
  Order,
  OrderStatus,
  PaymentMethod,
  SessionUser,
} from "@/lib/commerce/types";
import { err, ok, type Result } from "@/lib/result";
import { lookupPincode } from "@/lib/store/pincode";
import { quoteCart, COD_MAX_PAISE } from "@/lib/store/pricing";

type Stock = { onHand: number; reserved: number };
type Reservation = {
  id: string;
  orderId: string;
  variantId: string;
  qty: number;
  status: "active" | "committed" | "released";
  expiresAt: string;
};
type Ledger = {
  id: string;
  variantId: string;
  delta: number;
  reason: string;
  refOrderId: string | null;
  actor: string;
  note: string;
  at: string;
};
type User = SessionUser & { createdAt: string; addresses: Address[] };
type Otp = { email: string; code: string; expires: number; sentAt: number[] };
type Rate = { key: string; windowStart: number; count: number };
type WishlistItem = { userId: string; productId: string; colorwayId: string };
type Notify = { variantId: string; email: string; userId: string | null; notifiedAt: string | null };
type ReturnReq = {
  id: string;
  orderId: string;
  orderItemId: string;
  reason: string;
  resolution: string;
  note: string;
  status: "requested" | "approved" | "rejected" | "received";
  createdAt: string;
};
type Audit = {
  id: string;
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  diff: Record<string, unknown>;
  at: string;
};
type StoredReview = {
  id: string;
  productId: string;
  userId: string | null;
  userName: string;
  rating: number;
  title: string;
  body: string;
  fit: "runs_small" | "true" | "runs_large";
  status: "pending" | "approved" | "rejected";
  verified: boolean;
  createdAt: string;
};
type EmailOut = { id: string; to: string; subject: string; text: string; at: string };
type Cart = { id: string; userId: string | null; items: { variantId: string; qty: number }[]; updatedAt: string };

type Settings = {
  shippingThresholdPaise: number;
  shippingFeePaise: number;
  codFeePaise: number;
  codMaxPaise: number;
  returnWindowDays: number;
  announcements: string[];
};

type State = {
  stock: Record<string, Stock>;
  carts: Record<string, Cart>;
  orders: Order[];
  reservations: Reservation[];
  ledger: Ledger[];
  users: User[];
  otps: Otp[];
  rates: Rate[];
  wishlist: WishlistItem[];
  notifies: Notify[];
  notifyQueue: string[];
  returns: ReturnReq[];
  reviews: StoredReview[];
  newsletter: { email: string; source: string; at: string; unsubscribedAt: string | null }[];
  contacts: { id: string; name: string; email: string; phone: string; topic: string; message: string; at: string }[];
  audit: Audit[];
  outbox: EmailOut[];
  payments: { id: string; orderId: string; providerPaymentId: string | null; amountPaise: number; status: string; at: string }[];
  paymentEvents: string[];
  customProducts: CatalogProduct[];
  settings: Settings;
  inactiveVariants: string[];
};

const DATA_PATH = path.join(process.cwd(), ".data", "store.json");

const defaultSettings = (): Settings => ({
  shippingThresholdPaise: 99900,
  shippingFeePaise: 7900,
  codFeePaise: 4900,
  codMaxPaise: COD_MAX_PAISE,
  returnWindowDays: 7,
  announcements: [
    "Free shipping over ₹999",
    "COD available",
    "7-day easy returns",
  ],
});

function emptyState(): State {
  return {
    stock: {},
    carts: {},
    orders: [],
    reservations: [],
    ledger: [],
    users: [],
    otps: [],
    rates: [],
    wishlist: [],
    notifies: [],
    notifyQueue: [],
    returns: [],
    reviews: seedReviews.map((review) => ({
      ...review,
      userId: null,
    })),
    newsletter: [],
    contacts: [],
    audit: [],
    outbox: [],
    payments: [],
    paymentEvents: [],
    customProducts: [],
    settings: defaultSettings(),
    inactiveVariants: [],
  };
}

let memory: State | null = null;
let chain: Promise<unknown> = Promise.resolve();

function seedStock(state: State): void {
  for (const product of [...seedProducts, ...state.customProducts]) {
    for (const colorway of product.colorways) {
      for (const variant of colorway.variants) {
        if (!state.stock[variant.id]) {
          state.stock[variant.id] = { onHand: variant.stock, reserved: 0 };
        }
      }
    }
  }
}

function load(): State {
  if (memory) return memory;
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      memory = { ...emptyState(), ...(parsed as State) };
      seedStock(memory);
      return memory;
    }
  } catch {
    memory = emptyState();
    seedStock(memory);
  }
  return memory ?? emptyState();
}

function save(state: State): void {
  memory = state;
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(state));
}

function withStore<T>(fn: (state: State) => T): Promise<T> {
  const run = chain.then(() => {
    const state = load();
    releaseExpiredIn(state);
    const result = fn(state);
    save(state);
    return result;
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function uid(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function allProducts(state: State): CatalogProduct[] {
  return [...seedProducts, ...state.customProducts];
}

export function catalogProducts(): Promise<CatalogProduct[]> {
  return withStore((state) => allProducts(state));
}

type Located = { product: CatalogProduct; colorwayId: string; colorwaySlug: string; colorwayName: string; image: string; variant: CatalogVariant };

function locate(state: State, variantId: string): Located | null {
  for (const product of allProducts(state)) {
    for (const colorway of product.colorways) {
      const variant = colorway.variants.find((item) => item.id === variantId);
      const image = colorway.images[0];
      if (variant && image) {
        return {
          product,
          colorwayId: colorway.id,
          colorwaySlug: colorway.slug,
          colorwayName: colorway.name,
          image: image.src,
          variant,
        };
      }
    }
  }
  return null;
}

function available(state: State, variantId: string): number {
  const stock = state.stock[variantId];
  if (!stock) return 0;
  return Math.max(0, stock.onHand - stock.reserved);
}

function rules(state: State) {
  return {
    threshold: state.settings.shippingThresholdPaise,
    fee: state.settings.shippingFeePaise,
    codFee: state.settings.codFeePaise,
  };
}

function summarize(state: State, cart: Cart, method?: PaymentMethod): CartSummary {
  const inputs = cart.items.flatMap((item) => {
    const found = locate(state, item.variantId);
    if (!found) return [];
    return [
      {
        variantId: item.variantId,
        qty: item.qty,
        unitPricePaise: found.variant.pricePaise,
        available: available(state, item.variantId),
        found,
      },
    ];
  });
  const quote = quoteCart(
    inputs.map((item) => ({
      variantId: item.variantId,
      qty: item.qty,
      unitPricePaise: item.unitPricePaise,
      available: item.available,
    })),
    { method, rules: rules(state) },
  );
  return {
    cartId: cart.id,
    lines: quote.lines.flatMap((line) => {
      const source = inputs.find((item) => item.variantId === line.variantId);
      if (!source) return [];
      return [
        {
          variantId: line.variantId,
          productId: source.found.product.id,
          productSlug: source.found.product.slug,
          productName: source.found.product.name,
          colorwayName: source.found.colorwayName,
          colorwaySlug: source.found.colorwaySlug,
          image: source.found.image,
          sizeUk: source.found.variant.sizeUk,
          sizeLabel: source.found.variant.label,
          qty: line.qty,
          unitPricePaise: line.unitPricePaise,
          mrpPaise: source.found.variant.mrpPaise,
          lineTotalPaise: line.lineTotalPaise,
          available: line.available,
          isShort: line.isShort,
        },
      ];
    }),
    subtotalPaise: quote.subtotalPaise,
    shippingPaise: quote.shippingPaise,
    codFeePaise: quote.codFeePaise,
    taxPaise: quote.taxPaise,
    totalPaise: quote.totalPaise,
    freeShippingRemainingPaise: quote.freeShippingRemainingPaise,
    count: quote.lines.reduce((sum, line) => sum + line.qty, 0),
  };
}

export function emptySummary(): CartSummary {
  return {
    cartId: "",
    lines: [],
    subtotalPaise: 0,
    shippingPaise: 0,
    codFeePaise: 0,
    taxPaise: 0,
    totalPaise: 0,
    freeShippingRemainingPaise: 99900,
    count: 0,
  };
}

function fail(code: Parameters<typeof err>[0], details?: Record<string, unknown>): Result<never> {
  return err(code, errorCopy[code], details);
}

export function rateLimited(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  return withStore((state) => {
    const windowMs = windowSeconds * 1000;
    const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
    const row = state.rates.find((item) => item.key === key && item.windowStart === windowStart);
    if (!row) {
      state.rates.push({ key, windowStart, count: 1 });
      state.rates = state.rates.filter((item) => Date.now() - item.windowStart < 86_400_000);
      return false;
    }
    if (row.count >= limit) return true;
    row.count += 1;
    return false;
  });
}

export function createCart(userId: string | null = null): Promise<string> {
  return withStore((state) => {
    const id = crypto.randomUUID();
    state.carts[id] = { id, userId, items: [], updatedAt: nowIso() };
    return id;
  });
}

export function getCart(cartId: string | null): Promise<CartSummary> {
  return withStore((state) => {
    if (!cartId) return emptySummary();
    const cart = state.carts[cartId];
    if (!cart) return emptySummary();
    return summarize(state, cart);
  });
}

export function addToCart(cartId: string, variantId: string, qty: number): Promise<Result<CartSummary>> {
  return withStore((state) => {
    if (!Number.isInteger(qty) || qty < 1) return fail("VALIDATION");
    const cart = state.carts[cartId];
    if (!cart) return fail("EMPTY_CART");
    const found = locate(state, variantId);
    if (!found || state.inactiveVariants.includes(variantId) || !found.product.isActive) {
      return fail("VALIDATION", { reason: "inactive" });
    }
    const existing = cart.items.find((item) => item.variantId === variantId);
    const nextQty = (existing?.qty ?? 0) + qty;
    if (nextQty > 10) return fail("VALIDATION", { reason: "qty" });
    if (available(state, variantId) < nextQty) {
      return fail("OUT_OF_STOCK", { skus: [found.variant.sku], available: available(state, variantId) });
    }
    if (existing) existing.qty = nextQty;
    else cart.items.push({ variantId, qty });
    cart.updatedAt = nowIso();
    return ok(summarize(state, cart));
  });
}

export function updateQty(cartId: string, variantId: string, qty: number): Promise<Result<CartSummary>> {
  return withStore((state) => {
    const cart = state.carts[cartId];
    if (!cart) return fail("EMPTY_CART");
    if (!Number.isInteger(qty) || qty < 0 || qty > 10) return fail("VALIDATION");
    if (qty === 0) {
      cart.items = cart.items.filter((item) => item.variantId !== variantId);
    } else {
      const found = locate(state, variantId);
      if (!found) return fail("VALIDATION");
      if (available(state, variantId) < qty) {
        return fail("OUT_OF_STOCK", { skus: [found.variant.sku], available: available(state, variantId) });
      }
      const existing = cart.items.find((item) => item.variantId === variantId);
      if (existing) existing.qty = qty;
      else cart.items.push({ variantId, qty });
    }
    cart.updatedAt = nowIso();
    return ok(summarize(state, cart));
  });
}

export function removeFromCart(cartId: string, variantId: string): Promise<Result<CartSummary>> {
  return updateQty(cartId, variantId, 0);
}

export function quoteFor(cartId: string, method: PaymentMethod): Promise<Result<CartSummary>> {
  return withStore((state) => {
    const cart = state.carts[cartId];
    if (!cart || cart.items.length === 0) return fail("EMPTY_CART");
    return ok(summarize(state, cart, method));
  });
}

function orderNumber(state: State): string {
  const date = new Date();
  const stamp = `${String(date.getFullYear()).slice(2)}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  let code = "";
  bytes.forEach((byte) => {
    code += alphabet[byte % alphabet.length] ?? "A";
  });
  const number = `AQ-${stamp}-${code}`;
  if (state.orders.some((order) => order.number === number)) return orderNumber(state);
  return number;
}

export type PlaceInput = {
  cartId: string;
  email: string;
  phone: string;
  address: Address;
  method: PaymentMethod;
  idempotencyKey: string;
  userId: string | null;
};

export function placeOrder(input: PlaceInput): Promise<Result<Order>> {
  return withStore((state) => {
    const existing = state.orders.find((order) => order.idempotencyKey === input.idempotencyKey);
    if (existing) return ok(existing);
    const cart = state.carts[input.cartId];
    if (!cart || cart.items.length === 0) return fail("EMPTY_CART");
    const pin = lookupPincode(input.address.pincode);
    if (!pin?.serviceable) return fail("NOT_SERVICEABLE");
    const summary = summarize(state, cart, input.method);
    if (summary.lines.some((line) => line.isShort)) {
      return fail("OUT_OF_STOCK", {
        skus: summary.lines.filter((line) => line.isShort).map((line) => line.variantId),
      });
    }
    if (input.method === "cod") {
      if (!pin.codAvailable) return fail("COD_UNAVAILABLE", { reason: "pincode" });
      if (summary.totalPaise > state.settings.codMaxPaise) return fail("COD_UNAVAILABLE", { reason: "cap" });
    }
    const locked = [...cart.items].sort((a, b) => a.variantId.localeCompare(b.variantId));
    for (const item of locked) {
      if (available(state, item.variantId) < item.qty) {
        const found = locate(state, item.variantId);
        return fail("OUT_OF_STOCK", { skus: [found?.variant.sku ?? item.variantId] });
      }
    }
    const orderId = crypto.randomUUID();
    const createdAt = nowIso();
    const items = summary.lines.map((line) => {
      const found = locate(state, line.variantId);
      const tax = quoteCart([
        {
          variantId: line.variantId,
          qty: line.qty,
          unitPricePaise: line.unitPricePaise,
          available: line.available,
        },
      ]).lines[0];
      return {
        id: uid("oi"),
        variantId: line.variantId,
        productName: line.productName,
        colorwayName: line.colorwayName,
        productSlug: line.productSlug,
        sku: found?.variant.sku ?? line.variantId,
        sizeUk: line.sizeUk,
        image: line.image,
        unitPricePaise: line.unitPricePaise,
        qty: line.qty,
        taxRateBps: tax?.taxRateBps ?? 500,
        taxPaise: tax?.taxPaise ?? 0,
        lineTotalPaise: line.lineTotalPaise,
      };
    });
    const status: OrderStatus = input.method === "cod" ? "cod_confirmed" : "pending_payment";
    const order: Order = {
      id: orderId,
      number: orderNumber(state),
      userId: input.userId,
      email: input.email,
      phone: input.phone,
      status,
      paymentMethod: input.method,
      address: input.address,
      items,
      subtotalPaise: summary.subtotalPaise,
      shippingPaise: summary.shippingPaise,
      codFeePaise: summary.codFeePaise,
      taxPaise: summary.taxPaise,
      totalPaise: summary.totalPaise,
      idempotencyKey: input.idempotencyKey,
      accessToken: crypto.randomUUID(),
      razorpayOrderId: null,
      reservationExpiresAt:
        input.method === "razorpay" ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null,
      trackingCarrier: null,
      trackingNumber: null,
      needsAttention: false,
      attentionNote: null,
      createdAt,
      updatedAt: createdAt,
      paidAt: input.method === "cod" ? createdAt : null,
      shippedAt: null,
      deliveredAt: null,
      confirmationSentAt: null,
      events: [
        {
          id: uid("ev"),
          from: null,
          to: status,
          actor: "system",
          note: input.method === "cod" ? "COD confirmed" : "Awaiting payment",
          at: createdAt,
        },
      ],
    };
    for (const item of locked) {
      const stock = state.stock[item.variantId];
      if (!stock) return fail("OUT_OF_STOCK");
      if (input.method === "cod") {
        stock.onHand -= item.qty;
        state.ledger.push({
          id: uid("led"),
          variantId: item.variantId,
          delta: -item.qty,
          reason: "sale",
          refOrderId: orderId,
          actor: "system",
          note: "COD commit",
          at: createdAt,
        });
      } else {
        stock.reserved += item.qty;
        state.reservations.push({
          id: uid("res"),
          orderId,
          variantId: item.variantId,
          qty: item.qty,
          status: "active",
          expiresAt: order.reservationExpiresAt ?? createdAt,
        });
      }
    }
    if (input.method === "cod") cart.items = [];
    state.orders.push(order);
    return ok(order);
  });
}

export function attachRazorpay(orderId: string, razorpayOrderId: string): Promise<void> {
  return withStore((state) => {
    const order = state.orders.find((item) => item.id === orderId);
    if (order) order.razorpayOrderId = razorpayOrderId;
  });
}

function releaseOrderReservations(state: State, order: Order, reason: string): void {
  for (const reservation of state.reservations) {
    if (reservation.orderId !== order.id || reservation.status !== "active") continue;
    const stock = state.stock[reservation.variantId];
    if (stock) stock.reserved = Math.max(0, stock.reserved - reservation.qty);
    reservation.status = "released";
    state.ledger.push({
      id: uid("led"),
      variantId: reservation.variantId,
      delta: 0,
      reason: "reservation_release",
      refOrderId: order.id,
      actor: "system",
      note: reason,
      at: nowIso(),
    });
  }
}

export function confirmPayment(
  orderId: string,
  providerPaymentId: string,
  amountPaise: number,
  actor: string,
): Promise<Result<{ status: "paid" | "already_paid" | "needs_attention" }>> {
  return withStore((state) => {
    const order = state.orders.find((item) => item.id === orderId);
    if (!order) return fail("NOT_FOUND");
    if (order.status === "paid") return ok({ status: "already_paid" });
    if (amountPaise !== order.totalPaise) {
      releaseOrderReservations(state, order, "amount mismatch");
      pushEvent(order, "payment_failed", actor, "Amount mismatch");
      return fail("AMOUNT_MISMATCH");
    }
    const active = state.reservations.filter((item) => item.orderId === order.id && item.status === "active");
    const released = state.reservations.filter((item) => item.orderId === order.id && item.status === "released");
    if (active.length === 0 && released.length > 0) {
      const can = order.items.every((item) => available(state, item.variantId) >= item.qty);
      if (!can) {
        order.needsAttention = true;
        order.attentionNote = "Payment captured after the hold expired and stock could not be re-reserved.";
        pushEvent(order, "paid", actor, "Paid — needs attention");
        order.paidAt = nowIso();
        state.payments.push({
          id: uid("pay"),
          orderId: order.id,
          providerPaymentId,
          amountPaise,
          status: "captured",
          at: nowIso(),
        });
        state.audit.push({
          id: uid("aud"),
          actorId: actor,
          action: "payment_needs_attention",
          entity: "order",
          entityId: order.id,
          diff: { providerPaymentId },
          at: nowIso(),
        });
        return ok({ status: "needs_attention" });
      }
      for (const item of order.items) {
        const stock = state.stock[item.variantId];
        if (stock) stock.reserved += item.qty;
        state.reservations.push({
          id: uid("res"),
          orderId: order.id,
          variantId: item.variantId,
          qty: item.qty,
          status: "active",
          expiresAt: nowIso(),
        });
      }
    }
    for (const item of order.items) {
      const stock = state.stock[item.variantId];
      if (!stock) continue;
      const already = state.ledger.some(
        (row) => row.refOrderId === order.id && row.variantId === item.variantId && row.reason === "sale",
      );
      if (already) continue;
      stock.onHand -= item.qty;
      stock.reserved = Math.max(0, stock.reserved - item.qty);
      state.ledger.push({
        id: uid("led"),
        variantId: item.variantId,
        delta: -item.qty,
        reason: "sale",
        refOrderId: order.id,
        actor,
        note: "payment captured",
        at: nowIso(),
      });
    }
    for (const reservation of state.reservations) {
      if (reservation.orderId === order.id && reservation.status === "active") reservation.status = "committed";
    }
    pushEvent(order, "paid", actor, "Payment captured");
    order.paidAt = nowIso();
    state.payments.push({
      id: uid("pay"),
      orderId: order.id,
      providerPaymentId,
      amountPaise,
      status: "captured",
      at: nowIso(),
    });
    const cart = Object.values(state.carts).find((item) => item.userId && item.userId === order.userId);
    if (order.userId && cart) cart.items = [];
    return ok({ status: "paid" });
  });
}

export function clearCart(cartId: string): Promise<void> {
  return withStore((state) => {
    const cart = state.carts[cartId];
    if (cart) cart.items = [];
  });
}

export function failPayment(orderId: string, reason: string): Promise<Result<Order>> {
  return withStore((state) => {
    const order = state.orders.find((item) => item.id === orderId);
    if (!order) return fail("NOT_FOUND");
    if (order.status === "payment_failed" || order.status === "cancelled" || order.status === "paid") {
      return ok(order);
    }
    releaseOrderReservations(state, order, reason);
    pushEvent(order, "payment_failed", "system", reason);
    return ok(order);
  });
}

function releaseExpiredIn(state: State): number {
  let count = 0;
  const now = Date.now();
  for (const order of state.orders) {
    if (order.status !== "pending_payment" || !order.reservationExpiresAt) continue;
    if (new Date(order.reservationExpiresAt).getTime() > now) continue;
    releaseOrderReservations(state, order, "payment window expired");
    pushEvent(order, "cancelled", "system", "payment window expired");
    count += 1;
  }
  return count;
}

export function releaseExpired(): Promise<number> {
  return withStore((state) => releaseExpiredIn(state));
}

const TRANSITIONS: Record<string, OrderStatus[]> = {
  pending_payment: ["paid", "payment_failed", "cancelled"],
  cod_confirmed: ["packed", "cancelled"],
  paid: ["packed", "cancelled", "refunded"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["return_requested"],
  return_requested: ["returned"],
  returned: ["refunded"],
};

function pushEvent(order: Order, to: OrderStatus, actor: string, note: string): void {
  order.events.push({
    id: uid("ev"),
    from: order.status,
    to,
    actor,
    note,
    at: nowIso(),
  });
  order.status = to;
  order.updatedAt = nowIso();
  if (to === "shipped") order.shippedAt = nowIso();
  if (to === "delivered") order.deliveredAt = nowIso();
}

function restock(state: State, order: Order, reason: string, actor: string): void {
  for (const item of order.items) {
    const stock = state.stock[item.variantId];
    if (!stock) continue;
    stock.onHand += item.qty;
    state.ledger.push({
      id: uid("led"),
      variantId: item.variantId,
      delta: item.qty,
      reason,
      refOrderId: order.id,
      actor,
      note: reason,
      at: nowIso(),
    });
    if (stock.onHand - stock.reserved > 0) state.notifyQueue.push(item.variantId);
  }
}

export function transitionOrder(
  orderId: string,
  to: OrderStatus,
  note: string,
  actor: string,
  tracking?: { carrier: string; number: string },
): Promise<Result<Order>> {
  return withStore((state) => {
    const order = state.orders.find((item) => item.id === orderId);
    if (!order) return fail("NOT_FOUND");
    const allowed = TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(to)) return fail("INVALID_TRANSITION");
    if (to === "cancelled" && (order.status === "paid" || order.status === "cod_confirmed" || order.status === "packed")) {
      restock(state, order, "return", actor);
    }
    if (to === "cancelled" && order.status === "pending_payment") {
      releaseOrderReservations(state, order, note);
    }
    if (to === "shipped") {
      if (!tracking?.carrier || !tracking.number) return fail("VALIDATION");
      order.trackingCarrier = tracking.carrier;
      order.trackingNumber = tracking.number;
    }
    if (to === "refunded" && order.status !== "cancelled") {
      const already = state.ledger.some((row) => row.refOrderId === order.id && row.reason === "return");
      if (!already) restock(state, order, "return", actor);
    }
    pushEvent(order, to, actor, note);
    state.audit.push({
      id: uid("aud"),
      actorId: actor,
      action: "transition_order",
      entity: "order",
      entityId: order.id,
      diff: { to, note },
      at: nowIso(),
    });
    return ok(order);
  });
}

export function adjustStock(
  variantId: string,
  delta: number,
  reason: string,
  note: string,
  actor: string,
): Promise<Result<{ onHand: number; reserved: number; available: number }>> {
  return withStore((state) => {
    const stock = state.stock[variantId];
    if (!stock) return fail("NOT_FOUND");
    if (!Number.isInteger(delta)) return fail("VALIDATION");
    if (stock.onHand + delta < stock.reserved) return fail("VALIDATION", { reason: "below_reserved" });
    stock.onHand += delta;
    state.ledger.push({
      id: uid("led"),
      variantId,
      delta,
      reason,
      refOrderId: null,
      actor,
      note,
      at: nowIso(),
    });
    if (delta > 0) state.notifyQueue.push(variantId);
    state.audit.push({
      id: uid("aud"),
      actorId: actor,
      action: "adjust_stock",
      entity: "variant",
      entityId: variantId,
      diff: { delta, reason, note },
      at: nowIso(),
    });
    return ok({ onHand: stock.onHand, reserved: stock.reserved, available: stock.onHand - stock.reserved });
  });
}

export function getOrderByNumber(number: string): Promise<Order | null> {
  return withStore((state) => state.orders.find((order) => order.number === number) ?? null);
}

export function listOrders(): Promise<Order[]> {
  return withStore((state) => [...state.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export function markConfirmationSent(orderId: string): Promise<boolean> {
  return withStore((state) => {
    const order = state.orders.find((item) => item.id === orderId);
    if (!order || order.confirmationSentAt) return false;
    order.confirmationSentAt = nowIso();
    return true;
  });
}

export function recordOutbox(to: string, subject: string, text: string): Promise<void> {
  return withStore((state) => {
    state.outbox.unshift({ id: uid("mail"), to, subject, text, at: nowIso() });
    state.outbox = state.outbox.slice(0, 100);
  });
}

export function getSettings(): Promise<Settings> {
  return withStore((state) => state.settings);
}

export function updateSettings(patch: Partial<Settings>, actor: string): Promise<Settings> {
  return withStore((state) => {
    state.settings = { ...state.settings, ...patch };
    state.audit.push({
      id: uid("aud"),
      actorId: actor,
      action: "update_settings",
      entity: "settings",
      entityId: "store",
      diff: patch,
      at: nowIso(),
    });
    return state.settings;
  });
}

export function stockOf(variantId: string): Promise<Stock & { available: number }> {
  return withStore((state) => {
    const stock = state.stock[variantId] ?? { onHand: 0, reserved: 0 };
    return { ...stock, available: Math.max(0, stock.onHand - stock.reserved) };
  });
}

export function availabilityMap(ids: string[]): Promise<Record<string, number>> {
  return withStore((state) => {
    const out: Record<string, number> = {};
    ids.forEach((id) => {
      out[id] = available(state, id);
    });
    return out;
  });
}

export function sendOtp(email: string): Promise<Result<{ demoCode: string }>> {
  return withStore((state) => {
    const key = email.toLowerCase();
    const recent = state.otps.find((item) => item.email === key);
    const windowStart = Date.now() - 10 * 60 * 1000;
    const sends = (recent?.sentAt ?? []).filter((at) => at > windowStart);
    if (sends.length >= 3) return fail("RATE_LIMITED");
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] ?? 100000).slice(0, 6).padStart(6, "0");
    const next: Otp = { email: key, code, expires: Date.now() + 10 * 60 * 1000, sentAt: [...sends, Date.now()] };
    state.otps = state.otps.filter((item) => item.email !== key);
    state.otps.push(next);
    return ok({ demoCode: code });
  });
}

export function verifyOtp(email: string, code: string): Promise<Result<SessionUser>> {
  return withStore((state) => {
    const key = email.toLowerCase();
    const otp = state.otps.find((item) => item.email === key);
    if (!otp || otp.expires < Date.now() || otp.code !== code) return fail("VALIDATION");
    state.otps = state.otps.filter((item) => item.email !== key);
    let user = state.users.find((item) => item.email === key);
    if (!user) {
      user = {
        id: crypto.randomUUID(),
        email: key,
        role: key === "admin@aqualite.in" ? "admin" : "customer",
        fullName: "",
        phone: "",
        createdAt: nowIso(),
        addresses: [],
      };
      state.users.push(user);
    }
    return ok({ id: user.id, email: user.email, role: user.role, fullName: user.fullName, phone: user.phone });
  });
}

export function getUser(id: string): Promise<User | null> {
  return withStore((state) => state.users.find((user) => user.id === id) ?? null);
}

export function updateProfile(id: string, patch: { fullName?: string; phone?: string }): Promise<Result<SessionUser>> {
  return withStore((state) => {
    const user = state.users.find((item) => item.id === id);
    if (!user) return fail("NOT_FOUND");
    if (patch.fullName !== undefined) user.fullName = patch.fullName;
    if (patch.phone !== undefined) user.phone = patch.phone;
    return ok(user);
  });
}

export function saveAddress(userId: string, address: Address): Promise<Result<Address[]>> {
  return withStore((state) => {
    const user = state.users.find((item) => item.id === userId);
    if (!user) return fail("NOT_FOUND");
    const next = { ...address, id: address.id ?? uid("addr") };
    if (next.isDefault) user.addresses.forEach((item) => { item.isDefault = false; });
    const index = user.addresses.findIndex((item) => item.id === next.id);
    if (index >= 0) user.addresses[index] = next;
    else user.addresses.push(next);
    return ok(user.addresses);
  });
}

export function deleteAddress(userId: string, addressId: string): Promise<Result<Address[]>> {
  return withStore((state) => {
    const user = state.users.find((item) => item.id === userId);
    if (!user) return fail("NOT_FOUND");
    user.addresses = user.addresses.filter((item) => item.id !== addressId);
    return ok(user.addresses);
  });
}

export function mergeCart(guestCartId: string, userId: string): Promise<string> {
  return withStore((state) => {
    const guest = state.carts[guestCartId];
    let userCart = Object.values(state.carts).find((cart) => cart.userId === userId && cart.id !== guestCartId);
    if (!userCart) {
      const id = crypto.randomUUID();
      userCart = { id, userId, items: [], updatedAt: nowIso() };
      state.carts[id] = userCart;
    }
    if (guest) {
      for (const item of guest.items) {
        const existing = userCart.items.find((line) => line.variantId === item.variantId);
        const qty = Math.min(10, (existing?.qty ?? 0) + item.qty);
        if (existing) existing.qty = qty;
        else userCart.items.push({ variantId: item.variantId, qty });
      }
      guest.items = [];
    }
    userCart.userId = userId;
    return userCart.id;
  });
}

export function subscribeNewsletter(email: string, source: string): Promise<Result<{ created: boolean }>> {
  return withStore((state) => {
    const key = email.toLowerCase();
    if (state.newsletter.some((item) => item.email === key && !item.unsubscribedAt)) {
      return ok({ created: false });
    }
    state.newsletter.push({ email: key, source, at: nowIso(), unsubscribedAt: null });
    return ok({ created: true });
  });
}

export function addContact(input: {
  name: string;
  email: string;
  phone: string;
  topic: string;
  message: string;
}): Promise<void> {
  return withStore((state) => {
    state.contacts.unshift({ id: uid("msg"), ...input, at: nowIso() });
  });
}

export function requestNotify(variantId: string, email: string, userId: string | null): Promise<Result<{ stored: boolean }>> {
  return withStore((state) => {
    const key = email.toLowerCase();
    const exists = state.notifies.some((item) => item.variantId === variantId && item.email === key);
    if (exists) return ok({ stored: false });
    state.notifies.push({ variantId, email: key, userId, notifiedAt: null });
    return ok({ stored: true });
  });
}

export function submitReview(input: {
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  body: string;
  fit: "runs_small" | "true" | "runs_large";
}): Promise<Result<{ id: string }>> {
  return withStore((state) => {
    const verified = state.orders.some(
      (order) =>
        order.userId === input.userId &&
        order.status === "delivered" &&
        order.items.some((item) => item.productSlug && locate(state, item.variantId)?.product.id === input.productId),
    );
    const id = uid("rev");
    state.reviews.unshift({
      id,
      productId: input.productId,
      userId: input.userId,
      userName: input.userName || "Aqualite customer",
      rating: input.rating,
      title: input.title,
      body: input.body,
      fit: input.fit,
      status: "pending",
      verified,
      createdAt: nowIso(),
    });
    return ok({ id });
  });
}

export function reviewsFor(productId: string, includePending = false): Promise<StoredReview[]> {
  return withStore((state) =>
    state.reviews.filter((review) => review.productId === productId && (includePending || review.status === "approved")),
  );
}

export function moderateReview(id: string, status: "approved" | "rejected", actor: string): Promise<Result<StoredReview>> {
  return withStore((state) => {
    const review = state.reviews.find((item) => item.id === id);
    if (!review) return fail("NOT_FOUND");
    review.status = status;
    state.audit.push({
      id: uid("aud"),
      actorId: actor,
      action: "moderate_review",
      entity: "review",
      entityId: id,
      diff: { status },
      at: nowIso(),
    });
    return ok(review);
  });
}

export function allReviews(): Promise<StoredReview[]> {
  return withStore((state) => state.reviews);
}

export function wishlistOf(userId: string): Promise<WishlistItem[]> {
  return withStore((state) => state.wishlist.filter((item) => item.userId === userId));
}

export function toggleWishlist(userId: string, productId: string, colorwayId: string): Promise<boolean> {
  return withStore((state) => {
    const index = state.wishlist.findIndex(
      (item) => item.userId === userId && item.productId === productId && item.colorwayId === colorwayId,
    );
    if (index >= 0) {
      state.wishlist.splice(index, 1);
      return false;
    }
    state.wishlist.push({ userId, productId, colorwayId });
    return true;
  });
}

export function createReturn(input: {
  orderId: string;
  orderItemId: string;
  reason: string;
  resolution: string;
  note: string;
}): Promise<Result<ReturnReq>> {
  return withStore((state) => {
    const order = state.orders.find((item) => item.id === input.orderId);
    if (!order) return fail("NOT_FOUND");
    if (order.status !== "delivered" && order.status !== "return_requested") return fail("INVALID_TRANSITION");
    const row: ReturnReq = { id: uid("ret"), ...input, status: "requested", createdAt: nowIso() };
    state.returns.push(row);
    if (order.status === "delivered") pushEvent(order, "return_requested", "customer", input.reason);
    return ok(row);
  });
}

export function listReturns(): Promise<ReturnReq[]> {
  return withStore((state) => state.returns);
}

export function dashboard(): Promise<{
  orders: Order[];
  ledger: Ledger[];
  reviews: StoredReview[];
  returns: ReturnReq[];
  outbox: EmailOut[];
  audit: Audit[];
  settings: Settings;
  stock: Record<string, Stock>;
}> {
  return withStore((state) => ({
    orders: state.orders,
    ledger: state.ledger,
    reviews: state.reviews,
    returns: state.returns,
    outbox: state.outbox,
    audit: state.audit,
    settings: state.settings,
    stock: state.stock,
  }));
}

export function drainNotifyQueue(): Promise<Notify[]> {
  return withStore((state) => {
    const ids = [...new Set(state.notifyQueue)];
    state.notifyQueue = [];
    const pending = state.notifies.filter((item) => ids.includes(item.variantId) && !item.notifiedAt);
    pending.forEach((item) => {
      item.notifiedAt = nowIso();
    });
    return pending;
  });
}

export function addCustomProduct(product: CatalogProduct, actor: string): Promise<CatalogProduct> {
  return withStore((state) => {
    state.customProducts.push(product);
    for (const colorway of product.colorways) {
      for (const variant of colorway.variants) {
        state.stock[variant.id] = { onHand: variant.stock, reserved: 0 };
      }
    }
    state.audit.push({
      id: uid("aud"),
      actorId: actor,
      action: "create_product",
      entity: "product",
      entityId: product.id,
      diff: { slug: product.slug },
      at: nowIso(),
    });
    return product;
  });
}

export function findOrderForPayment(razorpayOrderId: string): Promise<Order | null> {
  return withStore((state) => state.orders.find((order) => order.razorpayOrderId === razorpayOrderId) ?? null);
}

export function rememberPaymentEvent(eventId: string): Promise<boolean> {
  return withStore((state) => {
    if (state.paymentEvents.includes(eventId)) return false;
    state.paymentEvents.push(eventId);
    return true;
  });
}

export async function resetDemo(): Promise<void> {
  memory = null;
  await fs.promises.rm(DATA_PATH, { force: true });
}
