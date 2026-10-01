"use server";

import { z } from "zod";

import { readCartId, writeCartId } from "@/lib/cart/cookie";
import { errorCopy } from "@/content/errors";
import { logger } from "@/lib/logger";
import { err, ok, unexpected, type Result } from "@/lib/result";
import { limitCart, limitIp } from "@/lib/rate-limit";
import {
  addToCart,
  applyCouponToCart,
  couponAttemptLimited,
  createCart,
  emptySummary,
  getCart,
  removeFromCart,
  removeCouponFromCart,
  updateQty,
} from "@/lib/store/engine";
import type { CartSummary } from "@/lib/commerce/types";
import { readSession } from "@/lib/auth/session";

const addSchema = z.object({
  variantId: z.string().min(1).max(80),
  qty: z.number().int().min(1).max(10),
});

const qtySchema = z.object({
  variantId: z.string().min(1).max(80),
  qty: z.number().int().min(0).max(10),
});

async function cartId(): Promise<string> {
  const existing = await readCartId();
  if (existing) return existing;
  const created = await createCart();
  await writeCartId(created);
  return created;
}

async function guarded<T>(cart: string, fn: () => Promise<Result<T>>): Promise<Result<T>> {
  if (await limitIp("cart", 120, 60)) return err("RATE_LIMITED", errorCopy.RATE_LIMITED);
  if (await limitCart(cart)) return err("RATE_LIMITED", errorCopy.RATE_LIMITED);
  try {
    return await fn();
  } catch (error) {
    const requestId = crypto.randomUUID().slice(0, 8);
    logger.error("cart.action_failed", { requestId, message: error instanceof Error ? error.message : "unknown" });
    return unexpected(requestId);
  }
}

export async function addToCartAction(input: unknown): Promise<Result<CartSummary>> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return err("VALIDATION", errorCopy.VALIDATION);
  const id = await cartId();
  return guarded(id, () => addToCart(id, parsed.data.variantId, parsed.data.qty));
}

export async function updateQtyAction(input: unknown): Promise<Result<CartSummary>> {
  const parsed = qtySchema.safeParse(input);
  if (!parsed.success) return err("VALIDATION", errorCopy.VALIDATION);
  const existing = await readCartId();
  if (!existing) return ok(emptySummary());
  return guarded(existing, () => updateQty(existing, parsed.data.variantId, parsed.data.qty));
}

export async function removeFromCartAction(input: unknown): Promise<Result<CartSummary>> {
  const parsed = z.object({ variantId: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return err("VALIDATION", errorCopy.VALIDATION);
  const existing = await readCartId();
  if (!existing) return ok(emptySummary());
  return guarded(existing, () => removeFromCart(existing, parsed.data.variantId));
}

export async function getCartAction(): Promise<CartSummary> {
  const existing = await readCartId();
  return getCart(existing);
}

const couponSchema = z.object({
  code: z.string().trim().min(3).max(24),
  /** Optional checkout email — tightens per-customer checks for guests. */
  email: z.string().email().optional(),
});

/**
 * Applies a coupon code to the bag. Brute force is capped at 10 attempts per
 * 10 minutes per cart; failures carry the typed promoReason in details.
 */
export async function applyCouponAction(input: unknown): Promise<Result<CartSummary>> {
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) return err("VALIDATION", errorCopy.VALIDATION);
  const id = await cartId();
  if (await limitIp("coupon", 30, 600)) return err("RATE_LIMITED", errorCopy.RATE_LIMITED);
  if (await couponAttemptLimited(id)) return err("RATE_LIMITED", errorCopy.RATE_LIMITED);
  if (await limitCart(id)) return err("RATE_LIMITED", errorCopy.RATE_LIMITED);
  const session = await readSession();
  try {
    return await applyCouponToCart(id, parsed.data.code, {
      userId: session?.id ?? null,
      email: parsed.data.email ?? session?.email ?? null,
    });
  } catch (error) {
    const requestId = crypto.randomUUID().slice(0, 8);
    logger.error("coupon.apply_failed", { requestId, message: error instanceof Error ? error.message : "unknown" });
    return unexpected(requestId);
  }
}

export async function removeCouponAction(): Promise<Result<CartSummary>> {
  const existing = await readCartId();
  if (!existing) return ok(emptySummary());
  try {
    return await removeCouponFromCart(existing);
  } catch (error) {
    const requestId = crypto.randomUUID().slice(0, 8);
    logger.error("coupon.remove_failed", { requestId, message: error instanceof Error ? error.message : "unknown" });
    return unexpected(requestId);
  }
}
