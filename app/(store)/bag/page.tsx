import { BagView } from "@/components/cart/BagView";
import { Heading } from "@/components/ui/Heading";

export const metadata = { title: "Bag" };
export const dynamic = "force-dynamic";

export default function BagPage() {
  return (
    <div className="page-wrap py-16">
      <Heading level={1}>
        Your <em>bag</em>
      </Heading>
      <BagView />
    </div>
  );
}
