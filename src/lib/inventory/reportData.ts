import {
  type Product,
  type StockMovement,
  type PurchaseOrder,
  type Supplier,
  getAvailableStock,
  getStockStatus,
  getSupplierName,
  getLocationName,
  MOVEMENT_LABELS,
} from "@/mock/inventory";
import {
  computeProductMetrics,
  type ProductMetrics,
} from "@/lib/inventory/analytics";
import type { ExportColumn } from "@/lib/export";

export type ReportType =
  | "stock_balance"
  | "turnover"
  | "dead_stock"
  | "reorder"
  | "cost_analysis"
  | "movement_history"
  | "abc_analysis"
  | "channel_sales"
  | "margin_report"
  | "supplier_performance";

export interface ReportInput {
  products: Product[];
  movements: StockMovement[];
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
}

export interface ReportData {
  columns: ExportColumn<Record<string, unknown>>[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

const money = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;
const num = (n: number) => (Number.isFinite(n) ? Math.round(n * 100) / 100 : 0);

function metricsByProduct(input: ReportInput): Map<string, ProductMetrics> {
  const metrics = computeProductMetrics(input.products, input.movements);
  return new Map(metrics.map((m) => [m.product.id, m]));
}

export function buildReportData(type: ReportType, input: ReportInput): ReportData {
  const { products, movements, purchaseOrders, suppliers } = input;

  switch (type) {
    case "stock_balance": {
      const rows = products
        .filter((p) => p.status !== "archived")
        .map((p) => ({
          sku: p.sku,
          name: p.name,
          category: p.category,
          available: getAvailableStock(p),
          reserved: p.reservedUnits,
          inTransit: p.inTransitUnits,
          status: getStockStatus(p),
          value: num(p.totalPhysical * p.costPrice),
        }));
      return {
        columns: [
          { key: "sku", label: "Артикул" },
          { key: "name", label: "Товар" },
          { key: "category", label: "Категория" },
          { key: "available", label: "Доступно", align: "right" },
          { key: "reserved", label: "Резерв", align: "right" },
          { key: "inTransit", label: "В пути", align: "right" },
          { key: "value", label: "Стоимость, ₽", align: "right" },
        ],
        rows,
        rowCount: rows.length,
      };
    }

    case "turnover": {
      const m = computeProductMetrics(products, movements);
      const rows = m.map((x) => ({
        sku: x.product.sku,
        name: x.product.name,
        unitsSold: x.unitsSold,
        velocity: num(x.salesVelocity),
        daysOfInventory: Number.isFinite(x.daysOfInventory) ? Math.round(x.daysOfInventory) : "∞",
        turnover: num(x.turnoverRatio),
        sellThrough: `${Math.round(x.sellThroughRate * 100)}%`,
      }));
      return {
        columns: [
          { key: "sku", label: "Артикул" },
          { key: "name", label: "Товар" },
          { key: "unitsSold", label: "Продано (30д)", align: "right" },
          { key: "velocity", label: "Скорость/день", align: "right" },
          { key: "daysOfInventory", label: "Дней запаса", align: "right" },
          { key: "turnover", label: "Оборачиваемость", align: "right" },
          { key: "sellThrough", label: "Sell-through", align: "right" },
        ],
        rows,
        rowCount: rows.length,
      };
    }

    case "dead_stock": {
      const m = computeProductMetrics(products, movements);
      const rows = m
        .filter((x) => x.isDeadStock)
        .map((x) => ({
          sku: x.product.sku,
          name: x.product.name,
          onHand: getAvailableStock(x.product),
          lastSale: x.lastSaleDaysAgo == null ? "нет продаж" : `${x.lastSaleDaysAgo} дн. назад`,
          frozenValue: num(x.inventoryValue),
        }));
      return {
        columns: [
          { key: "sku", label: "Артикул" },
          { key: "name", label: "Товар" },
          { key: "onHand", label: "Остаток", align: "right" },
          { key: "lastSale", label: "Последняя продажа" },
          { key: "frozenValue", label: "Заморожено, ₽", align: "right" },
        ],
        rows,
        rowCount: rows.length,
      };
    }

    case "reorder": {
      const m = metricsByProduct(input);
      const rows = products
        .filter((p) => p.status === "active" && getStockStatus(p) !== "in_stock" && getStockStatus(p) !== "overstock")
        .map((p) => {
          const met = m.get(p.id);
          const velocity = met?.salesVelocity ?? 0;
          const suggested = Math.max(1, Math.ceil(velocity * 30));
          return {
            sku: p.sku,
            name: p.name,
            available: getAvailableStock(p),
            status: getStockStatus(p),
            supplier: getSupplierName(p.supplierId),
            suggestedQty: suggested,
            estCost: num(suggested * p.costPrice),
          };
        });
      return {
        columns: [
          { key: "sku", label: "Артикул" },
          { key: "name", label: "Товар" },
          { key: "available", label: "Доступно", align: "right" },
          { key: "status", label: "Статус" },
          { key: "supplier", label: "Поставщик" },
          { key: "suggestedQty", label: "К заказу", align: "right" },
          { key: "estCost", label: "Сумма закупки, ₽", align: "right" },
        ],
        rows,
        rowCount: rows.length,
      };
    }

    case "cost_analysis": {
      const rows = products
        .filter((p) => p.status !== "archived")
        .map((p) => ({
          sku: p.sku,
          name: p.name,
          costPrice: num(p.costPrice),
          onHand: p.totalPhysical,
          totalCost: num(p.totalPhysical * p.costPrice),
          price: num(p.price),
          potentialRevenue: num(p.totalPhysical * p.price),
        }));
      return {
        columns: [
          { key: "sku", label: "Артикул" },
          { key: "name", label: "Товар" },
          { key: "costPrice", label: "Себестоимость, ₽", align: "right" },
          { key: "onHand", label: "Остаток", align: "right" },
          { key: "totalCost", label: "Стоимость склада, ₽", align: "right" },
          { key: "price", label: "Цена, ₽", align: "right" },
          { key: "potentialRevenue", label: "Потенциал выручки, ₽", align: "right" },
        ],
        rows,
        rowCount: rows.length,
      };
    }

    case "movement_history": {
      const rows = [...movements]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 500)
        .map((mv) => ({
          date: new Date(mv.createdAt).toLocaleString("ru-RU"),
          type: MOVEMENT_LABELS[mv.type] ?? mv.type,
          sku: mv.sku,
          name: mv.productName,
          delta: mv.qtyDelta,
          location: getLocationName(mv.locationId),
          user: mv.userName,
          reason: mv.reason ?? "",
        }));
      return {
        columns: [
          { key: "date", label: "Дата" },
          { key: "type", label: "Тип" },
          { key: "sku", label: "Артикул" },
          { key: "name", label: "Товар" },
          { key: "delta", label: "Изменение", align: "right" },
          { key: "location", label: "Локация" },
          { key: "user", label: "Пользователь" },
          { key: "reason", label: "Причина" },
        ],
        rows,
        rowCount: rows.length,
      };
    }

    case "abc_analysis": {
      const m = computeProductMetrics(products, movements);
      const rows = [...m]
        .sort((a, b) => b.inventoryValue - a.inventoryValue)
        .map((x) => ({
          sku: x.product.sku,
          name: x.product.name,
          abc: x.abcClass,
          inventoryValue: num(x.inventoryValue),
          unitsSold: x.unitsSold,
        }));
      return {
        columns: [
          { key: "abc", label: "Класс" },
          { key: "sku", label: "Артикул" },
          { key: "name", label: "Товар" },
          { key: "inventoryValue", label: "Стоимость запаса, ₽", align: "right" },
          { key: "unitsSold", label: "Продано (30д)", align: "right" },
        ],
        rows,
        rowCount: rows.length,
      };
    }

    case "channel_sales": {
      const byChannel = new Map<string, { units: number; products: Set<string> }>();
      products.forEach((p) => {
        p.channels.forEach((ch) => {
          const entry = byChannel.get(ch) ?? { units: 0, products: new Set() };
          entry.products.add(p.id);
          byChannel.set(ch, entry);
        });
      });
      movements.filter((mv) => mv.type === "sale").forEach((mv) => {
        const prod = products.find((p) => p.id === mv.productId);
        prod?.channels.forEach((ch) => {
          const entry = byChannel.get(ch);
          if (entry) entry.units += Math.abs(mv.qtyDelta);
        });
      });
      const rows = [...byChannel.entries()].map(([ch, v]) => ({
        channel: ch,
        productCount: v.products.size,
        unitsSold: v.units,
      }));
      return {
        columns: [
          { key: "channel", label: "Канал" },
          { key: "productCount", label: "Товаров", align: "right" },
          { key: "unitsSold", label: "Продано ед.", align: "right" },
        ],
        rows,
        rowCount: rows.length,
      };
    }

    case "margin_report": {
      const rows = products
        .filter((p) => p.status !== "archived")
        .map((p) => {
          const profit = p.price - p.costPrice - (p.packagingCost ?? 0) - (p.deliveryCost ?? 0);
          const marginPct = p.price > 0 ? (profit / p.price) * 100 : 0;
          return {
            sku: p.sku,
            name: p.name,
            price: num(p.price),
            costPrice: num(p.costPrice),
            profit: num(profit),
            marginPct: `${Math.round(marginPct)}%`,
          };
        });
      return {
        columns: [
          { key: "sku", label: "Артикул" },
          { key: "name", label: "Товар" },
          { key: "price", label: "Цена, ₽", align: "right" },
          { key: "costPrice", label: "Себестоимость, ₽", align: "right" },
          { key: "profit", label: "Прибыль/ед., ₽", align: "right" },
          { key: "marginPct", label: "Маржа", align: "right" },
        ],
        rows,
        rowCount: rows.length,
      };
    }

    case "supplier_performance": {
      const rows = suppliers.map((s) => {
        const pos = purchaseOrders.filter((po) => po.supplierId === s.id);
        const totalSpend = pos.reduce((sum, po) => sum + po.totalAmount, 0);
        const productCount = products.filter((p) => p.supplierId === s.id).length;
        return {
          name: s.name,
          country: s.country,
          rating: s.rating,
          leadTime: `${s.leadTimeDays} дн.`,
          orders: pos.length,
          products: productCount,
          spend: num(totalSpend),
        };
      });
      return {
        columns: [
          { key: "name", label: "Поставщик" },
          { key: "country", label: "Страна" },
          { key: "rating", label: "Рейтинг", align: "right" },
          { key: "leadTime", label: "Срок поставки", align: "right" },
          { key: "orders", label: "Заказов", align: "right" },
          { key: "products", label: "Товаров", align: "right" },
          { key: "spend", label: "Закуплено, ₽", align: "right" },
        ],
        rows,
        rowCount: rows.length,
      };
    }
  }
}

export function reportSummaryMeta(type: ReportType, data: ReportData): { label: string; value: string }[] {
  const meta: { label: string; value: string }[] = [
    { label: "Строк", value: String(data.rowCount) },
    { label: "Сформирован", value: new Date().toLocaleDateString("ru-RU") },
  ];
  if (type === "stock_balance" || type === "cost_analysis") {
    const total = data.rows.reduce((s, r) => s + (Number(r.value ?? r.totalCost) || 0), 0);
    meta.push({ label: "Итого стоимость", value: money(total) });
  }
  return meta;
}
