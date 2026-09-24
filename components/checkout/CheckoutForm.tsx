"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { confirmDemoPayment, confirmRazorpayPayment, quoteCheckout, startCheckout } from "@/lib/orders/actions";
import { Button } from "@/components/ui/Button";
import { formatINR } from "@/lib/money";
import type { CartSummary } from "@/lib/commerce/types";

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
  "Andhra Pradesh", "Delhi", "Goa", "Gujarat", "Haryana", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "West Bengal",
];

export function CheckoutForm({ summary, demoPayments }: { summary: CartSummary; demoPayments: boolean }) {
  const router = useRouter();
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);
  const [method, setMethod] = useState<"razorpay" | "cod">("razorpay");
  const [quoted, setQuoted] = useState(summary);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    let live = true;
    void quoteCheckout(method).then((result) => {
      if (live && result.ok) setQuoted(result.data);
    });
    return () => {
      live = false;
    };
  }, [method]);

  return (
    <form
      className="grid gap-10 lg:grid-cols-12"
      onSubmit={(event) => {
        event.preventDefault();
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
            return;
          }
          if (result.data.method === "cod") {
            router.replace(`/order/${result.data.orderNumber}?t=${result.data.accessToken}`);
            return;
          }
          if (result.data.demo) {
            setHolding(true);
            const confirmed = await confirmDemoPayment({ number: result.data.orderNumber });
            if (!confirmed.ok) {
              setHolding(false);
              setError(confirmed.error.message);
              setPending(false);
              return;
            }
            router.replace(`/order/${confirmed.data.number}?t=${confirmed.data.accessToken}`);
            return;
          }
          const ready = await loadRazorpay();
          if (!ready || !window.Razorpay || !result.data.keyId || !result.data.razorpayOrderId) {
            setError("Payment could not start. Your pair is held for 15 minutes.");
            setPending(false);
            return;
          }
          const checkout = new window.Razorpay({
            key: result.data.keyId,
            amount: result.data.totalPaise,
            currency: "INR",
            order_id: result.data.razorpayOrderId,
            name: "Aqualite",
            handler: (response: RazorpaySuccess) => {
              void confirmRazorpayPayment(response).then((confirmed) => {
                if (!confirmed.ok) {
                  setError(confirmed.error.message);
                  setPending(false);
                  return;
                }
                router.replace(`/order/${confirmed.data.number}?t=${confirmed.data.accessToken}`);
              });
            },
            modal: {
              ondismiss: () => {
                setPending(false);
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
          <Field name="pincode" label="Pincode" inputMode="numeric" autoComplete="postal-code" />
          <Field name="line1" label="Address line 1" autoComplete="address-line1" />
          <Field name="line2" label="Address line 2" autoComplete="address-line2" />
          <Field name="landmark" label="Landmark" />
          <Field name="city" label="City" autoComplete="address-level2" />
          <label className="block font-mono text-eyebrow uppercase text-mist" htmlFor="state">State</label>
          <select id="state" name="state" required className="h-12 w-full border border-hairline bg-abyss px-3" defaultValue="Maharashtra">
            {STATES.map((state) => (
              <option key={state}>{state}</option>
            ))}
          </select>
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="font-mono text-eyebrow uppercase text-mist">03 — Payment</legend>
          <label className="flex items-center gap-3 border border-hairline p-4">
            <input type="radio" name="method" checked={method === "razorpay"} onChange={() => setMethod("razorpay")} />
            Pay online — UPI, cards, netbanking
          </label>
          <label className="flex items-center gap-3 border border-hairline p-4">
            <input type="radio" name="method" checked={method === "cod"} onChange={() => setMethod("cod")} />
            Cash on delivery (+₹49)
          </label>
          <p className="text-small text-mist">
            {demoPayments
              ? "Test mode on this prototype. Online pay confirms without a charge. COD is a real order in the local ledger."
              : "Online pay opens Razorpay. The amount is the one quoted on this page."}
          </p>
        </fieldset>
        {error ? <p className="text-small text-danger">{error}</p> : null}
        <Button type="submit" variant="primary" loading={pending} className="w-full">
          {holding ? "Confirming" : method === "cod" ? "Place COD order" : "Pay now"}
        </Button>
      </div>
      <aside className="h-fit border border-hairline p-6 lg:col-span-5">
        <p className="font-mono text-eyebrow uppercase text-mist">Order</p>
        <ul className="mt-4 divide-y divide-hairline">
          {quoted.lines.map((line) => (
            <li key={line.variantId} className="flex justify-between gap-4 py-3 text-small">
              <span>{line.productName} · UK {line.sizeLabel} × {line.qty}</span>
              <span className="tabular">{formatINR(line.lineTotalPaise)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex justify-between text-small text-mist"><span>Shipping</span><span className="tabular">{formatINR(summary.shippingPaise)}</span></p>
        <p className="mt-1 flex justify-between text-small text-mist"><span>Includes GST</span><span className="tabular">{formatINR(summary.taxPaise)}</span></p>
        {method === "cod" ? <p className="mt-1 flex justify-between text-small text-mist"><span>COD fee</span><span>₹49</span></p> : null}
        <p className="mt-4 flex justify-between font-medium"><span>Total</span><span className="tabular">{formatINR(method === "cod" ? summary.totalPaise + 4900 : summary.totalPaise)}</span></p>
      </aside>
    </form>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  const id = rest.name ?? label;
  return (
    <div>
      <label className="font-mono text-eyebrow uppercase text-mist" htmlFor={id}>{label}</label>
      <input id={id} required={label !== "Address line 2" && label !== "Landmark"} className="mt-1 h-12 w-full border border-hairline bg-transparent px-3 outline-none" {...rest} />
    </div>
  );
}
