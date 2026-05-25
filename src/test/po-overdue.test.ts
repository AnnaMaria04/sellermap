import { describe, it, expect } from "vitest";

function isOverdue(expectedDelivery: string, status: string): boolean {
  if (["closed", "cancelled"].includes(status)) return false;
  return new Date(expectedDelivery) < new Date();
}

function daysOverdue(expectedDelivery: string): number {
  const diff = Date.now() - new Date(expectedDelivery).getTime();
  return Math.floor(diff / 86400000);
}

describe("PO overdue logic", () => {
  it("marks past date as overdue for open PO", () => {
    expect(isOverdue("2020-01-01", "in_transit")).toBe(true);
  });
  it("does not mark closed PO as overdue", () => {
    expect(isOverdue("2020-01-01", "closed")).toBe(false);
  });
  it("does not mark future date as overdue", () => {
    const future = new Date(Date.now() + 86400000 * 30).toISOString();
    expect(isOverdue(future, "in_transit")).toBe(false);
  });
  it("computes days overdue correctly", () => {
    const date = new Date(Date.now() - 86400000 * 5).toISOString();
    expect(daysOverdue(date)).toBe(5);
  });
});
