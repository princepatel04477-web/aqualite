import Link from "next/link";
import { redirect } from "next/navigation";

import { Heading } from "@/components/ui/Heading";
import { readSession } from "@/lib/auth/session";
import { listOrders } from "@/lib/store/engine";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const session = await readSession();
  if (!session) redirect("/login?next=/account");
  const orders = (await listOrders()).filter((order) => order.userId === session.id);
  const latest = orders[0];
  return (
    <div className="page-wrap py-16">
      <Heading level={1}>
        Hello{session.fullName ? `, ${session.fullName.split(" ")[0]}` : ""}.
      </Heading>
      <div className="mt-8 flex flex-wrap gap-4 font-mono text-eyebrow uppercase text-mist">
        <Link href="/account/orders" className="link-draw">Orders</Link>
        <Link href="/account/addresses" className="link-draw">Addresses</Link>
        <Link href="/account/profile" className="link-draw">Profile</Link>
        {session.role === "admin" ? <Link href="/admin" className="text-aqua">Admin</Link> : null}
      </div>
      {latest ? (
        <article className="mt-10 border border-hairline p-6">
          <p className="font-mono text-eyebrow uppercase text-aqua">{latest.number}</p>
          <p className="mt-2 capitalize">{latest.status.replaceAll("_", " ")}</p>
          <p className="tabular">{formatINR(latest.totalPaise)}</p>
          <Link href={`/account/orders/${latest.number}`} className="mt-4 inline-block link-draw">View order</Link>
        </article>
      ) : (
        <p className="mt-10 text-mist">No orders yet.</p>
      )}
    </div>
  );
}
