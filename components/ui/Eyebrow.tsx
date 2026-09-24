import { cn } from "@/lib/cn";

export function Eyebrow({
  index,
  total,
  children,
  className,
}: {
  index?: string;
  total?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("font-mono text-eyebrow uppercase text-mist", className)}>
      {index ? <span className="text-aqua">{total ? `${index} / ${total}` : index}</span> : null}
      {index ? <span> — </span> : null}
      {children}
    </p>
  );
}
