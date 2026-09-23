import Link from "next/link";

import { Buoyancy } from "@/components/motion/Buoyancy";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Heading } from "@/components/ui/Heading";
import { homeCopy } from "@/content/site";
import type { ProductCardModel } from "@/lib/commerce/types";
import { formatINR } from "@/lib/money";

export function HomeView({
  arrivals,
  bestsellers,
  featured,
  counts,
}: {
  arrivals: ProductCardModel[];
  bestsellers: ProductCardModel[];
  featured: ProductCardModel | null;
  counts: { men: number; women: number; kids: number; slides: number };
}) {
  const rows = [
    { href: "/shop/men", label: "Men", count: counts.men },
    { href: "/shop/women", label: "Women", count: counts.women },
    { href: "/shop/kids", label: "Kids", count: counts.kids },
    { href: "/collections/everyday-slides", label: "Slides & flip-flops", count: counts.slides },
  ];

  return (
    <>
      <section data-header="transparent" className="relative -mt-[calc(var(--header-h)+2rem)] min-h-[100dvh] overflow-hidden bg-abyss">
        <div className="hero-glow pointer-events-none absolute inset-0" />
        <div className="page-wrap relative grid min-h-[100dvh] items-end gap-8 pb-16 pt-28 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <Eyebrow index="01" total="06">
              {homeCopy.eyebrow}
            </Eyebrow>
            <Heading level={1} size="hero" className="mt-6 max-w-[9ch] sm:max-w-[14ch]">
              {homeCopy.headlineLead}
              <br />
              <em>{homeCopy.headlineEm}</em> {homeCopy.headlineRest}
            </Heading>
            <p className="measure mt-6 text-lead text-mist">{homeCopy.lead}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button href="/shop/men" variant="primary">
                Shop men
              </Button>
              <Button href="/shop/women" variant="outline">
                Shop women
              </Button>
              <Button href="/shop/kids" variant="link">
                Kids
              </Button>
            </div>
          </div>
          <div className="relative lg:col-span-5">
            <Buoyancy>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/catalog/hero-tide-slide.jpg"
                alt="Aqualite Tide Slide, black with an aqua strap, floating on dark water"
                className="mx-auto w-full max-w-[560px]"
                width={1400}
                height={1000}
              />
            </Buoyancy>
            <p className="pointer-events-none absolute bottom-6 right-2 hidden h-28 w-28 items-center justify-center rounded-pill border border-aqua/40 font-mono text-eyebrow uppercase text-aqua lg:flex">
              <span className="spin-slow absolute inset-2">
                <svg viewBox="0 0 100 100" className="h-full w-full">
                  <defs>
                    <path id="circlePath" d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" />
                  </defs>
                  <text fill="currentColor" fontSize="11">
                    <textPath href="#circlePath">Waterproof · Lightweight · Anti-skid · </textPath>
                  </text>
                </svg>
              </span>
            </p>
          </div>
        </div>
        <p className="page-wrap pb-8 font-mono text-eyebrow uppercase text-mist">Scroll</p>
      </section>

      <section className="border-t border-hairline">
        <div className="page-wrap py-10">
          <Eyebrow index="02" total="06">Shop by</Eyebrow>
        </div>
        {rows.map((row, index) => (
          <Link
            key={row.href}
            href={row.href}
            className="group relative grid grid-cols-12 items-end border-t border-hairline px-page py-8 text-foam transition-colors duration-quick ease-tide last:border-b hover:bg-porcelain hover:text-ink-on-porcelain"
          >
            <span className="col-span-2 font-mono text-eyebrow text-aqua group-hover:text-aqua-deep sm:col-span-1">0{index + 1}</span>
            <span className="col-span-7 font-display text-h2 sm:col-span-8">{row.label}</span>
            <span className="col-span-3 text-right font-mono text-size text-mist group-hover:text-ink-on-porcelain/70">{row.count} pairs</span>
          </Link>
        ))}
      </section>

      <section className="py-section">
        <div className="page-wrap mb-8 flex items-end justify-between gap-4">
          <div>
            <Eyebrow index="03" total="06">New arrivals</Eyebrow>
            <Heading level={2} className="mt-3">
              Just <em>landed</em>.
            </Heading>
          </div>
          <Link href="/collections/new-season" className="link-draw font-mono text-eyebrow uppercase">
            View all
          </Link>
        </div>
        <div className="flex gap-gutter overflow-x-auto px-page pb-4">
          {arrivals.map((card) => (
            <div key={`${card.slug}-${card.colorwaySlug}`} className="w-[72vw] shrink-0 sm:w-[42vw] lg:w-[24vw]">
              <ProductCard card={card} />
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden border-y border-hairline py-6">
        <div className="marquee-track flex w-max gap-10 whitespace-nowrap font-display text-h2 italic text-foam/90">
          {Array.from({ length: 2 }, (_, copy) => (
            <span key={copy}>Walk on water — Aqualite — Walk on water — Aqualite — </span>
          ))}
        </div>
        <div className="marquee-track reverse mt-2 flex w-max gap-8 whitespace-nowrap font-mono text-eyebrow uppercase text-mist">
          {Array.from({ length: 2 }, (_, copy) => (
            <span key={copy}>Waterproof · Featherlight · Grip that holds · Made for every step · </span>
          ))}
        </div>
      </section>

      <section className="py-section">
        <div className="page-wrap">
          <Eyebrow index="04" total="06">Construction</Eyebrow>
          <Heading level={2} className="mt-3">
            What&apos;s <em>underfoot</em>.
          </Heading>
          <div className="mt-10 grid gap-4">
            {homeCopy.anatomy.map((layer) => (
              <article key={layer.index} className="grid gap-6 border border-hairline bg-trench p-6 md:grid-cols-2 md:p-10">
                <p className="font-mono text-eyebrow text-aqua">{layer.index}</p>
                <div>
                  <h3 className="font-display text-h3">{layer.name}</h3>
                  <p className="mt-2 max-w-measure text-lead text-mist">{layer.claim}</p>
                  <p className="mt-4 font-mono text-size text-foam">{layer.spec}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {featured ? (
        <section className="bg-porcelain text-ink-on-porcelain">
          <div className="page-wrap grid items-center gap-10 py-section lg:grid-cols-12">
            <div className="lg:col-span-7">
              <Buoyancy>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={featured.image} alt={featured.name} className="w-full" />
              </Buoyancy>
            </div>
            <div className="lg:col-span-5">
              <Eyebrow index="05" total="06" className="text-ink-on-porcelain/60">
                Featured drop
              </Eyebrow>
              <Heading level={2} className="mt-3 text-ink-on-porcelain">
                The <em>Tide</em> slide.
              </Heading>
              <ul className="mt-6 space-y-2 font-mono text-size uppercase text-ink-on-porcelain/80">
                {featured.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <p className="mt-6 font-body text-h3 tabular text-ink-on-porcelain">{formatINR(featured.pricePaise)}</p>
              <Button href={`/product/${featured.slug}?color=${featured.colorwaySlug}`} variant="primary" className="mt-8">
                Shop the drop
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="py-section">
        <div className="page-wrap">
          <Eyebrow index="06" total="06">Bestsellers</Eyebrow>
          <Heading level={2} className="mt-3">
            Pairs that <em>stay</em>.
          </Heading>
          <div className="mt-10 grid grid-cols-2 gap-gutter lg:grid-cols-4">
            {bestsellers.map((card) => (
              <ProductCard key={`${card.slug}-${card.colorwaySlug}`} card={card} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-hairline">
        <div className="page-wrap grid gap-10 py-section md:grid-cols-3">
          {homeCopy.stats.map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-h1 tabular">{stat.value.toLocaleString("en-IN")}</p>
              <p className="mt-2 font-mono text-eyebrow uppercase text-mist">{stat.label}</p>
              {stat.verified ? null : <p className="mt-2 font-mono text-eyebrow uppercase text-sand">Unverified</p>}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
