const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function assertIntegerPaise(value: number, label: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer number of paise.`);
  }
}

/** Format integer paise as Indian rupees, e.g. 129900 → "₹1,299". */
export function formatINR(paise: number): string {
  assertIntegerPaise(paise, "formatINR");
  const rupees = paise / 100;
  return inr.format(rupees);
}

/** Rupees (may be decimal) → integer paise. Throws on non-finite input. */
export function toPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) {
    throw new Error("toPaise received a non-finite amount.");
  }
  const paise = Math.round(rupees * 100);
  assertIntegerPaise(paise, "toPaise");
  return paise;
}

export function assertPaise(value: number, label = "amount"): number {
  assertIntegerPaise(value, label);
  return value;
}
