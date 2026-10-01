import { Heading } from "@/components/ui/Heading";

export const metadata = { title: "Our story" };

export default function StoryPage() {
  return (
    <article className="page-wrap py-16">
      <p className="font-mono text-eyebrow uppercase text-sand">Draft copy — awaiting the client’s history</p>
      <Heading level={1} className="mt-4">
        Made for the <em>monsoon</em>.
      </Heading>
      <div className="measure mt-8 space-y-4 text-mist">
        <p>Aqualite started as a footwear house for Indian weather: sudden rain, hot tile, long walks between a door and a bus.</p>
        <p>The prototype you are reading is a draft. Factory, materials and the founder’s account will replace this page before anything is called final.</p>
        <p>Until then, the product is the argument. Light EVA. A sole that holds. A price that includes the tax.</p>
      </div>
    </article>
  );
}
