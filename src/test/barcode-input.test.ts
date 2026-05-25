import { describe, it, expect } from "vitest";

// Test the rapid-keystroke detection logic in isolation (not the full component)
function shouldTriggerScan(chars: number, timeMs: number): boolean {
  return chars >= 4 && timeMs < 300;
}

describe("barcode scan detection", () => {
  it("triggers on >=4 chars within 300ms", () => {
    expect(shouldTriggerScan(6, 200)).toBe(true);
  });
  it("does not trigger on slow typing", () => {
    expect(shouldTriggerScan(6, 400)).toBe(false);
  });
  it("does not trigger on <4 chars", () => {
    expect(shouldTriggerScan(3, 100)).toBe(false);
  });
});
