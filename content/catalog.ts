export const GENDERS = ["men", "women", "kids", "unisex"] as const;
export type Gender = (typeof GENDERS)[number];

export const COLOR_FAMILIES = [
  "black",
  "white",
  "blue",
  "grey",
  "brown",
  "green",
  "red",
  "pink",
  "beige",
  "multi",
] as const;
export type ColorFamily = (typeof COLOR_FAMILIES)[number];

export const CATEGORIES = [
  { slug: "slides", name: "Slides", description: "One strap. All day. The pair that lives by the door." },
  { slug: "flip-flops", name: "Flip-Flops", description: "A thong, a footbed, and nothing you don't need." },
  { slug: "sandals", name: "Sandals", description: "Open, strapped, and ready for heat." },
  { slug: "clogs", name: "Clogs", description: "Closed toe, open heel, made for wet floors and long errands." },
  { slug: "sneakers", name: "Sneakers", description: "Quiet trainers for walking, not for shouting." },
  { slug: "casual-shoes", name: "Casual Shoes", description: "Everyday shoes with a lighter step." },
  { slug: "school-shoes", name: "School Shoes", description: "Simple, durable pairs for the school run." },
  { slug: "floaters", name: "Floaters", description: "Airy sandals for monsoon evenings." },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export type SizeRow = {
  uk: number;
  eu: number;
  us: number;
  mm: number;
  label: string;
};

const menSizes: SizeRow[] = [
  { uk: 6, eu: 40, us: 7, mm: 250, label: "6" },
  { uk: 7, eu: 41, us: 8, mm: 258, label: "7" },
  { uk: 8, eu: 42, us: 9, mm: 267, label: "8" },
  { uk: 9, eu: 43, us: 10, mm: 275, label: "9" },
  { uk: 10, eu: 44, us: 11, mm: 284, label: "10" },
  { uk: 11, eu: 45, us: 12, mm: 292, label: "11" },
];

const womenSizes: SizeRow[] = [
  { uk: 3, eu: 36, us: 5, mm: 225, label: "3" },
  { uk: 4, eu: 37, us: 6, mm: 233, label: "4" },
  { uk: 5, eu: 38, us: 7, mm: 242, label: "5" },
  { uk: 6, eu: 39, us: 8, mm: 250, label: "6" },
  { uk: 7, eu: 40, us: 9, mm: 258, label: "7" },
  { uk: 8, eu: 41, us: 10, mm: 267, label: "8" },
];

const kidsSizes: SizeRow[] = [
  { uk: 10, eu: 28, us: 11, mm: 170, label: "10C" },
  { uk: 11, eu: 29, us: 12, mm: 178, label: "11C" },
  { uk: 12, eu: 30, us: 13, mm: 186, label: "12C" },
  { uk: 13, eu: 31, us: 1, mm: 194, label: "13C" },
  { uk: 1, eu: 32, us: 2, mm: 203, label: "1" },
  { uk: 2, eu: 33, us: 3, mm: 211, label: "2" },
  { uk: 3, eu: 35, us: 4, mm: 220, label: "3" },
  { uk: 4, eu: 36, us: 5, mm: 228, label: "4" },
  { uk: 5, eu: 37, us: 6, mm: 236, label: "5" },
];

export const SIZE_CHART: Record<Gender, SizeRow[]> = {
  men: menSizes,
  women: womenSizes,
  kids: kidsSizes,
  unisex: menSizes,
};

export const APPROVED_FEATURES = [
  "waterproof",
  "anti-skid",
  "lightweight",
  "quick-dry",
  "cushioned",
] as const;

export type Feature = (typeof APPROVED_FEATURES)[number];

export type CatalogImage = {
  src: string;
  alt: string;
  role: "primary" | "secondary" | "detail" | "sole" | "on_foot";
  width: number;
  height: number;
};

export type CatalogVariant = {
  id: string;
  sku: string;
  sizeUk: number;
  sizeEu: number;
  sizeUs: number;
  footLengthMm: number;
  label: string;
  mrpPaise: number;
  pricePaise: number;
  stock: number;
};

export type CatalogColorway = {
  id: string;
  slug: string;
  name: string;
  swatch: string;
  family: ColorFamily;
  images: CatalogImage[];
  spinFrames: number;
  variants: CatalogVariant[];
};

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  category: CategorySlug;
  gender: Gender;
  materialUpper: string;
  materialSole: string;
  features: Feature[];
  care: string;
  isNew: boolean;
  isDemo: boolean;
  isActive: boolean;
  publishedAt: string;
  colorways: CatalogColorway[];
  manufacturer: string;
  countryOfOrigin: string;
  netQuantity: string;
};

