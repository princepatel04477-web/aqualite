"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { shipOrderAction } from "@/lib/admin/actions";

export function SellerOrderRowAction({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [pending, setPending] = useState(false);

  if (!["paid", "cod_confirmed", "packed"].includes(currentStatus)) {
    return (
      <span className="font-mono text-eyebrow uppercase text-mist">
        {currentStatus.replaceAll("_", " ")}
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void shipOrderAction({
          orderId,
          carrier: "Delhivery",
          tracking: `DLV-${orderId.slice(0, 6).toUpperCase()}`,
        }).then((res) => {
          setPending(false);
          if (res.ok) {
            setCurrentStatus("shipped");
            router.refresh();
          }
        });
      }}
      className="rounded-pill bg-red px-3 py-1.5 font-mono text-eyebrow uppercase text-on-red transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Shipping…" : "Confirm shipment"}
    </button>
  );
}
