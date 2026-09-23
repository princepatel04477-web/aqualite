"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";

import { spring } from "@/lib/motion/tokens";
import { useMotionPolicy } from "@/lib/motion/use-motion-policy";

export function RollingDigits({ value }: { value: number }) {
  const { reduced } = useMotionPolicy();
  const text = String(Math.max(0, value));
  const [shown, setShown] = useState(text);
  useEffect(() => setShown(text), [text]);
  if (reduced) return <span className="tabular">{shown}</span>;
  return (
    <span className="inline-flex overflow-hidden tabular" aria-label={shown}>
      {shown.split("").map((digit, index) => (
        <span key={`${index}-${shown.length}`} className="relative inline-block h-[1.1em] w-[0.62em] overflow-hidden">
          <motion.span
            className="absolute left-0 top-0 flex flex-col"
            initial={false}
            animate={{ y: `-${Number(digit) * 10}%` }}
            transition={spring.snappy}
          >
            {Array.from({ length: 10 }, (_, n) => (
              <span key={n} className="block h-[1.1em] leading-[1.1em]">
                {n}
              </span>
            ))}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
