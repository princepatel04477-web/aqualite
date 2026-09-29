import { CatalogNav } from "@/components/hub/catalog/CatalogNav";
import { VariationsManager } from "@/components/hub/catalog/VariationsManager";
import { inventoryData } from "@/lib/hub/catalog/rows";

export const metadata = { title: "Product variations — Seller Hub" };
export const dynamic = "force-dynamic";
export default async function VariationsPage() {
  const { products } = await inventoryData();
  return <div><p className="font-mono text-eyebrow uppercase text-aqua">Catalog / Variations</p><h1 className="mt-2 font-display text-h2">Colour × size.</h1><CatalogNav current="/seller/catalog/variations" /><VariationsManager products={products} /></div>;
}
