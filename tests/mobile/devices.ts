import type { Project } from "@playwright/test";

/**
 * Mobile device matrix for the Aqualite audit harness.
 *
 * Four real-world profiles. Touch is the source of truth (isMobile +
 * hasTouch), never the user-agent string — the audit runs the same
 * checks against whatever device the project emulates.
 */

export const BASE_URL =
  process.env.BASE_URL ?? "https://aqualite.aqualite.workers.dev";

export interface RouteDef {
  /** Stable slug used for result + screenshot filenames. */
  name: string;
  /** Path or absolute URL under test. */
  path: string;
  /** Routes that require an item in the bag before measuring. */
  requiresBag?: boolean;
}

export const ROUTES: RouteDef[] = [
  { name: "home", path: "/" },
  { name: "shop", path: "/shop" },
  { name: "shop-men", path: "/shop/men" },
  { name: "collection-everyday-slides", path: "/collections/everyday-slides" },
  { name: "product-tide-slide", path: "/product/tide-slide?color=midnight" },
  { name: "bag", path: "/bag", requiresBag: true },
  { name: "checkout", path: "/checkout", requiresBag: true },
  { name: "login", path: "/login" },
  { name: "size-guide", path: "/size-guide" },
  { name: "track", path: "/track" },
  { name: "not-found", path: "/this-route-does-not-exist-404" },
];

const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 13; Moto G Power) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";

export const MOBILE_PROJECTS: Project[] = [
  {
    name: "budget-android",
    use: {
      browserName: "chromium",
      viewport: { width: 360, height: 800 },
      deviceScaleFactor: 2,
      hasTouch: true,
      isMobile: true,
      colorScheme: "dark",
      userAgent: ANDROID_UA,
    },
  },
  {
    name: "iphone-se",
    use: {
      browserName: "webkit",
      viewport: { width: 375, height: 667 },
      deviceScaleFactor: 2,
      hasTouch: true,
      isMobile: true,
      colorScheme: "dark",
      userAgent: IOS_UA,
    },
  },
  {
    name: "iphone-14",
    use: {
      browserName: "webkit",
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      hasTouch: true,
      isMobile: true,
      colorScheme: "dark",
      userAgent: IOS_UA,
    },
  },
  {
    name: "pixel-7",
    use: {
      browserName: "chromium",
      viewport: { width: 412, height: 915 },
      deviceScaleFactor: 2.625,
      hasTouch: true,
      isMobile: true,
      colorScheme: "dark",
      userAgent: ANDROID_UA,
    },
  },
];
