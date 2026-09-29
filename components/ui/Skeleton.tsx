import { cn } from "@/lib/cn";

export function Skeleton({
  variant = "block",
  className,
  style,
}: {
  variant?: "text" | "block";
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      data-testid="skeleton"
      className={cn(
        "aq-shimmer bg-linen",
        variant === "text" ? "h-4 w-full rounded-panel" : "h-full w-full rounded-control",
        className,
      )}
      style={style}
    />
  );
}
