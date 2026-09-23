import Link from "next/link";

import { cn } from "@/lib/cn";

export function Wordmark({
  className,
  href = "/",
  tone = "foam",
}: {
  className?: string;
  href?: string;
  tone?: "foam" | "ink";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "font-display text-logo tracking-tight",
        tone === "ink" ? "text-ink-on-porcelain" : "text-foam",
        className,
      )}
    >
      Aqualite
    </Link>
  );
}
