import { CatalogNav } from "@/components/hub/catalog/CatalogNav";
import { ImageManager } from "@/components/hub/catalog/ImageManager";
import { inventoryData } from "@/lib/hub/catalog/rows";

export const metadata = { title: "Listing images — Seller Hub" };
export const dynamic = "force-dynamic";
export default async function CatalogImages() {
  const { products } = await inventoryData();
  return <div><p className="font-mono text-eyebrow uppercase text-aqua">Catalog / Images</p><h1 className="mt-2 font-display text-h2">A better first look.</h1><CatalogNav current="/seller/catalog/images" /><ImageManager products={products} /></div>;
}
