import { Heading } from "@/components/ui/Heading";
import { SIZE_CHART } from "@/content/catalog";

export const metadata = { title: "Size guide" };

export default function SizeGuidePage() {
  return (
    <div className="page-wrap py-16">
      <Heading level={1}>
        Find your <em>size</em>
      </Heading>
      <p className="measure mt-4 text-mist">UK is the size we sell. EU, US and foot length sit beside it. Between sizes, go up for closed shoes and stay true for slides.</p>
      <div className="mt-10 space-y-12">
        {(["men", "women", "kids"] as const).map((gender) => (
          <section key={gender}>
            <h2 className="font-display text-h3 capitalize">{gender}</h2>
            <table className="mt-4 w-full text-left font-mono text-size tabular">
              <thead className="text-mist">
                <tr>
                  <th className="py-2">UK</th>
                  <th>EU</th>
                  <th>US</th>
                  <th>Foot cm</th>
                </tr>
              </thead>
              <tbody>
                {SIZE_CHART[gender].map((row) => (
                  <tr key={row.uk} className="border-t border-hairline">
                    <td className="py-2">{row.label}</td>
                    <td>{row.eu}</td>
                    <td>{row.us}</td>
                    <td>{(row.mm / 10).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </div>
  );
}
