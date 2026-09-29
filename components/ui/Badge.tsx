import { cn } from "@/lib/cn";

const tones = {
  neutral: "bg-linen text-ink-2",
  brand: "bg-red-tint text-red-ink",
  success: "bg-success-tint text-success",
  warning: "bg-warning-tint text-warning",
  danger: "bg-danger-tint text-danger",
  info: "bg-info-tint text-info",
} as const;

export type BadgeTone = keyof typeof tones;

export function Badge({
  tone = "neutral",
  size = "md",
  className,
  children,
}: {
  tone?: BadgeTone;
  size?: "sm" | "md";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill font-body font-medium",
        size === "sm" ? "h-5 px-2 text-hub-label" : "h-6 px-2.5 text-hub-label",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
