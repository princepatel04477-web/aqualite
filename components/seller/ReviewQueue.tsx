"use client";

import { useState, useTransition } from "react";

import { moderateReviewAction, replyToReviewAction } from "@/lib/hub/reviews/actions";

function RowActions({
  id,
  status,
  replied,
}: {
  id: string;
  status: "pending" | "approved" | "rejected";
  replied: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [note, setNote] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "approved" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await moderateReviewAction({ id, status: "approved" });
              setNote(result.ok ? "Approved." : result.error.message);
            })
          }
          className="rounded-control border border-rule bg-paper px-2.5 py-1 font-mono text-hub-label uppercase transition-colors duration-quick hover:bg-linen disabled:opacity-60"
        >
          Approve
        </button>
      ) : null}
      {status !== "rejected" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await moderateReviewAction({ id, status: "rejected" });
              setNote(result.ok ? "Rejected." : result.error.message);
            })
          }
          className="rounded-control border border-rule bg-paper px-2.5 py-1 font-mono text-hub-label uppercase transition-colors duration-quick hover:bg-linen disabled:opacity-60"
        >
          Reject
        </button>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => setReplyOpen((open) => !open)}
        className="rounded-control border border-rule bg-paper px-2.5 py-1 font-mono text-hub-label uppercase transition-colors duration-quick hover:bg-linen disabled:opacity-60"
      >
        {replied ? "Edit reply" : "Reply"}
      </button>
      {note ? <span className="text-hub-label text-muted">{note}</span> : null}
      {replyOpen ? (
        <form
          className="flex w-full flex-col gap-2 pt-2"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await replyToReviewAction({ id, body: reply });
              if (result.ok) {
                setNote("Reply posted publicly under the review.");
                setReplyOpen(false);
                setReply("");
              } else {
                setNote(result.error.message);
              }
            });
          }}
        >
          <textarea
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Public reply — customers see this under the review"
            className="w-full rounded-control border border-rule bg-paper px-3 py-2 text-hub-body text-ink outline-none focus:border-red"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending || reply.trim().length === 0}
              className="rounded-control bg-red px-3 py-1.5 font-mono text-hub-label uppercase text-on-red transition-colors duration-quick hover:bg-red-deep disabled:opacity-60"
            >
              Post reply
            </button>
            <button
              type="button"
              onClick={() => setReplyOpen(false)}
              className="rounded-control border border-rule px-3 py-1.5 font-mono text-hub-label uppercase text-muted hover:bg-linen"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

export function ReviewQueue({
  rows,
}: {
  rows: {
    id: string;
    userName: string;
    rating: number;
    title: string;
    body: string;
    status: "pending" | "approved" | "rejected";
    createdAt: string;
    productName: string;
    verified: boolean;
    reply: string | null;
  }[];
}) {
  if (rows.length === 0) {
    return (
      <div className="mt-8 rounded-hub border border-hairline bg-paper p-10 text-center">
        <p className="text-hub-section font-semibold">Queue clear</p>
        <p className="mt-2 text-hub-body text-muted">No reviews waiting for moderation.</p>
      </div>
    );
  }
  return (
    <div className="mt-6 space-y-4">
      {rows.map((row) => (
        <article key={row.id} className="rounded-hub border border-hairline bg-paper p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-hub-label uppercase text-muted">
                {"★".repeat(row.rating)}
                {"☆".repeat(5 - row.rating)} · {row.productName} · {row.createdAt.slice(0, 10)}
                {row.verified ? " · verified" : ""}
              </p>
              <h2 className="mt-1 text-hub-section font-semibold">{row.title || "Review"}</h2>
              <p className="mt-1 text-hub-body text-muted">{row.body}</p>
              {row.reply ? (
                <p className="mt-3 border-l-2 border-red pl-3 text-hub-body text-ink">
                  <span className="font-mono text-hub-label uppercase text-muted">Your reply · </span>
                  {row.reply}
                </p>
              ) : null}
            </div>
            <div className="text-right">
              <p className="font-mono text-hub-label uppercase text-muted">{row.status}</p>
              <p className="mt-1 text-hub-label text-muted">{row.userName}</p>
            </div>
          </div>
          <div className="mt-4 border-t border-hairline pt-3">
            <RowActions id={row.id} status={row.status} replied={row.reply !== null} />
          </div>
        </article>
      ))}
    </div>
  );
}
