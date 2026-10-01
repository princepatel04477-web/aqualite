import { PolicyPage } from "@/components/content/PolicyPage";
import { getSettings } from "@/lib/store/engine";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Shipping" };

export default async function ShippingPage() {
  const settings = await getSettings();
  return (
    <PolicyPage eyebrow="Help" title="Shipping" updated="23 Sep 2026">
      <p>Orders of {formatINR(settings.shippingThresholdPaise)} and above ship free. Under that, shipping is {formatINR(settings.shippingFeePaise)}.</p>
      <p>Metro pincodes usually arrive in 2–4 days, other cities in 4–8, Sundays excluded. Cash on delivery, where offered, adds {formatINR(settings.codFeePaise)} and is capped at {formatINR(settings.codMaxPaise)}.</p>
      <p>These numbers are the same ones checkout enforces. If they change in admin, this page changes with them.</p>
    </PolicyPage>
  );
}
