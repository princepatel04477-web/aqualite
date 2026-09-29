"use client";

import { useId } from "react";

import { cn } from "@/lib/cn";
import { IconAlertTriangle } from "@/components/ui/Icons";

export function Field({
  label,
  hint,
  error,
  required = false,
  className,
  id,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  id?: string;
  children: (fieldId: string) => React.ReactNode;
}) {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={fieldId} className="text-hub-label text-ink-2">
        {label}
        {required ? (
          <span className="text-red" aria-hidden="true">
            {" *"}
          </span>
        ) : null}
      </label>
      {children(fieldId)}
      {error ? (
        <p id={`${fieldId}-error`} role="alert" className="flex items-center gap-1 text-hub-label text-danger">
          <IconAlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="text-hub-label text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
