"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

function registerOnce(): void {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger);
  if (process.env.NODE_ENV === "production") {
    gsap.config({ nullTargetWarn: false });
  }
  registered = true;
}

registerOnce();

export { gsap, ScrollTrigger };

export type SplitResult = {
  lines: HTMLElement[];
  revert: () => void;
};

/**
 * Line mask splitter. GSAP Club SplitText is not in the free package;
 * this is the project splitter every WetInk reveal uses.
 */
export function splitLines(element: HTMLElement): SplitResult {
  const original = element.innerHTML;
  const text = element.textContent ?? "";
  const words = text.split(/\s+/).filter(Boolean);
  element.textContent = "";
  const wordEls: HTMLSpanElement[] = [];
  words.forEach((word, index) => {
    const span = document.createElement("span");
    span.textContent = word;
    span.style.display = "inline-block";
    span.setAttribute("aria-hidden", "true");
    element.appendChild(span);
    wordEls.push(span);
    if (index < words.length - 1) {
      element.appendChild(document.createTextNode(" "));
    }
  });

  const lines: HTMLElement[] = [];
  let currentTop: number | null = null;
  let bucket: HTMLSpanElement[] = [];

  const flush = (): void => {
    if (bucket.length === 0) return;
    const mask = document.createElement("span");
    mask.style.display = "block";
    mask.style.overflow = "hidden";
    const inner = document.createElement("span");
    inner.style.display = "block";
    inner.setAttribute("aria-hidden", "true");
    bucket.forEach((word, index) => {
      inner.appendChild(word);
      if (index < bucket.length - 1) inner.appendChild(document.createTextNode(" "));
    });
    mask.appendChild(inner);
    lines.push(inner);
    element.appendChild(mask);
    bucket = [];
  };

  wordEls.forEach((word) => {
    const top = word.offsetTop;
    if (currentTop === null) currentTop = top;
    if (Math.abs(top - currentTop) > 2) {
      flush();
      currentTop = word.offsetTop;
    }
    bucket.push(word);
  });
  flush();

  return {
    lines,
    revert: () => {
      element.innerHTML = original;
    },
  };
}

export const SplitText = {
  create(element: HTMLElement): SplitResult {
    return splitLines(element);
  },
};
