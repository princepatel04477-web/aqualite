import { InventoryTable } from "@/components/hub/catalog/InventoryTable";
import { CatalogNav } from "@/components/hub/catalog/CatalogNav";
import { inventoryData } from "@/lib/hub/catalog/rows";

export const metadata = { title: "All inventory — Seller Hub" };
export const dynamic = "force-dynamic";

export default async function AllInventory({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter } = await searchParams;
  const initialTab = filter === "out" ? "Out of stock" : filter === "low" ? "Low stock" : filter === "suppressed" ? "Suppressed" : "All";
  const { rows } = await inventoryData();
  return <div><p className="font-mono text-eyebrow uppercase text-aqua">Catalog / Inventory</p>
    <h1 className="mt-2 font-display text-h2">Every size, in one place.</h1>
    <CatalogNav current="/seller/catalog/inventory" />
    <InventoryTable initial={rows} initialTab={initialTab} />
  </div>;
}
