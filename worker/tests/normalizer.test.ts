import { describe, expect, it } from "vitest";
import { extractNmIdFromUrl, normalizePriceRub, normalizeReviewCount, normalizeSearchItem } from "../src/normalizers/wb-normalizer.js";

describe("wb normalizer", () => {
  it("normalizes Russian prices", () => {
    expect(normalizePriceRub("1 299 ₽")).toBe(1299);
  });

  it("normalizes Russian review counts", () => {
    expect(normalizeReviewCount("1 234 отзыва")).toBe(1234);
  });

  it("extracts nmId from WB URLs", () => {
    expect(extractNmIdFromUrl("https://www.wildberries.ru/catalog/123456789/detail.aspx")).toBe("123456789");
  });

  it("does not crash on bad cards", () => {
    expect(normalizeSearchItem(null, "акриловый маркер", 1)).toBeNull();
    expect(normalizeSearchItem({ name: "Маркер", price: "99 ₽" }, "акриловый маркер", 1)?.priceRub).toBe(99);
  });

  it("converts WB API kopeck prices from size payloads", () => {
    const item = normalizeSearchItem({
      id: 491933707,
      name: "Акриловые маркеры",
      sizes: [{ price: { product: 30700, basic: 299900 } }],
    }, "акриловый маркер", 1);

    expect(item?.priceRub).toBe(307);
    expect(item?.originalPriceRub).toBe(2999);
  });
});
