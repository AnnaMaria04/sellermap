import {
  type Product,
  type InventoryBatch,
  getStockStatus,
  getAvailableStock,
} from "@/mock/inventory";

export type AlertSeverity = "critical" | "warning" | "info";
export type AlertCategory = "stock" | "expiry" | "performance" | "system";

export interface ComputedAlert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  category: AlertCategory;
  productId?: string;
  actionLabel?: string;
  actionHref?: string;
  createdAt: string; // ISO string
}

export function computeAlerts(
  products: Product[],
  batches: InventoryBatch[],
): ComputedAlert[] {
  const alerts: ComputedAlert[] = [];
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  products.filter((p) => p.status === "active").forEach((p) => {
    const status = getStockStatus(p);
    const available = getAvailableStock(p);

    if (status === "out_of_stock") {
      alerts.push({
        id: `oos-${p.id}`,
        title: "Нет в наличии",
        description: `«${p.name}» полностью отсутствует на складе`,
        severity: "critical",
        category: "stock",
        productId: p.id,
        actionLabel: "Создать заказ",
        actionHref: "/inventory/purchase-orders",
        createdAt: new Date(now.getTime() - Math.random() * 86400000).toISOString(),
      });
    } else if (status === "low_stock") {
      alerts.push({
        id: `low-${p.id}`,
        title: "Мало товара",
        description: `«${p.name}» (${p.sku}) — осталось ${available} шт.`,
        severity: available <= 2 ? "critical" : "warning",
        category: "stock",
        productId: p.id,
        actionLabel: "Пополнить",
        actionHref: "/inventory/purchase-orders",
        createdAt: new Date(now.getTime() - Math.random() * 86400000).toISOString(),
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
        title: "Товар просрочен",
        description: `Партия ${b.batchNumber} (${b.productName}, ${b.remainingQty} шт.) — просрочена. Необходимо списать.`,
        severity: "critical",
        category: "expiry",
        productId: b.productId,
        actionLabel: "Списать",
        actionHref: "/inventory/batches",
        createdAt: new Date(now.getTime() - Math.random() * 3600000).toISOString(),
      });
    } else if (days <= 30) {
      alerts.push({
        id: `exp-soon-${b.id}`,
        title: "Скоро истекает срок",
        description: `Партия ${b.batchNumber} (${b.productName}, ${b.remainingQty} шт.) — истекает через ${days} дн.`,
        severity: days <= 7 ? "critical" : "warning",
        category: "expiry",
        productId: b.productId,
        actionLabel: "Просмотреть",
        actionHref: "/inventory/batches",
        createdAt: new Date(now.getTime() - Math.random() * 3600000).toISOString(),
      });
    }
  });

  // Sort: critical first, then warning, then by createdAt desc
  const sev: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => {
    if (sev[a.severity] !== sev[b.severity]) return sev[a.severity] - sev[b.severity];
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
