import { headers } from "next/headers";

import { HomeView } from "@/components/home/HomeView";
import { getHeroSlides } from "@/lib/catalog/hero";
import { allCards, getFeatured } from "@/lib/catalog/queries";

export const revalidate = 300;

/** H06: phones get the stacked mobile hero straight from the server. */
function initialMobileFromUA(): boolean {
  const ua = headers().get("user-agent") ?? "";
  return /Android|iPhone|iPad|iPod|IEMobile|BlackBerry|Silk|Mobile/i.test(ua);
}

export default async function HomePage() {
  const [arrivals, bestsellers, featuredList, cards, heroSlides] = await Promise.all([
    getFeatured("new"),
    getFeatured("bestsellers"),
    getFeatured("featured"),
    allCards(),
    getHeroSlides(),
  ]);
  return (
    <HomeView
      initialMobile={initialMobileFromUA()}
      heroSlides={heroSlides}
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
