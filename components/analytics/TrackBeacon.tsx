"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { track } from "@/lib/analytics/beacon";

declare global {
  interface Window {
    aqTrack?: typeof track;
  }
}

/**
 * Mounts the tiny beacon and fires page_view on navigation. Commerce events
 * call window.aqTrack from the cart, checkout and order flows. Total added
 * storefront JS stays under 1 KB gzipped.
 */
export function TrackBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    window.aqTrack = track;
  }, []);

  useEffect(() => {
    if (pathname?.startsWith("/seller") || pathname?.startsWith("/admin")) return;
    track("page_view");
  }, [pathname]);

  return null;
}
