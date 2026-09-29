import Link from "next/link";

import { requireSeller } from "@/lib/hub/guard";
import { SellerNav } from "@/components/seller/SellerNav";

export const metadata = { title: "Seller Hub" };

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  await requireSeller();
  return (
    <div className="min-h-[100dvh] bg-ivory">
      <header className="sticky top-0 z-header flex h-14 items-center justify-between bg-red px-6 text-on-red">
        <div className="flex items-baseline gap-3">
          <Link href="/seller" className="font-display text-logo leading-none">
            Aqualite
          </Link>
          <span className="font-mono text-hub-label uppercase opacity-90">Seller Hub</span>
        </div>
        <div className="flex items-center gap-4 font-mono text-hub-label uppercase">
          <Link href="/" className="opacity-90 hover:opacity-100">
            View store
          </Link>
          <Link href="/admin" className="opacity-90 hover:opacity-100">
            Desk
          </Link>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1400px] gap-6 px-6 py-6">
        <SellerNav />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
