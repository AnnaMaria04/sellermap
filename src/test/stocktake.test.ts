import { describe, it, expect } from "vitest";

type Item = { expectedQty: number; countedQty: number | null };

function computeProgress(items: Item[]): { counted: number; total: number; pct: number } {
  const counted = items.filter((i) => i.countedQty !== null).length;
  return { counted, total: items.length, pct: Math.round((counted / items.length) * 100) };
}

function computeDiscrepancies(items: Item[]) {
  return items.filter((i) => i.countedQty !== null && i.countedQty !== i.expectedQty);
}

describe("stocktake logic", () => {
  const items: Item[] = [
    { expectedQty: 10, countedQty: 10 },
    { expectedQty: 5, countedQty: 3 },
    { expectedQty: 8, countedQty: null },
  ];

  it("computes progress correctly", () => {
    const { counted, total, pct } = computeProgress(items);
    expect(counted).toBe(2);
    expect(total).toBe(3);
    expect(pct).toBe(67);
  });

  it("finds discrepancies", () => {
    const d = computeDiscrepancies(items);
    expect(d).toHaveLength(1);
    expect(d[0].countedQty).toBe(3);
  });
});
