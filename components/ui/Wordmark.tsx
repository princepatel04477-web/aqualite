import Link from "next/link";

import { cn } from "@/lib/cn";

export function Wordmark({
  className,
  href = "/",
  tone = "red",
}: {
  className?: string;
  href?: string;
  tone?: "red" | "ink";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "font-display text-logo tracking-tight",
        tone === "ink" ? "text-ink" : "text-red",
        className,
      )}
    >
      Aqualite
    </Link>
  );
}
