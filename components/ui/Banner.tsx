import { cn } from "@/lib/cn";
import {
  IconAlertTriangle,
  IconCheckCircle,
  IconClose,
  IconInfoCircle,
  IconXCircle,
} from "@/components/ui/Icons";

const tones = {
  info: { box: "bg-info-tint border-info/30", icon: "text-info", Icon: IconInfoCircle },
  success: { box: "bg-success-tint border-success/30", icon: "text-success", Icon: IconCheckCircle },
  warning: { box: "bg-warning-tint border-warning/30", icon: "text-warning", Icon: IconAlertTriangle },
  danger: { box: "bg-danger-tint border-danger/30", icon: "text-danger", Icon: IconXCircle },
} as const;

export type BannerTone = keyof typeof tones;

export function Banner({
  tone = "info",
  title,
  action,
  onDismiss,
  className,
  children,
}: {
  tone?: BannerTone;
  title?: string;
  action?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const { box, icon, Icon } = tones[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-control border px-4 py-3", box, className)}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", icon)} aria-hidden="true" />
      <div className="min-w-0 flex-1 text-hub-body">
        {title ? <p className="font-semibold text-ink">{title}</p> : null}
        <div className={cn(!title && "text-ink", title && "text-ink-2")}>{children}</div>
        {action ? <div className="mt-2 flex gap-2">{action}</div> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-1 shrink-0 rounded-panel p-1 text-muted transition-colors duration-quick hover:text-ink"
        >
          <IconClose className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
