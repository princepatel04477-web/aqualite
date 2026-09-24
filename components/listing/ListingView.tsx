import Link from "next/link";

import { CategoryChips } from "@/components/listing/CategoryChips";
import { FilterBar } from "@/components/listing/FilterBar";
import { ListingGrid } from "@/components/listing/ListingGrid";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Heading } from "@/components/ui/Heading";
import {
  listingHref,
  PRICE_PRESETS,
  type ListingParams,
} from "@/lib/catalog/filters";
import type { ListingResult, ProductCardModel } from "@/lib/commerce/types";

export function ListingView({
  base,
  params,
  listing,
  scope,
  title,
  intro,
  crumbs,
}: {
  base: string;
  params: ListingParams;
  listing: ListingResult;
  scope: ProductCardModel[];
  title: React.ReactNode;
  intro?: string;
  crumbs: { label: string; href?: string }[];
}) {
  const toggleSize = (size: number) => {
    const sizes = params.sizes.includes(size)
      ? params.sizes.filter((item) => item !== size)
      : [...params.sizes, size];
    return listingHref(base, params, { sizes, page: 1 });
  };
  const toggleColor = (color: ListingParams["colors"][number]) => {
    const colors = params.colors.includes(color)
      ? params.colors.filter((item) => item !== color)
      : [...params.colors, color];
    return listingHref(base, params, { colors, page: 1 });
  };
  const hasFilters =
    params.sizes.length > 0 || params.colors.length > 0 || Boolean(params.q);

  return (
    <div className="py-6 lg:py-12 xl:py-16">
      <div className="page-wrap">
        {/* Mobile compact header: single-line breadcrumb → H1 → count (M07). */}
        <nav aria-label="Breadcrumb" className="lg:hidden">
          <ol className="flex items-center gap-1.5 whitespace-nowrap font-mono text-eyebrow uppercase text-mist">
            <li className="shrink-0">
              <Link href="/" className="link-draw">
                Home
              </Link>
            </li>
            {crumbs.map((crumb, index) => (
              <li
                key={`${crumb.label}-${index}`}
                className="flex min-w-0 items-center gap-1.5"
              >
                <span aria-hidden="true">/</span>
                {crumb.href ? (
                  <Link href={crumb.href} className="link-draw truncate">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="truncate" aria-current="page">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-4 hidden lg:block">
          <Eyebrow>Shop</Eyebrow>
        </div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4 lg:mt-4">
          <Heading level={1}>{title}</Heading>
          <p
            className="font-mono text-eyebrow uppercase text-mist"
            aria-live="polite"
          >
            {listing.total} {listing.total === 1 ? "pair" : "pairs"}
          </p>
        </div>
        {intro ? (
          <p className="measure mt-4 hidden text-lead text-mist lg:block">
            {intro}
          </p>
        ) : null}

        <div className="mt-6 hidden flex-wrap gap-3 font-mono text-eyebrow uppercase lg:flex">
          {(["featured", "new", "price-asc", "price-desc"] as const).map(
            (sort) => (
              <Link
                key={sort}
                href={listingHref(base, params, { sort })}
                className={params.sort === sort ? "text-aqua" : "text-mist"}
              >
                {sort === "featured"
                  ? "Featured"
                  : sort === "new"
                    ? "New"
                    : sort === "price-asc"
                      ? "Price, low"
                      : "Price, high"}
              </Link>
            ),
          )}
        </div>
      </div>

      {/* Chips + sticky bar run edge-to-edge on mobile (M07). */}
      <div className="mt-3">
        <CategoryChips base={base} />
      </div>
      <div className="mt-3">
        <FilterBar base={base} params={params} scope={scope} />
      </div>

      <div className="page-wrap mt-6 lg:mt-10">
        <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
          <aside className="hidden space-y-8 lg:block">
            <div>
              <p className="font-mono text-eyebrow uppercase text-mist">
                Size UK
              </p>
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
              <p className="font-mono text-eyebrow uppercase text-mist">
                Colour
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {listing.facets.colors.map((facet) => (
                  <Link
                    key={facet.value}
                    href={toggleColor(
                      facet.value as ListingParams["colors"][number],
                    )}
                    className={`rounded-pill border px-3 py-2 font-mono text-size capitalize ${params.colors.includes(facet.value as ListingParams["colors"][number]) ? "border-aqua text-aqua" : "border-hairline"}`}
                  >
                    {facet.label} {facet.count}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="font-mono text-eyebrow uppercase text-mist">
                Price
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {PRICE_PRESETS.map((preset) => (
                  <Link
                    key={preset.label}
                    href={listingHref(base, params, {
                      priceMin: preset.min,
                      priceMax: preset.max,
                      page: 1,
                    })}
                    className="link-draw text-small"
                  >
                    {preset.label}
                  </Link>
                ))}
              </div>
            </div>
            {hasFilters ? (
              <Link
                href={base}
                className="font-mono text-eyebrow uppercase text-aqua"
              >
                Clear all
              </Link>
            ) : null}
          </aside>
          {listing.items.length === 0 ? (
            <div className="py-16">
              <Heading level={2}>
                {hasFilters ? (
                  <>
                    Nothing in that <em>size</em> yet.
                  </>
                ) : (
                  <>
                    This edit is still <em>being lasted</em>.
                  </>
                )}
              </Heading>
              <p className="mt-4 max-w-measure text-mist">
                {hasFilters
                  ? "Remove one filter and the grid opens up."
                  : "Pairs land here as they’re photographed. The men’s and women’s edits are ready."}
              </p>
              <Link
                href={hasFilters ? base : "/shop"}
                className="link-draw mt-6 inline-block"
              >
                {hasFilters ? "Clear filters" : "Shop the edit"}
              </Link>
            </div>
          ) : (
            <ListingGrid params={params} scope={scope} />
          )}
        </div>
      </div>
    </div>
  );
}
