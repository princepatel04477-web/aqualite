/**
 * Seeds 15 realistic orders over the last 30 days (mix of paid, cod_confirmed,
 * shipped, delivered, 1 return_requested + return row, and 2 buyer message
 * threads) into .data/store.json so the Seller Hub home (/seller) displays
 * live non-zero sales, orders, inventory, and messages during demos.
 *
 * Run: npm run demo:orders
 */
import fs from "node:fs/promises";
import path from "node:path";

const STORE_FILE = path.resolve(import.meta.dirname, "../.data/store.json");
const NOW = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgoIso(days, hoursOffset = 2) {
  return new Date(NOW - days * DAY_MS - hoursOffset * 3600 * 1000).toISOString();
}

const BUYERS = [
  { name: "Aarav Mehta", email: "aarav.mehta@example.in", phone: "9820112233", city: "Mumbai", state: "Maharashtra", pincode: "400001", line1: "14 Marine Drive, Churchgate" },
  { name: "Riya Sharma", email: "riya.sharma@example.in", phone: "9811223344", city: "New Delhi", state: "Delhi", pincode: "110001", line1: "8 Connaught Circus" },
  { name: "Karthik Nair", email: "karthik.nair@example.in", phone: "9845012345", city: "Bengaluru", state: "Karnataka", pincode: "560001", line1: "22 MG Road, Indiranagar" },
  { name: "Meera Iyer", email: "meera.iyer@example.in", phone: "9840112299", city: "Chennai", state: "Tamil Nadu", pincode: "600001", line1: "45 Cathedral Road" },
  { name: "Vikram Desai", email: "vikram.desai@example.in", phone: "9825098765", city: "Surat", state: "Gujarat", pincode: "395007", line1: "19 Vesu Canal Road" },
  { name: "Ananya Verma", email: "ananya.verma@example.in", phone: "9830123456", city: "Kolkata", state: "West Bengal", pincode: "700016", line1: "11 Park Street" },
  { name: "Rohan Joshi", email: "rohan.joshi@example.in", phone: "9822011223", city: "Pune", state: "Maharashtra", pincode: "411001", line1: "7 Koregaon Park" },
  { name: "Divya Krishnan", email: "divya.k@example.in", phone: "9848011223", city: "Hyderabad", state: "Telangana", pincode: "500033", line1: "31 Jubilee Hills" },
];

const ITEMS_CATALOG = [
  {
    variantId: "v-tide-slide-midnight-uk8",
    productId: "p-tide-slide",
    productSlug: "tide-slide",
    productName: "Tide Slide",
    colorwayName: "Midnight / Aqua",
    sku: "AQ-SLI-TIDE-MID-UK8",
    sizeUk: 8,
    image: "/catalog/tide-slide-midnight.jpg",
    unitPricePaise: 49900,
    taxRateBps: 1200,
  },
  {
    variantId: "v-harbour-clog-navy-uk9",
    productId: "p-harbour-clog",
    productSlug: "harbour-clog",
    productName: "Harbour Clog",
    colorwayName: "Navy",
    sku: "AQ-CLG-HARB-NVY-UK9",
    sizeUk: 9,
    image: "/catalog/harbour-clog-navy.jpg",
    unitPricePaise: 64900,
    taxRateBps: 1200,
  },
  {
    variantId: "v-pearl-slide-blush-uk5",
    productId: "p-pearl-slide",
    productSlug: "pearl-slide",
    productName: "Pearl Slide",
    colorwayName: "Blush",
    sku: "AQ-SLI-PERL-BLS-UK5",
    sizeUk: 5,
    image: "/catalog/pearl-slide-blush.jpg",
    unitPricePaise: 44900,
    taxRateBps: 1200,
  },
  {
    variantId: "v-cove-clog-sage-uk6",
    productId: "p-cove-clog",
    productSlug: "cove-clog",
    productName: "Cove Clog",
    colorwayName: "Sage",
    sku: "AQ-CLG-COVE-SAG-UK6",
    sizeUk: 6,
    image: "/catalog/cove-clog-sage.jpg",
    unitPricePaise: 59900,
    taxRateBps: 1200,
  },
  {
    variantId: "v-reef-flip-porcelain-uk9",
    productId: "p-reef-flip",
    productSlug: "reef-flip",
    productName: "Reef Flip",
    colorwayName: "Porcelain",
    sku: "AQ-FLP-REEF-PRC-UK9",
    sizeUk: 9,
    image: "/catalog/reef-flip-white.jpg",
    unitPricePaise: 34900,
    taxRateBps: 1200,
  },
  {
    variantId: "v-marina-trainer-cloud-uk6",
    productId: "p-marina-trainer",
    productSlug: "marina-trainer",
    productName: "Marina Trainer",
    colorwayName: "Cloud",
    sku: "AQ-TRN-MRNA-CLD-UK6",
    sizeUk: 6,
    image: "/catalog/marina-trainer-cloud.jpg",
    unitPricePaise: 299900,
    taxRateBps: 1800,
  },
];

