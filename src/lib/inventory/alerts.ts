import {
  type Product,
  type InventoryBatch,
  getStockStatus,
  getAvailableStock,
} from "@/mock/inventory";

export interface ComputedAlert {
  id: string;
  type: "low_stock" | "out_of_stock" | "expiry_warning" | "reorder_triggered";
  priority: "critical" | "high" | "medium";
  title: string;
  body: string;
  createdAt: string;
  productId?: string;
}

export function computeAlerts(
  products: Product[],
  batches: InventoryBatch[],
): ComputedAlert[] {
  const now = new Date().toISOString();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const alerts: ComputedAlert[] = [];

  products.filter((p) => p.status === "active").forEach((p) => {
    const status = getStockStatus(p);
    const available = getAvailableStock(p);
    if (status === "out_of_stock") {
      alerts.push({
        id: `oos-${p.id}`,
        type: "out_of_stock",
        priority: "critical",
        title: "Нет в наличии",
        body: `«${p.name}» — остатки исчерпаны. Оформите закупку.`,
        createdAt: now,
        productId: p.id,
      });
    } else if (status === "low_stock") {
      alerts.push({
        id: `low-${p.id}`,
        type: "low_stock",
        priority: "high",
        title: "Мало товара",
        body: `«${p.name}» (${p.sku}) — осталось ${available} шт.`,
        createdAt: now,
        productId: p.id,
      });
    }
  });

  batches.forEach((b) => {
    if (b.remainingQty <= 0 || b.status === "quarantine") return;
    const exp = new Date(b.expiryDate);
    exp.setHours(0, 0, 0, 0);
    const days = Math.round((exp.getTime() - today.getTime()) / 86400000);
    if (days < 0) {
      alerts.push({
        id: `exp-${b.id}`,
        type: "expiry_warning",
        priority: "critical",
        title: "Просроченная партия",
        body: `Партия ${b.batchNumber} (${b.productName}, ${b.remainingQty} шт) — просрочена. Необходимо списать.`,
        createdAt: now,
        productId: b.productId,
      });
    } else if (days <= 30) {
      alerts.push({
        id: `exp-${b.id}`,
        type: "expiry_warning",
        priority: days <= 7 ? "critical" : "medium",
        title: "Истекает срок годности",
        body: `Партия ${b.batchNumber} (${b.productName}, ${b.remainingQty} шт) — истекает через ${days} дн.`,
        createdAt: now,
        productId: b.productId,
      });
    }
  });

  const order: Record<string, number> = { critical: 0, high: 1, medium: 2 };
  return alerts.sort((a, b) => order[a.priority] - order[b.priority]);
}
