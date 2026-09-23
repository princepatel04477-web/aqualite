import { NextResponse } from "next/server";

import { allCards } from "@/lib/catalog/queries";
import { searchProducts } from "@/lib/catalog/search";
import { limitIp } from "@/lib/rate-limit";

export async function GET(request: Request) {
  if (await limitIp("search", 30, 60)) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const cards = await allCards();
  const result = query ? searchProducts(cards, query) : { items: cards.slice(0, 6), suggestion: null };
  return NextResponse.json(
    {
      products: result.items.slice(0, 6).map((card) => ({
        slug: card.slug,
        name: card.name,
        colorwaySlug: card.colorwaySlug,
        colorwayName: card.colorwayName,
        image: card.image,
        pricePaise: card.pricePaise,
        category: card.category,
      })),
      categories: [],
      suggestion: result.suggestion,
    },
    { headers: { "Cache-Control": "s-maxage=60" } },
  );
}
