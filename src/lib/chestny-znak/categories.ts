/**
 * Честный Знак — товарные группы (product groups subject to mandatory marking).
 *
 * Detection in production should be driven by ТН ВЭД / ОКПД2 codes (authoritative).
 * Since the demo catalog only carries a free-text `category` + product name, we
 * match on category and name keywords, and expose `tnvedPrefixes` so the real
 * code can switch to code-based detection without changing the public API.
 */

export type MarkingGroupId =
  | "shoes"
  | "light_industry"
  | "perfume"
  | "tires"
  | "tobacco"
  | "dairy"
  | "water"
  | "beer"
  | "bad"
  | "antiseptic"
  | "medical_devices"
  | "photo"
  | "bicycles";

export type MarkingRequirement = "required" | "conditional" | "not_required";

export interface MarkingGroup {
  id: MarkingGroupId;
  label: string;            // human label (RU)
  /** Free-text categories (from the catalog) that map to this group. */
  categories: string[];
  /** Name keywords that imply this group (lowercase, matched as substrings). */
  keywords: string[];
  /** ТН ВЭД prefixes — used by the production detector. */
  tnvedPrefixes: string[];
  /**
   * "required"    — every item in the group must be marked.
   * "conditional" — only specific subtypes (matched by keyword) must be marked.
   */
  requirement: Extract<MarkingRequirement, "required" | "conditional">;
  /** For conditional groups: keywords that DO require marking within the group. */
  conditionalKeywords?: string[];
  /** Date the requirement took / takes effect (informational). */
  since?: string;
}

export const MARKING_GROUPS: MarkingGroup[] = [
  {
    id: "shoes",
    label: "Обувь",
    categories: ["Обувь"],
    keywords: ["обувь", "ботинки", "кроссовки", "туфли", "сапоги", "кеды"],
    tnvedPrefixes: ["64"],
    requirement: "required",
    since: "2020-07-01",
  },
  {
    id: "light_industry",
    label: "Лёгкая промышленность (одежда, бельё)",
    categories: ["Одежда"],
    keywords: ["футболка", "свитер", "куртка", "пальто", "бельё", "блузка", "рубашка", "трикотаж", "пиджак", "плащ"],
    tnvedPrefixes: ["61", "62", "6302"],
    requirement: "required",
    since: "2021-01-01",
  },
  {
    id: "perfume",
    label: "Духи и туалетная вода",
    categories: ["Косметика", "Парфюмерия"],
    keywords: ["духи", "парфюм", "туалетная вода", "одеколон", "eau de"],
    tnvedPrefixes: ["330300"],
    requirement: "conditional",
    conditionalKeywords: ["духи", "парфюм", "туалетная вода", "одеколон", "eau de"],
    since: "2020-10-01",
  },
  {
    id: "tires",
    label: "Шины и покрышки",
    categories: ["Автотовары", "Шины"],
    keywords: ["шина", "покрышка", "колесо"],
    tnvedPrefixes: ["4011"],
    requirement: "required",
    since: "2020-11-01",
  },
  {
    id: "tobacco",
    label: "Табак и никотинсодержащая продукция",
    categories: ["Табак"],
    keywords: ["сигареты", "табак", "никотин", "стики"],
    tnvedPrefixes: ["2402", "2403"],
    requirement: "required",
    since: "2019-07-01",
  },
  {
    id: "dairy",
    label: "Молочная продукция",
    categories: ["Молочная продукция", "Продукты"],
    keywords: ["молоко", "сыр", "творог", "йогурт", "масло сливочное", "кефир", "сметана", "мороженое"],
    tnvedPrefixes: ["0401", "0402", "0403", "0405", "0406"],
    requirement: "conditional",
    conditionalKeywords: ["молоко", "сыр", "творог", "йогурт", "масло сливочное", "кефир", "сметана", "мороженое"],
    since: "2021-06-01",
  },
  {
    id: "water",
    label: "Упакованная вода",
    categories: ["Напитки"],
    keywords: ["вода питьевая", "минеральная вода"],
    tnvedPrefixes: ["2201"],
    requirement: "conditional",
    conditionalKeywords: ["вода питьевая", "минеральная вода"],
    since: "2021-12-01",
  },
  {
    id: "beer",
    label: "Пиво и слабоалкогольные напитки",
    categories: ["Напитки", "Алкоголь"],
    keywords: ["пиво", "сидр", "пуэр", "медовуха"],
    tnvedPrefixes: ["2203", "2206"],
    requirement: "conditional",
    conditionalKeywords: ["пиво", "сидр", "медовуха"],
    since: "2023-04-01",
  },
  {
    id: "bad",
    label: "Биологически активные добавки (БАД)",
    categories: ["БАД", "Спортивное питание"],
    keywords: ["бад", "добавка к пище", "витамины"],
    tnvedPrefixes: ["2106"],
    requirement: "conditional",
    conditionalKeywords: ["бад", "добавка к пище", "витамины"],
    since: "2023-10-01",
  },
  {
    id: "antiseptic",
    label: "Антисептики",
    categories: ["Бытовая химия"],
    keywords: ["антисептик", "дезинфиц"],
    tnvedPrefixes: ["3808"],
    requirement: "conditional",
    conditionalKeywords: ["антисептик", "дезинфиц"],
    since: "2023-10-01",
  },
  {
    id: "medical_devices",
    label: "Медицинские изделия (отдельные виды)",
    categories: ["Медицина"],
    keywords: ["медицинск", "ортопед", "тонометр"],
    tnvedPrefixes: ["9018", "9021"],
    requirement: "conditional",
    conditionalKeywords: ["медицинск", "ортопед", "тонометр"],
    since: "2023-10-01",
  },
  {
    id: "photo",
    label: "Фотоаппараты и лампы-вспышки",
    categories: ["Фототехника"],
    keywords: ["фотоаппарат", "вспышка"],
    tnvedPrefixes: ["9006"],
    requirement: "required",
    since: "2020-10-01",
  },
  {
    id: "bicycles",
    label: "Велосипеды и рамы",
    categories: ["Спорт", "Велотовары"],
    keywords: ["велосипед", "велорама"],
    tnvedPrefixes: ["8712"],
    requirement: "conditional",
    conditionalKeywords: ["велосипед", "велорама"],
    since: "2024-09-01",
  },
];

/** Detect the marking group for a product by category + name keywords. */
export function detectMarkingGroup(category: string, name: string): MarkingGroup | null {
  const cat = category.trim().toLowerCase();
  const nm = name.toLowerCase();

  // Category match first, then keyword fallback.
  for (const group of MARKING_GROUPS) {
    if (group.categories.some((c) => c.toLowerCase() === cat)) return group;
  }
  for (const group of MARKING_GROUPS) {
    if (group.keywords.some((k) => nm.includes(k))) return group;
  }
  return null;
}
