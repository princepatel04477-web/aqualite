"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  duplicatePromotionAction,
  endPromotionAction,
  pausePromotionAction,
} from "@/lib/hub/promotions/actions";

export function PromotionRowActions({
  id,
  paused,
  expired,
}: {
  id: string;
  paused: boolean;
  expired: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"pause" | "duplicate" | "end" | null>(null);

  const run = (kind: "pause" | "duplicate" | "end", action: Promise<{ ok: boolean }>) => {
    setBusy(kind);
    void action.then((result) => {
      setBusy(null);
      if (result.ok) startTransition(() => router.refresh());
    });
  };

  return (
    <div className="flex items-center justify-end gap-2">
      {!expired ? (
        <button
          type="button"
          disabled={pending || busy !== null}
          aria-busy={busy === "pause"}
          className="h-8 rounded-control border border-rule px-2.5 font-body text-hub-label text-ink-2 transition-colors duration-quick hover:bg-linen disabled:opacity-50"
          onClick={() => run("pause", pausePromotionAction(id, !paused))}
        >
          {paused ? "Resume" : "Pause"}
        </button>
      ) : null}
      <button
        type="button"
        disabled={pending || busy !== null}
        aria-busy={busy === "duplicate"}
        className="h-8 rounded-control border border-rule px-2.5 font-body text-hub-label text-ink-2 transition-colors duration-quick hover:bg-linen disabled:opacity-50"
        onClick={() => run("duplicate", duplicatePromotionAction(id))}
      >
        Duplicate
      </button>
      {!expired ? (
        <button
          type="button"
          disabled={pending || busy !== null}
          aria-busy={busy === "end"}
          className="h-8 rounded-control border border-rule px-2.5 font-body text-hub-label text-danger transition-colors duration-quick hover:bg-danger-tint disabled:opacity-50"
          onClick={() => run("end", endPromotionAction(id))}
        >
          End now
        </button>
      ) : null}
    </div>
  );
}
