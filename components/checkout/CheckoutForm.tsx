"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { CouponField } from "@/components/cart/CouponField";
import { Button } from "@/components/ui/Button";
import type { CartSummary } from "@/lib/commerce/types";
import { formatINR } from "@/lib/money";
import { confirmRazorpayPayment, quoteCheckout, startCheckout, type CheckoutResult } from "@/lib/orders/actions";
import { deliveryLabel, lookupPincode, type PincodeInfo } from "@/lib/store/pincode";
import { COD_MAX_PAISE } from "@/lib/store/pricing";

type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckout = {
  open: () => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const STATES = [
  "Andhra Pradesh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "West Bengal",
];

async function verifyPaymentOverApi(payload: RazorpaySuccess): Promise<{
  ok: boolean;
  number?: string;
  accessToken?: string;
  message?: string;
}> {
  try {
    const res = await fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      number?: string;
      accessToken?: string;
      error?: string;
    };
    if (res.ok && data.ok && data.number && data.accessToken) {
      return { ok: true, number: data.number, accessToken: data.accessToken };
    }
  } catch {
    // Fallback to server action below
  }
  const fallback = await confirmRazorpayPayment(payload);
  if (fallback.ok) {
    return { ok: true, number: fallback.data.number, accessToken: fallback.data.accessToken };
  }
  return { ok: false, message: fallback.error.message };
}

