import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ListingView } from "@/components/listing/ListingView";
import { collections } from "@/content/catalog";
import { parseListing } from "@/lib/catalog/filters";
import { listProducts, listScope } from "@/lib/catalog/queries";

export const revalidate = 300;

export function generateStaticParams() {
  return collections.map((collection) => ({ slug: collection.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const collection = collections.find((item) => item.slug === params.slug);
  return { title: collection?.name ?? "Collection" };
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const collection = collections.find((item) => item.slug === params.slug);
  if (!collection) notFound();
  const parsed = parseListing(searchParams);
  const [listing, scope] = await Promise.all([
    listProducts({ ...parsed, collection: params.slug }),
    listScope({ ...parsed, collection: params.slug }),
  ]);
  const [lead, ...rest] = collection.name.split(" ");
  return (
    <ListingView
      base={`/collections/${params.slug}`}
      params={{ ...parsed, collection: params.slug }}
      listing={listing}
      scope={scope}
      crumbs={[{ label: collection.name }]}
      title={
        <>
          {lead} <em>{rest.join(" ") || "edit"}</em>
        </>
      }
      intro={collection.description}
    />
  );
}
