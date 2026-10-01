"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { deliverOrderAction, packOrderAction, shipOrderAction } from "@/lib/admin/actions";

export function AdminOrderActions({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [carrier, setCarrier] = useState("Delhivery");
  const [tracking, setTracking] = useState(`DLV-${orderId.slice(0, 6).toUpperCase()}`);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <div className="mt-8 max-w-md space-y-4">
      <p className="text-small text-mist">
        Current status: <strong className="font-mono uppercase text-foam">{currentStatus.replaceAll("_", " ")}</strong>
      </p>
      {message ? (
        <p className="text-small text-aqua" role="status">
          {message}
        </p>
      ) : null}
      {["paid", "cod_confirmed"].includes(currentStatus) ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPending(true);
            void packOrderAction(orderId).then((res) => {
              setPending(false);
              if (res.ok) {
                setCurrentStatus("packed");
                setMessage("Marked packed.");
                router.refresh();
              } else {
                setMessage(res.error.message);
              }
            });
          }}
        >
          <Button type="submit" variant="outline" loading={pending}>
            Mark packed
          </Button>
        </form>
      ) : null}
      {["paid", "cod_confirmed", "packed"].includes(currentStatus) ? (
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            void shipOrderAction({
              orderId,
              carrier: carrier.trim() || "Delhivery",
              tracking: tracking.trim() || `DLV-${orderId.slice(0, 6).toUpperCase()}`,
            }).then((result) => {
              setPending(false);
              if (result.ok) {
                setCurrentStatus("shipped");
                setMessage("Shipped. Customer email queued.");
                router.refresh();
              } else {
                setMessage(result.error.message);
              }
            });
          }}
        >
          <input
            name="carrier"
            required
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            placeholder="Carrier"
            className="h-12 border border-hairline bg-transparent px-3 outline-none"
          />
          <input
            name="tracking"
            required
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="Tracking number"
            className="h-12 border border-hairline bg-transparent px-3 outline-none"
          />
          <Button type="submit" variant="primary" loading={pending}>
            Confirm shipment
          </Button>
        </form>
      ) : null}
      {currentStatus === "shipped" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPending(true);
            void deliverOrderAction(orderId).then((res) => {
              setPending(false);
              if (res.ok) {
                setCurrentStatus("delivered");
                setMessage("Marked delivered.");
                router.refresh();
              } else {
                setMessage(res.error.message);
              }
            });
          }}
        >
          <Button type="submit" variant="ghost" loading={pending}>
            Mark delivered
          </Button>
        </form>
      ) : null}
    </div>
  );
}
