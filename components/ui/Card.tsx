import { cn } from "@/lib/cn";

export function Card({
  elevation = "raised",
  className,
  children,
  ...props
}: {
  elevation?: "flat" | "raised";
  className?: string;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children">) {
  return (
    <div
      className={cn(
        "rounded-hub border border-hairline bg-paper",
        elevation === "raised" && "shadow-1",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
