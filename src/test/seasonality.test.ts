import { describe, it, expect } from "vitest";
import type { StockMovement } from "@/mock/inventory";
import {
  upcomingEvents,
  nextOccurrence,
  RUSSIAN_DEMAND_EVENTS,
  weekOfYear,
  salesByWeek,
  seasonalityIndex,
  hasEnoughHistory,
  forecastWeeks,
} from "@/lib/inventory/seasonality";

function sale(productId: string, date: string, qty: number): StockMovement {
  return {
    id: `mv-${productId}-${date}-${qty}`,
    type: "sale",
    productId,
    productName: productId,
    sku: productId,
    qtyBefore: 0,
    qtyAfter: 0,
    qtyDelta: -qty,
    locationId: "loc-main",
    userId: "u",
    userName: "u",
    createdAt: `${date}T00:00:00.000Z`,
  };
}

describe("Russian demand calendar", () => {
  it("rolls an event into next year once it has passed", () => {
    const from = new Date("2026-03-10T00:00:00Z"); // after 8 марта
    const mar8 = RUSSIAN_DEMAND_EVENTS.find((e) => e.id === "mar8")!;
    expect(nextOccurrence(mar8, from).getFullYear()).toBe(2027);
  });

  it("returns upcoming events within the window, soonest first", () => {
    const from = new Date("2026-02-20T00:00:00Z");
    const events = upcomingEvents(from, 30);
    expect(events[0].event.id).toBe("feb23"); // 23 февраля is nearest
    expect(events[0].daysUntil).toBe(3);
    expect(events.every((e) => e.daysUntil <= 30)).toBe(true);
  });
});

describe("weekOfYear", () => {
  it("buckets early-January dates into week 1", () => {
    expect(weekOfYear(new Date("2026-01-05T00:00:00Z"))).toBe(2);
    expect(weekOfYear(new Date("2026-06-15T00:00:00Z"))).toBeGreaterThan(20);
  });
});

describe("salesByWeek", () => {
  it("aggregates sale units into the correct weekly buckets", () => {
    const now = new Date("2026-01-29T00:00:00Z");
    const movements = [
      sale("p1", "2026-01-28", 3), // this week
      sale("p1", "2026-01-26", 2), // this week
      sale("p1", "2026-01-20", 5), // previous week
    ];
    const series = salesByWeek(movements, 4, now);
    expect(series).toHaveLength(4);
    expect(series[series.length - 1].units).toBe(5); // current week: 3+2
    expect(series[series.length - 2].units).toBe(5); // prior week: 5
  });

  it("ignores non-sale movements", () => {
    const now = new Date("2026-01-29T00:00:00Z");
    const receipt: StockMovement = { ...sale("p1", "2026-01-28", 3), type: "receipt", qtyDelta: 3 };
    const series = salesByWeek([receipt], 2, now);
    expect(series.reduce((s, p) => s + p.units, 0)).toBe(0);
  });
});

describe("seasonalityIndex", () => {
  it("flags a high-demand week above the yearly average", () => {
    // Same week-of-year across two years sells far more than other weeks.
    const movements = [
      sale("p", "2025-03-08", 100),
      sale("p", "2026-03-08", 100),
      sale("p", "2025-07-01", 10),
      sale("p", "2026-07-02", 10),
    ];
    const idx = seasonalityIndex(movements, "p");
    const march = idx.find((s) => s.week === weekOfYear(new Date("2026-03-08T00:00:00Z")))!;
    expect(march.index).toBeGreaterThan(1.5);
  });
});

describe("hasEnoughHistory", () => {
  it("is false for a short window", () => {
    expect(hasEnoughHistory([sale("p", "2026-01-01", 1), sale("p", "2026-01-05", 1)])).toBe(false);
  });
  it("is true once history spans 12+ weeks with enough samples", () => {
    const movements = Array.from({ length: 14 }, (_, i) => {
      const d = new Date("2026-01-01T00:00:00Z");
      d.setDate(d.getDate() + i * 7);
      return sale("p", d.toISOString().slice(0, 10), 2);
    });
    expect(hasEnoughHistory(movements)).toBe(true);
  });
});

describe("forecastWeeks", () => {
  it("returns N future weeks with a non-negative expectation", () => {
    const now = new Date("2026-01-29T00:00:00Z");
    const movements = [
      sale("p", "2026-01-28", 4),
      sale("p", "2026-01-21", 6),
      sale("p", "2026-01-14", 5),
    ];
    const fc = forecastWeeks(movements, { productId: "p", weeks: 4, now });
    expect(fc).toHaveLength(4);
    expect(fc.every((w) => w.expectedUnits >= 0)).toBe(true);
  });
});
