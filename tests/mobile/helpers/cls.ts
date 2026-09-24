import type { Page } from "@playwright/test";

export interface LayoutShiftEntry {
  value: number;
  hadRecentInput: boolean;
  node?: string;
}

export interface LongTask {
  duration: number;
  startTime: number;
}

/**
 * Check e: layout shift.
 * Collects cumulative-layout-shift entries during load + a few seconds
 * of idle. `hadRecentInput` entries are excluded from the CLS sum per
 * spec, but we still report them.
 */
export async function observeLayoutShifts(
  page: Page,
  ms = 3000,
): Promise<LayoutShiftEntry[]> {
  return page.evaluate((duration: number): Promise<LayoutShiftEntry[]> => {
    return new Promise((resolve) => {
      const entries: LayoutShiftEntry[] = [];
      try {
        const po = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const ls = entry as PerformanceEntry & {
              value: number;
              hadRecentInput: boolean;
              sources?: Array<{ node?: Node }>;
            };
            entries.push({
              value: Math.round(ls.value * 1000) / 1000,
              hadRecentInput: ls.hadRecentInput,
              node: ls.sources?.[0]?.node
                ? (ls.sources[0].node as Element).tagName.toLowerCase()
                : undefined,
            });
          }
        });
        po.observe({ type: "layout-shift", buffered: true });
        window.setTimeout(() => {
          po.disconnect();
          resolve(entries);
        }, duration);
      } catch {
        resolve(entries);
      }
    });
  }, ms);
}

/**
 * Check h: long tasks.
 * Tasks > 50ms block the main thread and hurt INP/TBT. Captured during
 * the first 5s of idle (a fling-scroll pass can be added later).
 */
export async function findLongTasks(
  page: Page,
  ms = 5000,
): Promise<LongTask[]> {
  return page.evaluate((duration: number): Promise<LongTask[]> => {
    return new Promise((resolve) => {
      const tasks: LongTask[] = [];
      try {
        const po = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            tasks.push({
              duration: Math.round(entry.duration * 100) / 100,
              startTime: Math.round(entry.startTime * 100) / 100,
            });
          }
        });
        po.observe({ type: "longtask", buffered: true });
        window.setTimeout(() => {
          po.disconnect();
          resolve(tasks);
        }, duration);
      } catch {
        resolve(tasks);
      }
    });
  }, ms);
}
