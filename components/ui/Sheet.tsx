"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";

import { useLenis } from "@/components/motion/SmoothScroll";
import { IconClose } from "@/components/ui/Icons";
import { duration, ease } from "@/lib/motion/tokens";

/**
 * Bottom sheet shared by the touch quick-add, filter and sort sheets
 * (M07): grab handle, drag-down to close, Escape, scroll lock, and a
 * sticky footer slot padded into the safe area. Toaster (z-toast) sits
 * above it so the M05 added-card stays visible after adding.
 */
export function Sheet({
  open,
  onClose,
  label,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { lock, unlock } = useLenis();
  // Portal to <body> after mount: the sheet may be triggered from inside
  // cards whose reveal wrappers animate transforms, which would otherwise
  // become the containing block for the fixed dialog.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    lock();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unlock();
      window.removeEventListener("keydown", onKey);
    };
  }, [lock, onClose, open, unlock]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label={`Close ${label.toLowerCase()}`}
            className="fixed inset-0 z-drawer bg-abyss/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className="pb-safe fixed inset-x-0 bottom-0 z-drawer flex max-h-[92dvh] flex-col rounded-t-[16px] bg-trench"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: duration.base, ease: ease.tide }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_event, info) => {
              if (info.offset.y > 80 || info.velocity.y > 600) onClose();
            }}
          >
            <div className="flex justify-center pt-3" aria-hidden="true">
              <span className="h-1 w-10 rounded-pill bg-hairline" />
            </div>
            <div className="flex min-h-12 items-center justify-between border-b border-hairline px-5 py-3">
              <p className="font-mono text-eyebrow uppercase text-mist">
                {label}
              </p>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="-mr-2 grid h-11 w-11 place-items-center text-mist"
              >
                <IconClose />
              </button>
            </div>
            <div className="flex-1 overflow-auto px-5 py-4">{children}</div>
            {footer ? (
              <div className="border-t border-hairline px-5 py-3">{footer}</div>
            ) : null}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
