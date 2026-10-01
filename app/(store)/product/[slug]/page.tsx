import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BuyBox } from "@/components/pdp/BuyBox";
import { ProductGallery } from "@/components/pdp/ProductGallery";
import { ProductCard } from "@/components/product/ProductCard";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Heading } from "@/components/ui/Heading";
import { Tag } from "@/components/ui/Tag";
import { products } from "@/content/catalog";
import { getProduct } from "@/lib/catalog/queries";
import { effectivePrice } from "@/lib/hub/pricing/effective";
import { formatINR } from "@/lib/money";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProduct(slug);
  if (!data) return { title: "Product" };
  const primaryImage = data.product.colorways[0]?.images[0]?.src;
  return {
    title: data.product.seoTitle || data.product.name,
    description: data.product.seoDescription || data.product.subtitle,
    openGraph: {
      title: data.product.seoTitle || data.product.name,
      description: data.product.seoDescription || data.product.subtitle,
      images: primaryImage ? [{ url: primaryImage }] : undefined,
    },
  };
}

function fitLabel(fit: "runs_small" | "true" | "runs_large"): string {
  if (fit === "runs_small") return "Runs small";
  if (fit === "runs_large") return "Runs large";
  return "True to size";
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const data = await getProduct(slug);
  if (!data) notFound();
  const colorParam = typeof query.color === "string" ? query.color : undefined;
  const sizeParam = typeof query.size === "string" ? query.size : undefined;
  const colorway =
    data.product.colorways.find((item) => item.slug === colorParam) ??
    data.product.colorways.find((item) => item.variants.some((variant) => (data.stock[variant.id] ?? 0) > 0)) ??
    data.product.colorways[0];
  if (!colorway) notFound();

  const firstVariant = colorway.variants[0];
  const priceInr = firstVariant ? (effectivePrice(firstVariant) / 100).toFixed(2) : "0.00";
  const inStock = colorway.variants.some((v) => (data.stock[v.id] ?? 0) > 0);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: data.product.name,
    description: data.product.description,
    image: colorway.images.map((img) => img.src),
    sku: firstVariant?.sku ?? data.product.slug,
    brand: {
      "@type": "Brand",
      name: "Aqualite",
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: priceInr,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `/product/${data.product.slug}?color=${colorway.slug}`,
    },
    ...(data.reviewSummary.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(data.reviewSummary.avg.toFixed(1)),
            reviewCount: data.reviewSummary.count,
          },
        }
      : {}),
  };

  return (
    <div className="page-wrap py-8 pb-28 lg:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <p className="font-mono text-eyebrow uppercase text-mist">
        <Link href="/shop">Shop</Link> / <Link href={`/shop/${data.product.gender}`}>{data.product.gender}</Link> / {data.product.name}
      </p>
      <div className="mt-6 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ProductGallery images={colorway.images} productName={`${data.product.name} — ${colorway.name}`} />
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
            <BuyBox
              product={data.product}
              color={colorway.slug}
              size={sizeParam}
              stock={data.stock}
              promoLabel={data.promoLabel}
              clockAt={new Date().toISOString()}
            />
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
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <Heading level={2}>
            Worn, then <em>written</em>.
          </Heading>
          {data.reviewSummary.count > 0 ? (
            <p className="font-mono text-eyebrow uppercase text-mist">
              {data.reviewSummary.avg.toFixed(1)} / 5 · {data.reviewSummary.count} verified & guest reviews
            </p>
          ) : null}
        </div>
        <ul className="mt-8 divide-y divide-hairline">
          {data.reviews.map((review) => (
            <li key={review.id} className="py-6">
              <p className="font-mono text-size text-aqua">
                {"●".repeat(review.rating)}
                {"○".repeat(5 - review.rating)}
              </p>
              <p className="mt-2 font-body font-medium">{review.title}</p>
              <p className="measure mt-1 text-small text-mist">{review.body}</p>
              <p className="mt-2 font-mono text-eyebrow uppercase text-mist">
                {review.userName}
                {review.verified ? " · Verified purchase" : ""} · {fitLabel(review.fit)}
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
