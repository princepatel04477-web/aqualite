import { Heading } from "@/components/ui/Heading";
import { company } from "@/content/site";

export function PolicyPage({
  eyebrow,
  title,
  em,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  em?: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <article className="page-wrap py-16">
      {company.verified ? null : (
        <p className="mb-6 border border-sand/40 px-4 py-3 font-mono text-eyebrow uppercase text-sand">
          Draft — pending legal review
        </p>
      )}
      <p className="font-mono text-eyebrow uppercase text-mist">{eyebrow}</p>
      <Heading level={1} className="mt-4">
        {title} {em ? <em>{em}</em> : null}
      </Heading>
      <p className="mt-3 font-mono text-size text-mist">Updated {updated}</p>
      <div className="measure mt-8 space-y-4 text-body text-mist">{children}</div>
    </article>
  );
}
