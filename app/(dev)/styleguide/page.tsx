"use client";

import { useState, useSyncExternalStore } from "react";

import { Badge } from "@/components/ui/Badge";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Field } from "@/components/ui/Field";
import { Hairline } from "@/components/ui/Hairline";
import { IconAlertTriangle, IconInfoCircle } from "@/components/ui/Icons";
import { Kbd } from "@/components/ui/Kbd";
import { Price } from "@/components/ui/Price";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusPill } from "@/components/ui/StatusPill";
import { Switch } from "@/components/ui/Switch";
import { Tabs } from "@/components/ui/Tabs";
import { Tag } from "@/components/ui/Tag";
import { Tooltip } from "@/components/ui/Tooltip";
import { Wordmark } from "@/components/ui/Wordmark";
import { cn } from "@/lib/cn";
import { contrastRatio, readTokenChannels, type Rgb } from "@/lib/color/contrast";
import { formatINR } from "@/lib/money";

/* ------------------------------------------------------------------ colour */

const TEXT_TOKENS = [
  "--ink",
  "--ink-2",
  "--muted",
  "--red",
  "--red-ink",
  "--success",
  "--warning",
  "--danger",
  "--info",
] as const;

const SURFACE_TOKENS = ["--ivory", "--paper", "--linen"] as const;

const ON_STRONG_TOKENS = [
  { fg: "--on-red", bg: ["--red", "--red-deep"] },
] as const;

const TINT_PAIRS = [
  { fg: "--success", bg: "--success-tint" },
  { fg: "--warning", bg: "--warning-tint" },
  { fg: "--danger", bg: "--danger-tint" },
  { fg: "--info", bg: "--info-tint" },
] as const;

const SWATCH_TOKENS = [
  "--ivory",
  "--paper",
  "--linen",
  "--porcelain",
  "--hairline",
  "--rule",
  "--ink",
  "--ink-2",
  "--muted",
  "--red",
  "--red-deep",
  "--red-ink",
  "--red-tint",
  "--success",
  "--warning",
  "--danger",
  "--info",
] as const;

