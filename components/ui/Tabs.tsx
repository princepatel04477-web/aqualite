"use client";

import { useId, useRef } from "react";

import { cn } from "@/lib/cn";

export type TabItem = {
  id: string;
  label: string;
};

export function Tabs({
  tabs,
  value,
  onChange,
  label,
  className,
}: {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  /** Accessible name for the tablist, e.g. "Styleguide section". */
  label?: string;
  className?: string;
}) {
  const baseId = useId();
  const listRef = useRef<HTMLDivElement>(null);

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const index = tabs.findIndex((tab) => tab.id === value);
    if (index < 0) return;
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    const nextTab = tabs[next];
    if (!nextTab) return;
    onChange(nextTab.id);
    const button = listRef.current?.querySelector<HTMLButtonElement>(`#${CSS.escape(`${baseId}-tab-${nextTab.id}`)}`);
    button?.focus();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn("inline-flex items-center gap-1 rounded-control", className)}
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            id={`${baseId}-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              "h-8 whitespace-nowrap rounded-control px-3 font-body text-hub-body transition-colors duration-quick",
              active ? "bg-red-tint font-medium text-red-ink" : "text-ink-2 hover:bg-linen hover:text-ink",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