const ORDER_SPECS = [
  { daysAgo: 0, status: "paid", method: "razorpay", itemIdx: 1, qty: 2, buyerIdx: 0 },
  { daysAgo: 0, status: "cod_confirmed", method: "cod", itemIdx: 0, qty: 1, buyerIdx: 1 },
  { daysAgo: 1, status: "paid", method: "razorpay", itemIdx: 5, qty: 1, buyerIdx: 2 },
  { daysAgo: 2, status: "shipped", method: "razorpay", itemIdx: 3, qty: 2, buyerIdx: 3 },
  { daysAgo: 3, status: "shipped", method: "cod", itemIdx: 2, qty: 2, buyerIdx: 4 },
  { daysAgo: 4, status: "delivered", method: "razorpay", itemIdx: 1, qty: 1, buyerIdx: 5 },
  { daysAgo: 6, status: "delivered", method: "razorpay", itemIdx: 0, qty: 2, buyerIdx: 6 },
  { daysAgo: 8, status: "delivered", method: "razorpay", itemIdx: 5, qty: 1, buyerIdx: 7 },
  { daysAgo: 10, status: "return_requested", method: "razorpay", itemIdx: 3, qty: 1, buyerIdx: 0 },
  { daysAgo: 12, status: "delivered", method: "cod", itemIdx: 4, qty: 2, buyerIdx: 1 },
  { daysAgo: 15, status: "delivered", method: "razorpay", itemIdx: 2, qty: 2, buyerIdx: 2 },
  { daysAgo: 18, status: "delivered", method: "razorpay", itemIdx: 1, qty: 2, buyerIdx: 3 },
  { daysAgo: 21, status: "delivered", method: "razorpay", itemIdx: 0, qty: 3, buyerIdx: 4 },
  { daysAgo: 25, status: "delivered", method: "cod", itemIdx: 3, qty: 1, buyerIdx: 5 },
  { daysAgo: 28, status: "delivered", method: "razorpay", itemIdx: 5, qty: 1, buyerIdx: 6 },
];

let existing = {};
try {
  const raw = await fs.readFile(STORE_FILE, "utf8");
  existing = JSON.parse(raw);
} catch {
  existing = {};
}

const orders = [];
const payments = [];
const returns = [];

