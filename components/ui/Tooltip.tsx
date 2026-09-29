import { cn } from "@/lib/cn";

export function Tooltip({
  content,
  side = "top",
  className,
  children,
}: {
  content: React.ReactNode;
  side?: "top" | "bottom";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("group relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-modal invisible whitespace-nowrap rounded-control bg-ink px-2 py-1 text-hub-label text-ivory opacity-0 shadow-3 transition-opacity duration-instant group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100",
          side === "top" ? "bottom-full left-1/2 mb-2 -translate-x-1/2" : "top-full left-1/2 mt-2 -translate-x-1/2",
        )}
      >
        {content}
      </span>
    </div>
  );
}