export function CheckoutForm({ summary, demoPayments }: { summary: CartSummary; demoPayments: boolean }) {
  const router = useRouter();
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);
  const submittingRef = useRef(false);

  const [method, setMethod] = useState<"razorpay" | "cod">("razorpay");
  const [quoted, setQuoted] = useState(summary);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("Maharashtra");
  const [pinInfo, setPinInfo] = useState<PincodeInfo | null>(null);
  const [pinNote, setPinNote] = useState("");
  const [demoModal, setDemoModal] = useState<CheckoutResult | null>(null);
  const [demoTab, setDemoTab] = useState<"upi" | "card">("upi");
  const [demoUpiId, setDemoUpiId] = useState("success@razorpay");
  const [verifyingModal, setVerifyingModal] = useState(false);

  const codOverCap = quoted.subtotalPaise - quoted.discountPaise > COD_MAX_PAISE;
  const codDisabledByPin = pinInfo !== null && (!pinInfo.serviceable || !pinInfo.codAvailable);
  const codDisabled = codOverCap || codDisabledByPin;

  useEffect(() => {
    let live = true;
    void quoteCheckout(method).then((result) => {
      if (live && result.ok) setQuoted(result.data);
    });
    return () => {
      live = false;
    };
  }, [method]);

  useEffect(() => {
    window.aqTrack?.("begin_checkout");
  }, []);

  const handlePincodeChange = (raw: string) => {
    const clean = raw.replace(/\D/g, "").slice(0, 6);
    setPincode(clean);
    if (clean.length < 6) {
      setPinInfo(null);
      setPinNote("");
      return;
    }
    void fetch(`/api/pincode/${clean}`)
      .then(async (res) => {
        const info = res.ok ? ((await res.json()) as PincodeInfo) : lookupPincode(clean);
        if (!info) {
          setPinInfo(null);
          setPinNote("Enter a valid 6-digit Indian pincode.");
          return;
        }
        setPinInfo(info);
        setPinNote(deliveryLabel(info));
        if (!city && info.city) setCity(info.city);
        if (info.state && STATES.includes(info.state)) setStateVal(info.state);
        if (!info.codAvailable && method === "cod") setMethod("razorpay");
      })
      .catch(() => {
        const info = lookupPincode(clean);
        if (info) {
          setPinInfo(info);
          setPinNote(deliveryLabel(info));
          if (!city && info.city) setCity(info.city);
          if (info.state && STATES.includes(info.state)) setStateVal(info.state);
        }
      });
  };

  return (
    <>
      <form
        className="grid gap-10 lg:grid-cols-12"
        onSubmit={(event) => {
          event.preventDefault();
          if (submittingRef.current || pending) return;
          submittingRef.current = true;
          const form = new FormData(event.currentTarget);
          setPending(true);
          setError("");
          void startCheckout({
            email: String(form.get("email") ?? ""),
            phone: String(form.get("phone") ?? ""),
            method,
            idempotencyKey,
            address: {
              name: String(form.get("name") ?? ""),
              phone: String(form.get("phone") ?? ""),
              line1: String(form.get("line1") ?? ""),
              line2: String(form.get("line2") ?? ""),
              landmark: String(form.get("landmark") ?? ""),
              city: String(form.get("city") ?? ""),
              state: String(form.get("state") ?? ""),
              pincode: String(form.get("pincode") ?? ""),
            },
          }).then(async (result) => {
            if (!result.ok) {
              setError(result.error.message);
              setPending(false);
              submittingRef.current = false;
              return;
            }
            if (result.data.method === "cod") {
              router.replace(`/order/${result.data.orderNumber}?t=${result.data.accessToken}`);
              return;
            }
            if (result.data.demo) {
              setDemoModal(result.data);
              return;
            }
            const ready = await loadRazorpay();
            if (!ready || !window.Razorpay || !result.data.keyId || !result.data.razorpayOrderId) {
              setError("Payment could not start. Your pair is held for 15 minutes.");
              setPending(false);
              submittingRef.current = false;
              return;
            }
            const checkout = new window.Razorpay({
              key: result.data.keyId,
              amount: result.data.totalPaise,
              currency: "INR",
              order_id: result.data.razorpayOrderId,
              name: "Aqualite",
              theme: {
                color: "rgb(217, 35, 46)",
              },
              handler: (response: RazorpaySuccess) => {
                void verifyPaymentOverApi(response).then((confirmed) => {
                  if (!confirmed.ok || !confirmed.number || !confirmed.accessToken) {
                    setError(confirmed.message ?? "Payment verification failed.");
                    setPending(false);
                    submittingRef.current = false;
                    return;
                  }
                  router.replace(`/order/${confirmed.number}?t=${confirmed.accessToken}`);
                });
              },
              modal: {
                ondismiss: () => {
                  setPending(false);
                  submittingRef.current = false;
                  setError("Payment was not completed. Your pair is held for 15 minutes.");
                },
              },
            });
            checkout.open();
          });
        }}
      >
        <div className="space-y-8 lg:col-span-7">
          <fieldset className="space-y-3">
            <legend className="font-mono text-eyebrow uppercase text-mist">01 — Contact</legend>
            <Field name="email" label="Email" type="email" autoComplete="email" />
            <Field name="phone" label="Mobile" inputMode="numeric" autoComplete="tel" placeholder="10-digit mobile" />
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="font-mono text-eyebrow uppercase text-mist">02 — Delivery</legend>
            <Field name="name" label="Full name" autoComplete="name" />
            <div>
              <label className="font-mono text-eyebrow uppercase text-mist" htmlFor="pincode">
                Pincode
              </label>
              <input
                id="pincode"
                name="pincode"
                required
                inputMode="numeric"
                maxLength={6}
                autoComplete="postal-code"
                value={pincode}
                onChange={(e) => handlePincodeChange(e.target.value)}
                className="mt-1 h-12 w-full border border-hairline bg-transparent px-3 font-mono outline-none"
              />
              {pinNote ? (
                <p className={`mt-1 text-small ${pinInfo?.serviceable === false ? "text-danger" : "text-mist"}`}>
                  {pinNote}
                </p>
              ) : null}
            </div>
            <Field name="line1" label="Address line 1" autoComplete="address-line1" />
            <Field name="line2" label="Address line 2" autoComplete="address-line2" />
            <Field name="landmark" label="Landmark" />
            <div>
              <label className="font-mono text-eyebrow uppercase text-mist" htmlFor="city">
                City
              </label>
              <input
                id="city"
                name="city"
                required
                autoComplete="address-level2"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 h-12 w-full border border-hairline bg-transparent px-3 outline-none"
              />
            </div>
            <label className="block font-mono text-eyebrow uppercase text-mist" htmlFor="state">
              State
            </label>
            <select
              id="state"
              name="state"
              required
              value={stateVal}
              onChange={(e) => setStateVal(e.target.value)}
              className="h-12 w-full border border-hairline bg-abyss px-3"
            >
              {STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="font-mono text-eyebrow uppercase text-mist">03 — Payment</legend>
            <label className="flex cursor-pointer items-center gap-3 border border-hairline p-4">
              <input
                type="radio"
                name="method"
                value="razorpay"
                checked={method === "razorpay"}
                onChange={() => setMethod("razorpay")}
              />
              <span>Pay online — UPI, cards, netbanking (Razorpay)</span>
            </label>
            <label
              className={`flex items-center gap-3 border border-hairline p-4 ${codDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
            >
              <input
                type="radio"
                name="method"
                value="cod"
                disabled={codDisabled}
                checked={method === "cod"}
                onChange={() => setMethod("cod")}
              />
              <span>
                Cash on delivery (+₹49 · up to {formatINR(COD_MAX_PAISE)})
                {codOverCap ? " — Order exceeds COD cap" : ""}
              </span>
            </label>
            <p className="text-small text-mist">
              {demoPayments
                ? "Razorpay test mode enabled. Online checkout holds your pair for 15 minutes while payment completes."
                : "Online pay opens Razorpay. Your pair is held for 15 minutes while payment completes."}
            </p>
          </fieldset>
          {error ? (
            <p className="text-small text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="primary" loading={pending} className="w-full">
            {method === "cod" ? "Place COD order" : "Pay now"}
          </Button>
        </div>
        <aside className="h-fit border border-hairline p-6 lg:col-span-5">
          <p className="font-mono text-eyebrow uppercase text-mist">Order summary</p>
          <ul className="mt-4 divide-y divide-hairline">
            {quoted.lines.map((line) => (
              <li key={line.variantId} className="flex justify-between gap-4 py-3 text-small">
                <span>
                  {line.productName} · UK {line.sizeLabel} × {line.qty}
                </span>
                <span className="tabular">{formatINR(line.lineTotalPaise)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex justify-between text-small text-mist">
            <span>Subtotal</span>
            <span className="tabular">{formatINR(quoted.subtotalPaise)}</span>
          </p>
          {quoted.autoPromo ? (
            <p className="mt-2 flex justify-between text-small text-red-ink">
              <span>{quoted.autoPromo.name}</span>
              <span className="tabular">−{formatINR(quoted.autoPromo.discountPaise)}</span>
            </p>
          ) : null}
          {quoted.promo ? (
            <p className="mt-1 flex justify-between text-small text-red-ink">
              <span>{quoted.promo.code ?? quoted.promo.name}</span>
              <span className="tabular">−{formatINR(quoted.promo.discountPaise)}</span>
            </p>
          ) : null}
          <p className="mt-2 flex justify-between text-small text-mist">
            <span>Shipping</span>
            <span className="tabular">{quoted.shippingPaise === 0 ? "Free" : formatINR(quoted.shippingPaise)}</span>
          </p>
          <p className="mt-1 flex justify-between text-small text-mist">
            <span>Includes GST</span>
            <span className="tabular">{formatINR(quoted.taxPaise)}</span>
          </p>
          {quoted.codFeePaise > 0 ? (
            <p className="mt-1 flex justify-between text-small text-mist">
              <span>COD fee</span>
              <span className="tabular">{formatINR(quoted.codFeePaise)}</span>
            </p>
          ) : null}
          <p className="mt-4 flex justify-between border-t border-hairline pt-4 font-medium">
            <span>Total</span>
            <span className="tabular">{formatINR(quoted.totalPaise)}</span>
          </p>
          <CouponField
            onChanged={() =>
              void quoteCheckout(method).then((result) => {
                if (result.ok) setQuoted(result.data);
              })
            }
          />
          <p className="mt-4 font-mono text-eyebrow uppercase text-mist">
            15-minute stock hold on payment initiation
          </p>
        </aside>
      </form>

      {/* Razorpay Test Mode Checkout Modal */}
      {demoModal ? (
        <div
          data-testid="razorpay-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Razorpay Checkout"
          className="fixed inset-0 z-modal flex items-center justify-center bg-abyss/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md overflow-hidden border border-hairline bg-porcelain shadow-card">
            <div className="flex items-center justify-between bg-red px-5 py-4 text-on-red">
              <div>
                <p className="font-mono text-eyebrow uppercase opacity-90">Razorpay · Test Mode</p>
                <p className="font-display text-h3">Aqualite</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-eyebrow uppercase opacity-90">Amount</p>
                <p className="font-mono text-lead font-medium tabular">{formatINR(demoModal.totalPaise)}</p>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between border-b border-hairline pb-3 font-mono text-eyebrow uppercase text-mist">
                <span>Order {demoModal.orderNumber}</span>
                <span>{demoModal.razorpayOrderId}</span>
              </div>
              <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Payment method">
                <button
                  type="button"
                  role="tab"
                  aria-selected={demoTab === "upi"}
                  onClick={() => setDemoTab("upi")}
                  className={`border py-2.5 font-mono text-eyebrow uppercase ${demoTab === "upi" ? "border-aqua bg-red-tint text-red-ink" : "border-hairline text-mist"}`}
                >
                  UPI
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={demoTab === "card"}
                  onClick={() => setDemoTab("card")}
                  className={`border py-2.5 font-mono text-eyebrow uppercase ${demoTab === "card" ? "border-aqua bg-red-tint text-red-ink" : "border-hairline text-mist"}`}
                >
                  Test Card
                </button>
              </div>
              {demoTab === "upi" ? (
                <div>
                  <label className="font-mono text-eyebrow uppercase text-mist" htmlFor="rzp-upi">
                    UPI ID (Test VPA)
                  </label>
                  <input
                    id="rzp-upi"
                    value={demoUpiId}
                    onChange={(e) => setDemoUpiId(e.target.value)}
                    className="mt-1 h-11 w-full border border-hairline bg-abyss px-3 font-mono text-small outline-none"
                  />
                </div>
              ) : (
                <div className="space-y-2 border border-hairline bg-abyss p-3 font-mono text-size text-mist">
                  <p>Card · 4111 1111 1111 1111</p>
                  <p>Expiry · 12/29 · CVV · 123</p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setDemoModal(null);
                    setPending(false);
                    submittingRef.current = false;
                    setError("Payment was not completed. Your pair is held for 15 minutes.");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  loading={verifyingModal}
                  data-testid="razorpay-confirm-btn"
                  className="flex-1"
                  onClick={() => {
                    if (!demoModal.razorpayOrderId || !demoModal.demoPaymentId || !demoModal.demoSignature) return;
                    setVerifyingModal(true);
                    void verifyPaymentOverApi({
                      razorpay_order_id: demoModal.razorpayOrderId,
                      razorpay_payment_id: demoModal.demoPaymentId,
                      razorpay_signature: demoModal.demoSignature,
                    }).then((confirmed) => {
                      if (!confirmed.ok || !confirmed.number || !confirmed.accessToken) {
                        setVerifyingModal(false);
                        setDemoModal(null);
                        setPending(false);
                        submittingRef.current = false;
                        setError(confirmed.message ?? "Payment verification failed.");
                        return;
                      }
                      router.replace(`/order/${confirmed.number}?t=${confirmed.accessToken}`);
                    });
                  }}
                >
                  Authorize {formatINR(demoModal.totalPaise)}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  const id = rest.name ?? label;
  return (
    <div>
      <label className="font-mono text-eyebrow uppercase text-mist" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        required={label !== "Address line 2" && label !== "Landmark"}
        className="mt-1 h-12 w-full border border-hairline bg-transparent px-3 outline-none"
        {...rest}
      />
    </div>
  );
}
