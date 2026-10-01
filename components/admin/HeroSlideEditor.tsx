"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Reorder } from "motion/react";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { reorderHeroSlidesAction, saveHeroSlideAction } from "@/lib/admin/hero-actions";
import { cn } from "@/lib/cn";
import { contrastRatio, hexToRgb, readTokenChannels, type Rgb } from "@/lib/color/contrast";
import { formatINR } from "@/lib/money";
import { HERO_LEAD_MAX, heroRouteError, heroSlideInputSchema, type HeroSlideInput, type HeroSlideRow } from "@/lib/validation/hero";

export type HeroColourwayOption = {
  colorwayId: string;
  slug: string;
  name: string;
  pricePaise: number;
  mrpPaise: number;
  image: string;
  soldOut: boolean;
};

export type HeroProductOption = {
  productId: string;
  slug: string;
  name: string;
  colorways: HeroColourwayOption[];
};

type EditorDraft = Omit<HeroSlideRow, "id" | "sort" | "updatedAt"> & { id?: string };

const uploadResponse = z.object({ path: z.string(), width: z.number(), height: z.number() });

function toInput(row: HeroSlideRow): HeroSlideInput {
  return {
    id: row.id,
    isActive: row.isActive,
    productId: row.productId,
    colorwayId: row.colorwayId,
    eyebrow: row.eyebrow,
    headlineBefore: row.headlineBefore,
    headlineItalic: row.headlineItalic,
    headlineAfter: row.headlineAfter,
    lead: row.lead,
    glowHex: row.glowHex,
    imageDesktopPath: row.imageDesktopPath,
    imageMobilePath: row.imageMobilePath,
    imageAlt: row.imageAlt,
    focalX: row.focalX,
    focalY: row.focalY,
    shoeMaskPath: row.shoeMaskPath,
    ctaPrimaryLabel: row.ctaPrimaryLabel,
    ctaPrimaryHref: row.ctaPrimaryHref,
    ctaSecondaryLabel: row.ctaSecondaryLabel,
    ctaSecondaryHref: row.ctaSecondaryHref,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
  };
}

/* Contrast of the slide's glowHex against the page surface (--ivory, read
   from tokens at mount — no hex literals in code). Returns null during SSR. */
function glowContrast(hex: string, backdrop: Rgb | null): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb || !backdrop) return null;
  return Math.round(contrastRatio(rgb, backdrop) * 10) / 10;
}

/* Tokens never change at runtime, so a cached snapshot + no-op subscribe
   make getComputedStyle reads safe inside useSyncExternalStore. */
const NO_SUBSCRIBE = (): (() => void) => () => {};
let ivoryBackdrop: Rgb | null | undefined;
function getIvoryBackdrop(): Rgb | null {
  if (ivoryBackdrop === undefined) ivoryBackdrop = readTokenChannels("--ivory");
  return ivoryBackdrop;
}
function getNoBackdrop(): Rgb | null {
  return null;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function scheduleLabel(row: HeroSlideRow): string {
  if (!row.startsAt && !row.endsAt) return "Always on";
  const format = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16).replace("T", " ") : "—");
  return `${format(row.startsAt)} → ${format(row.endsAt)}`;
}

function Label({ text, hint }: { text: string; hint?: string }) {
  return (
    <p className="flex items-baseline justify-between font-mono text-eyebrow uppercase text-mist">
      <span>{text}</span>
      {hint ? <span className="normal-case tracking-normal">{hint}</span> : null}
    </p>
  );
}

const fieldClass =
  "mt-2 w-full border border-hairline bg-transparent px-3 py-2 font-body text-small text-foam outline-none focus:border-foam";

