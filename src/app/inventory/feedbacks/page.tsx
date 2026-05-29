"use client";

import { InventoryShell } from "@/components/inventory/InventoryShell";
import { FeedbacksPanel } from "@/components/inventory/FeedbacksPanel";

export default function FeedbacksPage() {
  return (
    <InventoryShell title="Отзывы и вопросы" subtitle="Ответы на отзывы и вопросы покупателей Wildberries — с помощью ИИ">
      <FeedbacksPanel />
    </InventoryShell>
  );
}
