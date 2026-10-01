import { CatalogNav } from "@/components/hub/catalog/CatalogNav";
import { ProductWizard } from "@/components/hub/catalog/ProductWizard";
import { requireAdmin } from "@/lib/admin/guard";
import { newDraft } from "@/lib/hub/catalog/schema";
import { readProductDrafts } from "@/lib/store/engine";

export const metadata = { title: "Add a product — Seller Hub" };
export const dynamic = "force-dynamic";
export default async function AddProduct({ searchParams }: { searchParams: Promise<{ draft?: string; new?: string }> }) {
  const admin = await requireAdmin();
  const query = await searchParams;
  const drafts = await readProductDrafts(admin.id);
  const active = query.new === "1" ? undefined : query.draft ? drafts.find((row) => row.draft.id === query.draft) : drafts[0];
  return <div><p className="font-mono text-eyebrow uppercase text-aqua">Catalog / Add product</p><h1 className="mt-2 font-display text-h2">Build a listing worth finding.</h1>
    <CatalogNav current="/seller/catalog/add" />
    {drafts.length > 0 && <div className="mb-5 border border-hairline bg-porcelain p-4 text-small"><span className="font-medium">Saved drafts</span><ul className="mt-2 flex flex-wrap gap-3">{drafts.map((row) => <li key={row.draft.id}><a className="text-aqua underline" href={`/seller/catalog/add?draft=${row.draft.id}`}>{row.draft.name || "Untitled"} · step {row.draft.step + 1}</a></li>)}</ul>
      <a href="/seller/catalog/add?new=1" className="mt-3 inline-block text-aqua">+ Start a new draft</a></div>}
    <ProductWizard key={active?.draft.id ?? "new"} initial={active?.draft ?? newDraft()} />
  </div>;
}
