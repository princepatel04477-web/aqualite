import { redirect } from "next/navigation";

import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { Heading } from "@/components/ui/Heading";
import { readCartId } from "@/lib/cart/cookie";
import { isDemoPayments } from "@/lib/env";
import { getCart } from "@/lib/store/engine";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const cart = await getCart(await readCartId());
  if (cart.lines.length === 0) redirect("/bag");
  return (
    <div className="page-wrap py-10">
      <Heading level={1} size="h2">
        Checkout, <em>quietly</em>.
      </Heading>
      <p className="mt-3 max-w-measure text-mist">Prices come from the catalogue. This page cannot change them.</p>
      <div className="mt-10">
        <CheckoutForm summary={cart} demoPayments={isDemoPayments()} />
      </div>
    </div>
  );
}
