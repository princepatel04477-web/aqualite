"use client";

import { useState, useTransition } from "react";

import { useCart } from "@/components/cart/CartProvider";

/**
 * Collapsible "Have a coupon?" field. Apply hits the server quote; success
 * shows the code chip with remove, failure shows the brand message for the
 * typed rejection reason.
 */
export function CouponField({
  compact = false,
  email,
  onChanged,
}: {
  compact?: boolean;
  email?: string;
  /** Fired after an apply or remove so parallel quotes (checkout) can refresh. */
  onChanged?: () => void;
}) {
  const { summary, applyCoupon, removeCoupon, toast } = useCart();
  const [open, setOpen] = useState(summary.promo !== null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const applied = summary.promo;

  if (applied) {
    return (
      <div className={compact ? "mt-3" : "mt-4"}>
        <div className="flex items-center justify-between gap-2 rounded-pill border border-red-tint bg-red-tint px-3 py-1.5">
          <p className="min-w-0 truncate font-mono text-size uppercase text-red-ink">
            {applied.code ?? applied.name}
            <span className="ml-2 normal-case text-muted">−₹{Math.round(applied.discountPaise / 100)}</span>
          </p>
          <button
            type="button"
            className="shrink-0 font-mono text-eyebrow uppercase text-muted hover:text-ink"
            onClick={() =>
              startTransition(() => {
                void removeCoupon().then(() => onChanged?.());
              })
            }
            disabled={pending}
          >
            Remove
          </button>
        </div>
        {summary.autoPromo ? null : (
          <p className="mt-1.5 font-body text-small text-mist">One offer per bag unless both stack.</p>
        )}
      </div>
    );
  }

  return (
    <div className={compact ? "mt-3" : "mt-4"}>
      {open ? (
        <form
          className="flex items-start gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const value = code.trim();
            if (!value) return;
            setError("");
            startTransition(() => {
              void applyCoupon(value, email).then((result) => {
                if (!result.ok) setError(result.message);
                else {
                  toast(result.message);
                  onChanged?.();
                }
              });
            });
          }}
        >
          <div className="min-w-0 flex-1">
            <label htmlFor="coupon-code" className="font-mono text-eyebrow uppercase text-mist">
              Coupon code
            </label>
            <input
              id="coupon-code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="MONSOON10"
              autoComplete="off"
              aria-invalid={error ? true : undefined}
              className="mt-1 h-10 w-full border border-hairline bg-transparent px-3 font-mono text-size uppercase outline-none focus:border-aqua"
            />
          </div>
          <button
            type="submit"
            disabled={pending || !code.trim()}
            aria-busy={pending}
            className="mt-6 h-10 shrink-0 border border-hairline px-4 font-mono text-eyebrow uppercase disabled:opacity-50"
          >
            {pending ? "Checking" : "Apply"}
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="font-mono text-eyebrow uppercase text-mist hover:text-ink"
          onClick={() => setOpen(true)}
        >
          Have a coupon?
        </button>
      )}
      {error ? (
        <p role="alert" className="mt-2 font-body text-small text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
