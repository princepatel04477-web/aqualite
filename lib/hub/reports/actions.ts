"use server";

import { z } from "zod";

import { errorCopy } from "@/content/errors";
import { logger } from "@/lib/logger";
import { syncSettlements } from "@/lib/payments/settlements";
import { err, ok, unexpected, type Result } from "@/lib/result";
import { markCodCollected, type CodCollection } from "@/lib/store/engine";
import { requireSeller } from "@/lib/hub/guard";

export type SyncSummary = {
  created: number;
  items: number;
  matched: number;
  mismatches: number;
};

/** Manual settlement pull — the same path the nightly cron runs. */
export async function runSettlementSyncAction(): Promise<Result<SyncSummary>> {
  try {
    await requireSeller();
    const summary = await syncSettlements();
    return ok(summary);
  } catch (error) {
    const requestId = crypto.randomUUID().slice(0, 8);
    logger.error("hub.sync_failed", {
      requestId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return unexpected(requestId);
  }
}

const codSchema = z.object({
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amountPaise: z.number().int().nonnegative(),
  courierNote: z.string().trim().max(200).default(""),
});

/** Courier remittance mark: COD period → collected. */
export async function markCodCollectedAction(input: unknown): Promise<Result<CodCollection>> {
  const parsed = codSchema.safeParse(input);
  if (!parsed.success) return err("VALIDATION", errorCopy.VALIDATION);
  try {
    const admin = await requireSeller();
    return markCodCollected(
      {
        periodStart: parsed.data.periodStart,
        periodEnd: parsed.data.periodEnd,
        amountPaise: parsed.data.amountPaise,
      },
      parsed.data.courierNote,
      `admin:${admin.id}`,
    );
  } catch (error) {
    const requestId = crypto.randomUUID().slice(0, 8);
    logger.error("hub.cod_mark_failed", {
      requestId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return unexpected(requestId);
  }
}
