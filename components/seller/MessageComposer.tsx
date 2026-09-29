"use client";

import { useRef, useState, useTransition } from "react";

import { closeThread, replyToThread } from "@/lib/hub/messages/actions";

export function MessageComposer({
  threadId,
  templates,
  demoChannel,
}: {
  threadId: string;
  templates: { id: string; title: string; body: string }[];
  demoChannel: boolean;
}) {
  const [body, setBody] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertTemplate = (id: string): void => {
    setTemplateId(id);
    const template = templates.find((row) => row.id === id);
    if (template) {
      setBody((current) => (current.trim().length ? current : template.body));
      textareaRef.current?.focus();
    }
  };

  return (
    <div className="rounded-hub border border-hairline bg-paper p-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="font-mono text-hub-label uppercase text-muted" htmlFor="template-picker">
          Template
        </label>
        <select
          id="template-picker"
          value={templateId}
          onChange={(event) => insertTemplate(event.target.value)}
          className="h-8 rounded-control border border-rule bg-paper px-2 text-hub-body text-ink"
        >
          <option value="">None</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.title}
            </option>
          ))}
        </select>
        {demoChannel ? (
          <span className="font-mono text-hub-label uppercase text-muted">
            Demo mode · replies land in the outbox
          </span>
        ) : null}
      </div>
      <form
        className="mt-3"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            const result = await replyToThread({ threadId, body, templateId: templateId || undefined });
            if (result.ok) {
              setBody("");
              setStatus(result.data.demo ? "Reply saved to the outbox (demo email)." : "Reply emailed to the customer.");
            } else {
              setStatus(result.error.message);
            }
          });
        }}
      >
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={4}
          maxLength={8000}
          placeholder="Write your reply — the customer receives it by email and can answer back to this thread."
          className="w-full rounded-control border border-rule bg-paper px-3 py-2 text-hub-body text-ink outline-none focus:border-red"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={pending || body.trim().length === 0}
            className="rounded-control bg-red px-4 py-2 font-mono text-hub-label uppercase text-on-red transition-colors duration-quick hover:bg-red-deep disabled:opacity-60"
          >
            {pending ? "Sending…" : "Send reply"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await closeThread(threadId);
                setStatus(result.ok ? "Thread closed." : result.error.message);
              })
            }
            className="rounded-control border border-rule px-4 py-2 font-mono text-hub-label uppercase text-muted transition-colors duration-quick hover:bg-linen hover:text-ink disabled:opacity-60"
          >
            Close thread
          </button>
          {status ? (
            <p role="status" className="text-hub-label text-muted">
              {status}
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