export type Review = {
  id: string;
  productId: string;
  userName: string;
  rating: number;
  title: string;
  body: string;
  fit: "runs_small" | "true" | "runs_large";
  status: "pending" | "approved" | "rejected";
  verified: boolean;
  createdAt: string;
};

type ColorInput = {
  slug: string;
  name: string;
  swatch: string;
  family: ColorFamily;
  image: string;
  alt: string;
  extra?: CatalogImage[];
  stock?: Partial<Record<number, number>>;
};

const CARE =
  "Rinse with clean water after rain or the beach. Air dry in the shade. Do not machine wash, tumble dry, or leave in noon sun.";

function skuSize(uk: number): string {
  return String(uk).replace(".", "");
}

function buildProduct(input: {
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  category: CategorySlug;
  gender: Gender;
  features: Feature[];
  isNew?: boolean;
  pricePaise: number;
  mrpPaise: number;
  materialUpper: string;
  materialSole: string;
  colors: ColorInput[];
  defaultStock?: number;
}): CatalogProduct {
  const sizes = SIZE_CHART[input.gender];
  const cat = input.category.slice(0, 3).toUpperCase();
  const productCode = input.slug.slice(0, 4).toUpperCase();
  return {
    id: `p_${input.slug.replaceAll("-", "_")}`,
    slug: input.slug,
    name: input.name,
    subtitle: input.subtitle,
    description: input.description,
    category: input.category,
    gender: input.gender,
    materialUpper: input.materialUpper,
    materialSole: input.materialSole,
    features: input.features,
    care: CARE,
    isNew: input.isNew ?? false,
    isDemo: true,
    isActive: true,
    publishedAt: "2026-03-01T00:00:00.000Z",
    manufacturer: "Aqualite Footwear",
    countryOfOrigin: "India",
    netQuantity: "1 Pair",
    colorways: input.colors.map((color) => {
      const colorCode = color.slug.slice(0, 3).toUpperCase();
      return {
        id: `cw_${input.slug.replaceAll("-", "_")}_${color.slug}`,
        slug: color.slug,
        name: color.name,
        swatch: color.swatch,
        family: color.family,
        spinFrames: 0,
        images: [
          {
            src: color.image,
            alt: color.alt,
            role: "primary" as const,
            width: 1024,
            height: 1280,
          },
          ...(color.extra ?? []),
        ],
        variants: sizes.map((size) => {
          const override = color.stock?.[size.uk];
          const stock = override ?? input.defaultStock ?? 12;
          return {
            id: `v_${input.slug.replaceAll("-", "_")}_${color.slug}_${skuSize(size.uk)}`,
            sku: `AQ-${cat}-${productCode}-${colorCode}-${skuSize(size.uk)}`,
            sizeUk: size.uk,
            sizeEu: size.eu,
            sizeUs: size.us,
            footLengthMm: size.mm,
            label: size.label,
            mrpPaise: input.mrpPaise,
            pricePaise: input.pricePaise,
            stock,
          };
        }),
      };
    }),
  };
}

