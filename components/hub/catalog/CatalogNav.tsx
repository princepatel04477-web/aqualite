import Link from "next/link";

const links = [
  ["All inventory", "/seller/catalog/inventory"], ["Add product", "/seller/catalog/add"],
  ["Variations", "/seller/catalog/variations"], ["Images", "/seller/catalog/images"],
  ["Listing quality", "/seller/catalog/quality"], ["Restock planning", "/seller/inventory/planning"],
  ["Stock ledger", "/seller/inventory/ledger"], ["Pricing", "/seller/pricing"],
  ["Sales", "/seller/pricing/sales"], ["Price log", "/seller/pricing/log"],
] as const;

export function CatalogNav({ current }: { current: string }) {
  return <nav aria-label="Catalogue tools" className="my-6 flex flex-wrap gap-2 border-b border-hairline pb-5 text-small">
    {links.map(([label, href]) => <Link key={href} href={href} aria-current={href === current ? "page" : undefined} className={`border px-3 py-2 transition-colors duration-quick ${href === current ? "border-aqua bg-aqua/10 text-aqua" : "border-hairline hover:border-aqua"}`}>{label}</Link>)}
  </nav>;
}
