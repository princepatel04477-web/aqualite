import { describe, expect, it } from "vitest";

import { formatINR, toPaise } from "@/lib/money";
import { quoteCart } from "@/lib/store/pricing";

describe("money", () => {
  it("formats paise in en-IN", () => {
    expect(formatINR(129900)).toBe("₹1,299");
  });

  it("rejects non-integers", () => {
    expect(() => formatINR(12.5)).toThrow();
  });

  it("converts rupees", () => {
    expect(toPaise(499)).toBe(49900);
  });
});

describe("quote", () => {
  it("charges shipping under ₹999 and not at the threshold", () => {
    const under = quoteCart([{ variantId: "a", qty: 2, unitPricePaise: 49900, available: 5 }]);
    expect(under.subtotalPaise).toBe(99800);
    expect(under.shippingPaise).toBe(7900);
    const free = quoteCart([{ variantId: "b", qty: 1, unitPricePaise: 99900, available: 5 }]);
    expect(free.shippingPaise).toBe(0);
  });

  it("uses the higher GST slab above ₹2,500", () => {
    const low = quoteCart([{ variantId: "a", qty: 1, unitPricePaise: 249900, available: 2 }]);
    const high = quoteCart([{ variantId: "b", qty: 1, unitPricePaise: 299900, available: 2 }]);
    expect(low.lines[0]?.taxRateBps).toBe(500);
    expect(high.lines[0]?.taxRateBps).toBe(1800);
    expect(high.totalPaise).toBe(299900);
  });

  it("adds COD fee only when asked", () => {
    const cod = quoteCart([{ variantId: "a", qty: 1, unitPricePaise: 49900, available: 3 }], { method: "cod" });
    expect(cod.codFeePaise).toBe(4900);
    expect(cod.totalPaise).toBe(49900 + 7900 + 4900);
  });
});
