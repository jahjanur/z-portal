// Default SEO backlink catalog — the four packages we resell (Core / Growth /
// Authority / Apex), each sourced 1:1 from an upstream provider package.
// Single source of truth for seeding; packages are editable in the admin UI
// afterwards. Content-only: provider spec (buy side) + client offer (sell side).

export interface DaLine { da: number; qty: number }
export interface ContentPiece { qty: number; label: string }

export interface SeoPackageSeed {
  name: string;
  positioning: string;
  sortOrder: number;
  price: number;
  currency: string;
  features: string[];
  highlights: string[];
  providerName: string;
  providerPackage: string;
  providerCost: number;
  providerListPrice: number;
  backlinks: number;
  packageItems: number;
  maxKeywords: number;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  processingHours: number;
  guaranteeMonths: number;
  contentPieces: ContentPiece[];
  backlinkProfile: DaLine[];
}

const p = (s: string): DaLine[] =>
  s.split(",").map((part) => {
    const [da, qty] = part.trim().split("x").map(Number);
    return { da, qty };
  });

export const DEFAULT_SEO_PACKAGES: SeoPackageSeed[] = [
  {
    name: "Core",
    positioning: "Low + Medium competition",
    sortOrder: 1,
    price: 290,
    currency: "EUR",
    features: ["Detailed online reporting", "100% manual & spam-free", "1-year guarantee"],
    highlights: [
      "4 keywords maximum",
      "1 SEO-compatible article per keyword",
      "Detailed reporting",
      "100% manual",
      "100% natural",
      "100% spam-free",
    ],
    providerName: "Upstream provider",
    providerPackage: "Altın",
    providerCost: 3250,
    providerListPrice: 6500,
    backlinks: 130,
    packageItems: 60,
    maxKeywords: 4,
    deliveryDaysMin: 15,
    deliveryDaysMax: 25,
    processingHours: 24,
    guaranteeMonths: 12,
    contentPieces: [
      { qty: 4, label: "News promo article (Haber Tanıtım Yazısı)" },
      { qty: 2, label: "Elite promo article (Elite Tanıtım Yazısı)" },
    ],
    backlinkProfile: p(
      "99x2,96x1,95x5,94x3,93x9,92x5,91x3,90x3,89x2,88x2,87x2,86x2,85x2,84x3,83x4,82x5,81x1,80x4,79x1,78x3,76x3,75x2,74x3,73x3,72x3,71x2,67x1,66x1,65x3,64x3,63x3,61x3,59x3,58x3,57x3,56x3,55x2,54x2,52x2,51x1,49x1,48x1,44x1,43x2,38x2,37x2,36x2,34x3,33x3,32x2"
    ),
  },
  {
    name: "Growth",
    positioning: "Medium + High competition",
    sortOrder: 2,
    price: 490,
    currency: "EUR",
    features: [
      "Foreign-language option",
      "E-commerce supported",
      "Detailed online reporting",
      "100% manual & spam-free",
      "1-year guarantee",
    ],
    highlights: [
      "6 keywords maximum",
      "1 SEO-compatible article per keyword",
      "E-commerce sector supported",
      "Foreign-language option",
      "Site rank tracking",
      "Detailed reporting",
      "100% manual",
      "100% natural",
      "100% spam-free",
    ],
    providerName: "Upstream provider",
    providerPackage: "Vip",
    providerCost: 6500,
    providerListPrice: 13000,
    backlinks: 180,
    packageItems: 64,
    maxKeywords: 6,
    deliveryDaysMin: 15,
    deliveryDaysMax: 32,
    processingHours: 24,
    guaranteeMonths: 12,
    contentPieces: [
      { qty: 6, label: "News promo article" },
      { qty: 4, label: "Elite promo article" },
      { qty: 1, label: "Paravan (buffer) Blog promo article" },
      { qty: 1, label: "Paravan Blog promo article 2" },
    ],
    backlinkProfile: p(
      "99x2,97x1,96x1,95x5,94x6,93x11,92x8,91x5,90x8,89x3,88x2,87x3,86x4,85x5,84x4,83x4,82x3,81x4,80x5,79x1,78x4,76x3,75x1,74x2,73x4,72x3,71x3,67x4,66x4,65x4,64x2,63x3,61x4,59x3,58x3,57x2,56x2,55x2,54x2,52x1,51x2,49x1,48x2,44x3,43x4,42x4,38x3,37x4,36x2,34x3,33x4,32x3,30x4"
    ),
  },
  {
    name: "Authority",
    positioning: "High competition",
    sortOrder: 3,
    price: 790,
    currency: "EUR",
    features: [
      "Foreign-language + e-commerce",
      "Rank tracking included",
      "Detailed online reporting",
      "100% manual & spam-free",
      "1-year guarantee",
    ],
    highlights: [
      "8 keywords maximum",
      "1 SEO-compatible article per keyword",
      "E-commerce sector supported",
      "Foreign-language option",
      "Site rank tracking",
      "Detailed reporting",
      "100% manual",
      "100% natural",
      "100% spam-free",
    ],
    providerName: "Upstream provider",
    providerPackage: "Elite Master",
    providerCost: 11000,
    providerListPrice: 22000,
    backlinks: 240,
    packageItems: 70,
    maxKeywords: 8,
    deliveryDaysMin: 15,
    deliveryDaysMax: 37,
    processingHours: 24,
    guaranteeMonths: 12,
    contentPieces: [
      { qty: 8, label: "News promo article" },
      { qty: 6, label: "Elite promo article" },
      { qty: 10, label: "Forum promo article (Forum Tanıtım Yazısı)" },
      { qty: 1, label: "Paravan Blog promo article" },
      { qty: 1, label: "Paravan Blog promo article 2" },
    ],
    backlinkProfile: p(
      "100x1,99x2,97x1,96x1,95x5,94x7,93x11,92x10,91x6,90x8,89x3,88x2,87x3,86x4,85x6,84x5,83x4,82x3,81x4,80x5,79x8,78x3,77x2,76x5,75x5,74x7,73x3,72x4,71x5,70x4,69x2,68x3,67x4,66x3,65x3,64x2,63x2,62x3,61x3,60x1,59x4,58x2,57x3,56x5,55x6,54x6,53x5,52x5,51x2,50x4,49x6,48x3,47x5,46x1,45x3,44x5,43x4,42x8"
    ),
  },
  {
    name: "Apex",
    positioning: "Highest competition — Turkey's first and only authority backlink package",
    sortOrder: 4,
    price: 1190,
    currency: "EUR",
    features: [
      "Foreign-language + e-commerce",
      "Rank tracking + SEMrush audit",
      "Detailed online reporting",
      "100% manual & spam-free",
      "1-year guarantee",
    ],
    highlights: [
      "10 keywords maximum",
      "1 SEO-compatible article per keyword",
      "E-commerce sector supported",
      "Foreign-language option",
      "Site rank tracking",
      "Detailed reporting",
      "100% manual",
      "100% natural",
      "100% spam-free",
    ],
    providerName: "Upstream provider",
    providerPackage: "Elite Leader",
    providerCost: 15000,
    providerListPrice: 30000,
    backlinks: 370,
    packageItems: 79,
    maxKeywords: 10,
    deliveryDaysMin: 25,
    deliveryDaysMax: 47,
    processingHours: 24,
    guaranteeMonths: 12,
    contentPieces: [
      { qty: 10, label: "News promo article" },
      { qty: 10, label: "Elite promo article" },
      { qty: 15, label: "Forum promo article" },
      { qty: 1, label: "Paravan Blog promo article" },
      { qty: 1, label: "Paravan Blog promo article 2" },
    ],
    backlinkProfile: p(
      "100x1,99x2,97x1,96x1,95x5,94x8,93x17,92x10,91x7,90x9,89x3,88x3,87x4,86x4,85x7,84x9,83x4,82x3,81x6,80x5,79x10,78x4,77x2,76x5,75x8,74x8,73x3,72x3,71x6,70x6,69x2,68x6,67x7,66x3,65x6,64x4,63x8,62x3,61x6,60x3,59x6,58x3,57x7,56x8,55x8,54x10,53x9,52x7,51x3,50x7,49x10,48x4,47x7,46x1,45x4,44x5,43x4,42x11,41x12,40x9,39x10,38x4,37x2,36x2,35x2,34x2,31x1"
    ),
  },
];
