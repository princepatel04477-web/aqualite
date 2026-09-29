"use client";

import { useState, useTransition } from "react";

import { runSettlementSyncAction } from "@/lib/hub/reports/actions";

/** Manual settlement pull with optimistic busy state. */
export function SettlementSyncButton() {
  const [pending, startTransition] = useTransition();
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          setSummary(null);
          startTransition(async () => {
            const result = await runSettlementSyncAction();
            if (result.ok) {
              const { created, items, matched, mismatches } = result.data;
              setSummary(
                `Synced: ${created} new settlement(s), ${items} line(s), ${matched} matched${
                  mismatches ? `, ${mismatches} mismatch(es)` : ""
                }.`,
              );
            } else {
              setError(result.error.message);
            }
          });
        }}
        className="h-9 rounded-control bg-red px-4 font-body text-hub-body font-medium uppercase text-on-red transition-colors duration-quick hover:bg-red-deep disabled:opacity-60"
      >
        {pending ? "Syncing…" : "Sync settlements"}
      </button>
      {summary ? (
        <p role="status" className="text-hub-label text-success">
          {summary}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-hub-label text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
