import Link from "next/link";
import { readSellerSettings } from "@/lib/hub/settings/actions";
import { defaultSellerSettings } from "@/lib/hub/settings/schema";

export const metadata = { title: "Settings — Seller Hub" };
export default async function SettingsPage() {
  await readSellerSettings();
  const sections = ["business", "shipping", "tax", "returns", "users", "notifications", "security", "audit"] as const;
  return <section><p className="font-mono text-eyebrow uppercase tracking-widest text-red-ink">Seller Hub / Control plane</p><h1 className="mt-2 text-hub-title">Settings</h1><p className="mt-2 max-w-2xl text-hub-body text-muted">One source of truth for storefront, checkout, invoices, customer care and the team.</p><div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{sections.map((section) => <Link key={section} href={`/seller/settings/${section}`} className="rounded-hub border border-hairline bg-paper p-5 transition-colors hover:bg-linen"><span className="text-hub-section">{section.charAt(0).toUpperCase() + section.slice(1)}</span><span className="mt-2 block text-hub-body text-muted">Manage {section} safely →</span></Link>)}</div><p className="mt-8 text-hub-label text-muted">Demo defaults are ready for local development. Production values are persisted by the settings migration and guarded by RLS.</p></section>;
}

export { defaultSellerSettings };
