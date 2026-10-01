import { PolicyPage } from "@/components/content/PolicyPage";
import { company } from "@/content/site";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <PolicyPage eyebrow="Legal" title="Privacy" updated="23 Sep 2026">
      <p>We collect the details needed to sell you a pair: name, email, mobile, delivery address, and order history. Payment card data is handled by Razorpay, not stored here.</p>
      <p>We use cookies for the bag, the session, and basic security. We do not sell personal data.</p>
      <p>Grievance officer: {company.grievanceOfficer}, {company.grievanceEmail}. Registered address: {company.address}. GSTIN {company.gstin}.</p>
    </PolicyPage>
  );
}
