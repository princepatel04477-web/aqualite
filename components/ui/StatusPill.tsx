import { cn } from "@/lib/cn";
import {
  IconAlertTriangle,
  IconCheckCircle,
  IconInfoCircle,
  IconMinusCircle,
  IconXCircle,
} from "@/components/ui/Icons";

type Tone = "success" | "warning" | "danger" | "info" | "muted";

/* Order + listing statuses (S01 set). Status is never colour-only: every
   pill carries an icon + label. Unknown future statuses fall back to muted. */
const statusTone: Record<string, Tone> = {
  /* listing */
  Active: "success",
  Inactive: "muted",
  "Out of stock": "danger",
  Suppressed: "warning",
  /* orders */
  Pending: "info",
  Unshipped: "warning",
  Shipped: "info",
  Delivered: "success",
  Cancelled: "muted",
  Refunded: "muted",
  "Return requested": "warning",
};

const toneStyles: Record<Tone, { box: string; Icon: typeof IconInfoCircle }> = {
  success: { box: "bg-success-tint text-success", Icon: IconCheckCircle },
  warning: { box: "bg-warning-tint text-warning", Icon: IconAlertTriangle },
  danger: { box: "bg-danger-tint text-danger", Icon: IconXCircle },
  info: { box: "bg-info-tint text-info", Icon: IconInfoCircle },
  muted: { box: "bg-linen text-muted", Icon: IconMinusCircle },
};

export function StatusPill({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const tone = statusTone[status] ?? "muted";
  const { box, Icon } = toneStyles[tone];
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 font-body text-hub-label font-medium",
        box,
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {status}
    </span>
  );
}
