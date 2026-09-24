const KEY = "aq-intro";

let done = false;
const waiters: Array<() => void> = [];

export function introSeen(): boolean {
  if (done) return true;
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(KEY) === "1";
}

export function whenIntroDone(fn: () => void): () => void {
  if (introSeen()) {
    fn();
    return () => undefined;
  }
  waiters.push(fn);
  return () => {
    const index = waiters.indexOf(fn);
    if (index >= 0) waiters.splice(index, 1);
  };
}

export function markIntroDone(): void {
  done = true;
  if (typeof window !== "undefined") window.sessionStorage.setItem(KEY, "1");
  const pending = waiters.splice(0);
  pending.forEach((fn) => fn());
}
