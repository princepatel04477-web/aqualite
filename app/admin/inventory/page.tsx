import { products } from "@/content/catalog";
import { Heading } from "@/components/ui/Heading";
import { dashboard } from "@/lib/store/engine";
import { StockAdjust } from "@/components/admin/StockAdjust";

export default async function InventoryPage() {
  const data = await dashboard();
  const rows = products.flatMap((product) =>
    product.colorways.flatMap((colorway) =>
      colorway.variants.map((variant) => {
        const stock = data.stock[variant.id] ?? { onHand: variant.stock, reserved: 0 };
        return {
          id: variant.id,
          sku: variant.sku,
          name: `${product.name} · ${colorway.name} · UK ${variant.label}`,
          onHand: stock.onHand,
          reserved: stock.reserved,
          available: stock.onHand - stock.reserved,
        };
      }),
    ),
  );
  const low = rows.filter((row) => row.available <= 3);
  return (
    <div>
      <Heading level={1} size="h2">Inventory</Heading>
      <p className="mt-3 text-mist">{low.length} variants at 3 or fewer available.</p>
      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-left text-small">
          <thead className="font-mono text-eyebrow uppercase text-mist">
            <tr>
              <th className="py-2">SKU</th>
              <th>Pair</th>
              <th>On hand</th>
              <th>Reserved</th>
              <th>Available</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.filter((row) => row.available <= 8).slice(0, 40).map((row) => (
              <tr key={row.id} className="border-t border-hairline">
                <td className="py-3 font-mono text-size">{row.sku}</td>
                <td>{row.name}</td>
                <td className="tabular">{row.onHand}</td>
                <td className="tabular">{row.reserved}</td>
                <td className="tabular">{row.available}</td>
                <td><StockAdjust variantId={row.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
