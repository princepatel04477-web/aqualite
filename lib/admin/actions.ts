"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { errorCopy } from "@/content/errors";
import { requireAdmin } from "@/lib/admin/guard";
import { err, ok, type Result } from "@/lib/result";
import { adjustStock, moderateReview, recordOutbox, transitionOrder, updateSettings } from "@/lib/store/engine";

export async function shipOrderAction(input: unknown): Promise<Result<{ shipped: boolean }>> {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      orderId: z.string(),
      carrier: z.string().min(2).default("Delhivery"),
      tracking: z.string().min(3).default("DLV-AQ-1001"),
    })
    .safeParse(input);
  if (!parsed.success) return err("VALIDATION", errorCopy.VALIDATION);
  const moved = await transitionOrder(parsed.data.orderId, "shipped", "Shipped", `admin:${admin.id}`, {
    carrier: parsed.data.carrier,
    number: parsed.data.tracking,
  });
  if (!moved.ok) return moved;
  await recordOutbox(moved.data.email, `Order ${moved.data.number} shipped`, `${parsed.data.carrier} ${parsed.data.tracking}`);
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/seller");
  revalidatePath("/seller/orders");
  revalidatePath(`/seller/orders/${moved.data.number}`);
  return ok({ shipped: true });
}

export async function packOrderAction(orderId: string): Promise<Result<{ packed: boolean }>> {
  const admin = await requireAdmin();
  const moved = await transitionOrder(orderId, "packed", "Packed", `admin:${admin.id}`);
  if (!moved.ok) return moved;
  revalidatePath("/seller/orders");
  revalidatePath("/admin/orders");
  return ok({ packed: true });
}

export async function deliverOrderAction(orderId: string): Promise<Result<{ delivered: boolean }>> {
  const admin = await requireAdmin();
  const moved = await transitionOrder(orderId, "delivered", "Delivered", `admin:${admin.id}`);
  if (!moved.ok) return moved;
  revalidatePath("/seller/orders");
  revalidatePath("/admin/orders");
  return ok({ delivered: true });
}

export async function stockAction(input: unknown): Promise<Result<{ available: number }>> {
  const admin = await requireAdmin();
  const parsed = z.object({
    variantId: z.string(),
    delta: z.number().int(),
    reason: z.enum(["restock", "adjustment", "return"]),
    note: z.string().min(2),
  }).safeParse(input);
  if (!parsed.success) return err("VALIDATION", errorCopy.VALIDATION);
  const adjusted = await adjustStock(parsed.data.variantId, parsed.data.delta, parsed.data.reason, parsed.data.note, `admin:${admin.id}`);
  if (!adjusted.ok) return adjusted;
  updateTag("catalog");
  return ok({ available: adjusted.data.available });
}

export async function settingsAction(input: unknown): Promise<Result<{ saved: boolean }>> {
  const admin = await requireAdmin();
  const parsed = z.object({
    shippingFeePaise: z.number().int().nonnegative(),
    shippingThresholdPaise: z.number().int().positive(),
    codFeePaise: z.number().int().nonnegative(),
    codMaxPaise: z.number().int().positive(),
    returnWindowDays: z.number().int().positive(),
  }).safeParse(input);
  if (!parsed.success) return err("VALIDATION", errorCopy.VALIDATION);
  await updateSettings(parsed.data, `admin:${admin.id}`);
  revalidatePath("/shipping");
  return ok({ saved: true });
}

export async function reviewModerationAction(id: string, status: "approved" | "rejected"): Promise<void> {
  const admin = await requireAdmin();
  await moderateReview(id, status, `admin:${admin.id}`);
}
