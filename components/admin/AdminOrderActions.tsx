"use client";

import { useState } from "react";

import { deliverOrderAction, packOrderAction, shipOrderAction } from "@/lib/admin/actions";
import { Button } from "@/components/ui/Button";

export function AdminOrderActions({ orderId, status }: { orderId: string; status: string }) {
  const [message, setMessage] = useState("");
  return (
    <div className="mt-8 max-w-md space-y-4">
      <p className="text-small text-mist">Current status {status.replaceAll("_", " ")}</p>
      {message ? <p className="text-small text-aqua">{message}</p> : null}
      <form action={async () => { await packOrderAction(orderId); }}>
        <Button type="submit" variant="outline">Mark packed</Button>
      </form>
      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void shipOrderAction({
            orderId,
            carrier: String(form.get("carrier") ?? ""),
            tracking: String(form.get("tracking") ?? ""),
          }).then((result) => setMessage(result.ok ? "Shipped. Customer email queued." : result.error.message));
        }}
      >
        <input name="carrier" required placeholder="Carrier" className="h-12 border border-hairline bg-transparent px-3 outline-none" />
        <input name="tracking" required placeholder="Tracking number" className="h-12 border border-hairline bg-transparent px-3 outline-none" />
        <Button type="submit" variant="primary">Mark shipped</Button>
      </form>
      <form action={async () => { await deliverOrderAction(orderId); }}>
        <Button type="submit" variant="ghost">Mark delivered</Button>
      </form>
    </div>
  );
}
