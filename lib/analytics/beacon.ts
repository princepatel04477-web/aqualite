/**
 * Storefront beacon — the entire client-side analytics footprint.
 * Kept under 1 KB gzipped (see tests/unit/track.test.ts). No dependencies,
 * no framework imports, works from any component.
 */

const KEY = "aq_sid";

function sid(): string {
  const hit = document.cookie.match(/(?:^|;\s*)aq_sid=([^;]+)/);
  if (hit && hit[1]) return hit[1];
  const id = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
  document.cookie = KEY + "=" + id + ";path=/;max-age=2592000;SameSite=Lax";
  return id;
}

export function track(type: string, extra?: { productId?: string; orderId?: string; valuePaise?: number }): void {
  if (typeof navigator === "undefined" || !navigator.sendBeacon) return;
  const body = JSON.stringify({
    id: Math.random().toString(36).slice(2, 12) + Date.now().toString(36),
    type: type,
    path: location.pathname.slice(0, 200),
    sid: sid(),
    ref: document.referrer ? new URL(document.referrer).host : undefined,
    productId: extra && extra.productId,
    orderId: extra && extra.orderId,
    valuePaise: extra && extra.valuePaise,
  });
  navigator.sendBeacon("/api/track", body);
}
