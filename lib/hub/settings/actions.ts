"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/guard";
import { getSettings, updateSettings } from "@/lib/store/engine";
import { err, ok, type Result } from "@/lib/result";
import { businessSchema, returnsSchema, securitySchema, shippingSchema, type SettingsSection } from "./schema";

export async function readSellerSettings() {
  await requireAdmin();
  return getSettings();
}

export async function saveSellerSettings(section: SettingsSection, input: unknown): Promise<Result<{ saved: true }>> {
  const admin = await requireAdmin();
  const schemas = { business: businessSchema, shipping: shippingSchema, returns: returnsSchema, security: securitySchema } as const;
  if (!(section in schemas)) return err("VALIDATION", "This settings section is read-only.");
  const editableSection = section as keyof typeof schemas;
  const parsed = schemas[editableSection].safeParse(input);
  if (!parsed.success) return err("VALIDATION", parsed.error.issues[0]?.message ?? "Review the highlighted fields.");
  if (section === "shipping") {
    const shipping = shippingSchema.parse(input);
    await updateSettings({ shippingThresholdPaise: shipping.thresholdPaise, shippingFeePaise: shipping.feePaise, codFeePaise: shipping.codFeePaise, codMaxPaise: shipping.codCapPaise }, `admin:${admin.id}`);
  } else if (section === "returns") {
    const returns = returnsSchema.parse(input);
    await updateSettings({ returnWindowDays: returns.windowDays, returns: { exchangeAllowed: returns.exchangeAllowed, restockingPercent: returns.restockingPercent, reasons: returns.reasons } }, `admin:${admin.id}`);
  } else if (section === "business") {
    await updateSettings({ business: businessSchema.parse(input) }, `admin:${admin.id}`);
  } else {
    await updateSettings({ security: securitySchema.parse(input) }, `admin:${admin.id}`);
  }
  revalidatePath("/seller/settings");
  revalidatePath("/shipping");
  revalidatePath("/returns");
  revalidatePath("/");
  return ok({ saved: true });
}

export async function exportAuditCsv(): Promise<Result<{ csv: string }>> {
  const admin = await requireAdmin();
  const { listAudit } = await import("@/lib/store/engine");
  const rows = await listAudit();
  const csv = ["id,actor,action,entity,entity_id,time,diff", ...rows.map((row) => [row.id, row.actorId, row.action, row.entity, row.entityId, row.at, JSON.stringify(row.diff)].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))].join("\n");
  return ok({ csv: `${csv}\n# exported by ${admin.email}` });
}

export const settingsSectionInput = z.enum(["business", "shipping", "returns", "security"]);
