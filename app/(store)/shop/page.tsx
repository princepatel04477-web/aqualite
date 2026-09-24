import type { Metadata } from "next";

import { ListingView } from "@/components/listing/ListingView";
import { parseListing } from "@/lib/catalog/filters";
import { listProducts } from "@/lib/catalog/queries";

export const metadata: Metadata = { title: "Shop", description: "Men's, women's and kids' Aqualite footwear." };
export const revalidate = 300;

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = parseListing(searchParams);
  const listing = await listProducts(params);
  return (
    <ListingView
      base="/shop"
      params={params}
      listing={listing}
      title={params.q ? <>Results for <em>{params.q}</em></> : <>All <em>pairs</em></>}
      intro="GST-inclusive prices. UK sizing, with EU and US on the product page."
    />
  );
}
