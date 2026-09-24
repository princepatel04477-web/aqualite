import { HomeView } from "@/components/home/HomeView";
import { allCards, getFeatured } from "@/lib/catalog/queries";

export const revalidate = 300;

export default async function HomePage() {
  const [arrivals, bestsellers, featuredList, cards] = await Promise.all([
    getFeatured("new"),
    getFeatured("bestsellers"),
    getFeatured("featured"),
    allCards(),
  ]);
  return (
    <HomeView
      arrivals={arrivals}
      bestsellers={bestsellers}
      featured={featuredList[0] ?? null}
      counts={{
        men: cards.filter((card) => card.gender === "men").length,
        women: cards.filter((card) => card.gender === "women").length,
        kids: cards.filter((card) => card.gender === "kids").length,
        slides: cards.filter((card) => card.categorySlug === "slides" || card.categorySlug === "flip-flops").length,
      }}
    />
  );
}
