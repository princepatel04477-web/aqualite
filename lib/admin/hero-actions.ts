"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import { errorCopy } from "@/content/errors";
import { requireAdmin } from "@/lib/admin/guard";
import { err, ok, type Result } from "@/lib/result";
import { catalogProducts, reorderHeroSlides, saveHeroSlide } from "@/lib/store/engine";
import { heroRouteError, heroSlideInputSchema } from "@/lib/validation/hero";

function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? errorCopy.VALIDATION;
}

async function ctaTargetError(href: string): Promise<string | null> {
  const routeError = heroRouteError(href);
  if (routeError) return routeError;
  const match = /^\/product\/([a-z0-9-]+)$/.exec(new URL(href, "http://aqualite.invalid").pathname);
  if (!match) return null;
  const products = await catalogProducts();
  if (!products.some((product) => product.slug === match[1] && product.isActive)) {
    return `CTA points at “${match[1]}”, which is not an active product.`;
  }
  return null;
}

export async function saveHeroSlideAction(input: unknown): Promise<Result<{ id: string }>> {
  const admin = await requireAdmin();
  const parsed = heroSlideInputSchema.safeParse(input);
  if (!parsed.success) return err("VALIDATION", firstIssueMessage(parsed.error));
  const data = parsed.data;

  for (const href of [data.ctaPrimaryHref, data.ctaSecondaryHref]) {
    const target = await ctaTargetError(href);
    if (target) return err("VALIDATION", target);
  }

  const saved = await saveHeroSlide(
    {
      id: data.id ?? "",
      isActive: data.isActive,
      productId: data.productId,
      colorwayId: data.colorwayId,
      eyebrow: data.eyebrow,
      headlineBefore: data.headlineBefore,
      headlineItalic: data.headlineItalic,
      headlineAfter: data.headlineAfter,
      lead: data.lead,
      glowHex: data.glowHex,
      imageDesktopPath: data.imageDesktopPath,
      imageMobilePath: data.imageMobilePath,
      imageAlt: data.imageAlt,
      focalX: data.focalX,
      focalY: data.focalY,
      shoeMaskPath: data.shoeMaskPath,
      ctaPrimaryLabel: data.ctaPrimaryLabel,
      ctaPrimaryHref: data.ctaPrimaryHref,
      ctaSecondaryLabel: data.ctaSecondaryLabel,
      ctaSecondaryHref: data.ctaSecondaryHref,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
    },
    `admin:${admin.id}`,
  );
  if (!saved.ok) return saved;

  revalidateTag("hero");
  revalidatePath("/");
  revalidatePath("/admin/hero");
  return ok({ id: saved.data.id });
}

const reorderSchema = z.array(z.string().min(1)).min(1).max(24);

export async function reorderHeroSlidesAction(input: unknown): Promise<Result<{ saved: boolean }>> {
  const admin = await requireAdmin();
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return err("VALIDATION", firstIssueMessage(parsed.error));
  const moved = await reorderHeroSlides(parsed.data, `admin:${admin.id}`);
  if (!moved.ok) return moved;
  revalidateTag("hero");
  revalidatePath("/");
  revalidatePath("/admin/hero");
  return ok({ saved: true });
}
