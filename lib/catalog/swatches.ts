/**
 * Colour-dot budget for touch cards (M07): at most three dots fit a
 * 2-column phone grid next to the "+N" overflow marker while keeping
 * 44px hit areas.
 */
export const MAX_SWATCH_DOTS = 3;

export function swatchDots<T>(items: T[]): { shown: T[]; extra: number } {
  return {
    shown: items.slice(0, MAX_SWATCH_DOTS),
    extra: Math.max(0, items.length - MAX_SWATCH_DOTS),
  };
}
