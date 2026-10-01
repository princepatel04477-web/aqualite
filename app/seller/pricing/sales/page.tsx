import Link from "next/link";

import { CatalogNav } from "@/components/hub/catalog/CatalogNav";
import { inventoryData } from "@/lib/hub/catalog/rows";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Sale prices — Seller Hub" };
export const dynamic = "force-dynamic";
export default async function SalePricesPage() {
  const { rows } = await inventoryData();
  const scheduled = rows.filter((row) => row.salePricePaise !== null && row.saleStartsAt && row.saleEndsAt);
  return <div><p className="font-mono text-eyebrow uppercase text-aqua">Pricing / Sales</p><h1 className="mt-2 font-display text-h2">Sale windows.</h1>
    <CatalogNav current="/seller/pricing/sales" /><p className="mb-5 text-small text-mist">Sale prices begin at the start instant and end just before the end instant. Edit the window from the pricing table.</p>
    <div className="overflow-x-auto border border-hairline bg-porcelain"><table className="w-full text-left text-small"><thead className="border-b border-hairline font-mono text-eyebrow uppercase text-mist"><tr><th className="p-3">SKU</th><th>Regular</th><th>Sale</th><th>Starts</th><th>Ends</th><th>Effective now</th><th /></tr></thead><tbody>{scheduled.map((row) => <tr key={row.id} className="border-b border-hairline"><td className="p-3 font-mono">{row.sku}</td><td>{formatINR(row.pricePaise)}</td><td>{formatINR(row.salePricePaise ?? 0)}</td><td className="font-mono">{row.saleStartsAt}</td><td className="font-mono">{row.saleEndsAt}</td><td>{formatINR(row.effectivePaise)}</td><td><Link href="/seller/pricing" className="text-aqua">Edit ↗</Link></td></tr>)}</tbody></table>
      {!scheduled.length && <p className="p-6 text-small text-mist">No sale windows are scheduled.</p>}</div>
  </div>;
}
