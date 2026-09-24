import type { DomainCode } from "@/lib/result";

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
  UNEXPECTED: "Something went quiet on our side. Try again in a moment.",
};
