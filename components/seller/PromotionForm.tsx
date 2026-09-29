"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { formatINR } from "@/lib/money";
import {
  automaticConflicts,
  quoteCartWithPromotions,
  type DiscountType,
  type Promotion,
  type PromotionScope,
} from "@/lib/pricing/promotions";
import {
  createPromotionAction,
  updatePromotionAction,
} from "@/lib/hub/promotions/actions";

type CatalogOption = { id: string; name: string };

export type PromotionFormCatalog = {
  products: CatalogOption[];
  categories: CatalogOption[];
  collections: CatalogOption[];
};

const SAMPLE_BAGS = [49900, 129900, 299900];
const PREVIEW_SHIPPING = { thresholdPaise: 99900, feePaise: 7900, codFeePaise: 4900 };

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function percentText(bps: number): string {
  return String(bps / 100);
}

export function PromotionForm({
  kind,
  initial,
  catalog,
  existing,
}: {
  kind: "coupon" | "automatic";
  initial?: Promotion;
  catalog: PromotionFormCatalog;
  existing: Promotion[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [discountType, setDiscountType] = useState<DiscountType>(initial?.discountType ?? "percent");
  const [percent, setPercent] = useState(initial && initial.discountType === "percent" ? percentText(initial.value) : "10");
  const [flat, setFlat] = useState(initial && initial.discountType === "flat" ? String(initial.value / 100) : "100");
  const [minSubtotal, setMinSubtotal] = useState(initial ? String(initial.minSubtotalPaise / 100) : "0");
  const [maxDiscount, setMaxDiscount] = useState(
    initial?.maxDiscountPaise != null ? String(initial.maxDiscountPaise / 100) : "",
  );
  const [appliesTo, setAppliesTo] = useState<PromotionScope>(initial?.appliesTo ?? "all");
  const [targetIds, setTargetIds] = useState<string[]>(initial?.targetIds ?? []);
  const [startsAt, setStartsAt] = useState(toLocalInput(initial?.startsAt ?? new Date().toISOString()));
  const [endsAt, setEndsAt] = useState(toLocalInput(initial?.endsAt ?? null));
  const [usageLimitTotal, setUsageLimitTotal] = useState(
    initial?.usageLimitTotal != null ? String(initial.usageLimitTotal) : "",
  );
  const [usageLimitPerCustomer, setUsageLimitPerCustomer] = useState(
    initial?.usageLimitPerCustomer != null ? String(initial.usageLimitPerCustomer) : "",
  );
  const [firstOrderOnly, setFirstOrderOnly] = useState(initial?.firstOrderOnly ?? false);
  const [stackable, setStackable] = useState(initial?.stackable ?? false);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const draft = useMemo<Promotion>(() => {
    const value =
      discountType === "percent"
        ? Math.round(Number(percent || "0") * 100)
        : discountType === "flat"
          ? Math.round(Number(flat || "0") * 100)
          : 0;
    return {
      id: initial?.id ?? "draft",
      kind,
      code: kind === "coupon" ? code.trim().toUpperCase() || null : null,
      name: name.trim() || "Untitled promotion",
      discountType,
      value: Number.isFinite(value) ? Math.max(0, value) : 0,
      minSubtotalPaise: Math.round(Number(minSubtotal || "0") * 100) || 0,
      maxDiscountPaise: maxDiscount.trim() ? Math.round(Number(maxDiscount) * 100) : null,
      appliesTo,
      targetIds,
      startsAt: fromLocalInput(startsAt) ?? new Date().toISOString(),
      endsAt: fromLocalInput(endsAt),
      usageLimitTotal: usageLimitTotal.trim() ? Number(usageLimitTotal) : null,
      usageLimitPerCustomer: usageLimitPerCustomer.trim() ? Number(usageLimitPerCustomer) : null,
      firstOrderOnly,
      stackable,
      isActive,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [
    appliesTo, code, discountType, endsAt, firstOrderOnly, flat, initial, kind, maxDiscount,
    minSubtotal, name, percent, stackable, startsAt, targetIds, usageLimitTotal, usageLimitPerCustomer, isActive,
  ]);

  const conflicts = useMemo(
    () => (kind === "automatic" ? automaticConflicts(existing, draft) : []),
    [draft, existing, kind],
  );

  const preview = useMemo(
    () =>
      SAMPLE_BAGS.map((bagPaise) => {
        const sampleTarget =
          appliesTo === "categories"
            ? { productId: "p-sample", category: targetIds[0] ?? "slides", collectionSlugs: [] }
            : appliesTo === "collections"
              ? { productId: "p-sample", category: "slides", collectionSlugs: [targetIds[0] ?? "new-season"] }
              : appliesTo === "products"
                ? { productId: targetIds[0] ?? "p-sample", category: "slides", collectionSlugs: [] }
                : { productId: "p-sample", category: "slides", collectionSlugs: [] };
        const quote = quoteCartWithPromotions({
          items: [
            {
              lineId: "preview",
              qty: 1,
              unitPricePaise: bagPaise,
              available: 5,
              ...sampleTarget,
            },
          ],
          code: kind === "coupon" ? draft.code : null,
          promotions: [draft],
          shipping: PREVIEW_SHIPPING,
          now: new Date(),
        });
        return { bagPaise, quote };
      }),
    [appliesTo, draft, kind, targetIds],
  );

  const toggleTarget = (id: string) => {
    setTargetIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const submit = () => {
    setPending(true);
    setError("");
    const payload = {
      kind,
      code: kind === "coupon" ? code.trim().toUpperCase() : null,
      name: name.trim(),
      discountType,
      value: draft.value,
      minSubtotalPaise: draft.minSubtotalPaise,
      maxDiscountPaise: draft.maxDiscountPaise,
      appliesTo,
      targetIds,
      startsAt: draft.startsAt,
      endsAt: draft.endsAt,
      usageLimitTotal: draft.usageLimitTotal,
      usageLimitPerCustomer: draft.usageLimitPerCustomer,
      firstOrderOnly,
      stackable,
      isActive,
    };
    const request = initial
      ? updatePromotionAction(initial.id, payload)
      : createPromotionAction(payload);
    void request.then((result) => {
      setPending(false);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      router.push("/seller/promotions");
      router.refresh();
    });
  };

  const targetOptions = appliesTo === "products" ? catalog.products : appliesTo === "categories" ? catalog.categories : catalog.collections;

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="space-y-5 lg:col-span-7">
        <Field label="Internal name" required hint="Only you see this.">
          {(id) => (
            <input
              id={id}
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              className="h-9 w-full rounded-control border border-rule bg-paper px-3 font-body text-hub-body"
            />
          )}
        </Field>
        {kind === "coupon" ? (
          <Field
            label="Coupon code"
            required
            hint="Customers type this in. 3–24 characters, stored upper-case."
            error={error.includes("code") ? "That code is already in use." : undefined}
          >
            {(id) => (
              <input
                id={id}
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                maxLength={24}
                placeholder="MONSOON10"
                className="h-9 w-full rounded-control border border-rule bg-paper px-3 font-mono text-hub-body uppercase"
              />
            )}
          </Field>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Discount type">
            {(id) => (
              <Select
                id={id}
                value={discountType}
                onChange={(event) => setDiscountType(event.target.value as DiscountType)}
                options={[
                  { value: "percent", label: "Percent off" },
                  { value: "flat", label: "Flat amount off" },
                  { value: "free_shipping", label: "Free shipping" },
                ]}
              />
            )}
          </Field>
          {discountType === "percent" ? (
            <Field label="Percent off" hint="0.5–100">
              {(id) => (
                <input
                  id={id}
                  type="number"
                  min={0.01}
                  max={100}
                  step={0.5}
                  value={percent}
                  onChange={(event) => setPercent(event.target.value)}
                  className="h-9 w-full rounded-control border border-rule bg-paper px-3 font-body text-hub-body tabular"
                />
              )}
            </Field>
          ) : null}
          {discountType === "flat" ? (
            <Field label="Amount off (₹)">
              {(id) => (
                <input
                  id={id}
                  type="number"
                  min={1}
                  step={1}
                  value={flat}
                  onChange={(event) => setFlat(event.target.value)}
                  className="h-9 w-full rounded-control border border-rule bg-paper px-3 font-body text-hub-body tabular"
                />
              )}
            </Field>
          ) : null}
          {discountType !== "free_shipping" ? (
            <Field label="Max discount (₹)" hint="Blank = no cap">
              {(id) => (
                <input
                  id={id}
                  type="number"
                  min={1}
                  step={1}
                  value={maxDiscount}
                  onChange={(event) => setMaxDiscount(event.target.value)}
                  className="h-9 w-full rounded-control border border-rule bg-paper px-3 font-body text-hub-body tabular"
                />
              )}
            </Field>
          ) : null}
        </div>

        <Field label="Minimum bag subtotal (₹)" hint="0 = any bag">
          {(id) => (
            <input
              id={id}
              type="number"
              min={0}
              step={1}
              value={minSubtotal}
              onChange={(event) => setMinSubtotal(event.target.value)}
              className="h-9 w-full rounded-control border border-rule bg-paper px-3 font-body text-hub-body tabular"
            />
          )}
        </Field>

        <Field label="Applies to">
          {(id) => (
            <Select
              id={id}
              value={appliesTo}
              onChange={(event) => {
                setAppliesTo(event.target.value as PromotionScope);
                setTargetIds([]);
              }}
              options={[
                { value: "all", label: "Everything in the bag" },
                { value: "categories", label: "Chosen categories" },
                { value: "products", label: "Chosen products" },
                { value: "collections", label: "Chosen collections" },
              ]}
            />
          )}
        </Field>
        {appliesTo !== "all" ? (
          <fieldset className="rounded-hub border border-hairline p-3">
            <legend className="px-1 font-mono text-hub-label uppercase text-muted">Targets</legend>
            <div className="max-h-56 overflow-y-auto">
              {targetOptions.map((option) => (
                <label key={option.id} className="flex items-center gap-2 py-1 text-hub-body">
                  <input
                    type="checkbox"
                    checked={targetIds.includes(option.id)}
                    onChange={() => toggleTarget(option.id)}
                    className="size-4 accent-red"
                  />
                  {option.name}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts" required>
            {(id) => (
              <input
                id={id}
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                className="h-9 w-full rounded-control border border-rule bg-paper px-3 font-body text-hub-body"
              />
            )}
          </Field>
          <Field label="Ends" hint="Blank = runs until you end it">
            {(id) => (
              <input
                id={id}
                type="datetime-local"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
                className="h-9 w-full rounded-control border border-rule bg-paper px-3 font-body text-hub-body"
              />
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Total uses" hint="Blank = unlimited">
            {(id) => (
              <input
                id={id}
                type="number"
                min={1}
                step={1}
                value={usageLimitTotal}
                onChange={(event) => setUsageLimitTotal(event.target.value)}
                className="h-9 w-full rounded-control border border-rule bg-paper px-3 font-body text-hub-body tabular"
              />
            )}
          </Field>
          <Field label="Uses per customer" hint="Blank = unlimited">
            {(id) => (
              <input
                id={id}
                type="number"
                min={1}
                step={1}
                value={usageLimitPerCustomer}
                onChange={(event) => setUsageLimitPerCustomer(event.target.value)}
                className="h-9 w-full rounded-control border border-rule bg-paper px-3 font-body text-hub-body tabular"
              />
            )}
          </Field>
        </div>

        <ToggleRow
          label="First order only"
          detail="Blocks customers who have ordered before."
          checked={firstOrderOnly}
          onChange={setFirstOrderOnly}
        />
        <ToggleRow
          label="Stacks with other offers"
          detail="Off by default. When off, the larger of this and any automatic offer applies alone."
          checked={stackable}
          onChange={setStackable}
        />
        <ToggleRow
          label="Active"
          detail="Paused promotions never apply, even inside their window."
          checked={isActive}
          onChange={setIsActive}
        />

        {error ? (
          <p role="alert" className="rounded-control bg-danger-tint px-3 py-2 text-hub-body text-danger">
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={pending}
            aria-busy={pending}
            onClick={submit}
            className="inline-flex h-9 items-center rounded-control bg-red px-5 font-body text-hub-body font-medium uppercase text-on-red transition-colors duration-quick hover:bg-red-deep disabled:opacity-50"
          >
            {initial ? "Save changes" : `Create ${kind === "coupon" ? "coupon" : "automatic promotion"}`}
          </button>
          <Link href="/seller/promotions" className="text-hub-body text-muted hover:text-ink">
            Cancel
          </Link>
        </div>
      </div>

      <aside className="space-y-4 lg:col-span-5">
        <div className="rounded-hub border border-hairline bg-paper p-5">
          <p className="font-mono text-hub-label uppercase text-muted">Live preview</p>
          <ul className="mt-3 space-y-2">
            {preview.map(({ bagPaise, quote }) => {
              const discount = quote.lineDiscountPaise + quote.shippingSavedPaise;
              return (
                <li key={bagPaise} className="flex items-baseline justify-between gap-3 text-hub-body">
                  <span className="text-muted">On a {formatINR(bagPaise)} bag</span>
                  {quote.rejection && quote.rejection.code === "MIN_NOT_MET" ? (
                    <span className="text-warning">below minimum</span>
                  ) : discount > 0 ? (
                    <span className="font-medium text-red-ink">−{formatINR(discount)}</span>
                  ) : (
                    <span className="text-muted">no change</span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-hub-label text-muted">
            Previews use the same pricing code as checkout. Tax slabs recompute on the discounted unit price.
          </p>
        </div>

        {conflicts.length > 0 ? (
          <div className="rounded-hub border border-warning bg-warning-tint p-5">
            <p className="text-hub-section font-semibold text-warning">
              Overlapping automatic promotions
            </p>
            <ul className="mt-2 space-y-1 text-hub-body text-warning">
              {conflicts.map((other) => (
                <li key={other.id}>
                  <Link
                    href={`/seller/promotions/automatic/${other.id}`}
                    className="underline underline-offset-2"
                  >
                    {other.name}
                  </Link>{" "}
                  runs{" "}
                  {new Date(other.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  {other.endsAt
                    ? ` – ${new Date(other.endsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                    : " onward"}{" "}
                  and targets the same {other.appliesTo === "all" ? "products" : other.appliesTo}.
                </li>
              ))}
            </ul>
            <p className="mt-2 text-hub-label text-warning">
              Where both apply and neither stacks, only the larger discount is taken.
            </p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function ToggleRow({
  label,
  detail,
  checked,
  onChange,
}: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-hub border border-hairline bg-paper px-4 py-3">
      <div>
        <p className="text-hub-body font-medium">{label}</p>
        <p className="text-hub-label text-muted">{detail}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
