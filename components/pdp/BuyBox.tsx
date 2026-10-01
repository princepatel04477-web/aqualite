"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useCart } from "@/components/cart/CartProvider";
import { Button } from "@/components/ui/Button";
import { Price } from "@/components/ui/Price";
import type { CatalogProduct } from "@/content/catalog";
import { effectivePrice } from "@/lib/hub/pricing/effective";
import { formatINR } from "@/lib/money";
import { deliveryLabel, lookupPincode, type PincodeInfo } from "@/lib/store/pincode";

export function BuyBox({
  product,
  color,
  size,
  stock,
  promoLabel,
  clockAt,
}: {
  product: CatalogProduct;
  color: string;
  size?: string;
  stock: Record<string, number>;
  promoLabel?: string | null;
  clockAt: string;
}) {
  const router = useRouter();
  const { add } = useCart();
  const colorway = product.colorways.find((item) => item.slug === color) ?? product.colorways[0];
  const [optimisticSize, setOptimisticSize] = useState<{ color: string; size: string } | null>(null);
  const selectedSize = optimisticSize?.color === color ? optimisticSize.size : size;
  const [message, setMessage] = useState("");
  const [shake, setShake] = useState(false);
  const [pin, setPin] = useState("");
  const [eta, setEta] = useState("");
  const [adding, setAdding] = useState(false);
  const [priceClock, setPriceClock] = useState(() => Date.parse(clockAt));

  const availableOf = (id: string) => stock[id] ?? 0;
  const selected = selectedSize ? colorway?.variants.find((variant) => String(variant.sizeUk) === selectedSize) : undefined;
  const price = selected ?? colorway?.variants[0];

  useEffect(() => {
    const next = [price?.saleStartsAt, price?.saleEndsAt]
      .filter((value): value is string => !!value)
      .map((value) => Date.parse(value))
      .filter((time) => time > Date.now())
      .sort((a, b) => a - b)[0];
    if (!next) return;
    const timer = window.setTimeout(() => setPriceClock(Date.now()), Math.max(1, next - Date.now() + 1));
    return () => window.clearTimeout(timer);
  }, [price?.saleStartsAt, price?.saleEndsAt, priceClock]);

  if (!colorway) return null;

  const isSelectedSoldOut = Boolean(selected && availableOf(selected.id) <= 0);
  const activePricePaise = price ? effectivePrice(price, new Date(priceClock)) : 0;

  const handleAddToBag = () => {
    if (!selected) {
      setMessage("Choose a size to continue.");
      setShake(true);
      window.setTimeout(() => setShake(false), 400);
      document.getElementById("pdp-size-grid")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (availableOf(selected.id) <= 0) {
      setMessage(`UK ${selected.label} is sold out.`);
      return;
    }
    setAdding(true);
    const image = document.querySelector("[data-pdp-image]");
    const from = image?.getBoundingClientRect();
    void add(selected.id, 1, from ? { image: colorway.images[0]?.src ?? "", from } : undefined).finally(() =>
      setAdding(false),
    );
  };

  return (
    <div>
      <p className="font-mono text-eyebrow uppercase text-mist">Colour — {colorway.name}</p>
      <div className="mt-3 flex gap-2">
        {product.colorways.map((item) => (
          <Link
            key={item.slug}
            href={`/product/${product.slug}?color=${item.slug}${selectedSize ? `&size=${selectedSize}` : ""}`}
            aria-label={item.name}
            className={`h-8 w-8 rounded-pill border ${item.slug === colorway.slug ? "border-aqua" : "border-hairline"}`}
            style={{ background: `rgb(var(--swatch-${item.swatch}))` }}
          />
        ))}
      </div>
      {price ? <Price className="mt-6" paise={activePricePaise} mrpPaise={price.mrpPaise} tax size="lg" /> : null}
      {promoLabel ? (
        <p className="mt-3 inline-flex rounded-pill bg-red px-2.5 py-1 font-mono text-eyebrow uppercase text-on-red">
          {promoLabel}
        </p>
      ) : null}
      <p className="mt-8 font-mono text-eyebrow uppercase text-mist">UK size</p>
      <div id="pdp-size-grid" className={`mt-3 grid grid-cols-4 gap-2 ${shake ? "animate-shake" : ""}`}>
        {colorway.variants.map((variant) => {
          const sold = availableOf(variant.id) <= 0;
          const active = String(variant.sizeUk) === selectedSize;
          return (
            <button
              key={variant.id}
              type="button"
              aria-label={`UK ${variant.label}${sold ? ", sold out" : ""}`}
              aria-pressed={active}
              className={`h-12 rounded-pill border font-mono text-size ${active ? "border-foam bg-foam text-abyss" : "border-hairline"} ${sold ? "text-mist line-through" : ""}`}
              onClick={() => {
                const nextSize = String(variant.sizeUk);
                setOptimisticSize({ color, size: nextSize });
                setMessage("");
                setPriceClock(Date.now());
                router.replace(`/product/${product.slug}?color=${colorway.slug}&size=${nextSize}`, { scroll: false });
              }}
            >
              {variant.label}
            </button>
          );
        })}
      </div>
      <p className="mt-3 font-body text-small text-mist">
        <Link href="/size-guide" className="link-draw">Size guide</Link>
        {selected && availableOf(selected.id) > 0 && availableOf(selected.id) <= 3
          ? ` · Only ${availableOf(selected.id)} left`
          : ""}
      </p>
      {message ? <p className="mt-3 text-small text-sand" role="alert">{message}</p> : null}
      {isSelectedSoldOut && selected ? (
        <NotifyForm variantId={selected.id} label={selected.label} />
      ) : (
        <Button
          variant="primary"
          className="mt-6 w-full"
          loading={adding}
          onClick={handleAddToBag}
        >
          Add to bag
        </Button>
      )}
      <form
        className="mt-8 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (pin.length !== 6) {
            setEta("Enter a 6-digit pincode.");
            return;
          }
          void fetch(`/api/pincode/${pin}`)
            .then(async (res) => {
              if (!res.ok) {
                const fallback = lookupPincode(pin);
                setEta(fallback ? deliveryLabel(fallback) : "Not serviceable at this pincode.");
                return;
              }
              const info = (await res.json()) as PincodeInfo;
              setEta(deliveryLabel(info));
            })
            .catch(() => {
              const fallback = lookupPincode(pin);
              setEta(fallback ? deliveryLabel(fallback) : "Enter a 6-digit pincode.");
            });
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

      {/* Sticky mobile buy bar */}
      <div
        data-sticky-buy-bar
        className="fixed inset-x-0 bottom-0 z-header flex items-center justify-between gap-4 border-t border-hairline bg-abyss/95 px-4 py-3 backdrop-blur-md lg:hidden"
      >
        <div className="min-w-0">
          <p className="truncate font-body text-small font-medium text-foam">{product.name}</p>
          <p className="font-mono text-eyebrow uppercase text-mist">
            {formatINR(activePricePaise)} · {selected ? `UK ${selected.label}` : "Select size"}
          </p>
        </div>
        {isSelectedSoldOut ? (
          <span className="rounded-pill border border-hairline px-4 py-2 font-mono text-eyebrow uppercase text-mist">
            Sold out
          </span>
        ) : (
          <Button variant="primary" loading={adding} onClick={handleAddToBag}>
            {selected ? "Add to bag" : "Choose size"}
          </Button>
        )}
      </div>
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
