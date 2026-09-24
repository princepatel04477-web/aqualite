"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";

import { useCart } from "@/components/cart/CartProvider";
import { IconBag, IconMenu, IconSearch, IconUser } from "@/components/ui/Icons";
import { Wordmark } from "@/components/ui/Wordmark";
import { RollingDigits } from "@/components/motion/RollingDigits";
import { setBagTarget } from "@/lib/motion/bag-target";
import { gsap } from "@/lib/motion/gsap";
import { duration, gsapEase } from "@/lib/motion/tokens";
import { cn } from "@/lib/cn";

export type NavCategory = { slug: string; name: string; count: number };
export type NavGroup = { gender: "men" | "women" | "kids"; categories: NavCategory[] };

const links = [
  { href: "/shop/men", label: "Men", key: "men" as const },
  { href: "/shop/women", label: "Women", key: "women" as const },
  { href: "/shop/kids", label: "Kids", key: "kids" as const },
  { href: "/collections/everyday-slides", label: "Slides", key: null },
  { href: "/collections/new-season", label: "New In", key: null },
];

export function Header({
  nav,
  onSearch,
  onMenu,
  overlayOpen,
}: {
  nav: NavGroup[];
  onSearch: () => void;
  onMenu: () => void;
  overlayOpen: boolean;
}) {
  const pathname = usePathname();
  const { summary, setOpen } = useCart();
  const headerRef = useRef<HTMLElement>(null);
  const bagRef = useRef<HTMLButtonElement>(null);
  const [solid, setSolid] = useState(false);
  const [mega, setMega] = useState<NavGroup | null>(null);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    setBagTarget(bagRef.current);
    return () => setBagTarget(null);
  }, []);

  useGSAP(
    () => {
      const node = headerRef.current;
      if (!node) return;
      const shift = gsap.quickTo(node, "yPercent", { duration: duration.base, ease: gsapEase.tide });
      let last = 0;
      const onScroll = () => {
        const y = window.scrollY;
        setSolid(y > 80);
        if (overlayOpen || mega) {
          shift(0);
          last = y;
          return;
        }
        if (y > 400 && y > last + 6) shift(-100);
        else if (y < last - 6) shift(0);
        last = y;
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    },
    { scope: headerRef, dependencies: [overlayOpen, mega] },
  );

  const openMega = (group: NavGroup) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setMega(group);
  };
  const scheduleClose = () => {
    closeTimer.current = window.setTimeout(() => setMega(null), 250);
  };

  return (
    <header
      ref={headerRef}
      className={cn(
        "z-header transition-colors duration-quick ease-tide",
        solid || mega ? "border-b border-hairline bg-abyss/90 backdrop-blur-md" : "bg-transparent",
      )}
    >
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-toast focus:bg-foam focus:px-3 focus:py-2 focus:text-abyss">
        Skip to content
      </a>
      <div className="page-wrap flex h-[var(--header-h)] items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <button type="button" className="lg:hidden" aria-label="Open menu" onClick={onMenu}>
            <IconMenu />
          </button>
          <Wordmark />
        </div>
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
          {links.map((link) => {
            const group = link.key ? nav.find((item) => item.gender === link.key) : null;
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <div
                key={link.href}
                onMouseEnter={() => (group ? openMega(group) : setMega(null))}
                onMouseLeave={scheduleClose}
              >
                <Link
                  href={link.href}
                  className="link-draw relative font-body text-small text-foam"
                  aria-expanded={group ? mega?.gender === group.gender : undefined}
                >
                  {link.label}
                  {active ? <span className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-pill bg-aqua" /> : null}
                </Link>
              </div>
            );
          })}
        </nav>
        <div className="flex items-center gap-1">
          <button type="button" className="grid h-11 w-11 place-items-center" aria-label="Search" onClick={onSearch}>
            <IconSearch />
          </button>
          <Link href="/account" className="grid h-11 w-11 place-items-center" aria-label="Account">
            <IconUser />
          </Link>
          <button
            ref={bagRef}
            type="button"
            className="relative grid h-11 w-11 place-items-center"
            aria-label={`Bag, ${summary.count} items`}
            onClick={() => setOpen(true)}
          >
            <IconBag />
            <span className="absolute right-1 top-1 min-w-4 font-mono text-eyebrow text-aqua">
              <RollingDigits value={summary.count} />
            </span>
          </button>
        </div>
      </div>
      {mega ? (
        <div
          className="absolute inset-x-0 top-full border-b border-hairline bg-trench"
          onMouseEnter={() => openMega(mega)}
          onMouseLeave={scheduleClose}
        >
          <div className="page-wrap grid gap-10 py-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="font-mono text-eyebrow uppercase text-mist">Shop by type</p>
              <ul className="mt-4 space-y-2">
                {mega.categories.map((category) => (
                  <li key={category.slug}>
                    <Link
                      href={`/shop/${mega.gender}/${category.slug}`}
                      className="flex items-baseline justify-between gap-6 font-body text-body text-foam hover:text-aqua"
                      onClick={() => setMega(null)}
                    >
                      <span>{category.name}</span>
                      <span className="font-mono text-size text-mist">{category.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:col-span-3">
              <p className="font-mono text-eyebrow uppercase text-mist">Collections</p>
              <ul className="mt-4 space-y-2">
                <li><Link className="link-draw" href="/collections/new-season" onClick={() => setMega(null)}>New season</Link></li>
                <li><Link className="link-draw" href="/collections/monsoon-ready" onClick={() => setMega(null)}>Monsoon ready</Link></li>
                <li><Link className="link-draw" href="/size-guide" onClick={() => setMega(null)}>Size guide</Link></li>
              </ul>
            </div>
            <Link href="/product/tide-slide?color=midnight" className="stage relative block aspect-[4/5] overflow-hidden lg:col-span-4 lg:col-start-9" onClick={() => setMega(null)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/catalog/tide-slide-midnight.jpg" alt="Tide Slide in Midnight / Aqua" className="h-full w-full object-cover" />
              <span className="absolute bottom-4 left-4 font-display text-h3 text-ink-on-porcelain">
                Shop <em>now</em>
              </span>
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
