import { describe, it, expect } from "vitest";
import { parseCommerceMLProducts, buildOrdersCommerceML } from "@/lib/integrations/onec/commerceml";

const CATALOG = `<?xml version="1.0" encoding="UTF-8"?>
<КоммерческаяИнформация ВерсияСхемы="2.10">
  <Каталог>
    <Товары>
      <Товар><Ид>a1</Ид><Наименование>Кружка белая</Наименование><Артикул>MUG-1</Артикул><Описание>Керамика</Описание></Товар>
      <Товар><Ид>a2</Ид><Наименование>Футболка</Наименование><Артикул>TS-2</Артикул></Товар>
    </Товары>
  </Каталог>
  <ПакетПредложений>
    <Предложения>
      <Предложение><Ид>a1</Ид><ЦенаЗаЕдиницу>450</ЦенаЗаЕдиницу></Предложение>
      <Предложение><Ид>a2#1</Ид><ЦенаЗаЕдиницу>1200</ЦенаЗаЕдиницу></Предложение>
    </Предложения>
  </ПакетПредложений>
</КоммерческаяИнформация>`;

describe("parseCommerceMLProducts", () => {
  it("parses goods and merges offer prices", () => {
    const products = parseCommerceMLProducts(CATALOG);
    expect(products).toHaveLength(2);
    const mug = products.find((p) => p.externalId === "a1")!;
    expect(mug.name).toBe("Кружка белая");
    expect(mug.sku).toBe("MUG-1");
    expect(mug.price).toBe(450);
    const tee = products.find((p) => p.externalId === "a2")!;
    expect(tee.price).toBe(1200); // offer id "a2#1" → matched to product a2
  });

  it("returns empty array for non-CommerceML input", () => {
    expect(parseCommerceMLProducts("<html></html>")).toEqual([]);
  });
});

describe("buildOrdersCommerceML", () => {
  it("produces a valid КоммерческаяИнформация document with line items", () => {
    const xml = buildOrdersCommerceML([
      { number: "1001", date: "2026-05-28T10:00:00Z", total: 900, lines: [{ name: "Кружка", sku: "MUG-1", qty: 2, unitPrice: 450 }] },
    ]);
    expect(xml).toContain("<КоммерческаяИнформация");
    expect(xml).toContain("<Номер>1001</Номер>");
    expect(xml).toContain("<Артикул>MUG-1</Артикул>");
    expect(xml).toContain("<Количество>2</Количество>");
    expect(xml).toContain("<Сумма>900</Сумма>");
  });

  it("escapes XML-special characters in names", () => {
    const xml = buildOrdersCommerceML([
      { number: "A&B", date: "2026-05-28", total: 0, lines: [{ name: "Чай <зелёный>", sku: "", qty: 1, unitPrice: 0 }] },
    ]);
    expect(xml).toContain("A&amp;B");
    expect(xml).toContain("Чай &lt;зелёный&gt;");
  });
});
