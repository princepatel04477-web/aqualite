export type Zone = "metro" | "tier2" | "rest";

export type PincodeInfo = {
  serviceable: boolean;
  codAvailable: boolean;
  etaMinDays: number;
  etaMaxDays: number;
  zone: Zone;
  state: string;
  city: string;
};

const METRO = new Set(["11", "40", "56", "60", "70", "50", "38", "39"]);
const NO_COD = new Set(["18", "19", "79", "17"]);

const STATE_BY_PREFIX: Record<string, { state: string; city: string }> = {
  "11": { state: "Delhi", city: "New Delhi" },
  "12": { state: "Haryana", city: "Sonipat" },
  "13": { state: "Haryana", city: "Faridabad" },
  "14": { state: "Punjab", city: "Ludhiana" },
  "16": { state: "Punjab", city: "Amritsar" },
  "20": { state: "Uttar Pradesh", city: "Ghaziabad" },
  "22": { state: "Uttar Pradesh", city: "Lucknow" },
  "30": { state: "Rajasthan", city: "Jaipur" },
  "38": { state: "Gujarat", city: "Ahmedabad" },
  "39": { state: "Gujarat", city: "Vadodara" },
  "40": { state: "Maharashtra", city: "Mumbai" },
  "41": { state: "Maharashtra", city: "Pune" },
  "44": { state: "Maharashtra", city: "Nagpur" },
  "50": { state: "Telangana", city: "Hyderabad" },
  "56": { state: "Karnataka", city: "Bengaluru" },
  "60": { state: "Tamil Nadu", city: "Chennai" },
  "70": { state: "West Bengal", city: "Kolkata" },
  "80": { state: "Bihar", city: "Patna" },
  "75": { state: "Odisha", city: "Bhubaneswar" },
  "68": { state: "Kerala", city: "Kochi" },
};

export function lookupPincode(code: string): PincodeInfo | null {
  if (!/^[1-9][0-9]{5}$/.test(code)) return null;
  const prefix = code.slice(0, 2);
  const zone: Zone = METRO.has(prefix) ? "metro" : Number(prefix) % 2 === 0 ? "tier2" : "rest";
  const eta =
    zone === "metro"
      ? { etaMinDays: 2, etaMaxDays: 4 }
      : zone === "tier2"
        ? { etaMinDays: 4, etaMaxDays: 6 }
        : { etaMinDays: 5, etaMaxDays: 8 };
  const place = STATE_BY_PREFIX[prefix] ?? { state: "India", city: "Serviceable area" };
  return {
    serviceable: true,
    codAvailable: !NO_COD.has(prefix),
    zone,
    ...eta,
    ...place,
  };
}

export function deliveryLabel(info: PincodeInfo, from = new Date()): string {
  const addBusiness = (start: Date, days: number): Date => {
    const date = new Date(start);
    let left = days;
    while (left > 0) {
      date.setDate(date.getDate() + 1);
      if (date.getDay() !== 0) left -= 1;
    }
    return date;
  };
  const eta = addBusiness(from, info.etaMaxDays);
  const formatted = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(eta);
  const cod = info.codAvailable ? "COD available" : "Prepaid only";
  return `Delivery by ${formatted} · ${cod}`;
}
