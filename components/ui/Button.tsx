import Link from "next/link";

import { cn } from "@/lib/cn";

type Variant = "primary" | "outline" | "ghost" | "link";
type Size = "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-foam text-abyss hover:bg-foam/90",
  outline: "border border-hairline bg-transparent text-foam hover:border-foam",
  ghost: "bg-transparent text-foam hover:bg-shelf",
  link: "link-draw bg-transparent px-0 text-foam",
};

const sizes: Record<Size, string> = {
  md: "h-12 px-5",
  lg: "h-14 px-7",
};

type Props = {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  href?: string;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">;

export function Button({
  variant = "outline",
  size = "md",
  loading = false,
  href,
  className,
  children,
  disabled,
  ...props
}: Props) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-panel font-body text-button font-medium uppercase transition-colors duration-quick ease-tide disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    variant === "link" ? "h-auto" : sizes[size],
    className,
  );
  const content = loading ? (
    <span className="dot-pulse" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  ) : (
    children
  );
  if (href) {
    return (
      <Link href={href} className={classes} aria-disabled={disabled || loading} onClick={props.onClick as React.MouseEventHandler<HTMLAnchorElement> | undefined}>
        {content}
      </Link>
    );
  }
  return (
    <button className={classes} disabled={disabled || loading} aria-busy={loading} {...props}>
      {content}
    </button>
  );
}
