"use client";

import { IconHeart } from "@/components/ui/Icons";
import { useWishlist } from "@/lib/account/useWishlist";
import { cn } from "@/lib/cn";

/**
 * Save-to-wishlist heart on the touch card (M07): 44px hit area,
 * 20px glyph, persisted locally until the account wishlist API lands.
 */
export function WishlistHeart({
  productId,
  colorwaySlug,
  name,
}: {
  productId: string;
  colorwaySlug: string;
  name: string;
}) {
  const { saved, toggle } = useWishlist(productId, colorwaySlug);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from saved` : `Save ${name}`}
      className="-m-1 grid h-11 w-11 place-items-center text-foam"
      onClick={toggle}
    >
      <IconHeart
        filled={saved}
        className={cn("h-5 w-5", saved ? "text-aqua" : "text-foam")}
      />
    </button>
  );
}
