import { CATEGORIES, collections } from "@/content/catalog";
import { PromotionForm, type PromotionFormCatalog } from "@/components/seller/PromotionForm";
import { catalogProducts, listPromotions } from "@/lib/store/engine";

export const metadata = { title: "New automatic promotion · Seller Hub" };

export default async function NewAutomaticPage() {
  const [products, existing] = await Promise.all([catalogProducts(), listPromotions()]);
  const catalog: PromotionFormCatalog = {
    products: products.map((product) => ({ id: product.id, name: product.name })),
    categories: CATEGORIES.map((category) => ({ id: category.slug, name: category.name })),
    collections: collections.map((collection) => ({ id: collection.slug, name: collection.name })),
  };
  return (
    <div>
      <h1 className="text-hub-title font-display">New automatic promotion</h1>
      <p className="mt-1 text-hub-body text-muted">
        Lands in the bag by itself when the bag qualifies. The best one applies automatically.
      </p>
      <div className="mt-6">
        <PromotionForm kind="automatic" catalog={catalog} existing={existing} />
      </div>
    </div>
  );
}
