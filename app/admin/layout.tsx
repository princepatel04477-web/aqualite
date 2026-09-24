import Link from "next/link";

import { requireAdmin } from "@/lib/admin/guard";
import { Wordmark } from "@/components/ui/Wordmark";

export const metadata = { title: "Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-[100dvh]">
      <header className="page-wrap flex h-16 items-center justify-between border-b border-hairline">
        <Wordmark />
        <nav className="flex gap-4 font-mono text-eyebrow uppercase text-mist">
          <Link href="/admin">Desk</Link>
          <Link href="/admin/orders">Orders</Link>
          <Link href="/admin/inventory">Inventory</Link>
          <Link href="/">Store</Link>
        </nav>
      </header>
      <div className="page-wrap py-10">{children}</div>
    </div>
  );
}
