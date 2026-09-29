"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CatalogProduct } from "@/content/catalog";
import { saveImagesAction } from "@/lib/hub/catalog/actions";

export function ImageManager({ products }: { products: CatalogProduct[] }) {
  const router = useRouter();
  const [selection, setSelection] = useState("");
  const [images, setImages] = useState<CatalogProduct["colorways"][number]["images"]>([]);
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();
  const colors = products.flatMap((product) => product.colorways.map((color) => ({ product, color })));
  const chosen = colors.find(({ color }) => color.id === selection);
  async function upload(files: FileList) {
    for (const file of Array.from(files)) {
      try {
        const form = new FormData(); form.set("file", file);
        const response = await fetch("/api/seller/images", { method: "POST", body: form });
        const result: unknown = await response.json();
        if (!response.ok || !result || typeof result !== "object" || !("src" in result) || typeof result.src !== "string" || !("width" in result) || typeof result.width !== "number" || !("height" in result) || typeof result.height !== "number") { setError("Upload failed. Try again."); return; }
        setImages((prev) => [...prev, { src: result.src as string, width: result.width as number, height: result.height as number, alt: "", role: prev.some((image) => image.role === "primary") ? "detail" : "primary" }]);
      } catch { setError("Upload service unavailable."); return; }
    }
  }
  function patch(index: number, patch: Partial<typeof images[number]>) { setImages((rows) => rows.map((row, i) => i === index ? { ...row, ...patch } : row)); }
  function save() {
    if (!selection) return;
    if (images.some((row) => !row.alt.trim())) { setError("Add alt text to every image before saving."); return; }
    startTransition(async () => {
      const result = await saveImagesAction({ colorwayId: selection, images });
      if (!result.ok) setError(result.error.message); else { setError(""); router.refresh(); }
    });
  }
  return <div><label className="text-small">Product / colourway<select className="hub-input w-full max-w-lg" value={selection} onChange={(event) => { setSelection(event.target.value); setImages(colors.find(({ color }) => color.id === event.target.value)?.color.images ?? []); setError(""); }}><option value="">Choose a colourway</option>{colors.map(({ product, color }) => <option key={color.id} value={color.id}>{product.name} / {color.name}</option>)}</select></label>
    {chosen && <div className="mt-6 border border-hairline bg-porcelain p-5"><h2 className="font-display text-h3">{chosen.product.name} / {chosen.color.name}</h2>
      <label className="mt-4 block border border-dashed border-aqua p-4 text-small text-aqua">Add photographs<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={(event) => event.target.files && void upload(event.target.files)} className="mt-2 block" /></label>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{images.map((image, index) => <div key={`${image.src}-${index}`} className="border border-hairline p-3"><img src={image.src} alt="" className="h-36 w-full object-contain" />
        <label className="mt-2 block text-small">Alt text<input value={image.alt} onChange={(event) => patch(index, { alt: event.target.value })} className="hub-input w-full" /></label>
        <label className="mt-2 block text-small">Role<select value={image.role} onChange={(event) => { const role = event.target.value as typeof image.role; setImages(images.map((row, i) => ({ ...row, role: i === index ? role : role === "primary" && row.role === "primary" ? "detail" : row.role }))); }} className="hub-input w-full"><option value="primary">Primary</option><option value="secondary">Secondary</option><option value="detail">Detail</option><option value="sole">Sole</option><option value="on_foot">On foot</option></select></label>
        <div className="mt-3 flex gap-3 text-small text-aqua"><button onClick={() => { const next = [...images]; if (index > 0) { [next[index - 1], next[index]] = [next[index]!, next[index - 1]!]; setImages(next); } }}>↑ Earlier</button><button onClick={() => { const next = [...images]; if (index < next.length - 1) { [next[index + 1], next[index]] = [next[index]!, next[index + 1]!]; setImages(next); } }}>↓ Later</button><button onClick={() => setImages(images.filter((_, i) => i !== index))}>Remove</button></div>
      </div>)}</div>
      {error && <p role="alert" className="mt-4 text-danger">{error}</p>}
      <button disabled={busy} onClick={save} className="mt-5 bg-aqua px-5 py-2 text-porcelain disabled:opacity-50">{busy ? "Saving…" : "Save images"}</button>
    </div>}
  </div>;
}
