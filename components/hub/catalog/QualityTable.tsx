"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { APPROVED_FEATURES, type CatalogProduct } from "@/content/catalog";
import { saveContentAction } from "@/lib/hub/catalog/actions";
import { qualityScore } from "@/lib/hub/catalog/schema";

export function QualityTable({ products }: { products: CatalogProduct[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<CatalogProduct | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [pending, startTransition] = useTransition();
  return <div><div className="overflow-x-auto border border-hairline bg-porcelain"><table className="w-full text-left text-small"><thead className="border-b border-hairline font-mono text-eyebrow uppercase text-mist"><tr><th className="p-3">Product</th><th>Quality score</th><th>Top improvement</th><th>Fix</th></tr></thead><tbody>{products.slice(page * 100, page * 100 + 100).map((product) => {
    const quality = qualityScore(product); const missing = quality.items.find((row) => !row.passed);
    return <tr key={product.id} className="border-b border-hairline"><td className="p-3 font-medium">{product.name}</td><td className="font-mono">{quality.score} / 100</td><td>{missing?.label ?? "All checks passed"}</td><td>{missing && <button className="text-aqua underline" onClick={() => { if (missing.step === 3) router.push("/seller/catalog/images"); else if (missing.step === 1) router.push("/seller/catalog/variations"); else if (missing.step === 2) router.push("/seller/catalog/inventory"); else setEditing(product); }}>Fix ↗</button>}</td></tr>;
  })}</tbody></table></div><div className="mt-3 flex gap-3 text-small"><button className="text-aqua disabled:opacity-40" disabled={page === 0} onClick={() => setPage(page - 1)}>← Previous</button><span>Page {page + 1} / {Math.max(1, Math.ceil(products.length / 100))}</span><button className="text-aqua disabled:opacity-40" disabled={(page + 1) * 100 >= products.length} onClick={() => setPage(page + 1)}>Next →</button></div>
    {editing && <div className="fixed inset-0 z-modal grid place-items-center bg-foam/30 p-4" onClick={() => setEditing(null)}><form className="max-h-[90vh] w-full max-w-xl overflow-y-auto border border-hairline bg-porcelain p-6" onClick={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const features = APPROVED_FEATURES.filter((name) => form.has(name)); startTransition(async () => { const result = await saveContentAction({ productId: editing.id, description: form.get("description"), care: form.get("care"), features, keywords: String(form.get("keywords") ?? "").split(",").map((row) => row.trim()).filter(Boolean), seoTitle: form.get("seoTitle"), seoDescription: form.get("seoDescription") }); if (!result.ok) setError(result.error.message); else { setEditing(null); setError(""); router.refresh(); } }); }}>
      <h2 className="font-display text-h3">Improve {editing.name}</h2>
      <label className="mt-4 block text-small">Description<textarea name="description" defaultValue={editing.description} maxLength={10000} className="hub-input min-h-28 w-full" /></label>
      <label className="mt-4 block text-small">Care<textarea name="care" defaultValue={editing.care} maxLength={2000} className="hub-input w-full" /></label>
      <fieldset className="mt-4"><legend className="text-small">Approved features</legend><div className="mt-2 flex flex-wrap gap-3">{APPROVED_FEATURES.map((feature) => <label key={feature} className="text-small"><input type="checkbox" name={feature} defaultChecked={editing.features.includes(feature)} /> {feature}</label>)}</div></fieldset>
      <label className="mt-4 block text-small">Search keywords<input name="keywords" defaultValue={editing.keywords?.join(", ") ?? ""} className="hub-input w-full" /></label>
      <label className="mt-4 block text-small">SEO title<input name="seoTitle" defaultValue={editing.seoTitle ?? ""} className="hub-input w-full" /></label>
      <label className="mt-4 block text-small">SEO description<textarea name="seoDescription" defaultValue={editing.seoDescription ?? ""} className="hub-input w-full" /></label>
      {error && <p role="alert" className="mt-3 text-danger">{error}</p>}
      <div className="mt-5 flex gap-4"><button type="submit" disabled={pending} className="bg-aqua px-4 py-2 text-porcelain">{pending ? "Saving…" : "Save improvements"}</button><button type="button" onClick={() => setEditing(null)}>Cancel</button></div>
    </form></div>}
  </div>;
}
