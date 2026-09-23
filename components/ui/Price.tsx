import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/money";

export function Price({
  paise,
  mrpPaise,
  tax = false,
  className,
  size = "md",
}: {
  paise: number;
  mrpPaise?: number;
  tax?: boolean;
  className?: string;
  size?: "md" | "lg";
}) {
  const showMrp = mrpPaise !== undefined && mrpPaise > paise;
  const off = showMrp && mrpPaise ? Math.round((1 - paise / mrpPaise) * 100) : 0;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}>
      <span className={cn("font-body font-medium tabular text-foam", size === "lg" ? "text-h3" : "text-price")}>
        {formatINR(paise)}
      </span>
      {showMrp && mrpPaise ? (
        <span className="font-body text-small tabular text-mist line-through">{formatINR(mrpPaise)}</span>
      ) : null}
      {off > 0 ? <span className="font-mono text-size text-sand">{off}% off</span> : null}
      {tax ? <span className="basis-full font-body text-small text-mist">MRP incl. of all taxes</span> : null}
    </span>
  );
}
