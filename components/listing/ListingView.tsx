import Link from "next/link";

import { RiseGrid } from "@/components/motion/RiseGrid";
import { ProductCard } from "@/components/product/ProductCard";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Heading } from "@/components/ui/Heading";
import { CATEGORIES } from "@/content/catalog";
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
  const toggleCategory = (catSlug: string) => {
    const nextCategory = params.category === catSlug ? undefined : catSlug;
    return listingHref(base, params, { category: nextCategory, page: 1 });
  };

  const categoryInPath = CATEGORIES.some((c) => base.endsWith(`/${c.slug}`));
  const hasActiveFilters = Boolean(
    params.sizes.length ||
      params.colors.length ||
      params.priceMin !== undefined ||
      params.priceMax !== undefined ||
      (!categoryInPath && params.category) ||
      params.q,
  );
  const totalPages = Math.max(1, Math.ceil(listing.total / listing.pageSize));

  return (
    <div className="page-wrap py-12 lg:py-16">
      <Eyebrow>Shop</Eyebrow>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <Heading level={1}>{title}</Heading>
        <p className="font-mono text-eyebrow uppercase text-mist">{listing.total} pairs</p>
      </div>
      {intro ? <p className="measure mt-4 text-lead text-mist">{intro}</p> : null}
      <div className="mt-6 flex flex-wrap gap-3 font-mono text-eyebrow uppercase" role="group" aria-label="Sort products">
        {(["featured", "new", "price-asc", "price-desc"] as const).map((sort) => (
          <Link key={sort} href={listingHref(base, params, { sort })} className={params.sort === sort ? "text-aqua" : "text-mist"}>
            {sort === "featured" ? "Featured" : sort === "new" ? "New" : sort === "price-asc" ? "Price, low" : "Price, high"}
          </Link>
        ))}
      </div>
      <div className="mt-10 grid gap-10 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-8" aria-label="Product filters">
          {!categoryInPath && listing.facets.categories.length > 0 ? (
            <div>
              <p className="font-mono text-eyebrow uppercase text-mist">Type</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {listing.facets.categories.map((facet) => {
                  const categoryInfo = CATEGORIES.find((c) => c.slug === facet.value);
                  const active = params.category === facet.value;
                  return (
                    <Link
                      key={facet.value}
                      href={toggleCategory(facet.value)}
                      className={`rounded-pill border px-3 py-2 font-mono text-size capitalize ${active ? "border-aqua text-aqua" : "border-hairline"}`}
                    >
                      {categoryInfo?.name ?? facet.label} {facet.count}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
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
              {PRICE_PRESETS.map((preset) => {
                const active = params.priceMin === preset.min && params.priceMax === preset.max;
                return (
                  <Link
                    key={preset.label}
                    href={
                      active
                        ? listingHref(base, params, { priceMin: undefined, priceMax: undefined, page: 1 })
                        : listingHref(base, params, { priceMin: preset.min, priceMax: preset.max, page: 1 })
                    }
                    className={`link-draw text-small ${active ? "font-medium text-aqua" : ""}`}
                  >
                    {preset.label}
                  </Link>
                );
              })}
            </div>
          </div>
          {hasActiveFilters ? (
            <Link href={base} className="inline-block font-mono text-eyebrow uppercase text-aqua">
              Clear all
            </Link>
          ) : null}
        </aside>
        {listing.items.length === 0 ? (
          <div className="py-16">
            <Heading level={2}>
              {hasActiveFilters ? (
                <>Nothing in that <em>filter</em> yet.</>
              ) : (
                <>This edit is still <em>being lasted</em>.</>
              )}
            </Heading>
            <p className="mt-4 max-w-measure text-mist">
              {hasActiveFilters
                ? "Remove one filter and the grid opens up."
                : "Pairs land here as they’re photographed. The men’s and women’s edits are ready."}
            </p>
            <Link href={hasActiveFilters ? base : "/shop"} className="mt-6 inline-block link-draw">
              {hasActiveFilters ? "Clear filters" : "Shop the edit"}
            </Link>
          </div>
        ) : (
          <div>
            <RiseGrid className="grid grid-cols-2 gap-x-gutter gap-y-10 xl:grid-cols-3">
              {listing.items.map((card) => (
                <ProductCard key={`${card.productId}-${card.colorwaySlug}`} card={card} />
              ))}
            </RiseGrid>
            {totalPages > 1 ? (
              <nav className="mt-12 flex items-center justify-between border-t border-hairline pt-6 font-mono text-eyebrow uppercase" aria-label="Pagination">
                <div>
                  {listing.page > 1 ? (
                    <Link href={listingHref(base, params, { page: listing.page - 1 })} className="text-aqua">
                      ← Previous
                    </Link>
                  ) : (
                    <span className="text-mist opacity-50">← Previous</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                    <Link
                      key={pageNum}
                      href={listingHref(base, params, { page: pageNum })}
                      aria-current={pageNum === listing.page ? "page" : undefined}
                      className={`grid h-9 w-9 place-items-center rounded-pill border ${pageNum === listing.page ? "border-foam bg-foam text-abyss" : "border-hairline text-mist"}`}
                    >
                      {pageNum}
                    </Link>
                  ))}
                </div>
                <div>
                  {listing.page < totalPages ? (
                    <Link href={listingHref(base, params, { page: listing.page + 1 })} className="text-aqua">
                      Load more →
                    </Link>
                  ) : (
                    <span className="text-mist opacity-50">Next →</span>
                  )}
                </div>
              </nav>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