export const products: CatalogProduct[] = [
  buildProduct({
    slug: "tide-slide",
    name: "Tide Slide",
    subtitle: "The monsoon strap",
    description:
      "A single wide strap and a footbed that stays quiet underfoot. Tide is the pair you leave by the door and still want on the street — waterproof EVA, a grip that holds wet tile, and almost nothing to weigh you down.",
    category: "slides",
    gender: "men",
    features: ["waterproof", "anti-skid", "lightweight"],
    isNew: true,
    pricePaise: 49900,
    mrpPaise: 89900,
    materialUpper: "EVA strap",
    materialSole: "Anti-skid EVA",
    colors: [
      {
        slug: "midnight",
        name: "Midnight / Aqua",
        swatch: "midnight",
        family: "black",
        image: "/catalog/tide-slide-midnight.jpg",
        alt: "Men's black Tide Slide with a thin aqua accent on a porcelain background",
        extra: [
          {
            src: "/catalog/hero-tide-slide.jpg",
            alt: "Tide Slide floating against a dark water background",
            role: "secondary",
            width: 1400,
            height: 1000,
          },
        ],
        stock: { 8: 2, 11: 0, 9: 1 },
      },
      {
        slug: "sand",
        name: "Sand",
        swatch: "sand",
        family: "beige",
        image: "/catalog/tide-slide-sand.jpg",
        alt: "Men's sand Tide Slide on a porcelain background",
        stock: { 6: 0, 10: 3 },
      },
    ],
  }),
  buildProduct({
    slug: "harbour-clog",
    name: "Harbour Clog",
    subtitle: "Closed toe, open day",
    description:
      "Ventilated, quick-drying, and steady on a wet floor. Harbour is the clog for markets, kitchens, and the walk home when the sky opens. The heel strap stays up; the sole stays planted.",
    category: "clogs",
    gender: "men",
    features: ["anti-skid", "lightweight", "quick-dry"],
    pricePaise: 64900,
    mrpPaise: 129900,
    materialUpper: "Moulded EVA",
    materialSole: "Textured EVA outsole",
    colors: [
      {
        slug: "navy",
        name: "Navy",
        swatch: "navy",
        family: "blue",
        image: "/catalog/harbour-clog-navy.jpg",
        alt: "Men's navy Harbour Clog on a porcelain background",
        stock: { 7: 2, 11: 0 },
      },
      {
        slug: "fog",
        name: "Fog",
        swatch: "fog",
        family: "grey",
        image: "/catalog/harbour-clog-fog.jpg",
        alt: "Men's fog grey Harbour Clog on a porcelain background",
        stock: { 9: 1 },
      },
    ],
  }),
  buildProduct({
    slug: "reef-flip",
    name: "Reef Flip",
    subtitle: "The honest thong",
    description:
      "A Y-strap, a cushioned footbed, and a sole that doesn't skate on wet stone. Reef is the flip-flop you stop replacing every season.",
    category: "flip-flops",
    gender: "men",
    features: ["lightweight", "anti-skid"],
    pricePaise: 34900,
    mrpPaise: 69900,
    materialUpper: "EVA thong",
    materialSole: "Anti-skid EVA",
    colors: [
      {
        slug: "porcelain",
        name: "Porcelain",
        swatch: "white",
        family: "white",
        image: "/catalog/reef-flip-white.jpg",
        alt: "White Reef Flip thong sandal on a porcelain background",
        stock: { 11: 0, 8: 2 },
      },
    ],
  }),
  buildProduct({
    slug: "pearl-slide",
    name: "Pearl Slide",
    subtitle: "Soft strap, firm grip",
    description:
      "A lower profile and a quieter colour, cut for a narrower foot. Pearl keeps the same waterproof EVA and anti-skid sole as the rest of the house — just less of it.",
    category: "slides",
    gender: "women",
    features: ["waterproof", "lightweight", "anti-skid"],
    isNew: true,
    pricePaise: 44900,
    mrpPaise: 79900,
    materialUpper: "EVA strap",
    materialSole: "Anti-skid EVA",
    colors: [
      {
        slug: "blush",
        name: "Blush",
        swatch: "blush",
        family: "pink",
        image: "/catalog/pearl-slide-blush.jpg",
        alt: "Women's blush Pearl Slide on a porcelain background",
        stock: { 3: 0, 5: 2 },
      },
      {
        slug: "ink",
        name: "Ink",
        swatch: "ink",
        family: "black",
        image: "/catalog/pearl-slide-ink.jpg",
        alt: "Women's ink black Pearl Slide on a porcelain background",
        stock: { 8: 1 },
      },
    ],
  }),
  buildProduct({
    slug: "cove-clog",
    name: "Cove Clog",
    subtitle: "A lighter harbour",
    description:
      "The women's clog: same quick-dry EVA, a softer volume, and a heel strap that doesn't bite. Made for wet kitchens, hostel corridors, and the first rain of June.",
    category: "clogs",
    gender: "women",
    features: ["lightweight", "anti-skid", "quick-dry"],
    isNew: true,
    pricePaise: 59900,
    mrpPaise: 99900,
    materialUpper: "Moulded EVA",
    materialSole: "Textured EVA outsole",
    colors: [
      {
        slug: "sage",
        name: "Sage",
        swatch: "sage",
        family: "green",
        image: "/catalog/cove-clog-sage.jpg",
        alt: "Women's sage Cove Clog on a porcelain background",
        stock: { 4: 0, 6: 2 },
      },
    ],
  }),
  buildProduct({
    slug: "marina-trainer",
    name: "Marina Trainer",
    subtitle: "A quiet white shoe",
    description:
      "A low, clean trainer for days that are not the beach and not the office. Cushioned underfoot, light on the scale, and plain enough to disappear into the rest of what you're wearing.",
    category: "sneakers",
    gender: "women",
    features: ["lightweight", "cushioned"],
    pricePaise: 299900,
    mrpPaise: 349900,
    materialUpper: "Synthetic leather",
    materialSole: "Cushioned rubber",
    colors: [
      {
        slug: "cloud",
        name: "Cloud",
        swatch: "cloud",
        family: "white",
        image: "/catalog/marina-trainer-cloud.jpg",
        alt: "Women's white Marina Trainer on a porcelain background",
        stock: { 3: 0, 7: 2 },
      },
    ],
  }),
];

