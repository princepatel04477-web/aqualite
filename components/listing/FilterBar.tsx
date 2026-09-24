"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { FilterSheet } from "@/components/listing/FilterSheet";
import { SortSheet } from "@/components/listing/SortSheet";
import { type ListingParams } from "@/lib/catalog/filters";
import type { ProductCardModel } from "@/lib/commerce/types";

/**
 * Sticky "Filter · Sort" bar (M07, mobile only): 48px, sticks just
 * below the header and lifts to the top edge when the header hides on
 * scroll down (tracked with an IntersectionObserver on the header
 * element — behaviour only, no layout decisions pre-hydration).
 */
export function FilterBar({
  base,
  params,
  scope,
}: {
  base: string;
  params: ListingParams;
  scope: ProductCardModel[];
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<"filter" | "sort" | null>(null);
  const [headerGone, setHeaderGone] = useState(false);

  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;
    const observer = new IntersectionObserver(([entry]) => {
      setHeaderGone(!(entry?.isIntersecting ?? true));
    });
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  const activeCount =
    params.sizes.length +
    params.colors.length +
    (params.priceMin !== undefined || params.priceMax !== undefined ? 1 : 0) +
    (params.q ? 1 : 0);

  // Filter navigations keep the scroll position — the grid re-renders
  // in place instead of jumping to the top of a "new" page.
  const navigate = (href: string) => {
    router.push(href, { scroll: false });
  };

  return (
    <>
      <div
        className="sticky z-sticky transition-[top] duration-quick ease-tide lg:hidden"
        style={{ top: headerGone ? "0px" : "var(--header-h)" }}
      >
        <div className="flex h-12 items-stretch border-y border-hairline bg-abyss/95">
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-2 font-mono text-eyebrow uppercase text-foam"
            aria-haspopup="dialog"
            aria-expanded={sheet === "filter"}
            onClick={() => setSheet("filter")}
          >
            Filter
            {activeCount > 0 ? (
              <span className="grid h-5 min-w-5 place-items-center rounded-pill bg-aqua px-1 font-mono text-tag text-abyss">
                {activeCount}
              </span>
            ) : null}
          </button>
          <span className="w-px bg-hairline" aria-hidden="true" />
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-2 font-mono text-eyebrow uppercase text-foam"
            aria-haspopup="dialog"
            aria-expanded={sheet === "sort"}
            onClick={() => setSheet("sort")}
          >
            Sort
            {params.sort !== "featured" ? (
              <span className="font-mono text-tag uppercase text-aqua">
                {params.sort === "new"
                  ? "New"
                  : params.sort === "price-asc"
                    ? "₹↑"
                    : "₹↓"}
              </span>
            ) : null}
          </button>
        </div>
      </div>
      <FilterSheet
        open={sheet === "filter"}
        onClose={() => setSheet(null)}
        base={base}
        params={params}
        scope={scope}
        onNavigate={navigate}
      />
      <SortSheet
        open={sheet === "sort"}
        onClose={() => setSheet(null)}
        base={base}
        params={params}
        onNavigate={navigate}
      />
    </>
  );
}
