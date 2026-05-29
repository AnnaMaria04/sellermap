import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { calculateResult } from "@/lib/analysis/calculateResult";
import { demoResultInput } from "@/lib/data/demoResult";

const REPO_ROOT = join(__dirname, "..", "..");

const FORBIDDEN = [
  // The old static AiInsights strings that used to live in calculateResult.ts.
  "Есть спрос в среднем ценовом сегменте",
  "Конкуренты часто проигрывают в описании и инфографике",
  "Маржа ниже безопасного уровня при росте рекламы",
  "Маржа рабочая, но требует контроля рекламного резерва",
  "Упаковка может съесть прибыль при возвратах",
  "Логистика управляемая, но тарифы нужно сверить",
  "Запустить тест 30-50 единиц с ценой в безопасном диапазоне",
  "Проверить CTR главного фото до масштабирования рекламы",
];

describe("calculateResult.aiInsights is not stubbed", () => {
  it("calculateResult returns empty insight buckets — real text comes from /api/analysis/product-insights", () => {
    const result = calculateResult(demoResultInput);
    expect(result.aiInsights.good).toEqual([]);
    expect(result.aiInsights.blockers).toEqual([]);
    expect(result.aiInsights.beforePurchase).toEqual([]);
    expect(result.aiInsights.firstTest).toEqual([]);
  });

  it("source files no longer carry the old static placeholder strings", () => {
    const files = [
      "src/lib/analysis/calculateResult.ts",
      "src/components/result/AiInsights.tsx",
    ];
    for (const rel of files) {
      const text = readFileSync(join(REPO_ROOT, rel), "utf8");
      for (const forbidden of FORBIDDEN) {
        expect(text, `${rel} must not contain "${forbidden}"`).not.toContain(forbidden);
      }
    }
  });
});
