import Link from "next/link";

import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link" | "outline";
type Size = "sm" | "md" | "lg";
type Radius = "panel" | "control" | "pill";

const variants: Record<Variant, string> = {
  primary: "bg-red text-on-red hover:bg-red-deep active:bg-red-deep",
  secondary: "border border-rule bg-paper text-ink hover:bg-linen",
  ghost: "bg-transparent text-ink hover:bg-linen",
  danger: "bg-danger text-on-red hover:bg-danger/90",
  link: "link-draw bg-transparent px-0 text-red-ink hover:text-red-deep",
  /* legacy alias — S02+ may converge on "secondary" */
  outline: "border border-rule bg-paper text-ink hover:bg-linen",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3",
  md: "h-9 px-4",
  lg: "h-12 px-6",
};

/* literal class names so Tailwind can see them while scanning */
const radii: Record<Radius, string> = {
  panel: "rounded-panel",
  control: "rounded-control",
  pill: "rounded-pill",
};

type Props = {
  variant?: Variant;
  size?: Size;
  radius?: Radius;
  loading?: boolean;
  href?: string;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">;

export function Button({
  variant = "secondary",
  size = "lg",
  radius = "panel",
  loading = false,
  href,
  className,
  children,
  disabled,
  ...props
}: Props) {
  const classes = cn(
    "relative inline-flex items-center justify-center gap-2 rounded-panel font-body text-button font-medium uppercase transition-[color,background-color,border-color,transform] duration-quick ease-tide disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    variant === "link" ? "h-auto" : [sizes[size], radii[radius]],
    variant !== "link" && "active:scale-[0.98]",
    className,
  );
  /* Loading keeps the button's width: children stay laid out (invisible)
     while a spinner overlays them. */
  const content = (
    <>
      <span className={cn("inline-flex items-center gap-2 transition-opacity", loading && "opacity-0")}>
        {children}
      </span>
      {loading ? (
        <span className="dot-pulse absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      ) : null}
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        aria-disabled={disabled || loading}
        onClick={props.onClick as React.MouseEventHandler<HTMLAnchorElement> | undefined}
      >
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
