import { cn } from "@/lib/cn";
import { IconCheck } from "@/components/ui/Icons";

export function Checkbox({
  id,
  label,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  className,
}: {
  id?: string;
  label?: React.ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2 font-body text-hub-body text-ink", disabled && "cursor-not-allowed opacity-50", className)}>
      <span className="relative inline-flex shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          defaultChecked={defaultChecked}
          onChange={onChange}
          disabled={disabled}
          className="peer size-4 cursor-pointer appearance-none rounded-panel border border-rule bg-paper transition-colors duration-quick checked:border-red checked:bg-red checked:hover:border-red-deep checked:hover:bg-red-deep disabled:cursor-not-allowed disabled:opacity-50"
        />
        <IconCheck className="pointer-events-none absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 text-on-red opacity-0 transition-opacity duration-quick peer-checked:opacity-100" aria-hidden="true" />
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  );
}
