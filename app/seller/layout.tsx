import Link from "next/link";

import { requireAdmin } from "@/lib/admin/guard";
import { Wordmark } from "@/components/ui/Wordmark";

export const metadata = { title: "Seller Hub" };

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="seller-hub min-h-dvh font-body">
      <header className="border-b border-hairline bg-porcelain">
        <div className="page-wrap flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-5"><Wordmark /><span className="border-l border-hairline pl-5 font-mono text-eyebrow uppercase tracking-widest text-mist">Seller Hub</span></div>
          <nav aria-label="Seller navigation" className="flex items-center gap-5 text-small font-medium">
            <Link href="/seller" aria-current="page" className="text-aqua">Overview</Link>
            <Link href="/admin/inventory">Inventory</Link>
            <Link href="/admin/orders">Orders</Link>
            <Link href="/">Visit store ↗</Link>
          </nav>
        </div>
      </header>
      <main className="page-wrap pb-24 pt-10">{children}</main>
    </div>
  );
}
