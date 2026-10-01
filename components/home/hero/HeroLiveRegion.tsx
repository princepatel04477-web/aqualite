"use client";

import type { HeroAnnouncement } from "@/components/home/hero/useHeroController";

/**
 * APG carousel live region. Announces only user-initiated scene changes
 * (the controller never announces autoplay advances), politely.
 */
export function HeroLiveRegion({ announcement }: { announcement: HeroAnnouncement | null }) {
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement ? <span key={announcement.key}>{announcement.text}</span> : null}
    </div>
  );
}
