"use client";

import { useState, useTransition } from "react";

import { sendOrderMessageAction } from "@/lib/account/messages";

export function CustomerMessageForm({ orderNumber }: { orderNumber: string }) {
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-6"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await sendOrderMessageAction({ orderNumber, body });
          if (result.ok) {
            setBody("");
            setStatus("Message sent — the team replies here and by email.");
          } else {
            setStatus(result.error.message);
          }
        });
      }}
    >
      <label htmlFor="order-message" className="font-mono text-eyebrow uppercase text-aqua">
        Message the team
      </label>
      <textarea
        id="order-message"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={3}
        maxLength={8000}
        placeholder="Ask anything about this order — delivery, sizing, returns…"
        className="mt-2 w-full rounded-control border border-hairline bg-paper px-3 py-2 text-body text-ink outline-none focus:border-red"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || body.trim().length === 0}
          className="rounded-control bg-red px-4 py-2 font-body font-medium uppercase text-on-red transition-colors duration-quick hover:bg-red-deep disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send"}
        </button>
        {status ? (
          <p role="status" className="text-small text-mist">
            {status}
          </p>
        ) : null}
      </div>
    </form>
  );
}
