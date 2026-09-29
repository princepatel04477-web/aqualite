import { cn } from "@/lib/cn";

export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  id,
  "aria-describedby": ariaDescribedBy,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  "aria-describedby"?: string;
  className?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={ariaDescribedBy}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-pill border transition-colors duration-quick ease-tide disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "border-red bg-red" : "border-rule bg-linen",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block size-4 translate-x-0.5 rounded-pill bg-paper shadow-1 transition-transform duration-quick ease-tide",
          checked && "translate-x-4",
        )}
      />
    </button>
  );
}
