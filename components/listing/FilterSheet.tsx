"use client";

import { useEffect, useMemo, useState } from "react";

import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import {
  applyListing,
  listingHref,
  PRICE_PRESETS,
  type ListingParams,
} from "@/lib/catalog/filters";
import type { ProductCardModel } from "@/lib/commerce/types";
import { cn } from "@/lib/cn";

type Draft = {
  sizes: number[];
  colors: ListingParams["colors"];
  priceMin?: number;
  priceMax?: number;
};

/**
 * Filter bottom sheet (M07): Size / Colour / Price groups as
 * accordions, 48px size pills, and a sticky footer with "Clear" plus a
 * live "Show N pairs" count. Counts re-run the same pure `applyListing`
 * the server uses against the route's base scope, so the number under
 * the button is exact. Apply navigates to the shareable URL.
 */
export function FilterSheet({
  open,
  onClose,
  base,
  params,
  scope,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  base: string;
  params: ListingParams;
  scope: ProductCardModel[];
  onNavigate: (href: string) => void;
}) {
  const [draft, setDraft] = useState<Draft>({
    sizes: params.sizes,
    colors: params.colors,
    priceMin: params.priceMin,
    priceMax: params.priceMax,
  });

  // Re-sync the draft each time the sheet opens (and when the URL's
  // filters change underneath it).
  useEffect(() => {
    if (open) {
      setDraft({
        sizes: params.sizes,
        colors: params.colors,
        priceMin: params.priceMin,
        priceMax: params.priceMax,
      });
    }
  }, [open, params]);

  const facets = useMemo(
    () =>
      applyListing(scope, {
        ...params,
        sizes: [],
        colors: [],
        priceMin: undefined,
        priceMax: undefined,
        page: 1,
      }).facets,
    [params, scope],
  );

  const candidate = useMemo(
    () =>
      applyListing(scope, {
        ...params,
        sizes: draft.sizes,
        colors: draft.colors,
        priceMin: draft.priceMin,
        priceMax: draft.priceMax,
        page: 1,
      }).total,
    [draft, params, scope],
  );

  const draftCount =
    draft.sizes.length +
    draft.colors.length +
    (draft.priceMin !== undefined || draft.priceMax !== undefined ? 1 : 0);

  const toggleSize = (size: number) =>
    setDraft((current) => ({
      ...current,
      sizes: current.sizes.includes(size)
        ? current.sizes.filter((item) => item !== size)
        : [...current.sizes, size],
    }));

  const toggleColor = (color: ListingParams["colors"][number]) =>
    setDraft((current) => ({
      ...current,
      colors: current.colors.includes(color)
        ? current.colors.filter((item) => item !== color)
        : [...current.colors, color],
    }));

  const apply = () => {
    onNavigate(
      listingHref(base, params, {
        sizes: draft.sizes,
        colors: draft.colors,
        priceMin: draft.priceMin,
        priceMax: draft.priceMax,
        page: 1,
      }),
    );
    onClose();
  };

  const clear = () =>
    setDraft((current) => ({
      ...current,
      sizes: [],
      colors: [],
      priceMin: undefined,
      priceMax: undefined,
    }));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      label="Filter"
      footer={
        <div className="flex items-center gap-3">
          {draftCount > 0 ? (
            <Button type="button" variant="outline" onClick={clear}>
              Clear
            </Button>
          ) : null}
          <Button
            type="button"
            variant="primary"
            className="flex-1"
            onClick={apply}
          >
            Show {candidate} {candidate === 1 ? "pair" : "pairs"}
          </Button>
        </div>
      }
    >
      <details
        open={draft.sizes.length > 0}
        className="border-b border-hairline pb-4"
      >
        <summary className="flex h-12 cursor-pointer list-none items-center justify-between font-mono text-eyebrow uppercase text-mist [&::-webkit-details-marker]:hidden">
          Size UK
          {draft.sizes.length > 0 ? (
            <span className="font-mono text-tag normal-case text-aqua">
              {draft.sizes.length}
            </span>
          ) : null}
        </summary>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {facets.sizes.map((facet) => {
            const value = Number(facet.value);
            const selected = draft.sizes.includes(value);
            return (
              <button
                key={facet.value}
                type="button"
                aria-pressed={selected}
                aria-label={`UK ${facet.label}, ${facet.count} ${facet.count === 1 ? "pair" : "pairs"}`}
                onClick={() => toggleSize(value)}
                className={cn(
                  "h-12 rounded-pill border font-mono text-size transition-colors duration-quick ease-tide",
                  selected
                    ? "border-foam bg-foam text-abyss"
                    : "border-hairline text-foam",
                )}
              >
                {facet.label}
              </button>
            );
          })}
        </div>
      </details>

      <details
        open={draft.colors.length > 0}
        className="border-b border-hairline py-4"
      >
        <summary className="flex h-12 cursor-pointer list-none items-center justify-between font-mono text-eyebrow uppercase text-mist [&::-webkit-details-marker]:hidden">
          Colour
          {draft.colors.length > 0 ? (
            <span className="font-mono text-tag normal-case text-aqua">
              {draft.colors.length}
            </span>
          ) : null}
        </summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {facets.colors.map((facet) => {
            const selected = draft.colors.includes(
              facet.value as ListingParams["colors"][number],
            );
            return (
              <button
                key={facet.value}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  toggleColor(facet.value as ListingParams["colors"][number])
                }
                className={cn(
                  "h-11 rounded-pill border px-4 font-mono text-size capitalize transition-colors duration-quick ease-tide",
                  selected
                    ? "border-aqua text-aqua"
                    : "border-hairline text-foam",
                )}
              >
                {facet.label} {facet.count}
              </button>
            );
          })}
        </div>
      </details>

      <details
        className="border-b border-hairline py-4"
        open={draft.priceMin !== undefined || draft.priceMax !== undefined}
      >
        <summary className="flex h-12 cursor-pointer list-none items-center justify-between font-mono text-eyebrow uppercase text-mist [&::-webkit-details-marker]:hidden">
          Price
          {draft.priceMin !== undefined || draft.priceMax !== undefined ? (
            <span className="font-mono text-tag normal-case text-aqua">1</span>
          ) : null}
        </summary>
        <div
          role="radiogroup"
          aria-label="Price range"
          className="mt-2 flex flex-col"
        >
          {PRICE_PRESETS.map((preset) => {
            const selected =
              draft.priceMin === preset.min && draft.priceMax === preset.max;
            return (
              <button
                key={preset.label}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    priceMin: selected ? undefined : preset.min,
                    priceMax: selected ? undefined : preset.max,
                  }))
                }
                className="flex h-12 items-center justify-between border-b border-hairline/60 font-body text-small last:border-b-0"
              >
                {preset.label}
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
      </details>
    </Sheet>
  );
}
