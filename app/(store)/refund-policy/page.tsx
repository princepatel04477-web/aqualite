import { PolicyPage } from "@/components/content/PolicyPage";

export const metadata = { title: "Refund policy" };

export default function RefundPage() {
  return (
    <PolicyPage eyebrow="Legal" title="Refunds" updated="23 Sep 2026">
      <p>If a paid order is cancelled before packing, we refund the captured amount. Returns approved after delivery are refunded once the pair is back with us.</p>
      <p>Razorpay refunds follow the bank’s timeline, usually 5–7 working days after we initiate them. This page is a draft until counsel signs it.</p>
    </PolicyPage>
  );
}
