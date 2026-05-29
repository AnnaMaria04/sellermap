/**
 * CommerceML 2 — the 1C:Предприятие "обмен с сайтом" exchange format.
 * Parse a catalog (import.xml / offers.xml) into products, and serialise orders
 * back to 1C. Intentionally tolerant string parsing (no DOM on the server):
 * CommerceML uses Russian element names (Товар, Наименование, Артикул, Цена…).
 */

export interface OneCProduct {
  externalId: string;
  name: string;
  sku: string;
  price: number;
  description?: string;
  category?: string;
}

function tag(block: string, name: string): string | undefined {
  const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1].trim()) : undefined;
}
function decode(s: string): string {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}
function encode(s: string): string {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Parse CommerceML catalog/offers XML → products. Prices come from the
 *  offers package (<Предложение><Цены><Цена><ЦенаЗаЕдиницу>). */
export function parseCommerceMLProducts(xml: string): OneCProduct[] {
  const products = new Map<string, OneCProduct>();

  // Catalog goods: <Товар> … </Товар>
  for (const m of xml.matchAll(/<Товар>([\s\S]*?)<\/Товар>/g)) {
    const b = m[1];
    const externalId = tag(b, "Ид");
    const name = tag(b, "Наименование");
    if (!externalId || !name) continue;
    products.set(externalId, {
      externalId,
      name,
      sku: tag(b, "Артикул") ?? "",
      price: 0,
      description: tag(b, "Описание"),
      category: tag(b, "Группы")?.match(/<Ид>([\s\S]*?)<\/Ид>/)?.[1],
    });
  }

  // Offers with prices: <Предложение> … <ЦенаЗаЕдиницу>123</ЦенаЗаЕдиницу>
  for (const m of xml.matchAll(/<Предложение>([\s\S]*?)<\/Предложение>/g)) {
    const b = m[1];
    const externalId = (tag(b, "Ид") ?? "").split("#")[0];
    const price = parseFloat(tag(b, "ЦенаЗаЕдиницу") ?? "") || 0;
    const existing = externalId ? products.get(externalId) : undefined;
    if (existing) existing.price = price;
    else if (externalId) {
      products.set(externalId, { externalId, name: tag(b, "Наименование") ?? externalId, sku: "", price });
    }
  }

  return [...products.values()];
}

export interface OneCOrderLine { name: string; sku: string; qty: number; unitPrice: number }
export interface OneCOrder {
  number: string; date: string; total: number; lines: OneCOrderLine[];
}

/** Serialise orders to a minimal CommerceML `КоммерческаяИнформация` document
 *  (type=sale) that 1C can import. */
export function buildOrdersCommerceML(orders: OneCOrder[]): string {
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const docs = orders.map((o) => `    <Документ>
      <Ид>${encode(o.number)}</Ид>
      <Номер>${encode(o.number)}</Номер>
      <Дата>${o.date.slice(0, 10)}</Дата>
      <ХозОперация>Заказ товара</ХозОперация>
      <Роль>Продавец</Роль>
      <Валюта>RUB</Валюта>
      <Сумма>${o.total}</Сумма>
      <Товары>
${o.lines.map((l) => `        <Товар>
          <Наименование>${encode(l.name)}</Наименование>
          <Артикул>${encode(l.sku)}</Артикул>
          <ЦенаЗаЕдиницу>${l.unitPrice}</ЦенаЗаЕдиницу>
          <Количество>${l.qty}</Количество>
          <Сумма>${l.unitPrice * l.qty}</Сумма>
        </Товар>`).join("\n")}
      </Товары>
    </Документ>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<КоммерческаяИнформация ВерсияСхемы="2.10" ДатаФормирования="${now}">
${docs}
</КоммерческаяИнформация>`;
}
