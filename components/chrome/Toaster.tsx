"use client";

import { AnimatePresence, motion } from "motion/react";

import { useCart } from "@/components/cart/CartProvider";
import { duration, ease } from "@/lib/motion/tokens";

export function Toaster() {
  const { toasts, dismiss } = useCart();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-toast flex w-[min(100%-2rem,22rem)] flex-col gap-2 max-sm:left-1/2 max-sm:right-auto max-sm:-translate-x-1/2" aria-live="polite">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.button
            key={toast.id}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: duration.quick, ease: ease.tide }}
            onClick={() => dismiss(toast.id)}
            className="pointer-events-auto border border-hairline bg-trench px-4 py-3 text-left"
          >
            <span className="font-mono text-eyebrow uppercase text-aqua">Note</span>
            <span className="mt-1 block font-body text-small text-foam">{toast.message}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
