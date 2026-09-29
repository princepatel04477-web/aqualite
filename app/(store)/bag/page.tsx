import Link from "next/link";

import { readCartId } from "@/lib/cart/cookie";
import { getCart } from "@/lib/store/engine";
import { formatINR } from "@/lib/money";
import { Heading } from "@/components/ui/Heading";
import { BagTotals } from "@/components/cart/BagTotals";

export const metadata = { title: "Bag" };

export default async function BagPage() {
  const cart = await getCart(await readCartId());
  return (
    <div className="page-wrap py-16">
      <Heading level={1}>
        Your <em>bag</em>
      </Heading>
      {cart.lines.length === 0 ? (
        <p className="mt-6 text-mist">
          Nothing here yet. <Link href="/shop" className="link-draw">Shop the edit</Link>
        </p>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-12">
          <ul className="divide-y divide-hairline lg:col-span-7">
            {cart.lines.map((line) => (
              <li key={line.variantId} className="flex gap-4 py-5">
                <div className="stage h-28 w-24 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={line.image} alt="" className="h-full w-full object-cover" />
                </div>
                <div>
                  <p className="font-medium">{line.productName}</p>
                  <p className="font-mono text-size text-mist">{line.colorwayName} · UK {line.sizeLabel} · Qty {line.qty}</p>
                  <p className="mt-2 tabular">{formatINR(line.lineTotalPaise)}</p>
                </div>
              </li>
            ))}
          </ul>
          <BagTotals />
        </div>
      )}
    </div>
  );
}
