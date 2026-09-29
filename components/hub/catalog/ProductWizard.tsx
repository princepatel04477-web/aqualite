"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { APPROVED_FEATURES, COLOR_FAMILIES, CATEGORIES, GENDERS, SIZE_CHART } from "@/content/catalog";
import { publishDraftAction, saveDraftAction } from "@/lib/hub/catalog/actions";
import { draftQuality, publishError, stepError, STEPS, type ProductDraft } from "@/lib/hub/catalog/schema";
import { formatINR } from "@/lib/money";

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80); }
function skuFor(product: string, color: string, size: number) { return `${product}-${color}-${String(size).replace(".", "-")}`.toUpperCase().slice(0, 60); }

export function ProductWizard({ initial }: { initial: ProductDraft }) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState("");
  const [bulkOffer, setBulkOffer] = useState({ mrp: "", price: "", stock: "" });
  const [status, setStatus] = useState("Draft ready");
  const [publishing, startPublishing] = useTransition();
  const latest = useRef(draft);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const saved = useRef("");
  const score = draftQuality(draft);
  function change(next: ProductDraft) { latest.current = next; setDraft(next); setStatus("Unsaved changes"); }
  function save(next: ProductDraft): Promise<boolean> {
    let success = false;
    queue.current = queue.current.catch(() => undefined).then(async () => {
      setStatus("Saving draft…");
      const result = await saveDraftAction(next);
      if (result.ok) { saved.current = JSON.stringify(next); success = true; setStatus("Draft saved to your account"); }
      else { setError(result.error.message); setStatus("Could not save draft"); }
    });
    return queue.current.then(() => success);
  }
  useEffect(() => {
    const serialized = JSON.stringify(draft);
    if (serialized === saved.current) return;
    const timer = window.setTimeout(() => void save(latest.current), 600);
    return () => window.clearTimeout(timer);
  // Saves on every field change, serialised so an older response never overwrites a newer step.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);
  function go(next: number) {
    if (next > draft.step) {
      const problem = stepError(draft, draft.step);
      if (problem) { setError(problem); return; }
    }
    setError("");
    const updated = { ...draft, step: next };
    change(updated);
    void save(updated);
  }
  function addColor() {
    const id = crypto.randomUUID();
    const number = draft.colorways.length + 1;
    const name = `Colour ${number}`;
    change({ ...draft, colorways: [...draft.colorways, { id, name, slug: `colour-${number}`, swatch: "red", family: "red", sizes: [], offers: [], images: [] }] });
  }
  function updateColor(index: number, patch: Partial<ProductDraft["colorways"][number]>) {
    change({ ...draft, colorways: draft.colorways.map((color, n) => n === index ? { ...color, ...patch } : color) });
  }
  function prepareOffers() {
    change({ ...draft, colorways: draft.colorways.map((color) => ({ ...color,
      offers: color.sizes.map((size) => color.offers.find((offer) => offer.sizeUk === size) ?? { sizeUk: size, sku: skuFor(draft.slug, color.slug, size), mrpPaise: 0, pricePaise: 0, stock: 0 }),
    })) });
  }
  function changeOffer(colorIndex: number, sizeUk: number, patch: Partial<ProductDraft["colorways"][number]["offers"][number]>) {
    const color = draft.colorways[colorIndex]; if (!color) return;
    updateColor(colorIndex, { offers: color.offers.map((offer) => offer.sizeUk === sizeUk ? { ...offer, ...patch } : offer) });
  }
  async function upload(index: number, files: FileList | File[]) {
    const color = draft.colorways[index]; if (!color) return;
    setStatus("Uploading images…");
    for (const file of Array.from(files)) {
      const body = new FormData(); body.set("file", file);
      try {
        const response = await fetch("/api/seller/images", { method: "POST", body });
        const json: unknown = await response.json();
        if (!response.ok || !json || typeof json !== "object" || !("src" in json) || typeof json.src !== "string" || !("width" in json) || typeof json.width !== "number" || !("height" in json) || typeof json.height !== "number") { setError("Image upload failed. Try another file."); return; }
        const current = latest.current.colorways[index]; if (!current) return;
        const updated = { ...latest.current, colorways: latest.current.colorways.map((row, n) => n === index ? { ...row, images: [...row.images, { src: json.src as string, width: json.width as number, height: json.height as number, alt: "", role: row.images.length ? "detail" as const : "primary" as const }] } : row) };
        change(updated);
      } catch { setError("Could not reach the image service. Try again."); return; }
    }
    setStatus("Images uploaded; add alt text and save.");
  }
  function updateImage(colorIndex: number, imageIndex: number, patch: Partial<ProductDraft["colorways"][number]["images"][number]>) {
    const color = draft.colorways[colorIndex]; if (!color) return;
    updateColor(colorIndex, { images: color.images.map((image, index) => index === imageIndex ? { ...image, ...patch } : image) });
  }
  function publish() {
    const problem = publishError(draft);
    if (problem) { setError(problem); return; }
    startPublishing(async () => {
      if (!await save(draft)) return;
      const result = await publishDraftAction(draft.id);
      if (!result.ok) { setError(result.error.message); return; }
      router.push(`/seller/catalog/inventory?published=${result.data.slug}`);
      router.refresh();
    });
  }
  return <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
    <nav aria-label="Product steps" className="self-start border border-hairline bg-porcelain p-3">
      {STEPS.map((label, index) => <button key={label} onClick={() => index <= draft.step ? go(index) : undefined} disabled={index > draft.step} className={`relative block w-full border-b border-hairline p-3 text-left text-small disabled:opacity-40 ${index === draft.step ? "text-aqua" : ""}`}>
        {index === draft.step && <motion.span layoutId="active-step" className="absolute inset-y-0 left-0 w-1 bg-aqua" />}
        <span className="mr-2 font-mono">{String(index + 1).padStart(2, "0")}</span>{label}
      </button>)}
      <p className="mt-4 px-3 font-mono text-eyebrow uppercase text-mist">{status}</p>
    </nav>
    <section className="min-h-[560px] border border-hairline bg-porcelain p-5 sm:p-8">
      <div className="mb-6 flex items-end justify-between"><div><p className="font-mono text-eyebrow uppercase text-aqua">Step {draft.step + 1} / 6</p><h2 className="mt-2 font-display text-h3">{STEPS[draft.step]}</h2></div><div className="text-right"><span className="font-mono text-h3 text-aqua">{score.score}/100</span><p className="text-eyebrow text-mist">Listing quality</p></div></div>
      {draft.step === 0 && <div className="grid gap-4 sm:grid-cols-2">
        <label>Product name<input className="hub-input w-full" value={draft.name} onChange={(event) => change({ ...draft, name: event.target.value, slug: draft.slug === slugify(draft.name) ? slugify(event.target.value) : draft.slug })} /></label>
        <label>URL slug<input className="hub-input w-full font-mono" value={draft.slug} onChange={(event) => change({ ...draft, slug: slugify(event.target.value) })} /></label>
        <label>Category<select className="hub-input w-full" value={draft.category} onChange={(event) => change({ ...draft, category: event.target.value as ProductDraft["category"] })}>{CATEGORIES.map((row) => <option key={row.slug} value={row.slug}>{row.name}</option>)}</select></label>
        <label>Gender<select className="hub-input w-full" value={draft.gender} onChange={(event) => change({ ...draft, gender: event.target.value as ProductDraft["gender"], colorways: [] })}>{GENDERS.map((row) => <option key={row} value={row}>{row}</option>)}</select></label>
        <label className="sm:col-span-2">Subtitle<input className="hub-input w-full" value={draft.subtitle} onChange={(event) => change({ ...draft, subtitle: event.target.value })} /></label>
        <label>Upper material<input className="hub-input w-full" value={draft.materialUpper} onChange={(event) => change({ ...draft, materialUpper: event.target.value })} /></label>
        <label>Sole material<input className="hub-input w-full" value={draft.materialSole} onChange={(event) => change({ ...draft, materialSole: event.target.value })} /></label>
        <label>HSN (4–8 digits)<input className="hub-input w-full font-mono" value={draft.hsn} inputMode="numeric" onChange={(event) => change({ ...draft, hsn: event.target.value.replace(/\D/g, "").slice(0, 8) })} /></label>
        <fieldset className="sm:col-span-2"><legend>Approved features</legend><div className="mt-2 flex flex-wrap gap-3">{APPROVED_FEATURES.map((feature) => <label key={feature} className="flex items-center gap-1 text-small"><input type="checkbox" checked={draft.features.includes(feature)} onChange={() => change({ ...draft, features: draft.features.includes(feature) ? draft.features.filter((row) => row !== feature) : [...draft.features, feature] })} />{feature}</label>)}</div></fieldset>
      </div>}
      {draft.step === 1 && <div><button onClick={addColor} className="border border-aqua px-4 py-2 text-small text-aqua">+ Add colourway</button>
        {draft.colorways.map((color, index) => <div key={color.id} className="mt-4 border border-hairline p-4"><div className="grid gap-3 sm:grid-cols-3"><label>Name<input className="hub-input w-full" value={color.name} onChange={(event) => updateColor(index, { name: event.target.value, slug: slugify(event.target.value) })} /></label>
          <label>URL colour slug<input className="hub-input w-full" value={color.slug} onChange={(event) => updateColor(index, { slug: slugify(event.target.value) })} /></label>
          <label>Colour family<select className="hub-input w-full" value={color.family} onChange={(event) => updateColor(index, { family: event.target.value as typeof color.family, swatch: event.target.value })}>{COLOR_FAMILIES.map((family) => <option key={family}>{family}</option>)}</select></label></div>
          <p className="mt-3 text-small">Size run · UK <button className="ml-2 text-aqua underline" onClick={() => updateColor(index, { sizes: SIZE_CHART[draft.gender].map((row) => row.uk) })}>Select full preset</button></p>
          <div className="mt-2 flex flex-wrap gap-2">{SIZE_CHART[draft.gender].map((size) => <button key={size.uk} aria-pressed={color.sizes.includes(size.uk)} onClick={() => updateColor(index, { sizes: color.sizes.includes(size.uk) ? color.sizes.filter((value) => value !== size.uk) : [...color.sizes, size.uk].sort((a, b) => a - b) })} className={`border px-3 py-2 font-mono text-small ${color.sizes.includes(size.uk) ? "border-aqua bg-aqua/10" : "border-hairline"}`}>{size.label}</button>)}</div>
          <button onClick={() => change({ ...draft, colorways: draft.colorways.filter((_, n) => n !== index) })} className="mt-3 text-small text-danger">Remove colourway</button></div>)}
      </div>}
      {draft.step === 2 && <div><p className="mb-4 text-small text-mist">Every cell has its own SKU, MRP, price and initial stock. Money is saved in paise.</p>
        {draft.colorways.map((color, index) => <div key={color.id} className="mb-6"><h3 className="font-medium">{color.name}</h3>
          <div className="my-3 flex flex-wrap items-end gap-2 text-small">
            <label>Bulk MRP ₹<input type="number" min="0.01" step="0.01" aria-label="Bulk MRP in rupees" className="hub-input w-24" value={bulkOffer.mrp} onChange={(event) => setBulkOffer({ ...bulkOffer, mrp: event.target.value })} /></label>
            <label>Bulk price ₹<input type="number" min="0.01" step="0.01" aria-label="Bulk price in rupees" className="hub-input w-24" value={bulkOffer.price} onChange={(event) => setBulkOffer({ ...bulkOffer, price: event.target.value })} /></label>
            <label>Stock / size<input type="number" min="0" aria-label="Bulk stock per size" className="hub-input w-24" value={bulkOffer.stock} onChange={(event) => setBulkOffer({ ...bulkOffer, stock: event.target.value })} /></label>
            <button onClick={() => { const mrp = Number(bulkOffer.mrp); const price = Number(bulkOffer.price); const stock = Number(bulkOffer.stock); if (!bulkOffer.mrp || !bulkOffer.price || !bulkOffer.stock || !Number.isFinite(mrp) || !Number.isFinite(price) || !Number.isInteger(stock) || price <= 0 || price > mrp || stock < 0) { setError("Enter a valid MRP, price and stock before bulk filling."); return; } updateColor(index, { offers: color.offers.map((offer) => ({ ...offer, mrpPaise: Math.round(mrp * 100), pricePaise: Math.round(price * 100), stock })) }); }} className="border border-aqua px-3 py-2 text-aqua">Fill this colourway</button>
          </div>
          <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-small"><thead className="font-mono text-eyebrow uppercase text-mist"><tr><th>UK</th><th>SKU</th><th>MRP ₹</th><th>Price ₹</th><th>Stock</th></tr></thead><tbody>{color.offers.map((offer) => <tr key={offer.sizeUk} className="border-t border-hairline"><td className="p-2">{offer.sizeUk}</td><td><input className="hub-input w-44 font-mono" value={offer.sku} onChange={(event) => changeOffer(index, offer.sizeUk, { sku: event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "") })} /></td><td><input className="hub-input w-24" type="number" min="0" step="0.01" value={offer.mrpPaise / 100} onChange={(event) => changeOffer(index, offer.sizeUk, { mrpPaise: Math.round(Number(event.target.value) * 100) })} /></td><td><input className="hub-input w-24" type="number" min="0" step="0.01" value={offer.pricePaise / 100} onChange={(event) => changeOffer(index, offer.sizeUk, { pricePaise: Math.round(Number(event.target.value) * 100) })} /></td><td><input className="hub-input w-20" type="number" min="0" value={offer.stock} onChange={(event) => changeOffer(index, offer.sizeUk, { stock: Number(event.target.value) })} /></td></tr>)}</tbody></table></div>
        </div>)}
      </div>}
      {draft.step === 3 && <div>{draft.colorways.map((color, index) => <div key={color.id} className="mb-6 border-b border-hairline pb-5"><h3 className="font-medium">{color.name}</h3><label onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void upload(index, event.dataTransfer.files); }} className="my-3 block border border-dashed border-aqua p-4 text-small text-aqua">Drop images here or select files<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => event.target.files && void upload(index, event.target.files)} className="mt-2 block" /></label>
        <div className="grid gap-3 sm:grid-cols-2">{color.images.map((image, imageIndex) => <div key={image.src} className="flex gap-3 border border-hairline p-2"><img src={image.src} alt="" className="h-24 w-20 object-cover" /><div className="min-w-0 flex-1"><input aria-label={`Alt text ${imageIndex + 1}`} className="hub-input w-full" placeholder="Describe this image" value={image.alt} onChange={(event) => updateImage(index, imageIndex, { alt: event.target.value })} /><select aria-label="Image role" value={image.role} onChange={(event) => { const role = event.target.value as typeof image.role; updateColor(index, { images: color.images.map((row, n) => ({ ...row, role: n === imageIndex ? role : role === "primary" && row.role === "primary" ? "detail" : row.role })) }); }} className="hub-input"><option value="primary">Primary</option><option value="secondary">Secondary</option><option value="detail">Detail</option><option value="sole">Sole</option><option value="on_foot">On foot</option></select><div className="mt-2 flex gap-2 text-small text-aqua"><button onClick={() => { if (imageIndex > 0) { const images = [...color.images]; [images[imageIndex - 1], images[imageIndex]] = [images[imageIndex]!, images[imageIndex - 1]!]; updateColor(index, { images }); } }}>↑</button><button onClick={() => { if (imageIndex + 1 < color.images.length) { const images = [...color.images]; [images[imageIndex + 1], images[imageIndex]] = [images[imageIndex]!, images[imageIndex + 1]!]; updateColor(index, { images }); } }}>↓</button><button onClick={() => updateColor(index, { images: color.images.filter((_, n) => n !== imageIndex) })}>Remove</button></div></div></div>)}</div></div>)}</div>}
      {draft.step === 4 && <div className="grid gap-4"><label>Description <span className="text-small text-mist">{draft.description.length} / 300 recommended characters</span><textarea className="hub-input min-h-36 w-full" value={draft.description} onChange={(event) => change({ ...draft, description: event.target.value })} /></label>
        <label>Care instructions<textarea className="hub-input w-full" value={draft.care} onChange={(event) => change({ ...draft, care: event.target.value })} /></label>
        <label>Search keywords · comma separated<input className="hub-input w-full" value={draft.keywords.join(", ")} onChange={(event) => change({ ...draft, keywords: event.target.value.split(",").map((word) => word.trim()).filter(Boolean) })} /></label>
        <label>SEO title<input className="hub-input w-full" value={draft.seoTitle} onChange={(event) => change({ ...draft, seoTitle: event.target.value })} /></label><label>SEO description<textarea className="hub-input w-full" value={draft.seoDescription} onChange={(event) => change({ ...draft, seoDescription: event.target.value })} /></label>
      </div>}
      {draft.step === 5 && <div><p className="text-small text-mist">{draft.name} · {draft.colorways.length} colourways · {draft.colorways.reduce((sum, color) => sum + color.offers.length, 0)} sizes · from {formatINR(Math.min(...draft.colorways.flatMap((row) => row.offers.map((offer) => offer.pricePaise))))}</p>
        <ul className="mt-5 divide-y divide-hairline">{score.items.map((item) => <li key={item.label} className="flex justify-between gap-3 py-3 text-small"><span className={item.passed ? "text-success" : "text-warning"}>{item.passed ? "✓" : "○"} {item.label}</span><span className="font-mono">{item.passed ? "+" : ""}{item.passed ? item.points : 0} / {item.points}</span>{!item.passed && <button onClick={() => go(item.step)} className="text-aqua underline">Fix ↗</button>}</li>)}</ul>
        {publishError(draft) && <p className="mt-4 text-danger">Publish blocked: {publishError(draft)}</p>}
        <button disabled={publishing || !!publishError(draft)} onClick={publish} className="mt-6 bg-aqua px-5 py-3 font-medium text-porcelain disabled:opacity-40">{publishing ? "Publishing…" : "Publish listing"}</button>
      </div>}
      {error && <p role="alert" className="mt-5 text-small text-danger">{error}</p>}
      <div className="mt-8 flex items-center gap-4 border-t border-hairline pt-5"><button disabled={draft.step === 0} onClick={() => go(draft.step - 1)} className="text-small text-aqua disabled:opacity-40">← Previous</button>
        {draft.step < 5 && <button onClick={() => { if (draft.step === 1) prepareOffers(); const next = draft.step === 1 ? { ...latest.current, step: 2 } : { ...draft, step: draft.step + 1 }; const problem = stepError(next, draft.step); if (problem) { setError(problem); return; } change(next); void save(next); }} className="ml-auto bg-aqua px-5 py-2 text-small text-porcelain">Continue →</button>}
        <button onClick={() => void save(draft)} className="text-small text-aqua underline">Save draft</button>
      </div>
    </section>
  </div>;
}
