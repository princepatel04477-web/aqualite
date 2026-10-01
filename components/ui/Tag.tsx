import { cn } from "@/lib/cn";

const tones = {
  New: "text-red-ink",
  "Sold out": "text-muted",
  "Last few": "text-warning",
} as const;

export function Tag({
  children,
  className,
}: {
  children: keyof typeof tones | string;
  className?: string;
}) {
  const tone = children in tones ? tones[children as keyof typeof tones] : "text-muted";
  return <span className={cn("font-mono text-eyebrow uppercase", tone, className)}>{children}</span>;
}
