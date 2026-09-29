"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { errorCopy } from "@/content/errors";
import { requireSeller } from "@/lib/hub/guard";
import { err, ok, unexpected, type Result } from "@/lib/result";
import {
  createPromotion,
  duplicatePromotion,
  endPromotionNow,
  getPromotion,
  setPromotionPaused,
  updatePromotion,
  type PromotionDraft,
} from "@/lib/store/engine";
import type { Promotion } from "@/lib/pricing/promotions";
import { logger } from "@/lib/logger";

const draftSchema = z
  .object({
    kind: z.enum(["coupon", "automatic"]),
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,24}$/).nullable(),
    name: z.string().trim().min(1).max(80),
    discountType: z.enum(["percent", "flat", "free_shipping"]),
    value: z.number().int().min(0),
    minSubtotalPaise: z.number().int().min(0),
    maxDiscountPaise: z.number().int().positive().nullable(),
    appliesTo: z.enum(["all", "categories", "products", "collections"]),
    targetIds: z.array(z.string().trim().min(1).max(60)).max(60),
    startsAt: z.string().min(4),
    endsAt: z.string().min(4).nullable(),
    usageLimitTotal: z.number().int().positive().nullable(),
    usageLimitPerCustomer: z.number().int().positive().nullable(),
    firstOrderOnly: z.boolean(),
    stackable: z.boolean(),
    isActive: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.kind === "coupon" && !value.code) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["code"], message: "Coupon codes are required." });
    }
    if (value.kind === "automatic" && value.code) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["code"], message: "Automatic promotions have no code." });
    }
    if (value.discountType === "percent" && (value.value <= 0 || value.value > 10000)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["value"], message: "Percent is 0.01–100." });
    }
    if (value.discountType === "flat" && value.value <= 0) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["value"], message: "Flat discount must be positive." });
    }
    if (value.discountType === "free_shipping" && value.value !== 0) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["value"], message: "Free shipping carries no value." });
    }
    if (value.appliesTo !== "all" && value.targetIds.length === 0) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["targetIds"], message: "Pick at least one target." });
    }
    const starts = new Date(value.startsAt).getTime();
    const ends = value.endsAt ? new Date(value.endsAt).getTime() : Number.POSITIVE_INFINITY;
    if (!Number.isFinite(starts)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["startsAt"], message: "Start date is required." });
    } else if (ends <= starts) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "End must come after start." });
    }
  });

function toDraft(parsed: z.infer<typeof draftSchema>): PromotionDraft {
  return {
    kind: parsed.kind,
    code: parsed.kind === "coupon" ? parsed.code : null,
    name: parsed.name,
    discountType: parsed.discountType,
    value: parsed.value,
    minSubtotalPaise: parsed.minSubtotalPaise,
    maxDiscountPaise: parsed.maxDiscountPaise,
    appliesTo: parsed.appliesTo,
    targetIds: parsed.targetIds,
    startsAt: new Date(parsed.startsAt).toISOString(),
    endsAt: parsed.endsAt ? new Date(parsed.endsAt).toISOString() : null,
    usageLimitTotal: parsed.usageLimitTotal,
    usageLimitPerCustomer: parsed.usageLimitPerCustomer,
    firstOrderOnly: parsed.firstOrderOnly,
    stackable: parsed.stackable,
    isActive: parsed.isActive,
  };
}

async function guard() {
  return requireSeller();
}

export async function createPromotionAction(input: unknown): Promise<Result<Promotion>> {
  const admin = await guard();
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return err("VALIDATION", errorCopy.VALIDATION);
  try {
    const created = await createPromotion(toDraft(parsed.data), `admin:${admin.id}`);
    if (!created.ok) return created;
    revalidatePath("/seller/promotions");
    return created;
  } catch (error) {
    const requestId = crypto.randomUUID().slice(0, 8);
    logger.error("promotion.create_failed", { requestId, message: error instanceof Error ? error.message : "unknown" });
    return unexpected(requestId);
  }
}

export async function updatePromotionAction(id: string, input: unknown): Promise<Result<Promotion>> {
  const admin = await guard();
  const parsedId = z.string().min(1).safeParse(id);
  const parsed = draftSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) return err("VALIDATION", errorCopy.VALIDATION);
  try {
    const updated = await updatePromotion(parsedId.data, toDraft(parsed.data), `admin:${admin.id}`);
    if (!updated.ok) return updated;
    revalidatePath("/seller/promotions");
    return updated;
  } catch (error) {
    const requestId = crypto.randomUUID().slice(0, 8);
    logger.error("promotion.update_failed", { requestId, message: error instanceof Error ? error.message : "unknown" });
    return unexpected(requestId);
  }
}

export async function pausePromotionAction(id: string, paused: boolean): Promise<Result<Promotion>> {
  const admin = await guard();
  const parsed = z.object({ id: z.string().min(1), paused: z.boolean() }).safeParse({ id, paused });
  if (!parsed.success) return err("VALIDATION", errorCopy.VALIDATION);
  const moved = await setPromotionPaused(parsed.data.id, parsed.data.paused, `admin:${admin.id}`);
  if (moved.ok) revalidatePath("/seller/promotions");
  return moved;
}

export async function duplicatePromotionAction(id: string): Promise<Result<Promotion>> {
  const admin = await guard();
  const parsed = z.string().min(1).safeParse(id);
  if (!parsed.success) return err("VALIDATION", errorCopy.VALIDATION);
  const copied = await duplicatePromotion(parsed.data, `admin:${admin.id}`);
  if (copied.ok) revalidatePath("/seller/promotions");
  return copied;
}

export async function endPromotionAction(id: string): Promise<Result<Promotion>> {
  const admin = await guard();
  const parsed = z.string().min(1).safeParse(id);
  if (!parsed.success) return err("VALIDATION", errorCopy.VALIDATION);
  const ended = await endPromotionNow(parsed.data, `admin:${admin.id}`);
  if (ended.ok) revalidatePath("/seller/promotions");
  return ended;
}

export async function loadPromotionAction(id: string): Promise<Result<Promotion>> {
  await guard();
  const parsed = z.string().min(1).safeParse(id);
  if (!parsed.success) return err("VALIDATION", errorCopy.VALIDATION);
  const promotion = await getPromotion(parsed.data);
  if (!promotion) return err("NOT_FOUND", errorCopy.NOT_FOUND);
  return ok(promotion);
}
