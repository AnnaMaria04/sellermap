import { type Product } from "@/mock/inventory";
import { detectMarkingGroup, type MarkingGroup } from "./categories";

export type MarkingNeed = "required" | "optional" | "not_required";

export interface MarkingAssessment {
  need: MarkingNeed;          // does this product require Честный Знак?
  group: MarkingGroup | null; // detected товарная группа
  reason: string;             // human explanation (RU)
  /** True when the product is flagged for marking but its category doesn't require it. */
  flaggedUnnecessarily: boolean;
  /** True when the category requires marking but the product isn't set up for it. */
  missingSetup: boolean;
}

/**
 * Decide whether a product is subject to mandatory Честный Знак marking, and
 * reconcile that against how the product is currently configured
 * (`requiresLabeling` / `labelingType`).
 */
export function assessMarking(product: Product): MarkingAssessment {
  const group = detectMarkingGroup(product.category, product.name);
  const isFlagged = product.requiresLabeling && product.labelingType === "chestny_znak";

  if (!group) {
    return {
      need: "not_required",
      group: null,
      reason: "Категория не входит в перечень обязательной маркировки",
      flaggedUnnecessarily: isFlagged,
      missingSetup: false,
    };
  }

  let need: MarkingNeed;
  let reason: string;

  if (group.requirement === "required") {
    need = "required";
    reason = `Группа «${group.label}» подлежит обязательной маркировке${group.since ? ` с ${group.since}` : ""}`;
  } else {
    // conditional: only subtypes matching conditionalKeywords are mandatory
    const nm = product.name.toLowerCase();
    const matches = (group.conditionalKeywords ?? []).some((k) => nm.includes(k));
    if (matches) {
      need = "required";
      reason = `Подтип группы «${group.label}» требует маркировки`;
    } else {
      need = "optional";
      reason = `Группа «${group.label}» маркируется выборочно — проверьте подпадает ли товар под требование`;
    }
  }

  return {
    need,
    group,
    reason,
    flaggedUnnecessarily: false,
    missingSetup: need === "required" && !isFlagged,
  };
}

export type ChecklistKey =
  | "gis_mt_registration"
  | "ukep"
  | "cryptopro"
  | "edo_contract"
  | "gs1_membership"
  | "suz_access"
  | "ofd_cashbox";

export interface ChecklistItem {
  key: ChecklistKey;
  title: string;
  description: string;
  /** Whether this item is needed for the given product/role. */
  required: boolean;
}

/**
 * The participant-readiness checklist for working with Честный Знак.
 * `isManufacturerOrImporter` toggles GS1 membership (needed only when you mint
 * your own GTIN rather than receiving coded goods from a supplier).
 */
export function getReadinessChecklist(isManufacturerOrImporter = false): ChecklistItem[] {
  return [
    {
      key: "gis_mt_registration",
      title: "Регистрация в ГИС МТ (Честный Знак)",
      description: "Учётная запись участника оборота товаров",
      required: true,
    },
    {
      key: "ukep",
      title: "УКЭП (квалифицированная ЭЦП)",
      description: "Подпись на токене (Рутокен/JaCarta) от УЦ ФНС — на руководителя/ИП",
      required: true,
    },
    {
      key: "cryptopro",
      title: "КриптоПро CSP + драйверы токена",
      description: "Криптопровайдер и браузерный плагин для подписания запросов",
      required: true,
    },
    {
      key: "edo_contract",
      title: "Договор с оператором ЭДО",
      description: "Передача УПД с кодами при обороте (Контур.Диадок, СБИС и др.)",
      required: true,
    },
    {
      key: "gs1_membership",
      title: "Членство в GS1 РУС",
      description: "Нужно только если вы сами генерируете GTIN (производитель/импортёр)",
      required: isManufacturerOrImporter,
    },
    {
      key: "suz_access",
      title: "Доступ к СУЗ",
      description: "Станция управления заказами — эмиссия кодов маркировки (КМ)",
      required: true,
    },
    {
      key: "ofd_cashbox",
      title: "Онлайн-касса + ОФД",
      description: "Передача «вывода из оборота» при розничной продаже (54-ФЗ)",
      required: true,
    },
  ];
}

export type MarkingComplianceState =
  | "compliant"        // required & has a valid data-matrix code
  | "action_needed"    // required but no code yet
  | "review"           // optional / conditional — needs human check
  | "unnecessary"      // flagged but not actually required
  | "not_applicable";  // not required, not flagged

export interface ComplianceResult {
  state: MarkingComplianceState;
  assessment: MarkingAssessment;
  hasCode: boolean;
}

export function getCompliance(product: Product): ComplianceResult {
  const assessment = assessMarking(product);
  const hasCode = Boolean(product.dataMatrixCode);

  let state: MarkingComplianceState;
  if (assessment.need === "required") {
    state = hasCode ? "compliant" : "action_needed";
  } else if (assessment.need === "optional") {
    state = "review";
  } else {
    state = assessment.flaggedUnnecessarily ? "unnecessary" : "not_applicable";
  }

  return { state, assessment, hasCode };
}

export function summarizeCompliance(products: Product[]) {
  const counts: Record<MarkingComplianceState, number> = {
    compliant: 0,
    action_needed: 0,
    review: 0,
    unnecessary: 0,
    not_applicable: 0,
  };
  for (const p of products) counts[getCompliance(p).state] += 1;
  return counts;
}
