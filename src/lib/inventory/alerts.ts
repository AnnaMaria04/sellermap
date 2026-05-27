import {
  type Product,
  type InventoryBatch,
  type PurchaseOrder,
  getStockStatus,
  getAvailableStock,
} from "@/mock/inventory";
import { quarterSchedule } from "@/lib/finance/tax";

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
  purchaseOrders: PurchaseOrder[] = [],
): ComputedAlert[] {
  const alerts: ComputedAlert[] = [];
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Overdue purchase orders ─────────────────────────────────────────────────
  purchaseOrders.forEach((po) => {
    if (po.status === "closed" || !po.expectedArrival) return;
    const exp = new Date(po.expectedArrival);
    exp.setHours(0, 0, 0, 0);
    if (exp.getTime() >= today.getTime()) return;
    const daysLate = Math.round((today.getTime() - exp.getTime()) / 86400000);
    alerts.push({
      id: `po-overdue-${po.id}`,
      title: "Просрочен заказ поставщику",
      description: `${po.supplierName} — ожидался ${exp.toLocaleDateString("ru-RU")} (просрочен на ${daysLate} дн.)`,
      severity: "critical",
      category: "system",
      actionLabel: "Открыть заказ",
      actionHref: `/inventory/purchase-orders/${po.id}`,
      createdAt: now.toISOString(),
    });
  });

  // ── Upcoming tax advance deadline (within 14 days) ──────────────────────────
  for (const q of quarterSchedule(today.getFullYear())) {
    const [d, m, y] = q.deadline.split(".").map(Number);
    const due = new Date(y, m - 1, d);
    due.setHours(0, 0, 0, 0);
    const days = Math.round((due.getTime() - today.getTime()) / 86400000);
    if (days >= 0 && days <= 14) {
      alerts.push({
        id: `tax-${q.deadline}`,
        title: "Скоро авансовый платёж",
        description: `Налог за «${q.label}» — срок ${q.deadline}, осталось ${days} дн.`,
        severity: days <= 5 ? "critical" : "warning",
        category: "system",
        actionLabel: "Открыть налоги",
        actionHref: "/inventory/tax",
        createdAt: now.toISOString(),
      });
    }
  }

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
