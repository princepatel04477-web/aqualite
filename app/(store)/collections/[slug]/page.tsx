import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ListingView } from "@/components/listing/ListingView";
import { collections } from "@/content/catalog";
import { parseListing } from "@/lib/catalog/filters";
import { listProducts } from "@/lib/catalog/queries";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return collections.map((collection) => ({ slug: collection.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const collection = collections.find((item) => item.slug === slug);
  return { title: collection?.name ?? "Collection" };
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const collection = collections.find((item) => item.slug === slug);
  if (!collection) notFound();
  const parsed = parseListing(await searchParams);
  const listing = await listProducts({ ...parsed, collection: slug });
  const [lead, ...rest] = collection.name.split(" ");
  return (
    <ListingView
      base={`/collections/${slug}`}
      params={{ ...parsed, collection: slug }}
      listing={listing}
      title={<>{lead} <em>{rest.join(" ") || "edit"}</em></>}
      intro={collection.description}
    />
  );
}
