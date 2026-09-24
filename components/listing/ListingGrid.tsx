"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import { RiseGrid } from "@/components/motion/RiseGrid";
import { ProductCard } from "@/components/product/ProductCard";
import {
  applyListing,
  PAGE_SIZE,
  type ListingParams,
} from "@/lib/catalog/filters";
import type { ProductCardModel } from "@/lib/commerce/types";

type HistoryMemory = { aqPages?: number; aqScrollY?: number; aqHref?: string };

/**
 * Listing grid (M07). The route's base scope arrives from the server
 * (prices included, server-owned); filtering, sorting and pagination
 * run through the same pure `applyListing` the server uses, so "Load
 * more" becomes local: an IntersectionObserver 600px before the end
 * appends the next page instantly (no fetch, no layout shift — tiles
 * have fixed aspect stages). The button stays as the accessible
 * fallback. Pages and scroll offset are written to the history entry,
 * so returning from a PDP restores both the loaded pages and the
 * position. Deep links with ?page=N open at that page.
 */
export function ListingGrid({
  params,
  scope,
}: {
  params: ListingParams;
  scope: ProductCardModel[];
}) {
  const pathname = usePathname();
  const paramKey = JSON.stringify(params);
  const [pageState, setPageState] = useState(() => ({
    key: paramKey,
    pages: Math.max(1, params.page),
  }));
  // A filter/sort navigation re-renders with new params; until the sync
  // effect runs, fall back to that navigation's own page count.
  const pages =
    pageState.key === paramKey ? pageState.pages : Math.max(1, params.page);
  const listing = useMemo(() => applyListing(scope, params), [params, scope]);
  const shown = listing.items.slice(0, pages * PAGE_SIZE);
  const hasMore = shown.length < listing.total;
  const loading = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const href = useMemo(() => {
    const search = typeof window === "undefined" ? "" : window.location.search;
    return `${pathname}${search}`;
  }, [pathname]);

  const more = useCallback(() => {
    if (loading.current || !hasMore) return;
    loading.current = true;
    setPageState({ key: paramKey, pages: pages + 1 });
  }, [hasMore, pages, paramKey]);

  // Persist loaded pages on the current history entry.
  useEffect(() => {
    loading.current = false;
    if (pages <= 1) return;
    const state = window.history.state as HistoryMemory | null;
    window.history.replaceState({ ...state, aqPages: pages, aqHref: href }, "");
  }, [pages, href]);

  // Track scroll offset on the same entry (rAF + interval throttled).
  useEffect(() => {
    let frame = 0;
    let last = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const now = Date.now();
        if (now - last < 200) return;
        last = now;
        const state = window.history.state as HistoryMemory | null;
        window.history.replaceState(
          { ...state, aqScrollY: window.scrollY, aqHref: href },
          "",
        );
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [href]);

  // Restore pages + scroll before paint when arriving via back/forward.
  useLayoutEffect(() => {
    const state = window.history.state as HistoryMemory | null;
    if (!state?.aqHref || state.aqHref !== href) return;
    if (state.aqPages && state.aqPages > 1) {
      setPageState({ key: paramKey, pages: state.aqPages });
    }
    if (state.aqScrollY) {
      window.scrollTo(0, state.aqScrollY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep state in sync when the params (filters/sort) change.
  useEffect(() => {
    if (pageState.key !== paramKey)
      setPageState({ key: paramKey, pages: Math.max(1, params.page) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramKey]);

  // Auto-load 600px before the end.
  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) more();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [more]);

  if (listing.items.length === 0) return null;

  return (
    <div>
      <RiseGrid className="grid grid-cols-2 gap-x-gutter gap-y-10 xl:grid-cols-3">
        {shown.map((card) => (
          <ProductCard
            key={`${card.productId}-${card.colorwaySlug}`}
            card={card}
          />
        ))}
      </RiseGrid>
      <div ref={sentinel} aria-hidden="true" className="h-px" />
      {hasMore ? (
        <div className="mt-12 text-center">
          <button
            type="button"
            onClick={more}
            className="font-mono text-eyebrow uppercase text-aqua"
            aria-label={`Load more pairs, ${listing.total - shown.length} remaining`}
          >
            Load more
          </button>
        </div>
      ) : null}
    </div>
  );
}
