import { CatalogNav } from "@/components/hub/catalog/CatalogNav";
import { InventoryTable } from "@/components/hub/catalog/InventoryTable";
import { inventoryData } from "@/lib/hub/catalog/rows";

export const metadata = { title: "Manage pricing — Seller Hub" };
export const dynamic = "force-dynamic";
export default async function PricingPage() {
  const { rows } = await inventoryData();
  return <div><p className="font-mono text-eyebrow uppercase text-aqua">Pricing / Manage</p><h1 className="mt-2 font-display text-h2">The right price, right now.</h1>
    <CatalogNav current="/seller/pricing" /><InventoryTable initial={rows} mode="pricing" /></div>;
}
