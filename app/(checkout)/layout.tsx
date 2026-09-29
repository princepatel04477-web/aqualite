import Link from "next/link";

import { TrackBeacon } from "@/components/analytics/TrackBeacon";
import { Wordmark } from "@/components/ui/Wordmark";

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh]">
      <TrackBeacon />
      <header className="page-wrap flex h-[var(--header-h)] items-center justify-between">
        <Wordmark />
        <Link href="/bag" className="font-mono text-eyebrow uppercase text-mist">Back to bag</Link>
      </header>
      <main id="content">{children}</main>
    </div>
  );
}
