"use client";

import { useEffect, useState } from "react";

import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartProvider } from "@/components/cart/CartProvider";
import { AnnouncementBar } from "@/components/chrome/AnnouncementBar";
import { Footer } from "@/components/chrome/Footer";
import { Header, type NavGroup } from "@/components/chrome/Header";
import { MobileMenu } from "@/components/chrome/MobileMenu";
import { SearchOverlay } from "@/components/chrome/SearchOverlay";
import { Toaster } from "@/components/chrome/Toaster";
import type { CartSummary } from "@/lib/commerce/types";

export function StoreChrome({
  initialCart,
  nav,
  announcements,
  children,
}: {
  initialCart: CartSummary;
  nav: NavGroup[];
  announcements: string[];
  children: React.ReactNode;
}) {
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if ((meta && event.key.toLowerCase() === "k") || event.key === "/") {
        const target = event.target;
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
        event.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <CartProvider initial={initialCart}>
      <div className="fixed inset-x-0 top-0 z-header">
        <AnnouncementBar messages={announcements} />
        <Header nav={nav} onSearch={() => setSearch(true)} onMenu={() => setMenu(true)} overlayOpen={menu || search} />
      </div>
      <MobileMenu open={menu} onClose={() => setMenu(false)} />
      <SearchOverlay open={search} onClose={() => setSearch(false)} />
      <main id="content" className="pt-[calc(var(--header-h)+2rem)]">{children}</main>
      <Footer />
      <CartDrawer />
      <Toaster />
    </CartProvider>
  );
}
