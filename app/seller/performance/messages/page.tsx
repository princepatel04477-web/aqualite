import Link from "next/link";

import { waitingHours } from "@/lib/hub/reports/view";
import { listMessagesForReport, listThreads, type MessageThread } from "@/lib/store/engine";

export const metadata = { title: "Messages · Seller Hub" };
export const dynamic = "force-dynamic";

type Row = {
  thread: MessageThread;
  lastIn: string | null;
  lastOut: string | null;
  messages: number;
  hoursWaiting: number | null;
};

function slaBadge(hoursWaiting: number | null, direction: "waiting" | "open" | "closed"): React.ReactNode {
  if (direction === "closed") {
    return <span className="font-mono text-hub-label uppercase text-muted">Closed</span>;
  }
  if (hoursWaiting == null) {
    return <span className="font-mono text-hub-label uppercase text-muted">—</span>;
  }
  if (hoursWaiting > 24) {
    return (
      <span className="rounded-pill bg-danger-tint px-2 py-0.5 font-mono text-hub-label uppercase text-danger">
        {Math.round(hoursWaiting)}h unanswered
      </span>
    );
  }
  return (
    <span className="rounded-pill bg-success-tint px-2 py-0.5 font-mono text-hub-label uppercase text-success">
      {Math.round(hoursWaiting)}h
    </span>
  );
}

export default async function MessagesPage() {
  const [threads, messages] = await Promise.all([listThreads(), listMessagesForReport()]);

  const rows: Row[] = threads
    .map((thread) => {
      const rowsInThread = messages.filter((message) => message.threadId === thread.id);
      const lastIn =
        [...rowsInThread].reverse().find((message) => message.direction === "in")?.sentAt ?? null;
      const lastOut =
        [...rowsInThread].reverse().find((message) => message.direction === "out")?.sentAt ?? null;
      return {
        thread,
        lastIn,
        lastOut,
        messages: rowsInThread.length,
        hoursWaiting: waitingHours(lastIn, lastOut),
      };
    })
    .sort((a, b) => b.thread.lastMessageAt.localeCompare(a.thread.lastMessageAt));

  const overdue = rows.filter((row) => (row.hoursWaiting ?? 0) > 24).length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-hub-title font-display">Buyer messages</h1>
          <p className="mt-1 text-hub-body text-muted">
            {rows.length} thread{rows.length === 1 ? "" : "s"}
            {overdue > 0 ? (
              <>
                {" · "}
                <span className="text-danger">
                  {overdue} over the 24h response target
                </span>
              </>
            ) : null}
          </p>
        </div>
      </div>

      <section className="mt-6 rounded-hub border border-hairline bg-paper">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-hub-table">
            <thead>
              <tr className="border-b border-hairline bg-linen text-left font-mono text-hub-label uppercase text-muted">
                <th className="px-4 py-2.5 font-medium">Subject</th>
                <th className="px-4 py-2.5 font-medium">Customer</th>
                <th className="px-4 py-2.5 text-right font-medium">Messages</th>
                <th className="px-4 py-2.5 font-medium">Last activity (IST)</th>
                <th className="px-4 py-2.5 font-medium">SLA</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted">
                    No messages yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.thread.id} className="border-b border-hairline last:border-0 hover:bg-linen/50">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/seller/performance/messages/${row.thread.id}`}
                        className="font-medium text-red-ink"
                      >
                        {row.thread.subject}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-muted">{row.thread.customerEmail}</td>
                    <td className="px-4 py-2.5 text-right tabular">{row.messages}</td>
                    <td className="px-4 py-2.5 font-mono text-hub-id text-muted">
                      {row.thread.lastMessageAt.slice(0, 16).replace("T", " ")}
                    </td>
                    <td className="px-4 py-2.5">{slaBadge(row.hoursWaiting, row.thread.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
