import { CatalogNav } from "@/components/hub/catalog/CatalogNav";
import { LedgerTable } from "@/components/hub/catalog/LedgerTable";
import { inventoryData } from "@/lib/hub/catalog/rows";

export const metadata = { title: "Stock ledger — Seller Hub" };
export const dynamic = "force-dynamic";
export default async function StockLedgerPage() {
  const { rows, ledger } = await inventoryData();
  return <div><p className="font-mono text-eyebrow uppercase text-aqua">Inventory / Ledger</p><h1 className="mt-2 font-display text-h2">Every movement, traced.</h1><CatalogNav current="/seller/inventory/ledger" /><LedgerTable entries={ledger} skus={Object.fromEntries(rows.map((row) => [row.id, row.sku]))} /></div>;
}
