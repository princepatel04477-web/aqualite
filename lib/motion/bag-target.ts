let target: HTMLElement | null = null;

export function setBagTarget(node: HTMLElement | null): void {
  target = node;
}

export function getBagTarget(): HTMLElement | null {
  return target;
}
