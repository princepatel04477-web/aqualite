"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Saved pairs (M07 touch card). The store engine models wishlists per
 * user, but no account API exists yet — the card heart persists to
 * localStorage so the control is real (state survives reloads) and can
 * later be reconciled with the account wishlist.
 */
const KEY = "aq-wishlist";

type Entry = { productId: string; colorwaySlug: string };

function read(): Entry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Entry[]) : [];
  } catch {
    return [];
  }
}

function write(entries: Entry[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(entries));
}

export function useWishlist(productId: string, colorwaySlug: string) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(
      read().some(
        (entry) =>
          entry.productId === productId && entry.colorwaySlug === colorwaySlug,
      ),
    );
  }, [colorwaySlug, productId]);

  const toggle = useCallback(() => {
    const entries = read();
    const exists = entries.some(
      (entry) =>
        entry.productId === productId && entry.colorwaySlug === colorwaySlug,
    );
    const next = exists
      ? entries.filter(
          (entry) =>
            !(
              entry.productId === productId &&
              entry.colorwaySlug === colorwaySlug
            ),
        )
      : [...entries, { productId, colorwaySlug }];
    write(next);
    setSaved(!exists);
  }, [colorwaySlug, productId]);

  return { saved, toggle };
}
