import Link from "next/link";

import { ProductCard } from "@/components/product/ProductCard";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Heading } from "@/components/ui/Heading";
import { listingHref, type ListingParams } from "@/lib/catalog/filters";
import type { ListingResult } from "@/lib/commerce/types";

const PRICE_PRESETS = [
  { label: "Under ₹499", min: 0, max: 49900 },
  { label: "₹500–₹999", min: 50000, max: 99900 },
  { label: "₹1,000–₹1,999", min: 100000, max: 199900 },
  { label: "₹2,000+", min: 200000, max: undefined },
];

export function ListingView({
  base,
  params,
  listing,
  title,
  intro,
}: {
  base: string;
  params: ListingParams;
  listing: ListingResult;
  title: React.ReactNode;
  intro?: string;
}) {
  const toggleSize = (size: number) => {
    const sizes = params.sizes.includes(size) ? params.sizes.filter((item) => item !== size) : [...params.sizes, size];
    return listingHref(base, params, { sizes, page: 1 });
  };
  const toggleColor = (color: ListingParams["colors"][number]) => {
    const colors = params.colors.includes(color) ? params.colors.filter((item) => item !== color) : [...params.colors, color];
    return listingHref(base, params, { colors, page: 1 });
  };

  return (
    <div className="page-wrap py-12 lg:py-16">
      <Eyebrow>Shop</Eyebrow>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <Heading level={1}>{title}</Heading>
        <p className="font-mono text-eyebrow uppercase text-mist">{listing.total} pairs</p>
      </div>
      {intro ? <p className="measure mt-4 text-lead text-mist">{intro}</p> : null}
      <div className="mt-6 flex flex-wrap gap-3 font-mono text-eyebrow uppercase">
        {(["featured", "new", "price-asc", "price-desc"] as const).map((sort) => (
          <Link key={sort} href={listingHref(base, params, { sort })} className={params.sort === sort ? "text-aqua" : "text-mist"}>
            {sort}
          </Link>
        ))}
      </div>
      <div className="mt-10 grid gap-10 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-8">
          <div>
            <p className="font-mono text-eyebrow uppercase text-mist">Size UK</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {listing.facets.sizes.map((facet) => (
                <Link
                  key={facet.value}
                  href={toggleSize(Number(facet.value))}
                  className={`grid h-10 min-w-10 place-items-center rounded-pill border px-2 font-mono text-size ${params.sizes.includes(Number(facet.value)) ? "border-foam bg-foam text-abyss" : "border-hairline"}`}
                  aria-label={`UK ${facet.label}, ${facet.count} pairs`}
                >
                  {facet.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="font-mono text-eyebrow uppercase text-mist">Colour</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {listing.facets.colors.map((facet) => (
                <Link
                  key={facet.value}
                  href={toggleColor(facet.value as ListingParams["colors"][number])}
                  className={`rounded-pill border px-3 py-2 font-mono text-size capitalize ${params.colors.includes(facet.value as ListingParams["colors"][number]) ? "border-aqua text-aqua" : "border-hairline"}`}
                >
                  {facet.label} {facet.count}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="font-mono text-eyebrow uppercase text-mist">Price</p>
            <div className="mt-3 flex flex-col gap-2">
              {PRICE_PRESETS.map((preset) => (
                <Link key={preset.label} href={listingHref(base, params, { priceMin: preset.min, priceMax: preset.max, page: 1 })} className="link-draw text-small">
                  {preset.label}
                </Link>
              ))}
            </div>
          </div>
          {(params.sizes.length || params.colors.length || params.q) ? (
            <Link href={base} className="font-mono text-eyebrow uppercase text-aqua">
              Clear all
            </Link>
          ) : null}
        </aside>
        {listing.items.length === 0 ? (
          <div className="py-16">
            <Heading level={2}>
              {params.sizes.length || params.colors.length || params.q ? (
                <>Nothing in that <em>size</em> yet.</>
              ) : (
                <>This edit is still <em>being lasted</em>.</>
              )}
            </Heading>
            <p className="mt-4 max-w-measure text-mist">
              {params.sizes.length || params.colors.length
                ? "Remove one filter and the grid opens up."
                : "Pairs land here as they’re photographed. The men’s and women’s edits are ready."}
            </p>
            <Link href={params.sizes.length || params.colors.length ? base : "/shop"} className="mt-6 inline-block link-draw">
              {params.sizes.length || params.colors.length ? "Clear filters" : "Shop the edit"}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-gutter gap-y-10 xl:grid-cols-3">
            {listing.items.map((card) => (
              <ProductCard key={`${card.productId}-${card.colorwaySlug}`} card={card} />
            ))}
          </div>
        )}
      </div>
      {listing.page * listing.pageSize < listing.total ? (
        <div className="mt-12">
          <Link href={listingHref(base, params, { page: listing.page + 1 })} className="font-mono text-eyebrow uppercase text-aqua">
            Load more
          </Link>
        </div>
      ) : null}
    </div>
  );
}
