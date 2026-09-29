import { CatalogNav } from "@/components/hub/catalog/CatalogNav";
import { QualityTable } from "@/components/hub/catalog/QualityTable";
import { inventoryData } from "@/lib/hub/catalog/rows";

export const metadata = { title: "Listing quality — Seller Hub" };
export const dynamic = "force-dynamic";
export default async function QualityPage() {
  const { products } = await inventoryData();
  return <div><p className="font-mono text-eyebrow uppercase text-aqua">Catalog / Listing quality</p><h1 className="mt-2 font-display text-h2">Make every detail count.</h1><CatalogNav current="/seller/catalog/quality" /><QualityTable products={products} /></div>;
}
