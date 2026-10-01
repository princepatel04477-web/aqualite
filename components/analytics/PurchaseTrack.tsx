"use client";

import { useEffect } from "react";

import { track } from "@/lib/analytics/beacon";

/** Fires the purchase event once an order confirmation is on screen. */
export function PurchaseTrack({ orderId, valuePaise }: { orderId: string; valuePaise: number }) {
  useEffect(() => {
    track("purchase", { orderId, valuePaise });
  }, [orderId, valuePaise]);
  return null;
}
