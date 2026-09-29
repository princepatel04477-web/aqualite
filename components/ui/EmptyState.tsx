import { cn } from "@/lib/cn";
import { IconInbox } from "@/components/ui/Icons";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}>
      <span className="flex size-10 items-center justify-center rounded-pill bg-linen text-muted">
        {icon ?? <IconInbox className="h-5 w-5" aria-hidden="true" />}
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-hub-section text-ink">{title}</p>
        {description ? <p className="measure text-hub-body text-muted">{description}</p> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
