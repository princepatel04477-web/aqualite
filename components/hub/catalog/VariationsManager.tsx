"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { SIZE_CHART, type CatalogProduct } from "@/content/catalog";
import { addVariationAction } from "@/lib/hub/catalog/actions";

export function VariationsManager({ products }: { products: CatalogProduct[] }) {
  const router = useRouter(); const [error, setError] = useState(""); const [pending, startTransition] = useTransition(); const [page, setPage] = useState(0);
  return <div className="space-y-4">{products.slice(page * 50, page * 50 + 50).map((product) => <details key={product.id} className="border border-hairline bg-porcelain p-4"><summary className="cursor-pointer font-medium">{product.name} <span className="ml-2 font-mono text-eyebrow text-mist">{product.colorways.length} colourways · {product.colorways.reduce((sum, color) => sum + color.variants.length, 0)} SKUs</span></summary>
    {product.colorways.map((color) => { const missing = SIZE_CHART[product.gender].filter((size) => !color.variants.some((row) => row.sizeUk === size.uk));
      return <div key={color.id} className="mt-4 border-t border-hairline pt-3"><h2>{color.name} <span className="font-mono text-eyebrow text-mist">{color.family}</span></h2><div className="mt-2 flex flex-wrap gap-2">{color.variants.map((variant) => <span key={variant.id} title={variant.sku} className="border border-hairline px-3 py-2 font-mono text-small">UK {variant.label}</span>)}</div>
        {missing.length > 0 && <form className="mt-3 flex flex-wrap items-end gap-2 text-small" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); startTransition(async () => { const result = await addVariationAction({ colorwayId: color.id, sizeUk: Number(data.get("size")), sku: String(data.get("sku")).toUpperCase(), mrpPaise: Math.round(Number(data.get("mrp")) * 100), pricePaise: Math.round(Number(data.get("price")) * 100), stock: Number(data.get("stock")) }); if (!result.ok) setError(result.error.message); else { setError(""); router.refresh(); } }); }}>
          <label>Missing UK<select name="size" className="hub-input">{missing.map((size) => <option key={size.uk} value={size.uk}>{size.label}</option>)}</select></label>
          <label>SKU<input name="sku" required minLength={3} className="hub-input w-36 font-mono" /></label><label>MRP ₹<input name="mrp" type="number" min="0.01" step="0.01" required className="hub-input w-24" /></label><label>Price ₹<input name="price" type="number" min="0.01" step="0.01" required className="hub-input w-24" /></label><label>Stock<input name="stock" type="number" min={0} required className="hub-input w-20" /></label>
          <button disabled={pending} type="submit" className="border border-aqua px-3 py-2 text-aqua disabled:opacity-50">{pending ? "Adding…" : "Add size"}</button>
        </form>}
      </div>; })}
    {error && <p role="alert" className="mt-3 text-danger">{error}</p>}
    <p className="mt-4 text-small"><Link href="/seller/catalog/inventory" className="text-aqua underline">Manage SKUs and availability ↗</Link></p>
  </details>)}<div className="flex gap-3 text-small"><button disabled={page === 0} onClick={() => setPage(page - 1)} className="text-aqua disabled:opacity-40">← Previous</button><span>Page {page + 1} / {Math.max(1, Math.ceil(products.length / 50))}</span><button disabled={(page + 1) * 50 >= products.length} onClick={() => setPage(page + 1)} className="text-aqua disabled:opacity-40">Next →</button></div></div>;
}
