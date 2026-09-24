import Link from "next/link";

const SECTIONS = [
  { href: "/shop", label: "All pairs", key: "all" },
  { href: "/shop/men", label: "Men", key: "men" },
  { href: "/shop/women", label: "Women", key: "women" },
  { href: "/shop/kids", label: "Kids", key: "kids" },
] as const;

/**
 * Category chips (M07): a horizontal snap rail with fade edges under
 * the listing header. Active state derives from the current base path.
 */
export function CategoryChips({ base }: { base: string }) {
  return (
    <nav aria-label="Shop sections" className="lg:hidden">
      <div className="rail fade-x flex snap-x scroll-p-page gap-2 overflow-x-auto px-page py-1">
        {SECTIONS.map((section) => {
          const active =
            section.key === "all"
              ? base === "/shop"
              : base.startsWith(section.href);
          return (
            <Link
              key={section.href}
              href={section.href}
              aria-current={active ? "page" : undefined}
              className={`flex h-11 shrink-0 snap-start items-center rounded-pill border px-4 font-mono text-eyebrow uppercase transition-colors duration-quick ease-tide ${
                active
                  ? "border-foam bg-foam text-abyss"
                  : "border-hairline text-mist"
              }`}
            >
              {section.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
