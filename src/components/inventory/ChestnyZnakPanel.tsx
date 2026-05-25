"use client";

import { useMemo, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Shield,
  CheckCircle2,
  Circle,
  Loader2,
  KeyRound,
  AlertTriangle,
} from "lucide-react";
import { useInventory } from "@/contexts/InventoryContext";
import {
  getCompliance,
  summarizeCompliance,
  getReadinessChecklist,
  type MarkingComplianceState,
} from "@/lib/chestny-znak/requirements";
import {
  MockChestnyZnakAdapter,
  MockSigningProvider,
} from "@/lib/chestny-znak/adapter";
import { EmptyState } from "./ui/EmptyState";
import { cn } from "@/lib/utils";

const STATE_META: Record<MarkingComplianceState, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  compliant:      { label: "Промаркирован",      color: "text-[var(--c-green)]", bg: "bg-[var(--c-green-dim)]", icon: <ShieldCheck size={14} /> },
  action_needed:  { label: "Требует кодов",       color: "text-[var(--c-red)]",   bg: "bg-[var(--c-red-dim)]",   icon: <ShieldAlert size={14} /> },
  review:         { label: "Проверить",           color: "text-[var(--c-amber)]", bg: "bg-[var(--c-amber-dim)]", icon: <ShieldQuestion size={14} /> },
  unnecessary:    { label: "Маркировка лишняя",   color: "text-[var(--c-amber)]", bg: "bg-[var(--c-amber-dim)]", icon: <AlertTriangle size={14} /> },
  not_applicable: { label: "Не требуется",        color: "text-[var(--c-text3)]", bg: "bg-[var(--c-bg3)]",       icon: <Shield size={14} /> },
};

// Single mock signer + adapter instance for the demo session.
const signer = new MockSigningProvider({ available: true });
const cz = new MockChestnyZnakAdapter();

