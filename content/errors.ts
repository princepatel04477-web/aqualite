import type { DomainCode } from "@/lib/result";
import type { PromoRejectionReason } from "@/lib/pricing/promotions";

export const errorCopy: Record<DomainCode, string> = {
  OUT_OF_STOCK: "That size just sold out. We've updated your bag.",
  NOT_SERVICEABLE: "We don't deliver to that pincode yet.",
  COD_UNAVAILABLE: "Cash on delivery isn't available for this order.",
  AMOUNT_MISMATCH: "The payment amount didn't match the order. Nothing was charged twice — we'll sort it.",
  INVALID_TRANSITION: "That step isn't available for this order anymore.",
  RATE_LIMITED: "Too many tries, too quickly. Pause a moment, then continue.",
  EMPTY_CART: "Your bag is empty.",
  VALIDATION: "A few details need another look.",
  UNAUTHORIZED: "Sign in to continue.",
  NOT_FOUND: "We couldn't find that.",
  PAYMENT_PROVIDER_UNAVAILABLE: "Payments are briefly unavailable. Your sizes have been released.",
  ALREADY_EXISTS: "That's already on file.",
  PROMO_REJECTED: "That code can't be used on this bag.",
  UNEXPECTED: "Something went quiet on our side. Try again in a moment.",
};

/** Brand voice for typed promotion rejections (see lib/pricing/promotions.ts). */
export const promoCopy: Record<PromoRejectionReason, string> = {
  EXPIRED: "That code has run its course. The next one is worth waiting for.",
  NOT_STARTED: "That code isn't live yet. Hold tight — it's nearly time.",
  MIN_NOT_MET: "A little more in the bag and that code will work.",
  USAGE_EXHAUSTED: "That code made a splash and sold through. Your bag is still priced fairly.",
  NOT_ELIGIBLE: "That code doesn't sit right with this bag. Try another.",
  ALREADY_USED: "You've already made the most of that code. Thank you.",
};
