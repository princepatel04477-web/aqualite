"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

const NAV: { href: string; label: string; match: RegExp }[] = [
  { href: "/seller", label: "Overview", match: /^\/seller$/ },
  { href: "/seller/catalog/inventory", label: "Catalog", match: /^\/seller\/catalog/ },
  { href: "/seller/inventory/planning", label: "Planning", match: /^\/seller\/inventory/ },
  { href: "/seller/pricing", label: "Pricing", match: /^\/seller\/pricing/ },
  { href: "/seller/promotions", label: "Promotions", match: /^\/seller\/promotions/ },
  { href: "/seller/reports/business", label: "Reports", match: /^\/seller\/reports\/business|^\/seller\/reports\/tax/ },
  { href: "/seller/reports/payments", label: "Payments", match: /^\/seller\/reports\/payments/ },
  { href: "/seller/performance/health", label: "Account health", match: /^\/seller\/performance\/health/ },
  { href: "/seller/performance/reviews", label: "Reviews", match: /^\/seller\/performance\/reviews/ },
  { href: "/seller/performance/messages", label: "Messages", match: /^\/seller\/performance\/messages/ },
  { href: "/seller/orders", label: "Orders", match: /^\/seller\/orders/ },
  { href: "/admin/inventory", label: "Inventory", match: /^\/admin\/inventory/ },
];

export function SellerNav() {
  const pathname = usePathname() ?? "/seller";
  return (
    <nav aria-label="Seller Hub" className="sticky top-20 hidden h-fit w-52 shrink-0 flex-col gap-1 md:flex">
      {NAV.map((item) => {
        const active = item.match.test(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-9 items-center rounded-control px-3 font-body text-hub-body transition-colors duration-quick",
              active ? "bg-red-tint font-medium text-red-ink" : "text-ink-2 hover:bg-linen",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
