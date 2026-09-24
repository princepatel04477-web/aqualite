"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCart } from "@/components/cart/CartProvider";
import { Button } from "@/components/ui/Button";
import { Price } from "@/components/ui/Price";
import type { CatalogProduct } from "@/content/catalog";
import { deliveryLabel, lookupPincode } from "@/lib/store/pincode";

export function BuyBox({
  product,
  color,
  size,
  stock,
}: {
  product: CatalogProduct;
  color: string;
  size?: string;
  stock: Record<string, number>;
}) {
  const router = useRouter();
  const { add } = useCart();
  const colorway = product.colorways.find((item) => item.slug === color) ?? product.colorways[0];
  const [message, setMessage] = useState("");
  const [shake, setShake] = useState(false);
  const [pin, setPin] = useState("");
  const [eta, setEta] = useState("");
  const [adding, setAdding] = useState(false);
  if (!colorway) return null;
  const availableOf = (id: string) => stock[id] ?? 0;
  const selected = size ? colorway.variants.find((variant) => String(variant.sizeUk) === size) : undefined;
  const price = colorway.variants[0];

  return (
    <div>
      <p className="font-mono text-eyebrow uppercase text-mist">Colour — {colorway.name}</p>
      <div className="mt-3 flex gap-2">
        {product.colorways.map((item) => (
          <Link
            key={item.slug}
            href={`/product/${product.slug}?color=${item.slug}${size ? `&size=${size}` : ""}`}
            aria-label={`Colour: ${item.name}`}
            aria-current={item.slug === colorway.slug ? "true" : undefined}
            className={`h-8 w-8 rounded-pill border ${item.slug === colorway.slug ? "border-aqua" : "border-hairline"}`}
            style={{ background: `rgb(var(--swatch-${item.swatch}))` }}
          />
        ))}
      </div>
      {price ? <Price className="mt-6" paise={price.pricePaise} mrpPaise={price.mrpPaise} tax size="lg" /> : null}
      <p className="mt-8 font-mono text-eyebrow uppercase text-mist">UK size</p>
      <div
        role="radiogroup"
        aria-label="UK size"
        className={`mt-3 grid grid-cols-4 gap-2 ${shake ? "animate-shake" : ""}`}
      >
        {colorway.variants.map((variant) => {
          const sold = availableOf(variant.id) <= 0;
          const active = String(variant.sizeUk) === size;
          const low = !sold && availableOf(variant.id) <= 3;
          const label = `UK ${variant.label}${
            sold ? ", sold out" : low ? `, only ${availableOf(variant.id)} left` : ""
          }`;
          return (
            <button
              key={variant.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={label}
              aria-disabled={sold || undefined}
              className={`h-12 rounded-pill border font-mono text-size ${active ? "border-foam bg-foam text-abyss" : "border-hairline"} ${sold ? "text-mist line-through" : ""}`}
              onClick={() => {
                setMessage("");
                router.replace(`/product/${product.slug}?color=${colorway.slug}&size=${variant.sizeUk}`, { scroll: false });
              }}
            >
              {variant.label}
            </button>
          );
        })}
      </div>
      <p className="mt-3 font-body text-small text-mist">
        <Link href="/size-guide" className="link-draw">Size guide</Link>
        {selected && availableOf(selected.id) > 0 && availableOf(selected.id) <= 3 ? ` · Only ${availableOf(selected.id)} left` : ""}
      </p>
      {message ? <p className="mt-3 text-small text-sand">{message}</p> : null}
      {selected && availableOf(selected.id) <= 0 ? (
        <NotifyForm variantId={selected.id} label={selected.label} />
      ) : (
        <Button
          variant="primary"
          className="mt-6 w-full"
          loading={adding}
          onClick={() => {
            if (!selected) {
              setMessage("Choose a size to continue.");
              setShake(true);
              window.setTimeout(() => setShake(false), 400);
              return;
            }
            setAdding(true);
            const image = document.querySelector("[data-pdp-image]");
            const from = image?.getBoundingClientRect();
            void add(selected.id, 1, from ? { image: colorway.images[0]?.src ?? "", from } : undefined).finally(() => setAdding(false));
          }}
        >
          Add to bag
        </Button>
      )}
      <form
        className="mt-8 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const info = lookupPincode(pin);
          setEta(info ? deliveryLabel(info) : "Enter a 6-digit pincode.");
        }}
      >
        <label className="sr-only" htmlFor="pin">Pincode</label>
        <input
          id="pin"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="Pincode"
          className="h-12 flex-1 border border-hairline bg-transparent px-3 font-mono outline-none"
        />
        <Button type="submit" variant="outline">Check</Button>
      </form>
      {eta ? <p className="mt-2 font-body text-small text-mist">{eta}</p> : null}
    </div>
  );
}

function NotifyForm({ variantId, label }: { variantId: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <form
      className="mt-6 space-y-3"
      action={async (formData) => {
        const { notifyAction } = await import("@/lib/pdp/actions");
        const result = await notifyAction({ variantId, email: String(formData.get("email") ?? "") });
        if (result.ok) setDone(true);
      }}
    >
      <p className="text-small text-mist">UK {label} is sold out. We’ll email you when it’s back.</p>
      {done ? (
        <p className="text-small text-aqua">We’ll email you when UK {label} is back.</p>
      ) : (
        <div className="flex gap-2">
          <input name="email" type="email" required placeholder="Email" className="h-12 flex-1 border border-hairline bg-transparent px-3 outline-none" />
          <Button type="submit" variant="outline">Notify me</Button>
        </div>
      )}
    </form>
  );
}
