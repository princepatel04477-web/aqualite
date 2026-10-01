import Link from "next/link";
import { redirect } from "next/navigation";

import { ProductCard } from "@/components/product/ProductCard";
import { Heading } from "@/components/ui/Heading";
import { readSession } from "@/lib/auth/session";
import { allCards } from "@/lib/catalog/queries";
import { wishlistOf } from "@/lib/store/engine";

export const metadata = { title: "Wishlist" };
export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const session = await readSession();
  if (!session) redirect("/login?next=/account/wishlist");

  const [wishlist, cards] = await Promise.all([wishlistOf(session.id), allCards()]);
  const savedCards = wishlist.flatMap((item) => {
    const match = cards.find(
      (card) =>
        card.productId === item.productId &&
        card.colorways.some((cw) => `cw_${card.slug.replaceAll("-", "_")}_${cw.slug}` === item.colorwayId || cw.slug === card.colorwaySlug),
    );
    return match ? [match] : [];
  });

  return (
    <div className="page-wrap py-16">
      <Link href="/account" className="font-mono text-eyebrow uppercase text-mist hover:text-aqua">
        ← Account
      </Link>
      <Heading level={1} className="mt-4">
        Saved <em>pairs</em>
      </Heading>
      {savedCards.length === 0 ? (
        <p className="mt-6 text-mist">
          Your wishlist is empty.{" "}
          <Link href="/shop" className="link-draw">
            Explore the edit
          </Link>
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-gutter lg:grid-cols-3">
          {savedCards.map((card) => (
            <ProductCard key={`${card.productId}-${card.colorwaySlug}`} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
