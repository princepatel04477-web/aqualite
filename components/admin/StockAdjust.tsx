"use client";

import { stockAction } from "@/lib/admin/actions";

export function StockAdjust({ variantId }: { variantId: string }) {
  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const delta = Number(new FormData(event.currentTarget).get("delta"));
        void stockAction({ variantId, delta, reason: "restock", note: "Admin restock" });
      }}
    >
      <input name="delta" type="number" defaultValue={5} className="h-9 w-16 border border-hairline bg-transparent px-2 font-mono" />
      <button type="submit" className="font-mono text-eyebrow uppercase text-aqua">Apply</button>
    </form>
  );
}
