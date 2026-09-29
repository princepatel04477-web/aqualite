import { ReviewQueue } from "@/components/seller/ReviewQueue";
import { allReviewReplies, catalogProducts, listReviewsForReport } from "@/lib/store/engine";

export const metadata = { title: "Reviews · Seller Hub" };
export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const [reviews, replies, products] = await Promise.all([
    listReviewsForReport(),
    allReviewReplies(),
    catalogProducts(),
  ]);
  const nameById = new Map(products.map((product) => [product.id, product.name]));
  const replyByReview = new Map(replies.map((reply) => [reply.reviewId, reply.body]));

  const rows = [...reviews]
    .sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return 1;
      return b.createdAt.localeCompare(a.createdAt);
    })
    .map((review) => ({
      id: review.id,
      userName: review.userName,
      rating: review.rating,
      title: review.title,
      body: review.body,
      status: review.status,
      createdAt: review.createdAt,
      productName: nameById.get(review.productId) ?? review.productId,
      verified: review.verified,
      reply: replyByReview.get(review.id) ?? null,
    }));

  const pending = rows.filter((row) => row.status === "pending").length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-hub-title font-display">Review moderation</h1>
          <p className="mt-1 text-hub-body text-muted">
            {pending > 0
              ? `${pending} review${pending > 1 ? "s" : ""} waiting for moderation.`
              : "Nothing waiting — the queue is clear."}{" "}
            Public replies appear under the review on the product page.
          </p>
        </div>
      </div>
      <ReviewQueue rows={rows} />
    </div>
  );
}