export function ChestnyZnakPanel() {
  const { products, actions } = useInventory();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<MarkingComplianceState | "all">("all");

  const rows = useMemo(
    () => products.map((p) => ({ product: p, compliance: getCompliance(p) })),
    [products],
  );
  const summary = useMemo(() => summarizeCompliance(products), [products]);
  const checklist = useMemo(() => getReadinessChecklist(false), []);

  const filtered = filter === "all" ? rows : rows.filter((r) => r.compliance.state === filter);

  async function orderAndIntroduce(productId: string, gtin: string, groupId: string) {
    setBusyId(productId);
    try {
      await cz.authenticate(signer);
      const order = await cz.orderCodes({ gtin, groupId, quantity: 1 });
      const cis = order.codes[0]?.cis;
      if (cis) {
        await cz.introduceIntoCirculation({ cises: [cis], signer });
        actions.updateProduct(productId, {
          dataMatrixCode: cis,
          gtin,
          requiresLabeling: true,
          labelingType: "chestny_znak",
        });
      }
    } catch {
      // In the demo, surface nothing fatal; real impl would toast the error.
    } finally {
      setBusyId(null);
    }
  }

  const needsAction = summary.action_needed;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Промаркировано" value={summary.compliant} state="compliant" />
        <SummaryCard label="Требуют кодов" value={summary.action_needed} state="action_needed" />
        <SummaryCard label="На проверку" value={summary.review} state="review" />
        <SummaryCard label="Лишняя маркировка" value={summary.unnecessary} state="unnecessary" />
      </div>

      {needsAction > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-[rgba(240,80,80,0.25)] bg-[var(--c-red-dim)] p-4">
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-[var(--c-red)]" />
          <div>
            <p className="text-sm font-semibold text-[var(--c-red)]">{needsAction} товаров без кодов маркировки</p>
            <p className="mt-0.5 text-xs text-[var(--c-text2)]">
              Эти товары подлежат обязательной маркировке «Честный Знак», но коды ещё не заказаны. Закажите КМ ниже.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Product compliance table */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "action_needed", "compliant", "review", "unnecessary"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  filter === f
                    ? "bg-[var(--c-bg3)] text-[var(--c-text)]"
                    : "text-[var(--c-text2)] hover:text-[var(--c-text)]",
                )}
              >
                {f === "all" ? "Все" : STATE_META[f].label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={<ShieldCheck size={24} />} title="Нет товаров в этой категории" />
          ) : (
            <div className="overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--c-border)] text-left">
                    <th className="px-4 py-3 text-xs font-medium text-[var(--c-text2)]">Товар</th>
                    <th className="px-4 py-3 text-xs font-medium text-[var(--c-text2)]">Группа</th>
                    <th className="px-4 py-3 text-xs font-medium text-[var(--c-text2)]">Статус</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(({ product, compliance }) => {
                    const meta = STATE_META[compliance.state];
                    const canOrder = compliance.state === "action_needed";
                    return (
                      <tr key={product.id} className="border-b border-[var(--c-border)] last:border-0">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-[var(--c-text)]">{product.name}</p>
                          <p className="text-xs text-[var(--c-text3)]">
                            {product.sku}
                            {product.dataMatrixCode && ` · КМ ${product.dataMatrixCode.slice(0, 18)}…`}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-[var(--c-text2)]">{compliance.assessment.group?.label ?? "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", meta.bg, meta.color)}>
                            {meta.icon}
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canOrder && (
                            <button
                              onClick={() => orderAndIntroduce(product.id, product.gtin ?? product.barcode ?? product.sku, compliance.assessment.group?.id ?? "light_industry")}
                              disabled={busyId === product.id}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--c-green)] px-3 py-1.5 text-xs font-semibold text-[var(--c-bg)] transition hover:bg-[#25e890] disabled:opacity-60"
                            >
                              {busyId === product.id ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                              {busyId === product.id ? "Заказ…" : "Заказать коды"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right rail: signer + readiness checklist */}
        <div className="space-y-4">
          <SignerCard />
          <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
            <h3 className="mb-1 text-sm font-semibold text-[var(--c-text)]">Готовность к работе с ЧЗ</h3>
            <p className="mb-4 text-xs text-[var(--c-text3)]">Что нужно для маркировки</p>
            <ul className="space-y-3">
              {checklist.filter((c) => c.required).map((item) => (
                <li key={item.key} className="flex items-start gap-2.5">
                  <Circle size={15} className="mt-0.5 shrink-0 text-[var(--c-text3)]" />
                  <div>
                    <p className="text-sm text-[var(--c-text)]">{item.title}</p>
                    <p className="text-xs text-[var(--c-text3)]">{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, state }: { label: string; value: number; state: MarkingComplianceState }) {
  const meta = STATE_META[state];
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
      <div className={cn("mb-2", meta.color)}>{meta.icon}</div>
      <p className="text-xs text-[var(--c-text2)]">{label}</p>
      <p className={cn("mt-0.5 text-xl font-bold tabular", meta.color)}>{value}</p>
    </div>
  );
}

function SignerCard() {
  const [cert, setCert] = useState<{ subject: string; validUntil: string } | null>(null);
  const [checking, setChecking] = useState(false);

  async function connect() {
    setChecking(true);
    const ok = await signer.isAvailable();
    setCert(ok ? await signer.describe() : null);
    setChecking(false);
  }

  return (
    <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
      <div className="mb-3 flex items-center gap-2">
        <KeyRound size={15} className="text-[var(--c-blue)]" />
        <h3 className="text-sm font-semibold text-[var(--c-text)]">Электронная подпись (УКЭП)</h3>
      </div>
      {cert ? (
        <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] p-3">
          <div className="flex items-center gap-1.5 text-[var(--c-green)]">
            <CheckCircle2 size={14} />
            <span className="text-xs font-medium">Подпись подключена</span>
          </div>
          <p className="mt-1.5 text-xs text-[var(--c-text2)]">{cert.subject}</p>
          <p className="text-xs text-[var(--c-text3)]">действует до {cert.validUntil}</p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-[var(--c-text3)]">
            Подключите КриптоПро плагин и токен для подписания запросов в ГИС МТ (демо-режим использует тестовую подпись).
          </p>
          <button
            onClick={connect}
            disabled={checking}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--c-border2)] py-2 text-sm font-medium text-[var(--c-text2)] transition hover:text-[var(--c-text)] disabled:opacity-60"
          >
            {checking ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
            Подключить подпись
          </button>
        </>
      )}
    </div>
  );
}
