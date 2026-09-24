import { defineConfig } from "@playwright/test";

import { MOBILE_PROJECTS } from "./tests/mobile/devices";

/**
 * Mobile audit config. Runs the device matrix in tests/mobile against
 * BASE_URL (default the live workers.dev build; override for local).
 * Picks up the M01 audit spec and per-area acceptance specs (home since
 * M06); product e2e tests (when added) live in their own config.
 */
export default defineConfig({
  testDir: "./tests/mobile",
  testMatch: /.*\.spec\.ts/,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? "https://aqualite.aqualite.workers.dev",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: MOBILE_PROJECTS,
});
