"use server";

import { z } from "zod";

import { errorCopy } from "@/content/errors";
import { readSession } from "@/lib/auth/session";
import { limitEmail, limitIp } from "@/lib/rate-limit";
import { err, type Result } from "@/lib/result";
import { requestNotify, submitReview } from "@/lib/store/engine";

export async function notifyAction(input: unknown): Promise<Result<{ stored: boolean }>> {
  const parsed = z.object({ variantId: z.string().min(1), email: z.string().email() }).safeParse(input);
  if (!parsed.success) return err("VALIDATION", errorCopy.VALIDATION);
  if (await limitIp("notify", 8, 600)) return err("RATE_LIMITED", errorCopy.RATE_LIMITED);
  if (await limitEmail(parsed.data.email, "notify", 3, 600)) return err("RATE_LIMITED", errorCopy.RATE_LIMITED);
  const session = await readSession();
  return requestNotify(parsed.data.variantId, parsed.data.email, session?.id ?? null);
}

export async function reviewAction(input: unknown): Promise<Result<{ id: string }>> {
  const session = await readSession();
  if (!session) return err("UNAUTHORIZED", errorCopy.UNAUTHORIZED);
  const parsed = z
    .object({
      productId: z.string(),
      rating: z.number().int().min(1).max(5),
      title: z.string().min(2).max(80),
      body: z.string().min(8).max(800),
      fit: z.enum(["runs_small", "true", "runs_large"]),
    })
    .safeParse(input);
  if (!parsed.success) return err("VALIDATION", errorCopy.VALIDATION);
  return submitReview({ ...parsed.data, userId: session.id, userName: session.fullName || session.email });
}
