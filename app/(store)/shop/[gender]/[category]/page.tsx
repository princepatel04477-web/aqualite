import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ListingView } from "@/components/listing/ListingView";
import { CATEGORIES, GENDERS, categoryBySlug, type Gender } from "@/content/catalog";
import { parseListing } from "@/lib/catalog/filters";
import { listProducts } from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return GENDERS.filter((gender) => gender !== "unisex").flatMap((gender) =>
    CATEGORIES.map((category) => ({ gender, category: category.slug })),
  );
}

export async function generateMetadata({ params }: { params: Promise<{ gender: string; category: string }> }): Promise<Metadata> {
  const { gender: genderSlug, category: categorySlug } = await params;
  const category = categoryBySlug(categorySlug);
  const gender = genderSlug[0]?.toUpperCase() + genderSlug.slice(1);
  return { title: `${gender}'s ${category?.name ?? "footwear"}` };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ gender: string; category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { gender, category: categorySlug } = await params;
  if (!GENDERS.includes(gender as Gender)) notFound();
  const category = categoryBySlug(categorySlug);
  if (!category) notFound();
  const parsed = parseListing(await searchParams);
  const listing = await listProducts({
    ...parsed,
    gender: gender as Gender,
    category: category.slug,
  });
  return (
    <ListingView
      base={`/shop/${gender}/${category.slug}`}
      params={{ ...parsed, gender: gender as Gender, category: category.slug }}
      listing={listing}
      title={
        <>
          {gender[0]?.toUpperCase()}
          {gender.slice(1)}&apos;s <em>{category.name.toLowerCase()}</em>
        </>
      }
      intro={category.description}
    />
  );
}
