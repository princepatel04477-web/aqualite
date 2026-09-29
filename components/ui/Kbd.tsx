import { cn } from "@/lib/cn";

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-panel border border-rule bg-paper px-1.5 font-mono text-hub-id text-ink-2 shadow-1",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
