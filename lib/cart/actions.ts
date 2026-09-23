"use server";

import { z } from "zod";

import { readCartId, writeCartId } from "@/lib/cart/cookie";
import { errorCopy } from "@/content/errors";
import { logger } from "@/lib/logger";
import { err, ok, unexpected, type Result } from "@/lib/result";
import { limitCart, limitIp } from "@/lib/rate-limit";
import { addToCart, createCart, emptySummary, getCart, removeFromCart, updateQty } from "@/lib/store/engine";
import type { CartSummary } from "@/lib/commerce/types";

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
