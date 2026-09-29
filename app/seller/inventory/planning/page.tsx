import { CatalogNav } from "@/components/hub/catalog/CatalogNav";
import { PlanningTable } from "@/components/hub/catalog/PlanningTable";
import { inventoryData } from "@/lib/hub/catalog/rows";

export const metadata = { title: "Restock planning — Seller Hub" };
export const dynamic = "force-dynamic";
export default async function PlanningPage() {
  const { rows, leadDays, targetDays } = await inventoryData();
  return <div><p className="font-mono text-eyebrow uppercase text-aqua">Inventory / Planning</p><h1 className="mt-2 font-display text-h2">Stay ahead of demand.</h1><CatalogNav current="/seller/inventory/planning" /><PlanningTable rows={rows} leadDays={leadDays} targetDays={targetDays} /></div>;
}
