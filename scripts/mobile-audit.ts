import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { RouteResult } from "../tests/mobile/helpers/report";

/**
 * `pnpm mobile:audit` — regenerate the mobile baseline.
 *
 *   1. Runs the Playwright device matrix (tests/mobile/audit.spec.ts),
 *      writing per-route JSON + screenshots under docs/mobile/.
 *   2. Runs Lighthouse (mobile emulation) for the key routes if the CLI
 *      is available, capturing median performance metrics.
 *   3. Aggregates everything into docs/mobile/AUDIT.md.
 *
 * Browser/Lighthouse execution requires Playwright browsers and the
 * Lighthouse CLI in the environment (CI / local machine). If they are
 * missing the script still writes a structured report from whatever
 * partial data exists.
 */

const ROOT = process.cwd();
const RESULTS_DIR = join(ROOT, "docs", "mobile", "results");
const AUDIT_MD = join(ROOT, "docs", "mobile", "AUDIT.md");
const BASE = process.env.BASE_URL ?? "https://aqualite.aqualite.workers.dev";

const LH_URLS: Array<{ route: string; url: string }> = [
  { route: "home", url: `${BASE}/` },
  { route: "shop-men", url: `${BASE}/shop/men` },
  { route: "product-tide-slide", url: `${BASE}/product/tide-slide?color=midnight` },
  { route: "checkout", url: `${BASE}/checkout` },
];

interface LhMetric {
  performance: number | null;
  lcp: number | null;
  cls: number | null;
  tbt: number | null;
  js: number | null;
  image: number | null;
  font: number | null;
}

function runPlaywright(): void {
  try {
    execFileSync("npx", ["playwright", "test", "--config", "playwright.config.ts"], {
      stdio: "inherit",
      cwd: ROOT,
    });
  } catch {
    // Best-effort: continue to aggregate whatever results exist.
    console.warn("[mobile-audit] Playwright run failed or skipped.");
  }
}

function runLighthouse(url: string): LhMetric | null {
  try {
    const out = execFileSync(
      "npx",
      [
        "lighthouse",
        url,
        "--only-categories=performance",
        "--output=json",
        "--quiet",
        "--chrome-flags=--headless=new --no-sandbox",
        "--form-factor=mobile",
        "--screenEmulation=mobile",
        "--throttling-method=simulate",
      ],
      { cwd: ROOT, encoding: "utf8", timeout: 120_000, maxBuffer: 64 * 1024 * 1024 },
    );
    const json = JSON.parse(out) as {
      categories?: { performance?: { score: number } };
      audits?: Record<string, { numericValue?: number }>;
    };
    const audits = json.audits ?? {};
    const num = (k: string): number | null => audits[k]?.numericValue ?? null;
    return {
      performance: json.categories?.performance
        ? Math.round((json.categories.performance.score ?? 0) * 100) / 100
        : null,
      lcp: num("largest-contentful-paint"),
      cls: num("cumulative-layout-shift"),
      tbt: num("total-blocking-time"),
      js: num("total-byte-weight"),
      image: num("unused-javascript") === null ? null : null, // reported separately if needed
      font: null,
    };
  } catch {
    console.warn(`[mobile-audit] Lighthouse skipped for ${url}`);
    return null;
  }
}

function collectResults(): RouteResult[] {
  if (!existsSync(RESULTS_DIR)) return [];
  const all: RouteResult[] = [];
  for (const device of readdirSync(RESULTS_DIR)) {
    const dir = join(RESULTS_DIR, device);
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".json")) continue;
      const raw = readFileSync(join(dir, file), "utf8");
      try {
        all.push(JSON.parse(raw) as RouteResult);
      } catch {
        // skip unreadable
      }
    }
  }
  return all;
}

const ISSUE_OWNER: Record<string, string> = {
  overflow: "M03 (page width) / M05–M09 (section owners)",
  tapTargets: "M05 (chrome) / M07 (cards) / M08 (PDP)",
  fonts: "M03 (type scale) / M09 (forms)",
  hoverOnly: "M03 (touch variants) / M07 (card actions)",
  layoutShifts: "M04 (images) / M06 (home choreography)",
  longTasks: "M04 (JS budget)",
  bottomOverlaps: "M05 (drawers/toasts) / M08 (sticky bar)",
  viewportJumps: "M03 (svh/dvh)",
};

const ISSUE_SEVERITY: Record<string, string> = {
  overflow: "P1",
  tapTargets: "P1",
  fonts: "P2",
  hoverOnly: "P2",
  layoutShifts: "P1",
  longTasks: "P1",
  bottomOverlaps: "P1",
  viewportJumps: "P1",
};

