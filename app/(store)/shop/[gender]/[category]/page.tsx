import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ListingView } from "@/components/listing/ListingView";
import { CATEGORIES, GENDERS, categoryBySlug, type Gender } from "@/content/catalog";
import { parseListing } from "@/lib/catalog/filters";
import { listProducts } from "@/lib/catalog/queries";

export const revalidate = 300;

export function generateStaticParams() {
  return GENDERS.filter((gender) => gender !== "unisex").flatMap((gender) =>
    CATEGORIES.map((category) => ({ gender, category: category.slug })),
  );
}

export function generateMetadata({ params }: { params: { gender: string; category: string } }): Metadata {
  const category = categoryBySlug(params.category);
  const gender = params.gender[0]?.toUpperCase() + params.gender.slice(1);
  return { title: `${gender}'s ${category?.name ?? "footwear"}` };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { gender: string; category: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (!GENDERS.includes(params.gender as Gender)) notFound();
  const category = categoryBySlug(params.category);
  if (!category) notFound();
  const parsed = parseListing(searchParams);
  const listing = await listProducts({
    ...parsed,
    gender: params.gender as Gender,
    category: category.slug,
  });
  return (
    <ListingView
      base={`/shop/${params.gender}/${category.slug}`}
      params={{ ...parsed, gender: params.gender as Gender, category: category.slug }}
      listing={listing}
      title={
        <>
          {params.gender[0]?.toUpperCase()}
          {params.gender.slice(1)}&apos;s <em>{category.name.toLowerCase()}</em>
        </>
      }
      intro={category.description}
    />
  );
}
