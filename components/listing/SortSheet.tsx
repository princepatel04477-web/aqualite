"use client";

import { Sheet } from "@/components/ui/Sheet";
import {
  SORT_LABELS,
  listingHref,
  type SortKey,
  type ListingParams,
} from "@/lib/catalog/filters";
import { cn } from "@/lib/cn";

const ORDER: SortKey[] = ["featured", "new", "price-asc", "price-desc"];

/**
 * Sort bottom sheet (M07): small sheet with radio rows; picking a sort
 * applies it immediately and navigates to the shareable URL.
 */
export function SortSheet({
  open,
  onClose,
  base,
  params,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  base: string;
  params: ListingParams;
  onNavigate: (href: string) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} label="Sort">
      <div role="radiogroup" aria-label="Sort pairs">
        {ORDER.map((sort) => {
          const selected = params.sort === sort;
          return (
            <button
              key={sort}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                onNavigate(listingHref(base, params, { sort }));
                onClose();
              }}
              className="flex h-12 w-full items-center justify-between border-b border-hairline/60 font-body text-small last:border-b-0"
            >
              {SORT_LABELS[sort]}
              <span
                aria-hidden="true"
                className={cn(
                  "grid h-5 w-5 place-items-center rounded-pill border",
                  selected ? "border-aqua" : "border-hairline",
                )}
              >
                {selected ? (
                  <span className="h-2.5 w-2.5 rounded-pill bg-aqua" />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
