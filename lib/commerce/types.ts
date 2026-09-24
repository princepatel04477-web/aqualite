import type { ColorFamily, Feature, Gender, CategorySlug } from "@/content/catalog";

export type PaymentMethod = "razorpay" | "cod";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "cod_confirmed"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "payment_failed"
  | "return_requested"
  | "returned"
  | "refunded";

export type Address = {
  id?: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
};

export type CartLine = {
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  colorwayName: string;
  colorwaySlug: string;
  image: string;
  sizeUk: number;
  sizeLabel: string;
  qty: number;
  unitPricePaise: number;
  mrpPaise: number;
  lineTotalPaise: number;
  available: number;
  isShort: boolean;
};

export type CartSummary = {
  cartId: string;
  lines: CartLine[];
  subtotalPaise: number;
  shippingPaise: number;
  codFeePaise: number;
  taxPaise: number;
  totalPaise: number;
  freeShippingRemainingPaise: number;
  count: number;
};

export type CardSize = {
  variantId: string;
  sizeUk: number;
  label: string;
  available: number;
};

export type CardColorway = {
  slug: string;
  name: string;
  swatch: string;
  family: ColorFamily;
  image: string;
  pricePaise: number;
  mrpPaise: number;
  soldOut: boolean;
  sizes: CardSize[];
};

export type ProductCardModel = {
  productId: string;
  slug: string;
  name: string;
  subtitle: string;
  category: string;
  categorySlug: CategorySlug;
  gender: Gender;
  colorwaySlug: string;
  colorwayName: string;
  image: string;
  secondaryImage: string | null;
  pricePaise: number;
  mrpPaise: number;
  tags: Array<"New" | "Last few" | "Sold out">;
  soldOut: boolean;
  colorways: CardColorway[];
  features: Feature[];
  isNew: boolean;
};

export type FacetCount = { value: string; label: string; count: number };

export type ListingResult = {
  items: ProductCardModel[];
  total: number;
  page: number;
  pageSize: number;
  facets: {
    sizes: FacetCount[];
    colors: FacetCount[];
    categories: FacetCount[];
    features: FacetCount[];
    genders: FacetCount[];
    price: { min: number; max: number };
  };
};

export type OrderItem = {
  id: string;
  variantId: string;
  productName: string;
  colorwayName: string;
  productSlug: string;
  sku: string;
  sizeUk: number;
  image: string;
  unitPricePaise: number;
  qty: number;
  taxRateBps: number;
  taxPaise: number;
  lineTotalPaise: number;
};

export type OrderEvent = {
  id: string;
  from: OrderStatus | null;
  to: OrderStatus;
  actor: string;
  note: string;
  at: string;
};

export type Order = {
  id: string;
  number: string;
  userId: string | null;
  email: string;
  phone: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  address: Address;
  items: OrderItem[];
  subtotalPaise: number;
  shippingPaise: number;
  codFeePaise: number;
  taxPaise: number;
  totalPaise: number;
  idempotencyKey: string;
  accessToken: string;
  razorpayOrderId: string | null;
  reservationExpiresAt: string | null;
  trackingCarrier: string | null;
  trackingNumber: string | null;
  needsAttention: boolean;
  attentionNote: string | null;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  confirmationSentAt: string | null;
  events: OrderEvent[];
};

export type SessionUser = {
  id: string;
  email: string;
  role: "customer" | "admin";
  fullName: string;
  phone: string;
};
