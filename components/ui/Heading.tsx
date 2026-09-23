import { cn } from "@/lib/cn";

type Level = 1 | 2 | 3 | 4;
type Size = "hero" | "h1" | "h2" | "h3";

const tags: Record<Level, "h1" | "h2" | "h3" | "h4"> = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
};

const sizes: Record<Size, string> = {
  hero: "text-hero",
  h1: "text-h1",
  h2: "text-h2",
  h3: "text-h3",
};

export function Heading({
  level = 2,
  size,
  className,
  children,
  id,
}: {
  level?: Level;
  size?: Size;
  className?: string;
  children: React.ReactNode;
  id?: string;
}) {
  const Tag = tags[level];
  const visual = size ?? (level === 1 ? "h1" : level === 2 ? "h2" : "h3");
  return (
    <Tag id={id} className={cn("heading-display font-display font-normal text-balance", sizes[visual], className)}>
      {children}
    </Tag>
  );
}
