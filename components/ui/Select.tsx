import { cn } from "@/lib/cn";
import { IconChevronDown } from "@/components/ui/Icons";

export function Select({
  options,
  value,
  defaultValue,
  onChange,
  disabled = false,
  id,
  className,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: {
  options: { value: string; label: string }[];
  value?: string;
  defaultValue?: string;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
}) {
  return (
    <span className={cn("relative inline-flex w-full", className)}>
      <select
        id={id}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        className="h-9 w-full appearance-none rounded-control border border-rule bg-paper px-3 pr-8 font-body text-hub-body text-ink transition-colors duration-quick hover:border-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <IconChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
    </span>
  );
}
