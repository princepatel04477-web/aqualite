import { cn } from "@/lib/cn";

type IconProps = { className?: string };

function base(className?: string) {
  return cn("h-5 w-5", className);
}

export function IconSearch({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16.5 20 20.5" />
    </svg>
  );
}

export function IconBag({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M6.5 8.5h11l-.8 11h-9.4l-.8-11Z" />
      <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
    </svg>
  );
}

export function IconUser({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="8" r="3" />
      <path d="M5.5 19.5c1.2-3 3.4-4.5 6.5-4.5s5.3 1.5 6.5 4.5" />
    </svg>
  );
}

export function IconHeart({ className, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M12 19s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9Z" />
    </svg>
  );
}

export function IconClose({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function IconMenu({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  );
}

export function IconPlus({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconMinus({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M5 12h14" />
    </svg>
  );
}