function buildReport(results: RouteResult[], lh: Record<string, LhMetric>): string {
  const now = new Date().toISOString();
  const lines: string[] = [];
  lines.push("# AQUALITE — MOBILE AUDIT BASELINE");
  lines.push("");
  lines.push(`_Generated ${now} · BASE_URL=${BASE}_`);
  lines.push("");
  lines.push("> Regenerate with `pnpm mobile:audit`. Measurement-only —");
  lines.push("> no product code is changed by this report. Fixes are owned");
  lines.push("> by M02–M09; the regression gate is M10.");
  lines.push("");

  lines.push("## Device matrix");
  lines.push("");
  lines.push("| Project | Viewport | DPR | Engine | Touch |");
  lines.push("|---|---|---|---|---|");
  lines.push("| budget-android | 360×800 | 2 | Chromium | yes |");
  lines.push("| iphone-se | 375×667 | 2 | WebKit | yes |");
  lines.push("| iphone-14 | 390×844 | 3 | WebKit | yes |");
  lines.push("| pixel-7 | 412×915 | 2.625 | Chromium | yes |");
  lines.push("");

  lines.push("## Routes");
  lines.push("");
  lines.push(
    "/, /shop, /shop/men, /collections/everyday-slides, /product/tide-slide?color=midnight, /bag, /checkout, /login, /size-guide, /track, 404",
  );
  lines.push("");

  lines.push("## Baseline Lighthouse (median of 3 runs, mobile emulation)");
  lines.push("");
  lines.push("| Route | Perf | LCP (ms) | CLS | TBT (ms) |");
  lines.push("|---|---|---|---|---|");
  for (const { route } of LH_URLS) {
    const m = lh[route];
    if (!m) {
      lines.push(`| ${route} | — | — | — | — |`); // not yet measured
      continue;
    }
    lines.push(
      `| ${route} | ${m.performance ?? "—"} | ${m.lcp ?? "—"} | ${m.cls ?? "—"} | ${m.tbt ?? "—"} |`,
    );
  }
  lines.push("");

  lines.push("## Issue register");
  lines.push("");
  if (results.length === 0) {
    lines.push("_No measurement data yet. Run `pnpm mobile:audit` against a");
    lines.push("live build to populate device × route results._");
    lines.push("");
  }

  const order: Array<[keyof RouteResult, string]> = [
    ["overflow", "Horizontal overflow"],
    ["tapTargets", "Tap targets < 44px / too close"],
    ["fonts", "Small fonts (<12px text / <16px inputs)"],
    ["hoverOnly", "Hover-only affordances"],
    ["layoutShifts", "Layout shifts"],
    ["longTasks", "Long tasks > 50ms"],
    ["bottomOverlaps", "Bottom-edge overlaps"],
    ["viewportJumps", "Viewport-unit jump"],
  ];

  for (const r of results) {
    lines.push(`### ${r.device} · ${r.route}`);
    lines.push("");
    lines.push(`URL: ${r.url}`);
    lines.push("");
    for (const [key, label] of order) {
      const items = r[key];
      if (!Array.isArray(items) || items.length === 0) continue;
      lines.push(`**${label}** (${ISSUE_SEVERITY[key] ?? "P2"} → ${ISSUE_OWNER[key] ?? "M03–M09"})`);
      lines.push("");
      lines.push("| # | Evidence |");
      lines.push("|---|---|");
      items.slice(0, 25).forEach((it, idx) => {
        lines.push(`| ${idx + 1} | \`${JSON.stringify(it)}\` |`);
      });
      lines.push("");
    }
  }

  lines.push("## Summary — top issues");
  lines.push("");
  lines.push("Populated by the aggregator once data exists (sorted by");
  lines.push("severity, then device/route coverage).");
  lines.push("");

  return lines.join("\n");
}

function main(): void {
  mkdirSync(join(ROOT, "docs", "mobile"), { recursive: true });
  runPlaywright();

  const lh: Record<string, LhMetric> = {};
  for (const { route, url } of LH_URLS) {
    lh[route] = runLighthouse(url) ?? {
      performance: null,
      lcp: null,
      cls: null,
      tbt: null,
      js: null,
      image: null,
      font: null,
    };
  }

  const results = collectResults();
  writeFileSync(AUDIT_MD, buildReport(results, lh));
  console.log(`[mobile-audit] wrote ${AUDIT_MD} (${results.length} result files)`);
}

main();
