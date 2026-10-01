"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { duration, ease } from "@/lib/motion/tokens";
import { useMotionPolicy } from "@/lib/motion/use-motion-policy";

export function AnnouncementBar({ messages }: { messages: string[] }) {
  const { reduced } = useMotionPolicy();
  const [index, setIndex] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (hidden || reduced || paused || messages.length < 2) return;
    const id = window.setInterval(() => setIndex((current) => (current + 1) % messages.length), 5000);
    return () => window.clearInterval(id);
  }, [hidden, messages.length, paused, reduced]);

  if (hidden || messages.length === 0) return null;
  const message = messages[index] ?? messages[0];

  return (
    <div
      className="relative flex h-8 items-center justify-center bg-trench px-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.p
          key={message}
          initial={false}
          animate={{ y: 0, opacity: 1 }}
          exit={reduced ? undefined : { y: "-100%", opacity: 0 }}
          transition={{ duration: duration.quick, ease: ease.tide }}
          className="font-mono text-eyebrow uppercase text-foam"
        >
          {message}
        </motion.p>
      </AnimatePresence>
      <button
        type="button"
        className="absolute right-3 font-mono text-eyebrow uppercase text-mist"
        onClick={() => setHidden(true)}
      >
        Close
      </button>
    </div>
  );
}