ORDER_SPECS.forEach((spec, idx) => {
  const item = ITEMS_CATALOG[spec.itemIdx];
  const buyer = BUYERS[spec.buyerIdx];
  const createdAt = daysAgoIso(spec.daysAgo, (idx % 5) + 1);
  const lineTotalPaise = item.unitPricePaise * spec.qty;
  const subtotalPaise = lineTotalPaise;
  const shippingPaise = subtotalPaise >= 99900 ? 0 : 7900;
  const codFeePaise = spec.method === "cod" ? 4900 : 0;
  const taxPaise = Math.round(
    subtotalPaise - subtotalPaise / (1 + item.taxRateBps / 10000),
  );
  const totalPaise = subtotalPaise + shippingPaise + codFeePaise;
  const orderId = `ord_demo_${String(idx + 1).padStart(2, "0")}`;
  const orderNumber = `AQ-20261001-${String(101 + idx)}`;
  const orderItemId = `oi_demo_${String(idx + 1).padStart(2, "0")}`;

  const events = [
    {
      id: `evt_demo_${String(idx + 1).padStart(2, "0")}`,
      from: null,
      to: spec.status,
      actor: "system",
      note: "Order placed",
      at: createdAt,
    },
  ];

  const isShippedOrLater =
    spec.status === "shipped" ||
    spec.status === "delivered" ||
    spec.status === "return_requested";

  orders.push({
    id: orderId,
    number: orderNumber,
    userId: null,
    email: buyer.email,
    phone: buyer.phone,
    status: spec.status,
    paymentMethod: spec.method,
    address: {
      name: buyer.name,
      phone: buyer.phone,
      line1: buyer.line1,
      line2: "",
      landmark: "",
      city: buyer.city,
      state: buyer.state,
      pincode: buyer.pincode,
    },
    items: [
      {
        id: orderItemId,
        variantId: item.variantId,
        productId: item.productId,
        productName: item.productName,
        colorwayName: item.colorwayName,
        productSlug: item.productSlug,
        sku: item.sku,
        sizeUk: item.sizeUk,
        image: item.image,
        unitPricePaise: item.unitPricePaise,
        qty: spec.qty,
        taxRateBps: item.taxRateBps,
        taxPaise,
        lineTotalPaise,
        discountPaise: 0,
      },
    ],
    subtotalPaise,
    shippingPaise,
    codFeePaise,
    taxPaise,
    totalPaise,
    discountPaise: 0,
    promotionId: null,
    promotionCode: null,
    promotionName: null,
    promotionKind: null,
    idempotencyKey: `idem_demo_${idx + 1}`,
    accessToken: `tok_demo_${idx + 1}`,
    razorpayOrderId: spec.method === "razorpay" ? `order_demo_${idx + 1}` : null,
    reservationExpiresAt: null,
    trackingCarrier: isShippedOrLater ? "Delhivery" : null,
    trackingNumber: isShippedOrLater ? `DLV${900100 + idx}` : null,
    needsAttention: false,
    attentionNote: null,
    createdAt,
    updatedAt: createdAt,
    paidAt: spec.method === "razorpay" ? createdAt : null,
    shippedAt: isShippedOrLater ? createdAt : null,
    deliveredAt: spec.status === "delivered" ? createdAt : null,
    confirmationSentAt: createdAt,
    events,
  });

  if (spec.method === "razorpay") {
    payments.push({
      id: `pay_row_${idx + 1}`,
      orderId,
      providerPaymentId: `pay_demo_${idx + 1}`,
      amountPaise: totalPaise,
      status: "captured",
      at: createdAt,
    });
  }

  if (spec.status === "return_requested") {
    returns.push({
      id: "ret_demo_01",
      orderId,
      orderItemId,
      reason: "Size or fit",
      resolution: "exchange",
      note: "Need UK 7 instead of UK 6.",
      status: "requested",
      createdAt: daysAgoIso(2, 1),
    });
  }
});

const messageThreads = [
  {
    id: "thr_demo_01",
    orderId: "ord_demo_01",
    customerEmail: "aarav.mehta@example.in",
    subject: "Delivery timing for AQ-20261001-101",
    status: "open",
    lastMessageAt: daysAgoIso(0, 1),
    createdAt: daysAgoIso(0, 2),
  },
  {
    id: "thr_demo_02",
    orderId: "ord_demo_09",
    customerEmail: "riya.sharma@example.in",
    subject: "Size exchange request on Cove Clog",
    status: "open",
    lastMessageAt: daysAgoIso(1, 3),
    createdAt: daysAgoIso(1, 4),
  },
];

const messages = [
  {
    id: "msg_demo_01",
    threadId: "thr_demo_01",
    direction: "in",
    body: "Hi team, could you share the tracking link once AQ-20261001-101 ships today?",
    attachments: [],
    sentVia: "form",
    sentAt: daysAgoIso(0, 1),
  },
  {
    id: "msg_demo_02",
    threadId: "thr_demo_02",
    direction: "in",
    body: "Hello, I requested a size exchange from UK 6 to UK 7 on my Cove Clog order. Please confirm.",
    attachments: [],
    sentVia: "form",
    sentAt: daysAgoIso(1, 3),
  },
];

const nextState = {
  ...existing,
  orders,
  payments,
  returns,
  messageThreads,
  messages,
};

await fs.mkdir(path.dirname(STORE_FILE), { recursive: true });
await fs.writeFile(STORE_FILE, JSON.stringify(nextState, null, 2), "utf8");
console.log(`[demo:orders] Seeded ${orders.length} orders, ${returns.length} return, and ${messageThreads.length} buyer messages into .data/store.json`);
