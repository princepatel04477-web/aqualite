import { notFound } from "next/navigation";

import { CATEGORIES, collections } from "@/content/catalog";
import { PromotionForm, type PromotionFormCatalog } from "@/components/seller/PromotionForm";
import { PromotionPerformance } from "@/components/seller/PromotionPerformance";
import { promotionPerformance } from "@/lib/hub/promotions/summary";
import {
  catalogProducts,
  getPromotion,
  listOrders,
  listPromotions,
  listRedemptions,
} from "@/lib/store/engine";

export const metadata = { title: "Edit automatic promotion · Seller Hub" };

export default async function EditAutomaticPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const promotion = await getPromotion(decodeURIComponent(id));
  if (!promotion || promotion.kind !== "automatic") notFound();
  const [products, existing, redemptions, orders] = await Promise.all([
    catalogProducts(),
    listPromotions(),
    listRedemptions(),
    listOrders(),
  ]);
  const catalog: PromotionFormCatalog = {
    products: products.map((product) => ({ id: product.id, name: product.name })),
    categories: CATEGORIES.map((category) => ({ id: category.slug, name: category.name })),
    collections: collections.map((collection) => ({ id: collection.slug, name: collection.name })),
  };
  return (
    <div>
      <h1 className="text-hub-title font-display">{promotion.name}</h1>
      <p className="mt-1 text-hub-body text-muted">
        Automatic promotions show on matching products and apply themselves in the bag.
      </p>
      <div className="mt-6">
        <PromotionForm kind="automatic" initial={promotion} catalog={catalog} existing={existing} />
      </div>
      <PromotionPerformance performance={promotionPerformance(promotion, redemptions, orders)} />
    </div>
  );
}
