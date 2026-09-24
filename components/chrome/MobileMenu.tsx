"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";

import { duration, ease, stagger } from "@/lib/motion/tokens";
import { useMotionPolicy } from "@/lib/motion/use-motion-policy";
import { useLenis } from "@/components/motion/SmoothScroll";

const items = [
  { href: "/shop/men", label: "Men" },
  { href: "/shop/women", label: "Women" },
  { href: "/shop/kids", label: "Kids" },
  { href: "/collections/everyday-slides", label: "Slides" },
  { href: "/collections/new-season", label: "New in" },
];

const secondary = [
  { href: "/account", label: "Account" },
  { href: "/track", label: "Track order" },
  { href: "/contact", label: "Help" },
  { href: "/size-guide", label: "Size guide" },
];

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { reduced } = useMotionPolicy();
  const { lock, unlock } = useLenis();
  const panel = useRef<HTMLDivElement>(null);

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

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={panel}
          className="fixed inset-0 z-overlay bg-abyss"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? duration.quick : duration.base, ease: ease.tide }}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <div className="flex h-[var(--header-h)] items-center justify-between px-page">
            <p className="font-mono text-eyebrow uppercase text-mist">Menu</p>
            <button type="button" className="font-mono text-eyebrow uppercase" onClick={onClose}>
              Close
            </button>
          </div>
          <nav className="px-page pt-8">
            {items.map((item, index) => (
              <motion.div
                key={item.href}
                initial={reduced ? false : { y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: reduced ? 0 : index * stagger.base, duration: duration.base, ease: ease.tide }}
              >
                <Link href={item.href} onClick={onClose} className="flex items-baseline gap-4 border-b border-hairline py-4">
                  <span className="font-mono text-eyebrow text-aqua">0{index + 1}</span>
                  <span className="font-display text-h2">{item.label}</span>
                </Link>
              </motion.div>
            ))}
          </nav>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 px-page">
            {secondary.map((item) => (
              <Link key={item.href} href={item.href} onClick={onClose} className="link-draw font-body text-small text-mist">
                {item.label}
              </Link>
            ))}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
