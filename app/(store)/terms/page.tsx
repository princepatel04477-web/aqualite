import { PolicyPage } from "@/components/content/PolicyPage";
import { company } from "@/content/site";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <PolicyPage eyebrow="Legal" title="Terms" updated="23 Sep 2026">
      <p>These terms govern purchases from {company.legalName}. Prices are MRP inclusive of GST. A contract forms when an order is paid or COD is confirmed.</p>
      <p>You may cancel before the order is packed. Governing law: India. Courts at Mumbai have jurisdiction, subject to the client’s confirmed registered office.</p>
    </PolicyPage>
  );
}
