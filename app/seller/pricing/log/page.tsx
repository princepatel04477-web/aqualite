import Link from "next/link";
import { CatalogNav } from "@/components/hub/catalog/CatalogNav";
import { inventoryData } from "@/lib/hub/catalog/rows";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Price change log — Seller Hub" };
export const dynamic = "force-dynamic";
export default async function PriceLogPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { priceChanges } = await inventoryData();
  const query = await searchParams;
  const page = Math.max(1, Math.min(100000, Number.parseInt(query.page ?? "1", 10) || 1));
  return <div><p className="font-mono text-eyebrow uppercase text-aqua">Pricing / Audit</p><h1 className="mt-2 font-display text-h2">Every change, accounted for.</h1>
    <CatalogNav current="/seller/pricing/log" />
    <div className="overflow-x-auto border border-hairline bg-porcelain"><table className="w-full text-left text-small"><thead className="border-b border-hairline font-mono text-eyebrow uppercase text-mist"><tr><th className="p-3">Changed</th><th>SKU</th><th>Actor</th><th>Price</th><th>MRP</th><th>Sale</th></tr></thead><tbody>{priceChanges.slice((page - 1) * 100, page * 100).map((row) => <tr key={row.id} className="border-b border-hairline"><td className="p-3 font-mono">{new Date(row.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td><td className="font-mono">{row.sku}</td><td className="font-mono">{row.actor}</td><td>{formatINR(row.before.pricePaise)} → {formatINR(row.after.pricePaise)}</td><td>{formatINR(row.before.mrpPaise)} → {formatINR(row.after.mrpPaise)}</td><td>{row.before.salePricePaise === null ? "—" : formatINR(row.before.salePricePaise)} → {row.after.salePricePaise === null ? "—" : formatINR(row.after.salePricePaise)}</td></tr>)}</tbody></table>
    {!priceChanges.length && <p className="p-6 text-small text-mist">No price changes recorded.</p>}</div><nav className="mt-4 flex gap-4 text-small" aria-label="Price log pages">{page > 1 && <Link className="text-aqua" href={`/seller/pricing/log?page=${page - 1}`}>← Previous</Link>}<span>Page {page} / {Math.max(1, Math.ceil(priceChanges.length / 100))}</span>{page * 100 < priceChanges.length && <Link className="text-aqua" href={`/seller/pricing/log?page=${page + 1}`}>Next →</Link>}</nav>
  </div>;
}