export function HeroSlideEditor({
  slides,
  options,
}: {
  slides: HeroSlideRow[];
  options: HeroProductOption[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<HeroSlideRow[]>(slides);
  const itemsRef = useRef(items);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditorDraft | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"desktop" | "mobile" | null>(null);
  const [dragging, setDragging] = useState(false);
  /* Backdrop channels read once on the client; null during SSR/hydration
     (no mismatch — useSyncExternalStore re-renders with the snapshot). */
  const backdrop = useSyncExternalStore(NO_SUBSCRIBE, getIvoryBackdrop, getNoBackdrop);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const productById = useMemo(() => new Map(options.map((option) => [option.productId, option])), [options]);

  const patch = (changes: Partial<EditorDraft>): void => {
    setDraft((current) => (current ? { ...current, ...changes } : current));
  };

  const persistOrder = async (): Promise<void> => {
    const ids = itemsRef.current.map((item) => item.id);
    const result = await reorderHeroSlidesAction(ids);
    if (!result.ok) {
      setNotice({ tone: "error", text: result.error.message });
      return;
    }
    setNotice({ tone: "ok", text: "Order saved." });
    router.refresh();
  };

  const toggleActive = async (row: HeroSlideRow): Promise<void> => {
    const result = await saveHeroSlideAction({ ...toInput(row), isActive: !row.isActive });
    if (!result.ok) {
      setNotice({ tone: "error", text: result.error.message });
      return;
    }
    setItems((current) =>
      current.map((item) => (item.id === row.id ? { ...item, isActive: !row.isActive } : item)),
    );
    setNotice({ tone: "ok", text: `${row.id} is now ${row.isActive ? "hidden" : "active"}.` });
    router.refresh();
  };

  const startEdit = (row: HeroSlideRow): void => {
    setEditingId(row.id);
    setDraft({ ...toInput(row) });
    setNotice(null);
  };

  const startCreate = (): void => {
    const first = options[0];
    const colorway = first?.colorways[0];
    setEditingId("new");
    setDraft({
      isActive: false,
      productId: first?.productId ?? "",
      colorwayId: colorway?.colorwayId ?? "",
      eyebrow: "Monsoon '26",
      headlineBefore: "",
      headlineItalic: "",
      headlineAfter: "",
      lead: "",
      glowHex: "#1E7F78",
      imageDesktopPath: "",
      imageMobilePath: "",
      imageAlt: "",
      focalX: 0.5,
      focalY: 0.45,
      shoeMaskPath: null,
      ctaPrimaryLabel: "Shop",
      ctaPrimaryHref: "/shop",
      ctaSecondaryLabel: "All",
      ctaSecondaryHref: "/shop",
      startsAt: null,
      endsAt: null,
    });
    setNotice(null);
  };

  const upload = async (slot: "desktop" | "mobile", file: File): Promise<void> => {
    setUploading(slot);
    setNotice(null);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("kind", slot);
      const response = await fetch("/api/admin/upload", { method: "POST", body });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = z.object({ message: z.string() }).safeParse(payload).success
          ? (payload as { message: string }).message
          : "Upload failed. Check the file and try again.";
        setNotice({ tone: "error", text: message });
        return;
      }
      const parsed = uploadResponse.safeParse(payload);
      if (!parsed.success) {
        setNotice({ tone: "error", text: "Unexpected upload response." });
        return;
      }
      patch(slot === "desktop" ? { imageDesktopPath: parsed.data.path } : { imageMobilePath: parsed.data.path });
      setNotice({ tone: "ok", text: `Uploaded ${parsed.data.width}×${parsed.data.height}.` });
    } finally {
      setUploading(null);
    }
  };

  const saveDraft = async (): Promise<void> => {
    if (!draft) return;
    const parsed = heroSlideInputSchema.safeParse({ ...draft, id: draft.id || undefined });
    if (!parsed.success) {
      setNotice({ tone: "error", text: parsed.error.issues[0]?.message ?? "Check the highlighted fields." });
      return;
    }
    for (const href of [parsed.data.ctaPrimaryHref, parsed.data.ctaSecondaryHref]) {
      const routeProblem = heroRouteError(href);
      if (routeProblem) {
        setNotice({ tone: "error", text: routeProblem });
        return;
      }
    }
    setSaving(true);
    const result = await saveHeroSlideAction(parsed.data);
    setSaving(false);
    if (!result.ok) {
      setNotice({ tone: "error", text: result.error.message });
      return;
    }
    setEditingId(null);
    setDraft(null);
    setNotice({ tone: "ok", text: "Slide saved." });
    router.refresh();
  };

  const draftProduct = draft ? productById.get(draft.productId) : undefined;
  const draftColorways = draftProduct?.colorways ?? [];
  const primaryRoute = draft ? heroRouteError(draft.ctaPrimaryHref) : null;
  const secondaryRoute = draft ? heroRouteError(draft.ctaSecondaryHref) : null;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-eyebrow uppercase text-mist">
          {items.length} slides · {items.filter((item) => item.isActive).length} active · drag to reorder
        </p>
        <Button variant="outline" onClick={startCreate}>
          New slide
        </Button>
      </div>

      {notice ? (
        <p className={cn("mt-4 border px-4 py-2 font-mono text-size", notice.tone === "ok" ? "border-hairline text-mist" : "border-danger/40 text-danger")}>
          {notice.text}
        </p>
      ) : null}

      <Reorder.Group
        axis="y"
        values={items}
        onReorder={(next) => {
          setItems(next);
          setDragging(true);
        }}
        className="mt-6 divide-y divide-hairline border border-hairline"
      >
        {items.map((row) => {
          const product = productById.get(row.productId);
          const colorway = product?.colorways.find((item) => item.colorwayId === row.colorwayId);
          return (
            <Reorder.Item
              key={row.id}
              value={row}
              onDragEnd={() => {
                setDragging(false);
                void persistOrder();
              }}
              className={cn("bg-abyss", dragging && "relative z-sticky")}
            >
              <div className="flex flex-wrap items-center gap-4 p-4">
                <span className="cursor-grab select-none font-mono text-eyebrow text-mist" aria-hidden="true">
                  ::
                </span>
                <span className="stage block h-12 w-10 shrink-0 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={colorway?.image ?? ""} alt="" className="h-full w-full object-cover" />
                </span>
                <span className="min-w-40 flex-1">
                  <span className="block font-mono text-eyebrow uppercase text-foam">
                    {product?.name ?? row.productId} · {colorway?.name ?? row.colorwayId}
                  </span>
                  <span className="mt-1 block font-mono text-eyebrow text-mist">
                    {scheduleLabel(row)} · updated {row.updatedAt.slice(0, 16).replace("T", " ")}
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={row.isActive}
                  onClick={() => void toggleActive(row)}
                  className={cn(
                    "h-11 border px-4 font-mono text-eyebrow uppercase",
                    row.isActive ? "border-success/60 text-success" : "border-hairline text-mist",
                  )}
                >
                  {row.isActive ? "Active" : "Hidden"}
                </button>
                <Button variant="ghost" onClick={() => startEdit(row)}>
                  Edit
                </Button>
              </div>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>

      {draft ? (
        <div className="mt-8 border border-hairline p-6">
          <p className="font-display text-h3 text-foam">
            {draft.id ? "Edit slide" : "New slide"}
          </p>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <Label text="Product" />
              <select
                className={fieldClass}
                value={draft.productId}
                onChange={(event) => {
                  const next = productById.get(event.target.value);
                  patch({
                    productId: event.target.value,
                    colorwayId: next?.colorways[0]?.colorwayId ?? "",
                  });
                }}
              >
                {options.map((option) => (
                  <option key={option.productId} value={option.productId} className="bg-abyss">
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label text="Colourway" hint={draftColorways.find((item) => item.colorwayId === draft.colorwayId)?.soldOut ? "Sold out — slide will be hidden" : undefined} />
              <select
                className={fieldClass}
                value={draft.colorwayId}
                onChange={(event) => patch({ colorwayId: event.target.value })}
              >
                {draftColorways.map((colorway) => (
                  <option key={colorway.colorwayId} value={colorway.colorwayId} className="bg-abyss">
                    {colorway.name} — {formatINR(colorway.pricePaise)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6">
            <Label text="Headline — one italic phrase, rendered live" />
            <div className="mt-2 border border-hairline p-5">
              <p className="heading-display font-display text-h2 text-foam">
                {draft.headlineBefore}
                <em>{draft.headlineItalic}</em>
                {draft.headlineAfter}
              </p>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <input
                className={fieldClass}
                value={draft.headlineBefore}
                maxLength={80}
                placeholder="Before"
                aria-label="Headline before the italic phrase"
                onChange={(event) => patch({ headlineBefore: event.target.value })}
              />
              <input
                className={cn(fieldClass, "italic")}
                value={draft.headlineItalic}
                maxLength={48}
                placeholder="Italic phrase"
                aria-label="Headline italic phrase"
                onChange={(event) => patch({ headlineItalic: event.target.value })}
              />
              <input
                className={fieldClass}
                value={draft.headlineAfter}
                maxLength={80}
                placeholder="After"
                aria-label="Headline after the italic phrase"
                onChange={(event) => patch({ headlineAfter: event.target.value })}
              />
            </div>
          </div>

          <div className="mt-6">
            <Label text={`Lead — ${draft.lead.length}/${HERO_LEAD_MAX}`} hint={draft.lead.length >= HERO_LEAD_MAX ? "At the limit" : undefined} />
            <textarea
              className={cn(fieldClass, "min-h-24")}
              value={draft.lead}
              maxLength={HERO_LEAD_MAX}
              onChange={(event) => patch({ lead: event.target.value })}
            />
          </div>

          <div className="mt-6">
            <Label text="Eyebrow" />
            <input
              className={fieldClass}
              value={draft.eyebrow}
              maxLength={40}
              onChange={(event) => patch({ eyebrow: event.target.value })}
            />
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <Label
                text="Glow colour"
                hint={`${glowContrast(draft.glowHex, backdrop) ?? "…"}:1 on ivory`}
              />
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="color"
                  aria-label="Glow colour picker"
                  value={draft.glowHex}
                  onChange={(event) => patch({ glowHex: event.target.value.toUpperCase() })}
                  className="h-11 w-14 border border-hairline bg-transparent"
                />
                <input
                  className={fieldClass}
                  value={draft.glowHex}
                  maxLength={7}
                  aria-label="Glow hex value"
                  onChange={(event) => {
                    const value = event.target.value;
                    patch({ glowHex: value.startsWith("#") ? value : `#${value}` });
                  }}
                />
              </div>
              <div
                className="mt-3 h-20 border border-hairline"
                style={{
                  background: `radial-gradient(ellipse at 58% 42%, ${draft.glowHex} 0%, rgb(var(--abyss)) 72%)`,
                }}
                role="img"
                aria-label={`Glow preview over abyss: ${draft.glowHex}`}
              />
            </div>
            <div>
              <Label text="Focal point — click the image" hint={`${draft.focalX.toFixed(2)} / ${draft.focalY.toFixed(2)}`} />
              <button
                type="button"
                className="relative mt-2 block aspect-video w-full cursor-crosshair overflow-hidden border border-hairline bg-trench"
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  patch({
                    focalX: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
                    focalY: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
                  });
                }}
                aria-label="Set focal point on the desktop hero image"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={draft.imageDesktopPath}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ objectPosition: `${draft.focalX * 100}% ${draft.focalY * 100}%` }}
                />
                <span
                  aria-hidden="true"
                  className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 border border-aqua"
                  style={{ left: `${draft.focalX * 100}%`, top: `${draft.focalY * 100}%` }}
                />
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {(["desktop", "mobile"] as const).map((slot) => {
              const path = slot === "desktop" ? draft.imageDesktopPath : draft.imageMobilePath;
              return (
                <div key={slot}>
                  <Label text={`${slot} image`} hint={slot === "desktop" ? "min 2560×1440" : "min 1080×1350"} />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    disabled={uploading !== null}
                    className="mt-2 w-full border border-hairline p-2 font-mono text-eyebrow text-mist file:mr-3 file:border file:border-hairline file:bg-transparent file:px-3 file:py-2 file:font-mono file:text-eyebrow file:text-foam"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void upload(slot, file);
                    }}
                  />
                  <p className="mt-2 break-all font-mono text-eyebrow text-mist">
                    {uploading === slot ? "Uploading…" : path || "No image set"}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-6">
            <Label text="Alt text — required" hint={`${draft.imageAlt.length}/200`} />
            <input
              className={fieldClass}
              value={draft.imageAlt}
              maxLength={200}
              onChange={(event) => patch({ imageAlt: event.target.value })}
            />
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <Label text="Primary CTA" hint={primaryRoute ?? undefined} />
              <div className="mt-2 flex gap-3">
                <input
                  className={cn(fieldClass, "w-32")}
                  value={draft.ctaPrimaryLabel}
                  maxLength={28}
                  aria-label="Primary CTA label"
                  onChange={(event) => patch({ ctaPrimaryLabel: event.target.value })}
                />
                <input
                  className={cn(fieldClass, primaryRoute ? "border-danger" : "")}
                  value={draft.ctaPrimaryHref}
                  aria-label="Primary CTA href"
                  onChange={(event) => patch({ ctaPrimaryHref: event.target.value })}
                />
              </div>
            </div>
            <div>
              <Label text="Secondary CTA" hint={secondaryRoute ?? undefined} />
              <div className="mt-2 flex gap-3">
                <input
                  className={cn(fieldClass, "w-32")}
                  value={draft.ctaSecondaryLabel}
                  maxLength={28}
                  aria-label="Secondary CTA label"
                  onChange={(event) => patch({ ctaSecondaryLabel: event.target.value })}
                />
                <input
                  className={cn(fieldClass, secondaryRoute ? "border-danger" : "")}
                  value={draft.ctaSecondaryHref}
                  aria-label="Secondary CTA href"
                  onChange={(event) => patch({ ctaSecondaryHref: event.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div>
              <Label text="Starts at" />
              <input
                type="datetime-local"
                className={fieldClass}
                value={toLocalInput(draft.startsAt)}
                onChange={(event) => patch({ startsAt: fromLocalInput(event.target.value) })}
              />
            </div>
            <div>
              <Label text="Ends at" />
              <input
                type="datetime-local"
                className={fieldClass}
                value={toLocalInput(draft.endsAt)}
                onChange={(event) => patch({ endsAt: fromLocalInput(event.target.value) })}
              />
            </div>
            <div>
              <Label text="Visibility" />
              <button
                type="button"
                role="switch"
                aria-checked={draft.isActive}
                onClick={() => patch({ isActive: !draft.isActive })}
                className={cn(
                  "mt-2 h-11 w-full border px-4 font-mono text-eyebrow uppercase",
                  draft.isActive ? "border-success/60 text-success" : "border-hairline text-mist",
                )}
              >
                {draft.isActive ? "Active" : "Hidden"}
              </button>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <Button variant="primary" loading={saving} onClick={() => void saveDraft()}>
              Save slide
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setEditingId(null);
                setDraft(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <p className="mt-6 font-mono text-eyebrow text-mist">
        {editingId ? "Editing " + editingId : "Prices, names and thumbnails are read live from the catalogue — never stored here."}
      </p>
    </div>
  );
}
