"use server";

import { z } from "zod";

import { requireAdmin } from "@/lib/admin/guard";
import { defaultLayout, WIDGET_IDS, type WidgetSetting, type SellerRole } from "@/lib/hub/metrics";
import { err, ok, type Result } from "@/lib/result";
import { readHubLayout, writeHubLayout } from "@/lib/store/engine";

const setting = z.object({ id: z.enum(WIDGET_IDS), visible: z.boolean(), size: z.enum(["S", "M", "L"]) });
const schema = z.array(setting).length(WIDGET_IDS.length).refine((rows) => new Set(rows.map((row) => row.id)).size === WIDGET_IDS.length);

export async function getLayout(): Promise<WidgetSetting[]> {
  const user = await requireAdmin();
  const saved = schema.safeParse(await readHubLayout(user.id));
  const role: SellerRole = "owner"; // Existing sessions have admin/customer only.
  return saved.success ? saved.data : defaultLayout(role);
}

export async function saveLayout(input: unknown): Promise<Result<WidgetSetting[]>> {
  const user = await requireAdmin();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return err("VALIDATION", "Invalid dashboard layout.");
  try {
    await writeHubLayout(user.id, parsed.data);
    return ok(parsed.data);
  } catch {
    return err("UNEXPECTED", "Could not save your dashboard layout. Try again.");
  }
}
