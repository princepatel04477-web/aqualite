import { cn } from "@/lib/cn";

export function Hairline({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-hairline", className)} role="separator" />;
}
