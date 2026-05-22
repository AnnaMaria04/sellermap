import { calculateMargin } from "@/lib/calculators";

export const demoMargin = calculateMargin({
  sellingPrice: 2490,
  productCost: 900,
  commission: 370,
  logisticsCost: 210,
  packagingCost: 95,
  adsReserve: 250,
  returnReserve: 120,
});

export const productCheck = {
  productName: "Foldable travel cosmetic organizer",
  productUrl: "https://wildberries.ru/catalog/demo/detail.aspx",
  wbNmId: "178293402",
  category: "Travel accessories",
  brand: "Demo supplier",
  score: 78,
  verdict: "Promising, but fix margin risk",
  demandScore: 22,
  competitionScore: 15,
  marginScore: 17,
  cardQualityScore: 10,
  riskScore: 14,
  createdAt: "May 22, 2026",
};

export const metrics = [
  {
    label: "Demand",
    status: "Strong",
    tone: "green" as const,
    detail: "Search and review velocity show healthy buyer interest.",
  },
  {
    label: "Competition",
    status: "Medium",
    tone: "amber" as const,
    detail: "Top listings are strong, but positioning gaps remain.",
  },
  {
    label: "Margin",
    status: "Risky",
    tone: "red" as const,
    detail: "Packaging and ads can push profit below a safe level.",
  },
  {
    label: "Card Quality",
    status: "Weak",
    tone: "amber" as const,
    detail: "Photos and SEO need work before launch.",
  },
];

export const competitors = [
  {
    name: "Competitor A",
    price: 1890,
    rating: 4.8,
    reviewCount: 2341,
    position: 2,
    strength: "Strong visuals",
    weakness: "No bundle",
    x: 38,
    y: 82,
  },
  {
    name: "Competitor B",
    price: 2190,
    rating: 4.6,
    reviewCount: 1180,
    position: 6,
    strength: "High trust",
    weakness: "Generic title",
    x: 56,
    y: 70,
  },
  {
    name: "Competitor C",
    price: 1490,
    rating: 4.2,
    reviewCount: 624,
    position: 11,
    strength: "Low price",
    weakness: "Weak packaging",
    x: 24,
    y: 44,
  },
  {
    name: "Competitor D",
    price: 2790,
    rating: 4.4,
    reviewCount: 817,
    position: 17,
    strength: "Premium angle",
    weakness: "Overpriced",
    x: 78,
    y: 58,
  },
  {
    name: "Competitor E",
    price: 2390,
    rating: 4.1,
    reviewCount: 402,
    position: 24,
    strength: "Fast delivery",
    weakness: "Review complaints",
    x: 66,
    y: 34,
  },
];

export const audit = [
  ["Title", "Good", "Contains main keyword and size cue."],
  ["Photos", "Weak", "Needs lifestyle, packaging, and dimension images."],
  ["SEO", "Missing keywords", "Add organizer, travel, waterproof, compact."],
  ["Description", "Too generic", "Move materials and dimensions into first lines."],
  ["Specs", "Incomplete", "Add weight, material, zipper type, warranty."],
  ["Reviews", "Strong", "Competitor complaints reveal bundle opportunity."],
  ["Q&A", "Needs answers", "Prepare replies for cleaning and size questions."],
];

export const recommendations = {
  fix: [
    "Lower target price or improve bundle",
    "Confirm packaging cost before ordering",
    "Improve main image and add usage photos",
  ],
  opportunity: [
    "Competitor descriptions are weak",
    "Mid-price positioning may work",
    "Reviews mention packaging complaints",
  ],
  risk: [
    "Margin is weak if ads exceed 10%",
    "High-review competitors dominate top slots",
    "Reinforced packaging may raise unit cost",
  ],
};

export const checklist = [
  "Confirm packaging cost",
  "Calculate safe selling price",
  "Check top 5 competitor reviews",
  "Improve product title",
  "Create 5-photo listing structure",
  "Test price between ₽2,190–2,390",
  "Avoid launch if net margin falls below 20%",
];

export const savedReports = [
  {
    name: "Foldable travel cosmetic organizer",
    date: "May 22, 2026",
    score: 78,
    verdict: "Promising",
    risk: "Packaging cost",
    status: "Needs supplier quote",
  },
  {
    name: "Silicone kitchen storage set",
    date: "May 20, 2026",
    score: 84,
    verdict: "Strong opportunity",
    risk: "Ad reserve",
    status: "Ready to launch",
  },
  {
    name: "Compact desk humidifier",
    date: "May 17, 2026",
    score: 52,
    verdict: "Risky",
    risk: "Returns",
    status: "Researching",
  },
  {
    name: "Premium pet grooming glove",
    date: "May 14, 2026",
    score: 36,
    verdict: "Avoid",
    risk: "Competition",
    status: "Rejected",
  },
];

export const weeklyUpdates = [
  {
    title: "Packaging rules changed for medium soft goods",
    type: "Packaging",
    impact: "May affect 3 saved products",
    summary:
      "Reinforced outer packaging is recommended for similar size categories. Confirm supplier box cost before launch.",
  },
  {
    title: "Logistics tariff note for compact accessories",
    type: "Logistics",
    impact: "Low impact",
    summary:
      "Delivery estimates remain stable, but returns reserve should stay above 4% for new sellers.",
  },
  {
    title: "Category card quality trend",
    type: "AI insight",
    impact: "High opportunity",
    summary:
      "Competitors with packaging photos are earning stronger review trust in travel accessory niches.",
  },
];
