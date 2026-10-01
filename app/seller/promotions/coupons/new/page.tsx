import { CATEGORIES, collections } from "@/content/catalog";
import { PromotionForm, type PromotionFormCatalog } from "@/components/seller/PromotionForm";
import { catalogProducts, listPromotions } from "@/lib/store/engine";

export const metadata = { title: "New coupon · Seller Hub" };

export default async function NewCouponPage() {
  const [products, existing] = await Promise.all([catalogProducts(), listPromotions()]);
  const catalog: PromotionFormCatalog = {
    products: products.map((product) => ({ id: product.id, name: product.name })),
    categories: CATEGORIES.map((category) => ({ id: category.slug, name: category.name })),
    collections: collections.map((collection) => ({ id: collection.slug, name: collection.name })),
  };
  return (
    <div>
      <h1 className="text-hub-title font-display">New coupon</h1>
      <p className="mt-1 text-hub-body text-muted">
        A code customers type in. One coupon per bag, re-validated on the server at payment.
      </p>
      <div className="mt-6">
        <PromotionForm kind="coupon" catalog={catalog} existing={existing} />
      </div>
    </div>
  );
}
