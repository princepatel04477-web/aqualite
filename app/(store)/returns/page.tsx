import { PolicyPage } from "@/components/content/PolicyPage";
import { getSettings } from "@/lib/store/engine";

export const metadata = { title: "Returns" };

export default async function ReturnsPage() {
  const settings = await getSettings();
  return (
    <PolicyPage eyebrow="Help" title="Returns" updated="23 Sep 2026">
      <p>Delivered orders can be returned within {settings.returnWindowDays} days. The pair should be unworn, with the tags if it had them.</p>
      <p>Start a return from your account once the order is marked delivered, or write to us with the order number.</p>
      <p>Refunds go back to the original payment method after we receive the pair. COD refunds are transferred to the account you share.</p>
    </PolicyPage>
  );
}
