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
 *
 * Preserves inline <em> markup: words inside an emphasis keep it (wrapped in
 * a new <em>), so italic display phrases survive line splitting.
 */
export function splitLines(element: HTMLElement): SplitResult {
  const original = element.innerHTML;

  type Word = { text: string; italic: boolean };
  const words: Word[] = [];
  element.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      for (const word of (node.textContent ?? "").split(/\s+/).filter(Boolean)) {
        words.push({ text: word, italic: false });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const italic = (node as HTMLElement).tagName === "EM";
      for (const word of (node.textContent ?? "").split(/\s+/).filter(Boolean)) {
        words.push({ text: word, italic });
      }
    }
  });

  element.textContent = "";
  const wordEls: HTMLElement[] = [];
  words.forEach((word, index) => {
    let span: HTMLElement;
    if (word.italic) {
      const em = document.createElement("em");
      span = document.createElement("span");
      span.textContent = word.text;
      em.appendChild(span);
      element.appendChild(em);
    } else {
      span = document.createElement("span");
      span.textContent = word.text;
      element.appendChild(span);
    }
    span.style.display = "inline-block";
    span.setAttribute("aria-hidden", "true");
    wordEls.push(span);
    if (index < words.length - 1) {
      element.appendChild(document.createTextNode(" "));
    }
  });

  const lines: HTMLElement[] = [];
  let currentTop: number | null = null;
  let bucket: HTMLElement[] = [];

  const flush = (): void => {
    if (bucket.length === 0) return;
    const mask = document.createElement("span");
    mask.style.display = "block";
    mask.style.overflow = "hidden";
    const inner = document.createElement("span");
    inner.style.display = "block";
    inner.setAttribute("aria-hidden", "true");
    bucket.forEach((word, index) => {
      // Re-wrap emphasised words in <em> inside the line so styling holds.
      const parent = word.parentElement;
      if (parent && parent.tagName === "EM" && parent.parentElement === element) {
        inner.appendChild(parent);
      } else {
        inner.appendChild(word);
      }
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
