import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ListingView } from "@/components/listing/ListingView";
import { GENDERS, type Gender } from "@/content/catalog";
import { parseListing } from "@/lib/catalog/filters";
import { listProducts } from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return GENDERS.filter((gender) => gender !== "unisex").map((gender) => ({ gender }));
}

export async function generateMetadata({ params }: { params: Promise<{ gender: string }> }): Promise<Metadata> {
  const { gender } = await params;
  const label = gender[0]?.toUpperCase() + gender.slice(1);
  return { title: label, description: `Aqualite ${gender}'s footwear.` };
}

export default async function GenderPage({
  params,
  searchParams,
}: {
  params: Promise<{ gender: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { gender } = await params;
  if (!GENDERS.includes(gender as Gender) || gender === "unisex") notFound();
  const parsed = parseListing(await searchParams);
  const listing = await listProducts({ ...parsed, gender: gender as Gender });
  const label = gender[0]?.toUpperCase() + gender.slice(1);
  return (
    <ListingView
      base={`/shop/${gender}`}
      params={{ ...parsed, gender: gender as Gender }}
      listing={listing}
      title={<>{label}&apos;s <em>edit</em></>}
    />
  );
}
