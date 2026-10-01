"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { useLenis } from "@/components/motion/SmoothScroll";
import { formatINR } from "@/lib/money";
import { duration, ease } from "@/lib/motion/tokens";

type Hit = { slug: string; name: string; colorwaySlug: string; colorwayName: string; image: string; pricePaise: number; category: string };

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { lock, unlock } = useLenis();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(0);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    lock();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unlock();
      window.removeEventListener("keydown", onKey);
    };
  }, [lock, onClose, open, unlock]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const handle = window.setTimeout(() => {
      void fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data: unknown) => {
          if (!data || typeof data !== "object" || !("products" in data) || !Array.isArray(data.products)) return;
          const next = data.products.flatMap((item) => {
            if (!item || typeof item !== "object") return [];
            const row = item as Partial<Hit>;
            if (!row.slug || !row.name || !row.image || row.pricePaise === undefined) return [];
            return [row as Hit];
          });
          setHits(next);
          setActive(0);
        })
        .catch(() => undefined);
    }, 180);
    return () => {
      window.clearTimeout(handle);
      controller.abort();
    };
  }, [open, query]);

  const go = (hit: Hit) => {
    onClose();
    router.push(`/product/${hit.slug}?color=${hit.colorwaySlug}`);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-overlay bg-abyss/95"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: duration.quick, ease: ease.tide }}
        >
          <div className="page-wrap pt-24">
            <label className="font-mono text-eyebrow uppercase text-mist" htmlFor="aq-search">
              Search
            </label>
            <input
              id="aq-search"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={hits[active] ? `hit-${hits[active]?.slug}` : undefined}
              autoFocus
              value={query}
              placeholder="Slides for the monsoon…"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActive((current) => Math.min(hits.length - 1, current + 1));
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActive((current) => Math.max(0, current - 1));
                }
                if (event.key === "Enter") {
                  const hit = hits[active];
                  if (hit) go(hit);
                  else {
                    onClose();
                    router.push(`/shop?q=${encodeURIComponent(query)}`);
                  }
                }
              }}
              className="mt-3 w-full bg-transparent font-display text-h2 text-foam outline-none placeholder:text-mist"
            />
            <ul id={listId} role="listbox" className="mt-8 divide-y divide-hairline border-t border-hairline">
              {hits.map((hit, index) => (
                <li key={`${hit.slug}-${hit.colorwaySlug}`} id={`hit-${hit.slug}`} role="option" aria-selected={index === active}>
                  <button type="button" className="flex w-full items-center gap-4 py-4 text-left" onClick={() => go(hit)}>
                    <span className="stage h-16 w-14 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={hit.image} alt="" className="h-full w-full object-cover" />
                    </span>
                    <span className="flex-1">
                      <span className="block font-body font-medium">{hit.name}</span>
                      <span className="font-mono text-size text-mist">{hit.colorwayName} · {hit.category}</span>
                    </span>
                    <span className="tabular">{formatINR(hit.pricePaise)}</span>
                  </button>
                </li>
              ))}
            </ul>
            <Link href={query ? `/shop?q=${encodeURIComponent(query)}` : "/shop"} onClick={onClose} className="mt-6 inline-block font-mono text-eyebrow uppercase text-aqua">
              See all results
            </Link>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
