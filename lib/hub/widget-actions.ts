"use server";

import { z } from "zod";

import { requireAdmin } from "@/lib/admin/guard";
import { loadWidget, WIDGET_IDS, type WidgetData } from "@/lib/hub/metrics";
import { err, ok, type Result } from "@/lib/result";

export async function refreshWidget(input: unknown): Promise<Result<WidgetData>> {
  await requireAdmin();
  const id = z.enum(WIDGET_IDS).safeParse(input);
  if (!id.success) return err("VALIDATION", "Unknown widget.");
  try {
    return ok(await loadWidget(id.data));
  } catch {
    return err("UNEXPECTED", "This widget could not be refreshed.");
  }
}

export async function hubRevision(): Promise<Result<string>> {
  await requireAdmin();
  try {
    const { hubSnapshot } = await import("@/lib/store/engine");
    const snapshot = await hubSnapshot();
    const newestOrder = snapshot.orders.reduce((last, row) => row.updatedAt > last ? row.updatedAt : last, "");
    return ok([snapshot.orders.length, newestOrder, snapshot.returns.map((row) => row.status).join(","),
      snapshot.reviews.map((row) => row.status).join(","), snapshot.payments.length,
      Object.values(snapshot.stock).reduce((sum, row) => sum + row.onHand + row.reserved, 0)].join("|"));
  } catch {
    return err("UNEXPECTED", "Could not check for new activity.");
  }
}
