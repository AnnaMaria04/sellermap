import { describe, it, expect } from "vitest";
import { calculateCardAudit, type CardAuditData, type CardAuditSnapshot } from "@/lib/analysis/cardAudit";

function snap(overrides: Partial<CardAuditSnapshot> = {}): CardAuditSnapshot {
  return {
    rating: null,
    review_count: null,
    search_position: null,
    image_url: null,
    ad_visibility: null,
    price_rub: null,
    estimated_monthly_sales: null,
    query: null,
    created_at: "2026-05-01T00:00:00Z",
    ...overrides,
  };
}

function audit(data: Partial<CardAuditData>) {
  return calculateCardAudit({
    snapshots: data.snapshots ?? [],
    trackedKeywords: data.trackedKeywords ?? [],
    marketContext: data.marketContext ?? null,
  });
}

describe("calculateCardAudit", () => {
  it("returns the full set of audit dimensions even with zero data", () => {
    const items = audit({});
    expect(items.length).toBeGreaterThanOrEqual(8);
    const labels = items.map((i) => i.label);
    expect(labels).toContain("Главное изображение");
    expect(labels).toContain("Рейтинг карточки");
    expect(labels).toContain("Глубина отзывов");
    expect(labels).toContain("Позиция в поиске");
    expect(labels).toContain("Видимость в рекламе");
    expect(labels).toContain("Покрытие запросов");
    expect(labels).toContain("Цена vs медиана рынка");
    expect(labels).toContain("Глубина продаж");
  });

  it("scores main image: present = 100, absent = 0", () => {
    const withImage = audit({ snapshots: [snap({ image_url: "https://example.com/x.jpg" })] });
    const withoutImage = audit({ snapshots: [snap({ image_url: null })] });
    expect(withImage.find((i) => i.label === "Главное изображение")!.score).toBe(100);
    expect(withoutImage.find((i) => i.label === "Главное изображение")!.score).toBe(0);
  });

  it("maps rating linearly between 3.0★ → 50 and 5.0★ → 100", () => {
    const r3 = audit({ snapshots: [snap({ rating: 3 })] });
    const r5 = audit({ snapshots: [snap({ rating: 5 })] });
    const r48 = audit({ snapshots: [snap({ rating: 4.8 })] });
    expect(r3.find((i) => i.label === "Рейтинг карточки")!.score).toBe(50);
    expect(r5.find((i) => i.label === "Рейтинг карточки")!.score).toBe(100);
    const item48 = r48.find((i) => i.label === "Рейтинг карточки")!;
    expect(item48.score).toBeGreaterThanOrEqual(85);
    expect(item48.score).toBeLessThanOrEqual(100);
  });

  it("scales search position so #1 ≈ 100 and #100 ≈ 0", () => {
    const pos1 = audit({ snapshots: [snap({ search_position: 1 })] });
    const pos50 = audit({ snapshots: [snap({ search_position: 50 })] });
    const pos200 = audit({ snapshots: [snap({ search_position: 200 })] });
    expect(pos1.find((i) => i.label === "Позиция в поиске")!.score).toBe(100);
    expect(pos50.find((i) => i.label === "Позиция в поиске")!.score).toBeLessThan(20);
    expect(pos200.find((i) => i.label === "Позиция в поиске")!.score).toBe(0);
  });

  it("ad visibility = share of snapshots with ad_visibility=true", () => {
    const all = audit({
      snapshots: [
        snap({ ad_visibility: true }),
        snap({ ad_visibility: true }),
        snap({ ad_visibility: false }),
        snap({ ad_visibility: false }),
      ],
    });
    expect(all.find((i) => i.label === "Видимость в рекламе")!.score).toBe(50);
    const none = audit({ snapshots: [snap({ ad_visibility: false })] });
    expect(none.find((i) => i.label === "Видимость в рекламе")!.score).toBe(0);
  });

  it("price vs median rewards prices close to the median", () => {
    const onMedian = audit({
      snapshots: [snap({ price_rub: 1000 })],
      marketContext: { medianPrice: 1000, medianReviews: 100, top10MedianReviews: 500 },
    });
    const wayOff = audit({
      snapshots: [snap({ price_rub: 3000 })],
      marketContext: { medianPrice: 1000, medianReviews: 100, top10MedianReviews: 500 },
    });
    expect(onMedian.find((i) => i.label === "Цена vs медиана рынка")!.score).toBe(100);
    expect(wayOff.find((i) => i.label === "Цена vs медиана рынка")!.score).toBe(0);
  });

  it("never returns the demo seed placeholder strings", () => {
    const items = audit({
      snapshots: [snap({ rating: 4.7, review_count: 200, search_position: 5, image_url: "x" })],
      trackedKeywords: ["k1", "k2"],
      marketContext: { medianPrice: 1000, medianReviews: 150, top10MedianReviews: 500 },
    });
    const concat = items.flatMap((i) => [i.label, i.explanation, i.action]).join(" ");
    // Old static seed text we used to ship — must not appear now that the
    // audit is data-driven.
    expect(concat).not.toContain("Запросить у поставщика точные габариты короба");
    expect(concat).not.toContain("cardAuditSeed");
  });
});
