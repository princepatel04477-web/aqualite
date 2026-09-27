import { HeroSlideEditor, type HeroProductOption } from "@/components/admin/HeroSlideEditor";
import { Heading } from "@/components/ui/Heading";
import { availabilityMap, catalogProducts, getHeroSlideRows } from "@/lib/store/engine";

export const metadata = { title: "Hero slides — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminHeroPage() {
  const [rows, products] = await Promise.all([getHeroSlideRows(), catalogProducts()]);
  const stock = await availabilityMap(
    products.flatMap((product) =>
      product.colorways.flatMap((colorway) => colorway.variants.map((variant) => variant.id)),
    ),
  );

  const options: HeroProductOption[] = products
    .filter((product) => product.isActive)
    .map((product) => ({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      colorways: product.colorways.map((colorway) => ({
        colorwayId: colorway.id,
        slug: colorway.slug,
        name: colorway.name,
        pricePaise: colorway.variants.reduce(
          (min, variant) => Math.min(min, variant.pricePaise),
          colorway.variants[0]?.pricePaise ?? Number.MAX_SAFE_INTEGER,
        ),
        mrpPaise: colorway.variants[0]?.mrpPaise ?? 0,
        image: colorway.images[0]?.src ?? "",
        soldOut: colorway.variants.every((variant) => (stock[variant.id] ?? 0) <= 0),
      })),
    }));

  return (
    <div>
      <Heading level={1} size="h2">
        Hero slides
      </Heading>
      <p className="mt-3 max-w-measure font-body text-small text-mist">
        The home showcase is data: one scene per active slide. Prices, product names and
        thumbnails always come from the catalogue, so a price edit there flows through without
        touching these rows. Copy below is draft until sign-off.
      </p>
      <div className="mt-8">
        <HeroSlideEditor slides={rows} options={options} />
      </div>
    </div>
  );
}
