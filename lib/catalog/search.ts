import type { ProductCardModel } from "@/lib/commerce/types";

const SYNONYMS: Record<string, string[]> = {
  flipflop: ["flip-flops", "flip flop", "chappal", "slippers", "thong"],
  "flip flop": ["flip-flops", "flipflop", "chappal", "slippers"],
  chappal: ["flip-flops", "slippers", "flipflop"],
  slippers: ["flip-flops", "slides", "chappal"],
  slides: ["sliders", "slide", "slippers"],
  sliders: ["slides"],
  sneakers: ["trainers", "shoes"],
  trainers: ["sneakers", "shoes"],
  shoes: ["sneakers", "casual"],
  kids: ["children", "school"],
  children: ["kids"],
  school: ["kids", "school-shoes"],
  sandel: ["sandal", "sandals"],
  sandal: ["sandals"],
};

function levenshtein(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => {
    const row = Array.from({ length: b.length + 1 }, () => 0);
    row[0] = i;
    return row;
  });
  const first = rows[0];
  if (first) {
    for (let j = 0; j < b.length + 1; j += 1) first[j] = j;
  }
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const current = rows[i];
      const prev = rows[i - 1];
      if (!current || !prev) continue;
      current[j] = Math.min((prev[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
  }
  return rows[a.length]?.[b.length] ?? 99;
}

function expand(query: string): string[] {
  const q = query.toLowerCase().trim();
  const terms = new Set([q, q.replaceAll("-", ""), q.replaceAll(" ", "")]);
  const extra = SYNONYMS[q] ?? SYNONYMS[q.replaceAll(" ", "")] ?? [];
  extra.forEach((term) => terms.add(term));
  return [...terms];
}

export function searchProducts(cards: ProductCardModel[], query: string): { items: ProductCardModel[]; suggestion: string | null } {
  const terms = expand(query);
  const scored = cards
    .map((card) => {
      const hay = `${card.name} ${card.subtitle} ${card.category} ${card.categorySlug} ${card.gender}`.toLowerCase();
      let score = 0;
      terms.forEach((term) => {
        if (hay.includes(term)) score += 5;
      });
      const name = card.name.toLowerCase();
      const distance = levenshtein(name.slice(0, 12), query.toLowerCase().slice(0, 12));
      if (distance <= 3) score += 3;
      return { card, score, distance };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
  const suggestion = scored[0] && levenshtein(query.toLowerCase(), scored[0].card.categorySlug) <= 2 ? scored[0].card.category : null;
  return { items: scored.map((row) => row.card), suggestion };
}
