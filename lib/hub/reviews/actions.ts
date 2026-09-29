import { z } from "zod";

import { errorCopy } from "@/content/errors";
import { requireSeller } from "@/lib/hub/guard";
import { logger } from "@/lib/logger";
import { err, unexpected, type Result } from "@/lib/result";
import {
  moderateReview,
  replyToReview,
  type ReviewReply,
  type StoredReview,
} from "@/lib/store/engine";

const replySchema = z.object({
  id: z.string().min(1),
  body: z.string().trim().min(1).max(2000),
});

const moderateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["approved", "rejected"]),
});

/** Public reply on a review — shown under it on the PDP once approved. */
export async function replyToReviewAction(input: unknown): Promise<Result<ReviewReply>> {
  const parsed = replySchema.safeParse(input);
  if (!parsed.success) return err("VALIDATION", errorCopy.VALIDATION);
  try {
    const admin = await requireSeller();
    return replyToReview(parsed.data.id, parsed.data.body, `admin:${admin.id}`);
  } catch (error) {
    const requestId = crypto.randomUUID().slice(0, 8);
    logger.error("hub.review_reply_failed", {
      requestId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return unexpected(requestId);
  }
}

export async function moderateReviewAction(input: unknown): Promise<Result<StoredReview>> {
  const parsed = moderateSchema.safeParse(input);
  if (!parsed.success) return err("VALIDATION", errorCopy.VALIDATION);
  try {
    const admin = await requireSeller();
    return moderateReview(parsed.data.id, parsed.data.status, `admin:${admin.id}`);
  } catch (error) {
    const requestId = crypto.randomUUID().slice(0, 8);
    logger.error("hub.review_moderate_failed", {
      requestId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return unexpected(requestId);
  }
}
