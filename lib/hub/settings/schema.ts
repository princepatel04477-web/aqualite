import { z } from "zod";

export const settingsSectionSchema = z.enum(["business", "shipping", "tax", "returns", "users", "notifications", "security", "audit"]);
export type SettingsSection = z.infer<typeof settingsSectionSchema>;

export const businessSchema = z.object({
  legalName: z.string().min(2).max(160), brandName: z.string().min(2).max(80),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Enter a valid GSTIN."),
  panLast4: z.string().regex(/^[A-Z0-9]{4}$/), registeredAddress: z.string().min(10).max(500),
  supportEmail: z.string().email(), supportPhone: z.string().regex(/^\+?[0-9 ()-]{8,20}$/),
  grievanceOfficer: z.string().min(2).max(120), logoUrl: z.string().url().or(z.literal("")),
});
export const shippingSchema = z.object({
  thresholdPaise: z.number().int().nonnegative(), feePaise: z.number().int().nonnegative(), codFeePaise: z.number().int().nonnegative(), codCapPaise: z.number().int().positive(), handlingDays: z.number().int().min(0).max(30), cutoff: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/),
});
export const returnsSchema = z.object({ windowDays: z.number().int().min(0).max(90), exchangeAllowed: z.boolean(), restockingPercent: z.number().int().min(0).max(100), reasons: z.array(z.string().min(1).max(80)).min(1).max(20) });
export const securitySchema = z.object({ idleHours: z.literal(12), requireMfa: z.boolean(), reauthMinutes: z.number().int().min(1).max(60) });
export type BusinessSettings = z.infer<typeof businessSchema>;
export type ShippingSettings = z.infer<typeof shippingSchema>;
export type ReturnsSettings = z.infer<typeof returnsSchema>;
export type SecuritySettings = z.infer<typeof securitySchema>;

export type SellerSettings = {
  business: BusinessSettings;
  shipping: ShippingSettings;
  returns: ReturnsSettings;
  security: SecuritySettings;
};

export const defaultSellerSettings: SellerSettings = {
  business: { legalName: "Aqualite", brandName: "Aqualite", gstin: "27AAAAA0000A1Z5", panLast4: "0000", registeredAddress: "Update your registered address", supportEmail: "support@aqualite.in", supportPhone: "+91 00000 00000", grievanceOfficer: "Aqualite Grievance Officer", logoUrl: "" },
  shipping: { thresholdPaise: 99900, feePaise: 7900, codFeePaise: 4900, codCapPaise: 1000000, handlingDays: 1, cutoff: "14:00" },
  returns: { windowDays: 7, exchangeAllowed: true, restockingPercent: 0, reasons: ["Size or fit", "Damaged in transit", "Wrong item"] },
  security: { idleHours: 12, requireMfa: true, reauthMinutes: 15 },
};
