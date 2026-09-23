import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ListingView } from "@/components/listing/ListingView";
import { GENDERS, type Gender } from "@/content/catalog";
import { parseListing } from "@/lib/catalog/filters";
import { listProducts } from "@/lib/catalog/queries";

export const revalidate = 300;

export function generateStaticParams() {
  return GENDERS.filter((gender) => gender !== "unisex").map((gender) => ({ gender }));
}

export function generateMetadata({ params }: { params: { gender: string } }): Metadata {
  const label = params.gender[0]?.toUpperCase() + params.gender.slice(1);
  return { title: label, description: `Aqualite ${params.gender}'s footwear.` };
}

export default async function GenderPage({
  params,
  searchParams,
}: {
  params: { gender: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (!GENDERS.includes(params.gender as Gender) || params.gender === "unisex") notFound();
  const parsed = parseListing(searchParams);
  const listing = await listProducts({ ...parsed, gender: params.gender as Gender });
  const label = params.gender[0]?.toUpperCase() + params.gender.slice(1);
  return (
    <ListingView
      base={`/shop/${params.gender}`}
      params={{ ...parsed, gender: params.gender as Gender }}
      listing={listing}
      title={<>{label}&apos;s <em>edit</em></>}
    />
  );
}
