"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { addToCartAction, removeFromCartAction, updateQtyAction } from "@/lib/cart/actions";
import type { CartSummary } from "@/lib/commerce/types";
import { getBagTarget } from "@/lib/motion/bag-target";
import { duration, ease } from "@/lib/motion/tokens";

type Toast = { id: string; message: string };

type CartApi = {
  summary: CartSummary;
  open: boolean;
  setOpen: (open: boolean) => void;
  add: (variantId: string, qty?: number, fly?: { image: string; from: DOMRect }) => Promise<boolean>;
  update: (variantId: string, qty: number) => Promise<void>;
  remove: (variantId: string) => Promise<void>;
  toast: (message: string) => void;
  toasts: Toast[];
  dismiss: (id: string) => void;
};

const CartContext = createContext<CartApi | null>(null);

export function useCart(): CartApi {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}

type Flight = { id: string; image: string; from: DOMRect; to: DOMRect };

export function CartProvider({ initial, children }: { initial: CartSummary; children: React.ReactNode }) {
  const [summary, setSummary] = useState(initial);
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [flight, setFlight] = useState<Flight | null>(null);

  const api = useMemo<CartApi>(() => {
    const toast = (message: string) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, message }]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== id));
      }, 4000);
    };
    return {
      summary,
      open,
      setOpen,
      toasts,
      dismiss: (id) => setToasts((current) => current.filter((item) => item.id !== id)),
      toast,
      add: async (variantId, qty = 1, fly) => {
        const previous = summary;
        setSummary({ ...summary, count: summary.count + qty });
        if (fly) {
          const bag = getBagTarget()?.getBoundingClientRect();
          if (bag) setFlight({ id: crypto.randomUUID(), image: fly.image, from: fly.from, to: bag });
        }
        const result = await addToCartAction({ variantId, qty });
        if (!result.ok) {
          setSummary(previous);
          setFlight(null);
          toast(result.error.message);
          return false;
        }
        setSummary(result.data);
        window.setTimeout(() => setOpen(true), 680);
        return true;
      },
      update: async (variantId, qty) => {
        const previous = summary;
        const result = await updateQtyAction({ variantId, qty });
        if (!result.ok) {
          setSummary(previous);
          toast(result.error.message);
          return;
        }
        setSummary(result.data);
      },
      remove: async (variantId) => {
        const previous = summary;
        const result = await removeFromCartAction({ variantId });
        if (!result.ok) {
          setSummary(previous);
          toast(result.error.message);
          return;
        }
        setSummary(result.data);
      },
    };
  }, [open, summary, toasts]);

  return (
    <CartContext.Provider value={api}>
      {children}
      <AnimatePresence>
        {flight ? (
          <motion.img
            key={flight.id}
            src={flight.image}
            alt=""
            className="pointer-events-none fixed z-toast rounded-panel object-cover"
            style={{ width: flight.from.width, height: flight.from.height, top: 0, left: 0 }}
            initial={{ x: flight.from.left, y: flight.from.top, scale: 1, opacity: 1, borderRadius: 2 }}
            animate={{
              x: flight.to.left + flight.to.width / 2 - flight.from.width * 0.09,
              y: flight.to.top,
              scale: 0.18,
              opacity: 0.9,
              borderRadius: 999,
            }}
            transition={{ duration: 0.7, ease: ease.tide }}
            onAnimationComplete={() => setFlight(null)}
          />
        ) : null}
      </AnimatePresence>
    </CartContext.Provider>
  );
}

void duration;
