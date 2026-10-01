import Link from "next/link";

import { TrackBeacon } from "@/components/analytics/TrackBeacon";
import { CartProvider } from "@/components/cart/CartProvider";
import { Toaster } from "@/components/chrome/Toaster";
import { Wordmark } from "@/components/ui/Wordmark";
import { readCartId } from "@/lib/cart/cookie";
import { getCart } from "@/lib/store/engine";

export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const cartId = await readCartId();
  const cart = await getCart(cartId);
  return (
    <CartProvider initial={cart}>
      <div className="min-h-[100dvh]">
        <TrackBeacon />
        <header className="page-wrap flex h-[var(--header-h)] items-center justify-between border-b border-hairline">
          <Wordmark />
          <Link href="/bag" className="font-mono text-eyebrow uppercase text-mist hover:text-aqua">
            Back to bag
          </Link>
        </header>
        <main id="content">{children}</main>
        <Toaster />
      </div>
    </CartProvider>
  );
}
