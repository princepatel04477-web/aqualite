"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function OrderStatusPoller({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => {
      router.refresh();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [active, router]);

  if (!active) return null;

  return (
    <p className="mt-2 font-mono text-eyebrow uppercase text-aqua" role="status">
      Confirming payment status…
    </p>
  );
}
