import Link from "next/link";

import { Heading } from "@/components/ui/Heading";

export default function NotFound() {
  return (
    <div className="page-wrap flex min-h-[70dvh] flex-col justify-center py-20">
      <Heading level={1}>
        Lost a <em>shoe</em>?
      </Heading>
      <p className="mt-4 max-w-measure text-mist">That page isn’t here. The pairs are.</p>
      <div className="mt-8 flex flex-wrap gap-4">
        <Link href="/shop/men" className="link-draw">Men</Link>
        <Link href="/shop/women" className="link-draw">Women</Link>
        <Link href="/shop" className="link-draw">Shop</Link>
        <Link href="/contact" className="link-draw">Contact</Link>
      </div>
    </div>
  );
}