function toHex(rgb: Rgb): string {
  return `#${rgb
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

const AA = 4.5;

/* Token colours are static CSS — read them once per client session through
   useSyncExternalStore (null/empty on the server, no hydration mismatch). */
const TOKEN_NAMES: readonly string[] = [
  ...new Set([
    ...TEXT_TOKENS,
    ...SURFACE_TOKENS,
    ...ON_STRONG_TOKENS.flatMap((t) => t.bg),
    ...TINT_PAIRS.flatMap((t) => [t.fg, t.bg]),
    ...SWATCH_TOKENS,
  ]),
];
const NO_SUBSCRIBE = (): (() => void) => () => {};
const EMPTY_COLORS: Record<string, Rgb | null> = {};
let colorsCache: Record<string, Rgb | null> | null = null;
function readTokenColors(): Record<string, Rgb | null> {
  if (!colorsCache) {
    const next: Record<string, Rgb | null> = {};
    for (const name of TOKEN_NAMES) next[name] = readTokenChannels(name);
    colorsCache = next;
  }
  return colorsCache;
}
function serverTokenColors(): Record<string, Rgb | null> {
  return EMPTY_COLORS;
}

/* ------------------------------------------------------------------- views */

type View = "store" | "hub";

const VIEW_TABS = [
  { id: "store", label: "Storefront" },
  { id: "hub", label: "Seller Hub" },
];

const demoRows = [
  { sku: "AQ-1042", product: "Reef Runner", status: "Delivered", paise: 499000, updated: "12 Sep" },
  { sku: "AQ-2210", product: "Tide Boot", status: "Out of stock", paise: 649000, updated: "26 Sep" },
  { sku: "AQ-3115", product: "Coral Knit", status: "Pending", paise: 299000, updated: "28 Sep" },
  { sku: "AQ-0987", product: "Lagoon Slide", status: "Cancelled", paise: 199000, updated: "29 Sep" },
];

/* Dense sample table — 36px compact / 44px default row heights. */
function DenseTable({
  rowHeight,
  selected,
  onSelect,
}: {
  rowHeight: string;
  selected: string;
  onSelect: (sku: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-hub border border-hairline bg-paper shadow-1">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-linen text-hub-label uppercase text-ink-2">
            <th className="w-10 px-3 py-0">
              <span className="sr-only">Select</span>
            </th>
            <th className="px-3 py-0 font-medium">SKU</th>
            <th className="px-3 py-0 font-medium">Product</th>
            <th className="px-3 py-0 font-medium">Status</th>
            <th className="px-3 py-0 text-right font-medium">Price</th>
            <th className="px-3 py-0 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody className="text-hub-table text-ink-2">
          {demoRows.map((row) => {
            const isSelected = row.sku === selected;
            return (
              <tr
                key={row.sku}
                onClick={() => onSelect(row.sku)}
                className={cn(
                  rowHeight,
                  "cursor-pointer border-b border-hairline transition-colors duration-instant last:border-b-0",
                  isSelected ? "bg-red-tint text-ink" : "hover:bg-linen",
                  row.sku === "AQ-0987" && !isSelected && "bg-linen/60",
                )}
              >
                <td className="px-3">
                  <span
                    className={cn(
                      "inline-block size-4 rounded-panel border bg-paper align-middle",
                      isSelected ? "border-red bg-red" : "border-rule",
                    )}
                    aria-hidden="true"
                  />
                </td>
                <td className="px-3 font-mono text-hub-id text-ink">{row.sku}</td>
                <td className="px-3">{row.product}</td>
                <td className="px-3">
                  <StatusPill status={row.status} />
                </td>
                <td className="px-3 text-right tabular text-ink">{formatINR(row.paise)}</td>
                <td className="px-3 font-mono text-hub-id text-muted">{row.updated}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Styleguide() {
  const [view, setView] = useState<View>("store");
  const colors = useSyncExternalStore(NO_SUBSCRIBE, readTokenColors, serverTokenColors);
  const [demoSwitch, setDemoSwitch] = useState(true);
  const [demoRow, setDemoRow] = useState("AQ-2210");

  const inputCls =
    "h-9 w-full rounded-control border border-rule bg-paper px-3 font-body text-hub-body text-ink transition-colors duration-quick placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-50";

  function ratio(fg: string, bg: string) {
    const a = colors[fg];
    const b = colors[bg];
    if (!a || !b) return null;
    return contrastRatio(a, b);
  }

  const storeTypeSamples: [string, string][] = [
    ["text-hero", "Tide, set free"],
    ["text-display", "Made for the water"],
    ["text-h1", "The shelf edit"],
    ["text-h2", "Built to move"],
    ["text-h3", "Reef Runner"],
    ["text-lead", "Legible, generous, calm — the storefront scale is unchanged by S01."],
    ["text-body", "Body copy sits at 1rem / 1.6 in Instrument Sans."],
    ["text-small", "Small print — captions, tax notes, footnotes."],
    ["text-eyebrow", "Eyebrow — mono, tracked, uppercase"],
  ];

  const hubTypeSamples: [string, string][] = [
    ["text-hub-title", "Orders — all marketplaces"],
    ["text-hub-section", "Fulfilment queue"],
    ["text-hub-body", "Primary UI copy: labels, table text, form values."],
    ["text-hub-table", "Dense table row — tabular figures 0123456789"],
    ["text-hub-label", "FIELD LABEL · META · BADGE"],
    ["text-hub-id", "AQ-1042 / order_A73F"],
    ["text-hub-kpi", "₹1,24,890"],
  ];

  const orderStatuses = [
    "Pending",
    "Unshipped",
    "Shipped",
    "Delivered",
    "Cancelled",
    "Refunded",
    "Return requested",
  ];
  const listingStatuses = ["Active", "Inactive", "Out of stock", "Suppressed"];

  return (
    <main className="min-h-dvh bg-ivory text-ink">
      <div className="page-wrap py-10">
        {/* ------------------------------------------------------------ head */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Wordmark />
            <h1 className="text-hub-title">Aqualite Design System — Ivory &amp; Red (S01)</h1>
            <p className="text-hub-body text-muted">
              Tokens, primitives and both type scales. Every ratio below is computed at runtime from
              styles/tokens.css via <span className="font-mono text-hub-id">getComputedStyle</span> — WCAG AA needs{" "}
              {AA.toFixed(1)}:1 for text.
            </p>
          </div>
          <Tabs tabs={VIEW_TABS} value={view} onChange={(id) => setView(id as View)} label="Styleguide view" />
        </header>

        <Hairline className="my-8" />

        {/* ---------------------------------------------------------- colour */}
        <section className="flex flex-col gap-4">
          <h2 className="text-hub-section">Colour — swatches</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {SWATCH_TOKENS.map((token) => {
              const rgb = colors[token];
              return (
                <div key={token} className="overflow-hidden rounded-hub border border-hairline bg-paper">
                  <div className="h-14 border-b border-hairline" style={{ background: rgb ? `rgb(${rgb.join(" ")})` : undefined }} />
                  <div className="flex flex-col gap-0.5 p-2.5">
                    <span className="text-hub-label text-ink">{token.replace("--", "")}</span>
                    <span className="font-mono text-hub-id text-muted">{rgb ? toHex(rgb) : "…"}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <h2 className="mt-4 text-hub-section">Contrast — text tokens on ivory / paper / linen</h2>
          <div className="overflow-x-auto rounded-hub border border-hairline bg-paper shadow-1">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-linen text-hub-label uppercase text-ink-2">
                  <th className="px-4 py-2 font-medium">Token</th>
                  {SURFACE_TOKENS.map((surface) => (
                    <th key={surface} className="px-4 py-2 font-medium">
                      on {surface.replace("--", "")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-hub-table">
                {TEXT_TOKENS.map((token) => (
                  <tr key={token} className="h-11 border-b border-hairline last:border-b-0">
                    <td className="px-4">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-block size-3.5 rounded-panel border border-hairline"
                          style={{ background: colors[token] ? `rgb(${(colors[token] as Rgb).join(" ")})` : undefined }}
                        />
                        <span className="font-mono text-hub-id text-ink">{token.replace("--", "")}</span>
                      </span>
                    </td>
                    {SURFACE_TOKENS.map((surface) => {
                      const value = ratio(token, surface);
                      return (
                        <td key={surface} className="px-4">
                          {value === null ? (
                            <span className="text-muted">…</span>
                          ) : (
                            <span className={cn("font-mono text-hub-id", value >= AA ? "text-success" : "text-danger")}>
                              {value.toFixed(2)}:1 {value >= AA ? "PASS" : "FAIL"}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {ON_STRONG_TOKENS.map((row) =>
                  row.bg.map((bg) => (
                    <tr key={`${row.fg}-${bg}`} className="h-11 border-b border-hairline last:border-b-0">
                      <td className="px-4">
                        <span className="font-mono text-hub-id text-ink">
                          {row.fg.replace("--", "")} on {bg.replace("--", "")}
                        </span>
                      </td>
                      <td className="px-4" colSpan={2}>
                        {(() => {
                          const value = ratio(row.fg, bg);
                          return value === null ? (
                            <span className="text-muted">…</span>
                          ) : (
                            <span className={cn("font-mono text-hub-id", value >= AA ? "text-success" : "text-danger")}>
                              {value.toFixed(2)}:1 {value >= AA ? "PASS" : "FAIL"}
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  )),
                )}
                {TINT_PAIRS.map((pair) => (
                  <tr key={`${pair.fg}-on-${pair.bg}`} className="h-11 border-b border-hairline last:border-b-0">
                    <td className="px-4">
                      <span className="font-mono text-hub-id text-ink">
                        {pair.fg.replace("--", "")} on {pair.bg.replace("--", "")} (status pills)
                      </span>
                    </td>
                    <td className="px-4" colSpan={2}>
                      {(() => {
                        const value = ratio(pair.fg, pair.bg);
                        return value === null ? (
                          <span className="text-muted">…</span>
                        ) : (
                          <span className={cn("font-mono text-hub-id", value >= AA ? "text-success" : "text-danger")}>
                            {value.toFixed(2)}:1 {value >= AA ? "PASS" : "FAIL"}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <Hairline className="my-8" />

        {/* ------------------------------------------------------ storefront */}
        {view === "store" ? (
          <section className="flex flex-col gap-10">
            <div className="flex flex-col gap-4">
              <h2 className="text-hub-section">Type scale — storefront (fluid, unchanged)</h2>
              <div className="flex flex-col gap-4 rounded-hub border border-hairline bg-paper p-6">
                {storeTypeSamples.map(([cls, sample]) => (
                  <div key={cls} className="flex flex-col gap-1 border-b border-hairline pb-3 last:border-b-0 last:pb-0">
                    <span className="font-mono text-hub-id text-muted">{cls}</span>
                    <p className={cn("heading-display font-display text-ink", cls)}>{sample}</p>
                  </div>
                ))}
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-hub-id text-muted">.heading-display em → --red-ink</span>
                  <p className="heading-display text-h2 font-display text-ink">
                    The tide turns <em>red</em> only where it matters.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h2 className="text-hub-section">Button — variants, sizes, states</h2>
              <p className="text-hub-body text-muted">
                Sizes: sm 32 · md 36 · lg 48 (default lg for storefront CTAs). Press: scale .98 +
                --red-deep. Focus: tab to any button — 2px --red ring, ink ring on red fills.
                Loading keeps width.
              </p>
              <div className="flex flex-col gap-6 rounded-hub border border-hairline bg-paper p-6">
                {(["primary", "secondary", "ghost", "danger", "link"] as const).map((variant) => (
                  <div key={variant} className="flex flex-col gap-2">
                    <span className="font-mono text-hub-id text-muted">variant=&quot;{variant}&quot;</span>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button variant={variant} size="sm">
                        Sm 32
                      </Button>
                      <Button variant={variant} size="md">
                        Md 36
                      </Button>
                      <Button variant={variant} size="lg">
                        Lg 48
                      </Button>
                      <Button variant={variant} size="md" disabled>
                        Disabled
                      </Button>
                      {variant !== "link" ? (
                        <Button variant={variant} size="md" loading>
                          Loading
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-4 rounded-hub border border-hairline bg-paper p-6">
                <h2 className="text-hub-section">Eyebrow · Tag · Hairline</h2>
                <Eyebrow index="01" total="09">
                  Section counter
                </Eyebrow>
                <div className="flex flex-wrap items-center gap-4">
                  <Tag>New</Tag>
                  <Tag>Sold out</Tag>
                  <Tag>Last few</Tag>
                </div>
                <Hairline />
                <p className="text-hub-body text-muted">
                  Eyebrow: --muted label, index in --red. Tags: New = --red-ink, Sold out = --muted,
                  Last few = --warning.
                </p>
              </div>
              <div className="flex flex-col gap-4 rounded-hub border border-hairline bg-paper p-6">
                <h2 className="text-hub-section">Price · Wordmark</h2>
                <Price paise={499000} mrpPaise={649000} tax />
                <Price paise={499000} mrpPaise={649000} size="lg" />
                <div className="flex items-end gap-6">
                  <Wordmark />
                  <Wordmark tone="ink" />
                </div>
                <p className="text-hub-body text-muted">
                  Price: ink figure, MRP strike + % off in --red-ink. Wordmark tone &quot;red&quot;
                  (default) or &quot;ink&quot; — red is the only storefront accent.
                </p>
              </div>
            </div>
          </section>
        ) : (
          /* ------------------------------------------------------- seller hub */
          <section className="flex flex-col gap-10">
            <div className="flex flex-col gap-4">
              <h2 className="text-hub-section">Type scale — Seller Hub (dense)</h2>
              <div className="flex flex-col gap-4 rounded-hub border border-hairline bg-paper p-6">
                {hubTypeSamples.map(([cls, sample]) => (
                  <div key={cls} className="flex flex-col gap-1 border-b border-hairline pb-3 last:border-b-0 last:pb-0">
                    <span className="font-mono text-hub-id text-muted">{cls}</span>
                    <p className={cn(cls, cls === "text-hub-title" ? "text-ink" : "text-ink-2")}>{sample}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-5 rounded-hub border border-hairline bg-paper p-6">
                <h2 className="text-hub-section">Field · Select · Checkbox · Switch</h2>
                <Field label="Ship-from pincode" hint="Used to estimate dispatch date." required>
                  {(id) => <input id={id} defaultValue="400001" className={inputCls} />}
                </Field>
                <Field label="Order id" error="Order id must be 10 characters.">
                  {(id) => <input id={id} defaultValue="A7" className={cn(inputCls, "border-danger")} />}
                </Field>
                <Field label="Disabled">
                  {(id) => <input id={id} defaultValue="Read only" disabled className={inputCls} />}
                </Field>
                <Select
                  options={[
                    { value: "all", label: "All channels" },
                    { value: "store", label: "aqualite.com" },
                    { value: "market", label: "Marketplaces" },
                  ]}
                  defaultValue="all"
                  aria-label="Channel"
                />
                <div className="flex flex-wrap items-center gap-5">
                  <Checkbox label="Select all" defaultChecked />
                  <Checkbox label="Individual" />
                  <Checkbox label="Disabled" disabled />
                </div>
                <div className="flex items-center gap-4">
                  <Switch checked={demoSwitch} onCheckedChange={setDemoSwitch} />
                  <span className="text-hub-body text-ink-2">{demoSwitch ? "On" : "Off"}</span>
                  <Switch checked={false} onCheckedChange={() => undefined} disabled />
                </div>
              </div>

              <div className="flex flex-col gap-5 rounded-hub border border-hairline bg-paper p-6">
                <h2 className="text-hub-section">Badge · StatusPill · Kbd · Tooltip</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>Neutral</Badge>
                  <Badge tone="brand">Brand</Badge>
                  <Badge tone="success">Success</Badge>
                  <Badge tone="warning">Warning</Badge>
                  <Badge tone="danger">Danger</Badge>
                  <Badge tone="info">Info</Badge>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="font-mono text-hub-id text-muted">orders</span>
                  <div className="flex flex-wrap gap-2">
                    {orderStatuses.map((status) => (
                      <StatusPill key={status} status={status} />
                    ))}
                  </div>
                  <span className="mt-2 font-mono text-hub-id text-muted">listings</span>
                  <div className="flex flex-wrap gap-2">
                    {listingStatuses.map((status) => (
                      <StatusPill key={status} status={status} />
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-hub-body text-ink-2">
                    Press <Kbd>⌘</Kbd> <Kbd>K</Kbd> to search
                  </span>
                  <Tooltip content="Cancellation window closes in 2h">
                    <Button variant="secondary" size="sm" radius="control">
                      Hover me
                    </Button>
                  </Tooltip>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-4 rounded-hub border border-hairline bg-paper p-6">
                <h2 className="text-hub-section">Banner</h2>
                <Banner tone="info" title="Payment settlement in progress">
                  Payout <span className="font-mono text-hub-id">PO-7741</span> clears tomorrow.
                </Banner>
                <Banner tone="success" title="Listing live">
                  Reef Runner is now visible on aqualite.com.
                </Banner>
                <Banner
                  tone="warning"
                  title="Stock running low"
                  action={
                    <Button variant="secondary" size="sm" radius="control">
                      Restock
                    </Button>
                  }
                >
                  3 units left across all channels.
                </Banner>
                <Banner tone="danger" title="Payment failed" onDismiss={() => undefined}>
                  Order <span className="font-mono text-hub-id">AQ-3115</span> was not captured.
                </Banner>
                <div className="flex items-center gap-2 text-hub-body text-ink-2">
                  <IconInfoCircle className="size-4 text-info" aria-hidden="true" />
                  <IconAlertTriangle className="size-4 text-warning" aria-hidden="true" />
                  <span>status icons ship inside Banner / StatusPill — status is never colour-only</span>
                </div>
              </div>

              <div className="flex flex-col gap-4 rounded-hub border border-hairline bg-paper p-6">
                <h2 className="text-hub-section">Skeleton · Card · EmptyState</h2>
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Card className="p-4">
                  <p className="text-hub-body text-ink-2">
                    Card — paper, hairline, 6px radius, shadow-1.
                  </p>
                </Card>
                <EmptyState
                  title="No orders yet"
                  description="Orders appear here as soon as the first payment is captured."
                  action={
                    <Button variant="secondary" size="sm" radius="control">
                      View catalogue
                    </Button>
                  }
                />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h2 className="text-hub-section">Dense table — 36px (compact) and 44px (default) rows</h2>
              <p className="text-hub-body text-muted">
                13px tabular figures, mono ids, linen header, hairline rules. Row 2 shows selection
                (--red-tint); row 4 shows the hover surface (--linen). Click a row to move selection.
                Buttons here use size=&quot;sm&quot; radius=&quot;control&quot; (32px, 4px).
              </p>
              <div className="flex gap-3">
                <Button variant="primary" size="sm" radius="control">
                  Create listing
                </Button>
                <Button variant="secondary" size="sm" radius="control">
                  Export CSV
                </Button>
              </div>
              <DenseTable rowHeight="h-9" selected={demoRow} onSelect={setDemoRow} />
              <DenseTable rowHeight="h-11" selected={demoRow} onSelect={setDemoRow} />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
