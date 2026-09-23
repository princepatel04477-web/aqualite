import Link from "next/link";

import { Anatomy } from "@/components/home/Anatomy";
import { Campaign } from "@/components/home/Campaign";
import { EditRail } from "@/components/home/EditRail";
import { HeroStage } from "@/components/home/HeroStage";
import { ShopIndex } from "@/components/home/ShopIndex";
import { CountUp } from "@/components/motion/CountUp";
import { Reveal } from "@/components/motion/Reveal";
import { TideIntro } from "@/components/motion/TideIntro";
import { ProductCard } from "@/components/product/ProductCard";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Heading } from "@/components/ui/Heading";
import { homeCopy } from "@/content/site";
import type { ProductCardModel } from "@/lib/commerce/types";
import { formatINR } from "@/lib/money";
import { stagger } from "@/lib/motion/tokens";

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
  const edit = [featured, ...arrivals]
    .filter((card): card is ProductCardModel => card !== null)
    .filter((card, index, list) => list.findIndex((item) => item.slug === card.slug && item.colorwaySlug === card.colorwaySlug) === index)
    .slice(0, 4)
    .map((card) => ({
      href: `/product/${card.slug}?color=${card.colorwaySlug}`,
      name: card.name,
      image: card.image,
      price: formatINR(card.pricePaise),
    }));

  return (
    <>
      <TideIntro />
      <HeroStage
        eyebrow={homeCopy.eyebrow}
        lead={homeCopy.headlineLead}
        emphasis={homeCopy.headlineEm}
        rest={homeCopy.headlineRest}
        copy={homeCopy.lead}
        price={featured ? formatINR(featured.pricePaise) : formatINR(49900)}
        productHref={featured ? `/product/${featured.slug}?color=${featured.colorwaySlug}` : "/product/tide-slide?color=midnight"}
        edit={edit}
      />

      <ShopIndex
        rows={[
          { href: "/shop/men", label: "Men", count: counts.men, note: "Slides, clogs, flips", image: "/catalog/tide-slide-midnight.jpg" },
          { href: "/shop/women", label: "Women", count: counts.women, note: "Slides, clogs, trainers", image: "/catalog/pearl-slide-blush.jpg" },
          { href: "/shop/kids", label: "Kids", count: counts.kids, note: "Still being photographed", image: null },
          { href: "/collections/everyday-slides", label: "Slides", count: counts.slides, note: "The door pair", image: "/catalog/tide-slide-sand.jpg" },
        ]}
      />

      <section className="py-section">
        <div className="page-wrap mb-8 flex items-end justify-between gap-4">
          <Reveal>
            <Eyebrow index="03" total="06">
              New arrivals
            </Eyebrow>
            <Heading level={2} className="mt-3">
              Just <em>landed</em>.
            </Heading>
          </Reveal>
          <Link href="/collections/new-season" className="link-draw font-mono text-eyebrow uppercase">
            View all
          </Link>
        </div>
        <EditRail>
          {arrivals.map((card) => (
            <div key={`${card.slug}-${card.colorwaySlug}`} className="w-[72vw] shrink-0 snap-start sm:w-[42vw] lg:w-[24vw]">
              <ProductCard card={card} />
            </div>
          ))}
        </EditRail>
      </section>

      <section className="overflow-hidden border-y border-hairline py-8" aria-hidden="true">
        <div className="marquee-track flex w-max gap-12 whitespace-nowrap font-display text-h1 italic text-foam/90">
          {Array.from({ length: 2 }, (_, copy) => (
            <span key={copy}>Walk on water — Aqualite — Walk on water — Aqualite — </span>
          ))}
        </div>
        <div className="marquee-track reverse mt-3 flex w-max gap-8 whitespace-nowrap font-mono text-eyebrow uppercase text-mist">
          {Array.from({ length: 2 }, (_, copy) => (
            <span key={copy}>Waterproof · Featherlight · Grip that holds · Made for the monsoon · </span>
          ))}
        </div>
      </section>

      <Anatomy layers={homeCopy.anatomy} />

      {featured ? (
        <Campaign
          image={featured.image}
          name={featured.name}
          price={formatINR(featured.pricePaise)}
          href={`/product/${featured.slug}?color=${featured.colorwaySlug}`}
          features={featured.features}
        />
      ) : null}

      <section className="py-section">
        <div className="page-wrap">
          <Reveal>
            <Eyebrow index="06" total="06">
              Bestsellers
            </Eyebrow>
            <Heading level={2} className="mt-3">
              Pairs that <em>stay</em>.
            </Heading>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 gap-gutter lg:grid-cols-4">
            {bestsellers.map((card, index) => (
              <Reveal key={`${card.slug}-${card.colorwaySlug}`} delay={index * stagger.base}>
                <ProductCard card={card} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-hairline">
        <div className="page-wrap grid gap-10 py-section md:grid-cols-3">
          {homeCopy.stats.map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-h1 tabular">
                <CountUp value={stat.value} />
              </p>
              <p className="mt-2 font-mono text-eyebrow uppercase text-mist">{stat.label}</p>
              {stat.verified ? null : <p className="mt-2 font-mono text-eyebrow uppercase text-sand">Unverified</p>}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
