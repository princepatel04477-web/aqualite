import Link from "next/link";
import { notFound } from "next/navigation";

import { MessageComposer } from "@/components/seller/MessageComposer";
import { replyChannel } from "@/lib/hub/messages/actions";
import { waitingHours } from "@/lib/hub/reports/view";
import {
  getThreadWithMessages,
  listSavedReplies,
} from "@/lib/store/engine";

export const metadata = { title: "Thread · Seller Hub" };
export const dynamic = "force-dynamic";

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await getThreadWithMessages(id);
  if (!found) notFound();
  const [templates, channel] = await Promise.all([listSavedReplies(), replyChannel()]);
  const { thread, messages } = found;

  const lastIn = [...messages].reverse().find((message) => message.direction === "in");
  const lastOut = [...messages].reverse().find((message) => message.direction === "out");
  const hoursWaiting = waitingHours(lastIn?.sentAt ?? null, lastOut?.sentAt ?? null);

  return (
    <div>
      <p className="font-mono text-hub-label uppercase text-muted">
        <Link href="/seller/performance/messages" className="hover:text-ink">
          Messages
        </Link>{" "}
        / {thread.subject}
      </p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-hub-title font-display">{thread.subject}</h1>
          <p className="mt-1 text-hub-body text-muted">
            {thread.customerEmail}
            {thread.orderId ? (
              <>
                {" · "}
                <span className="font-mono text-hub-id">order {thread.orderId}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-hub-label uppercase text-muted">{thread.status}</p>
          {hoursWaiting != null && hoursWaiting > 24 ? (
            <p className="mt-1 rounded-pill bg-danger-tint px-2 py-0.5 font-mono text-hub-label uppercase text-danger">
              {Math.round(hoursWaiting)}h unanswered
            </p>
          ) : hoursWaiting != null ? (
            <p className="mt-1 rounded-pill bg-success-tint px-2 py-0.5 font-mono text-hub-label uppercase text-success">
              {Math.round(hoursWaiting)}h waiting
            </p>
          ) : null}
        </div>
      </div>

      <section className="mt-6 space-y-3">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`rounded-hub border p-4 ${
              message.direction === "out"
                ? "border-red/30 bg-red-tint/40"
                : "border-hairline bg-paper"
            }`}
          >
            <p className="font-mono text-hub-label uppercase text-muted">
              {message.direction === "out" ? "You" : thread.customerEmail} · {message.sentVia} ·{" "}
              {message.sentAt.slice(0, 16).replace("T", " ")} IST
            </p>
            <p className="mt-2 whitespace-pre-wrap text-hub-body text-ink">{message.body}</p>
          </article>
        ))}
      </section>

      <div className="mt-6">
        <MessageComposer
          threadId={thread.id}
          templates={templates.map((template) => ({
            id: template.id,
            title: template.title,
            body: template.body,
          }))}
          demoChannel={channel === "demo"}
        />
      </div>
    </div>
  );
}
