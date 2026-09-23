import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BuyBox } from "@/components/pdp/BuyBox";
import { FrameIn } from "@/components/pdp/FrameIn";
import { ProductCard } from "@/components/product/ProductCard";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Heading } from "@/components/ui/Heading";
import { Tag } from "@/components/ui/Tag";
import { products } from "@/content/catalog";
import { getProduct } from "@/lib/catalog/queries";
import { formatINR } from "@/lib/money";

export const revalidate = 300;

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await getProduct(params.slug);
  if (!data) return { title: "Product" };
  return {
    title: data.product.name,
    description: data.product.subtitle,
  };
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const data = await getProduct(params.slug);
  if (!data) notFound();
  const colorParam = typeof searchParams.color === "string" ? searchParams.color : undefined;
  const sizeParam = typeof searchParams.size === "string" ? searchParams.size : undefined;
  const colorway =
    data.product.colorways.find((item) => item.slug === colorParam) ??
    data.product.colorways.find((item) => item.variants.some((variant) => (data.stock[variant.id] ?? 0) > 0)) ??
    data.product.colorways[0];
  if (!colorway) notFound();
  const primary = colorway.images[0];

  return (
    <div className="page-wrap py-8 lg:py-12">
      <p className="font-mono text-eyebrow uppercase text-mist">
        <Link href="/shop">Shop</Link> / <Link href={`/shop/${data.product.gender}`}>{data.product.gender}</Link> / {data.product.name}
      </p>
      <div className="mt-6 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <FrameIn className="stage aspect-[4/5] overflow-hidden">
            {primary ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={primary.src} alt={primary.alt} className="h-full w-full object-cover" />
            ) : null}
          </FrameIn>
          {colorway.images.length > 1 ? (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {colorway.images.slice(1).map((image) => (
                <div key={image.src} className="stage aspect-[4/5] overflow-hidden bg-abyss">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.src} alt={image.alt} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="lg:col-span-5 lg:sticky lg:top-28 lg:self-start">
          <div className="flex gap-3">
            {data.cards[0]?.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
          <Heading level={1} size="h2" className="mt-3">
            {data.product.name}
          </Heading>
          <p className="mt-2 text-lead text-mist">{data.product.subtitle}</p>
          {data.reviewSummary.count > 0 ? (
            <p className="mt-3 font-mono text-size text-aqua">
              {data.reviewSummary.avg.toFixed(1)} · {data.reviewSummary.count} reviews
            </p>
          ) : null}
          <div className="mt-8">
            <BuyBox product={data.product} color={colorway.slug} size={sizeParam} stock={data.stock} />
          </div>
          <div className="mt-10 divide-y divide-hairline border-y border-hairline">
            <details className="py-4" open>
              <summary className="cursor-pointer font-body font-medium">Description</summary>
              <p className="measure mt-3 text-small text-mist">{data.product.description}</p>
            </details>
            <details className="py-4">
              <summary className="cursor-pointer font-body font-medium">Features & materials</summary>
              <ul className="mt-3 space-y-1 font-mono text-size text-mist">
                <li>Upper · {data.product.materialUpper}</li>
                <li>Sole · {data.product.materialSole}</li>
                {data.product.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </details>
            <details className="py-4">
              <summary className="cursor-pointer font-body font-medium">Care</summary>
              <p className="measure mt-3 text-small text-mist">{data.product.care}</p>
            </details>
            <details className="py-4">
              <summary className="cursor-pointer font-body font-medium">Declarations</summary>
              <ul className="mt-3 space-y-1 font-mono text-size text-mist">
                <li>Country of origin · {data.product.countryOfOrigin}</li>
                <li>Net quantity · {data.product.netQuantity}</li>
                <li>MRP · {priceLabel(colorway.variants[0]?.mrpPaise ?? 0)} incl. of all taxes</li>
                <li>Manufacturer · {data.product.manufacturer}</li>
              </ul>
            </details>
          </div>
        </div>
      </div>
      <section className="mt-section">
        <Eyebrow>Reviews</Eyebrow>
        <Heading level={2} className="mt-3">
          Worn, then <em>written</em>.
        </Heading>
        <ul className="mt-8 divide-y divide-hairline">
          {data.reviews.map((review) => (
            <li key={review.id} className="py-6">
              <p className="font-mono text-size text-aqua">{"●".repeat(review.rating)}{"○".repeat(5 - review.rating)}</p>
              <p className="mt-2 font-body font-medium">{review.title}</p>
              <p className="measure mt-1 text-small text-mist">{review.body}</p>
              <p className="mt-2 font-mono text-eyebrow uppercase text-mist">
                {review.userName}
                {review.verified ? " · Verified purchase" : ""} · {review.fit.replace("_", " ")}
              </p>
            </li>
          ))}
        </ul>
      </section>
      {data.related.length > 0 ? (
        <section className="mt-section">
          <Heading level={2}>
            Pairs well <em>with</em>
          </Heading>
          <div className="mt-8 grid grid-cols-2 gap-gutter lg:grid-cols-4">
            {data.related.slice(0, 4).map((card) => (
              <ProductCard key={`${card.productId}-${card.colorwaySlug}`} card={card} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function priceLabel(paise: number): string {
  return formatINR(paise);
}
