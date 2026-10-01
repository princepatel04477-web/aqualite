import { Heading } from "@/components/ui/Heading";

const groups = [
  { title: "Orders", q: "When is my order confirmed?", a: "Online orders confirm when payment is captured. COD orders confirm when you place them, and we hold the size immediately." },
  { title: "Sizing", q: "Which size system do you use?", a: "UK is primary. EU, US and foot length in centimetres are on every product and on the size guide." },
  { title: "Shipping", q: "Is shipping free?", a: "Yes, at ₹999 and above. Below that, a flat fee applies. The live number is on the shipping page." },
  { title: "Returns", q: "How long do I have?", a: "Seven days from delivery, unless the return window in settings says otherwise." },
  { title: "Payments", q: "Do you take UPI?", a: "Yes, through Razorpay, along with cards, netbanking and wallets. Cash on delivery is available on serviceable pincodes under the cap." },
];

export const metadata = { title: "FAQ" };

export default function FaqPage() {
  return (
    <div className="page-wrap py-16">
      <Heading level={1}>Questions, <em>answered</em>.</Heading>
      <div className="mt-10 max-w-3xl divide-y divide-hairline border-y border-hairline">
        {groups.map((item) => (
          <details key={item.title} className="py-4">
            <summary className="cursor-pointer">
              <span className="font-mono text-eyebrow uppercase text-mist">{item.title}</span>
              <span className="mt-1 block font-body font-medium">{item.q}</span>
            </summary>
            <p className="measure mt-3 text-mist">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