export const collections = [
  {
    slug: "new-season",
    name: "New Season",
    description: "The pairs that just landed for monsoon.",
    featured: true,
    gender: null as Gender | null,
    productSlugs: ["tide-slide", "pearl-slide", "cove-clog"],
  },
  {
    slug: "monsoon-ready",
    name: "Monsoon Ready",
    description: "Waterproof straps, quick-dry clogs, grip that holds.",
    featured: true,
    gender: null as Gender | null,
    productSlugs: ["tide-slide", "harbour-clog", "reef-flip", "cove-clog"],
  },
  {
    slug: "everyday-slides",
    name: "Everyday Slides",
    description: "The door-to-street pair.",
    featured: false,
    gender: null as Gender | null,
    productSlugs: ["tide-slide", "pearl-slide"],
  },
];

export const reviews: Review[] = [
  {
    id: "r1",
    productId: "p_tide_slide",
    userName: "Arjun M.",
    rating: 5,
    title: "Stays put in the rain",
    body: "Wore them through a week of Mumbai rain. Light, and the sole doesn't skate on wet tile.",
    fit: "true",
    status: "approved",
    verified: true,
    createdAt: "2026-06-12T08:00:00.000Z",
  },
  {
    id: "r2",
    productId: "p_tide_slide",
    userName: "Neel S.",
    rating: 4,
    title: "True to the UK chart",
    body: "UK 9 matched my usual size. Footbed is firmer than it looks, which I wanted.",
    fit: "true",
    status: "approved",
    verified: true,
    createdAt: "2026-05-02T08:00:00.000Z",
  },
  {
    id: "r3",
    productId: "p_tide_slide",
    userName: "Kabir R.",
    rating: 4,
    title: "Almost too light",
    body: "Forgot I was wearing them on the way to the market. Strap could be a touch wider for very wide feet.",
    fit: "runs_small",
    status: "approved",
    verified: false,
    createdAt: "2026-04-18T08:00:00.000Z",
  },
  {
    id: "r4",
    productId: "p_harbour_clog",
    userName: "Imran K.",
    rating: 5,
    title: "Kitchen and street",
    body: "Rinses clean. The heel strap actually stays up, which my last pair never did.",
    fit: "true",
    status: "approved",
    verified: true,
    createdAt: "2026-07-01T08:00:00.000Z",
  },
  {
    id: "r5",
    productId: "p_harbour_clog",
    userName: "Vikram P.",
    rating: 4,
    title: "Go with the chart",
    body: "I measured 27.4 cm and UK 9 was right. UK 8 felt short.",
    fit: "true",
    status: "approved",
    verified: true,
    createdAt: "2026-03-22T08:00:00.000Z",
  },
  {
    id: "r6",
    productId: "p_reef_flip",
    userName: "Sanjay D.",
    rating: 5,
    title: "The thong doesn't bite",
    body: "Soft between the toes after a day at the beach. Still looks plain, which is the point.",
    fit: "true",
    status: "approved",
    verified: true,
    createdAt: "2026-06-28T08:00:00.000Z",
  },
  {
    id: "r7",
    productId: "p_reef_flip",
    userName: "Rahul G.",
    rating: 3,
    title: "Fine for the price",
    body: "Comfortable. I sized up from my sneaker size and that was the right call.",
    fit: "runs_small",
    status: "approved",
    verified: false,
    createdAt: "2026-02-11T08:00:00.000Z",
  },
  {
    id: "r8",
    productId: "p_pearl_slide",
    userName: "Meera N.",
    rating: 5,
    title: "Blush is quieter in person",
    body: "Not candy pink. Wore them to college and through a sudden shower. Dry feet.",
    fit: "true",
    status: "approved",
    verified: true,
    createdAt: "2026-07-09T08:00:00.000Z",
  },
  {
    id: "r9",
    productId: "p_pearl_slide",
    userName: "Ananya V.",
    rating: 4,
    title: "True, if you use the cm guide",
    body: "UK 5 from a 24 cm foot. The strap sits flat and doesn't rub.",
    fit: "true",
    status: "approved",
    verified: true,
    createdAt: "2026-05-19T08:00:00.000Z",
  },
  {
    id: "r10",
    productId: "p_cove_clog",
    userName: "Divya S.",
    rating: 5,
    title: "Hostel approved",
    body: "Light enough for the stairs, grippy enough for a wet bathroom floor.",
    fit: "true",
    status: "approved",
    verified: true,
    createdAt: "2026-06-04T08:00:00.000Z",
  },
  {
    id: "r11",
    productId: "p_cove_clog",
    userName: "Pooja L.",
    rating: 4,
    title: "Sage is a real green",
    body: "Photographs match. A little roomy in the toe, which I prefer in a clog.",
    fit: "runs_large",
    status: "approved",
    verified: false,
    createdAt: "2026-04-02T08:00:00.000Z",
  },
  {
    id: "r12",
    productId: "p_marina_trainer",
    userName: "Ishita B.",
    rating: 5,
    title: "Plain in the best way",
    body: "Wore them all day in Bengaluru. The cushion is there without looking sporty.",
    fit: "true",
    status: "approved",
    verified: true,
    createdAt: "2026-07-14T08:00:00.000Z",
  },
];

export function categoryBySlug(slug: string) {
  return CATEGORIES.find((category) => category.slug === slug) ?? null;
}

export function productBySlug(slug: string) {
  return products.find((product) => product.slug === slug) ?? null;
}

export function recommendSize(gender: Gender, footLengthMm: number, closed: boolean): SizeRow | null {
  const chart = SIZE_CHART[gender];
  if (chart.length === 0) return null;
  const sorted = [...chart].sort((a, b) => a.mm - b.mm);
  const exact = sorted.find((row) => Math.abs(row.mm - footLengthMm) <= 3);
  if (exact && !closed) return exact;
  const next = sorted.find((row) => row.mm >= footLengthMm);
  if (closed) return next ?? sorted[sorted.length - 1] ?? null;
  return next ?? sorted[sorted.length - 1] ?? null;
}
