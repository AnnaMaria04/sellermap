import { describe, it, expect } from "vitest";

type Movement = { type: string; locationId: string; productId: string; createdAt: string };

function applyFilters(movements: Movement[], type: string, location: string, product: string) {
  let list = [...movements];
  if (type !== "all") list = list.filter(m => m.type === type);
  if (location !== "all") list = list.filter(m => m.locationId === location);
  if (product !== "all") list = list.filter(m => m.productId === product);
  return list;
}

const movements: Movement[] = [
  { type: "sale", locationId: "loc-1", productId: "prod-1", createdAt: "2024-01-01" },
  { type: "receipt", locationId: "loc-1", productId: "prod-2", createdAt: "2024-01-02" },
  { type: "sale", locationId: "loc-2", productId: "prod-1", createdAt: "2024-01-03" },
];

describe("history filters", () => {
  it("filters by type", () => {
    expect(applyFilters(movements, "sale", "all", "all")).toHaveLength(2);
  });
  it("filters by location", () => {
    expect(applyFilters(movements, "all", "loc-2", "all")).toHaveLength(1);
  });
  it("combines filters (AND logic)", () => {
    expect(applyFilters(movements, "sale", "loc-1", "all")).toHaveLength(1);
  });
  it("returns all when all filters = all", () => {
    expect(applyFilters(movements, "all", "all", "all")).toHaveLength(3);
  });
});
