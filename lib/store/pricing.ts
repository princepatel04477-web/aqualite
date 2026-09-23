export const FREE_SHIPPING_PAISE = 99900;
export const SHIPPING_FEE_PAISE = 7900;
export const COD_FEE_PAISE = 4900;
export const COD_MAX_PAISE = 300000;
export const TAX_THRESHOLD_PAISE = 250000;
export const TAX_LOW_BPS = 500;
export const TAX_HIGH_BPS = 1800;

export type QuoteLineInput = {
  variantId: string;
  qty: number;
  unitPricePaise: number;
  available: number;
};

export type QuoteLine = QuoteLineInput & {
  taxRateBps: number;
  taxPaise: number;
  lineTotalPaise: number;
  isShort: boolean;
};

export type Quote = {
  lines: QuoteLine[];
  subtotalPaise: number;
  shippingPaise: number;
  codFeePaise: number;
  taxPaise: number;
  totalPaise: number;
  freeShippingRemainingPaise: number;
};

export function taxForUnit(unitPricePaise: number): { rateBps: number; taxPaise: number } {
  const rateBps = unitPricePaise <= TAX_THRESHOLD_PAISE ? TAX_LOW_BPS : TAX_HIGH_BPS;
  const taxPaise = Math.round((unitPricePaise * rateBps) / (10000 + rateBps));
  return { rateBps, taxPaise };
}

export function shippingFor(subtotalPaise: number, rules?: { threshold: number; fee: number }): number {
  const threshold = rules?.threshold ?? FREE_SHIPPING_PAISE;
  const fee = rules?.fee ?? SHIPPING_FEE_PAISE;
  if (subtotalPaise <= 0) return 0;
  return subtotalPaise >= threshold ? 0 : fee;
}

export function quoteCart(
  items: QuoteLineInput[],
  options?: { method?: "razorpay" | "cod"; rules?: { threshold: number; fee: number; codFee: number } },
): Quote {
  const lines: QuoteLine[] = items.map((item) => {
    const tax = taxForUnit(item.unitPricePaise);
    return {
      ...item,
      taxRateBps: tax.rateBps,
      taxPaise: tax.taxPaise * item.qty,
      lineTotalPaise: item.unitPricePaise * item.qty,
      isShort: item.qty > item.available,
    };
  });
  const subtotalPaise = lines.reduce((sum, line) => sum + line.lineTotalPaise, 0);
  const shippingPaise = shippingFor(subtotalPaise, options?.rules
    ? { threshold: options.rules.threshold, fee: options.rules.fee }
    : undefined);
  const codFeePaise = options?.method === "cod" ? (options.rules?.codFee ?? COD_FEE_PAISE) : 0;
  const taxPaise = lines.reduce((sum, line) => sum + line.taxPaise, 0);
  const totalPaise = subtotalPaise + shippingPaise + codFeePaise;
  const threshold = options?.rules?.threshold ?? FREE_SHIPPING_PAISE;
  return {
    lines,
    subtotalPaise,
    shippingPaise,
    codFeePaise,
    taxPaise,
    totalPaise,
    freeShippingRemainingPaise: Math.max(0, threshold - subtotalPaise),
  };
}
