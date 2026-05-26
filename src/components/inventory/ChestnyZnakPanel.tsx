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
  QrCode,
  ChevronDown,
  ChevronUp,
  Info,
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
import { type Product } from "@/mock/inventory";

// ── Status metadata ───────────────────────────────────────────────────────────

const STATE_META: Record<
  MarkingComplianceState,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  compliant: {
    label: "Промаркирован",
    color: "text-[var(--c-green)]",
    bg: "bg-[var(--c-green-dim)]",
    icon: <ShieldCheck size={14} />,
  },
  action_needed: {
    label: "Требует кодов",
    color: "text-[var(--c-red)]",
    bg: "bg-[var(--c-red-dim)]",
    icon: <ShieldAlert size={14} />,
  },
  review: {
    label: "Проверить",
    color: "text-[var(--c-amber)]",
    bg: "bg-[var(--c-amber-dim)]",
    icon: <ShieldQuestion size={14} />,
  },
  unnecessary: {
    label: "Маркировка лишняя",
    color: "text-[var(--c-amber)]",
    bg: "bg-[var(--c-amber-dim)]",
    icon: <AlertTriangle size={14} />,
  },
  not_applicable: {
    label: "Не требуется",
    color: "text-[var(--c-text3)]",
    bg: "bg-[var(--c-bg3)]",
    icon: <Shield size={14} />,
  },
};

// Single mock signer + adapter instance for the demo session.
const signer = new MockSigningProvider({ available: true });
const cz = new MockChestnyZnakAdapter();

// ── Main panel ────────────────────────────────────────────────────────────────

export function ChestnyZnakPanel() {
  const { products, actions } = useInventory();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<MarkingComplianceState | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rows = useMemo(
    () => products.map((p) => ({ product: p, compliance: getCompliance(p) })),
    [products],
  );
  const summary = useMemo(() => summarizeCompliance(products), [products]);
  const checklist = useMemo(() => getReadinessChecklist(false), []);

  // Products explicitly tagged for Честный Знак
  const czProducts = useMemo(
    () =>
      products.filter(
        (p) => p.requiresLabeling && p.labelingType === "chestny_znak",
      ),
    [products],
  );
  const czLabeled = czProducts.filter((p) => Boolean(p.dataMatrixCode)).length;
  const czTotal = czProducts.length;

  const filtered =
    filter === "all" ? rows : rows.filter((r) => r.compliance.state === filter);

  const needsAction = summary.action_needed;

  async function orderAndIntroduce(
    productId: string,
    gtin: string,
    groupId: string,
  ) {
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

  /** Simulate generating a DataMatrix code without going through the full order flow. */
  async function simulateGenerate(product: Product) {
    setBusyId(product.id);
    // Deterministic fake CIS so it looks realistic
    await new Promise((r) => setTimeout(r, 900));
    const gtin =
      product.gtin ??
      product.barcode ??
      product.sku
        .split("")
        .map((c) => c.charCodeAt(0))
        .join("")
        .slice(0, 14)
        .padEnd(14, "0");
    const serial = `SIM${Date.now().toString(36).toUpperCase()}`;
    const cis = `010${gtin}21${serial}9310${Math.floor(
      Math.random() * 1000000,
    )
      .toString()
      .padStart(6, "0")}`;
    actions.updateProduct(product.id, {
      dataMatrixCode: cis,
      gtin,
      requiresLabeling: true,
      labelingType: "chestny_znak",
    });
    setBusyId(null);
  }

  return (
    <div className="space-y-6">
      {/* ── Statistics bar ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          label="Промаркировано"
          value={summary.compliant}
          state="compliant"
        />
        <SummaryCard
          label="Требуют кодов"
          value={summary.action_needed}
          state="action_needed"
        />
        <SummaryCard
          label="На проверку"
          value={summary.review}
          state="review"
        />
        <SummaryCard
          label="Лишняя маркировка"
          value={summary.unnecessary}
          state="unnecessary"
        />
      </div>

      {/* ── Alert banner ───────────────────────────────────────────────── */}
      {needsAction > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-[rgba(240,80,80,0.25)] bg-[var(--c-red-dim)] p-4">
          <ShieldAlert
            size={18}
            className="mt-0.5 shrink-0 text-[var(--c-red)]"
          />
          <div>
            <p className="text-sm font-semibold text-[var(--c-red)]">
              {needsAction} товаров без кодов маркировки
            </p>
            <p className="mt-0.5 text-xs text-[var(--c-text2)]">
              Эти товары подлежат обязательной маркировке «Честный Знак», но
              коды ещё не заказаны. Закажите КМ ниже.
            </p>
          </div>
        </div>
      )}

      {/* ── Честный Знак products: labeled / total ─────────────────────── */}
      {czTotal > 0 && (
        <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
          {/* Header with progress */}
          <div className="flex items-center justify-between border-b border-[var(--c-border)] px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--c-text)]">
                Товары Честного Знака
              </h3>
              <p className="mt-0.5 text-xs text-[var(--c-text3)]">
                Помечены как &laquo;обязательная маркировка ЧЗ&raquo;
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold tabular-nums text-[var(--c-text)]">
                <span className="text-[var(--c-green)]">{czLabeled}</span>
                <span className="text-[var(--c-text3)]"> / {czTotal}</span>
              </p>
              <p className="text-xs text-[var(--c-text3)]">промаркировано</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="px-5 py-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--c-bg3)]">
              <div
                className="h-full rounded-full bg-[var(--c-green)] transition-all duration-500"
                style={{ width: `${czTotal > 0 ? (czLabeled / czTotal) * 100 : 0}%` }}
              />
            </div>
            <p className="mt-1 text-right text-[10px] text-[var(--c-text3)]">
              {czTotal > 0 ? Math.round((czLabeled / czTotal) * 100) : 0}% готово
            </p>
          </div>

          {/* Per-product rows */}
          <div className="divide-y divide-[var(--c-border)]">
            {czProducts.map((product) => {
              const hasCode = Boolean(product.dataMatrixCode);
              const isExpanded = expandedId === product.id;
              const isBusy = busyId === product.id;

              return (
                <div key={product.id}>
                  <div className="flex items-center gap-3 px-5 py-3">
                    {/* DataMatrix thumbnail */}
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[var(--c-border)] bg-white">
                      {hasCode ? (
                        <DataMatrixMini seed={product.dataMatrixCode!} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <QrCode size={18} className="text-[var(--c-text3)]" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--c-text)]">
                        {product.name}
                      </p>
                      <p className="text-xs text-[var(--c-text3)]">
                        {product.sku}
                        {product.dataMatrixCode && (
                          <span className="ml-1 font-mono">
                            · КМ{" "}
                            {product.dataMatrixCode.slice(0, 20).replace(/[^\x20-\x7E]/g, "·")}…
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Status badge */}
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                        hasCode
                          ? "bg-[var(--c-green-dim)] text-[var(--c-green)]"
                          : "bg-[var(--c-red-dim)] text-[var(--c-red)]",
                      )}
                    >
                      {hasCode ? "Код есть" : "Нет кода"}
                    </span>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1.5">
                      {!hasCode && (
                        <button
                          onClick={() => simulateGenerate(product)}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--c-green)] px-3 py-1.5 text-xs font-semibold text-[var(--c-bg)] transition hover:bg-[#25e890] disabled:opacity-60"
                        >
                          {isBusy ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <ShieldCheck size={12} />
                          )}
                          {isBusy ? "Генерация…" : "Сгенерировать"}
                        </button>
                      )}
                      {hasCode && (
                        <button
                          onClick={() =>
                            setExpandedId(isExpanded ? null : product.id)
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--c-border2)] text-[var(--c-text3)] transition hover:text-[var(--c-text)]"
                        >
                          {isExpanded ? (
                            <ChevronUp size={13} />
                          ) : (
                            <ChevronDown size={13} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded: full DataMatrix visual + code */}
                  {isExpanded && hasCode && (
                    <div className="border-t border-[var(--c-border)] bg-[var(--c-bg3)] px-5 py-4">
                      <div className="flex items-start gap-5">
                        {/* Large DataMatrix */}
                        <div className="shrink-0 overflow-hidden rounded-xl border border-[var(--c-border)] bg-white p-2 shadow-sm">
                          <DataMatrixLarge seed={product.dataMatrixCode!} />
                        </div>

                        <div className="min-w-0 flex-1 space-y-2.5">
                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--c-text3)]">
                              Код маркировки (КМ)
                            </p>
                            <p className="mt-0.5 break-all font-mono text-[11px] text-[var(--c-text2)]">
                              {product.dataMatrixCode!.replace(
                                /[^\x20-\x7E]/g,
                                "·",
                              )}
                            </p>
                          </div>
                          {product.gtin && (
                            <div>
                              <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--c-text3)]">
                                GTIN
                              </p>
                              <p className="mt-0.5 font-mono text-xs text-[var(--c-text)]">
                                {product.gtin}
                              </p>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 rounded-lg bg-[var(--c-green-dim)] px-3 py-2">
                            <CheckCircle2
                              size={13}
                              className="shrink-0 text-[var(--c-green)]"
                            />
                            <span className="text-xs text-[var(--c-green)]">
                              Введён в оборот
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {czTotal === 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <Info size={15} className="mt-0.5 shrink-0 text-[var(--c-text3)]" />
          <p className="text-xs text-[var(--c-text3)]">
            Нет товаров с флагом «Честный Знак». Включите обязательную
            маркировку в карточке товара, чтобы управлять кодами здесь.
          </p>
        </div>
      )}

      {/* ── Full compliance table ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--c-text)]">
            Все товары — статус маркировки
          </h3>

          {/* Filter tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                "all",
                "action_needed",
                "compliant",
                "review",
                "unnecessary",
              ] as const
            ).map((f) => (
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
                {f !== "all" && summary[f] > 0 && (
                  <span className="ml-1.5 text-[10px] opacity-60">
                    {summary[f]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck size={24} />}
              title="Нет товаров в этой категории"
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-[var(--c-border)] text-left">
                    <th className="px-4 py-3 text-xs font-medium text-[var(--c-text2)]">
                      Товар
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-[var(--c-text2)]">
                      Группа
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-[var(--c-text2)]">
                      Статус
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(({ product, compliance }) => {
                    const meta = STATE_META[compliance.state];
                    const canOrder = compliance.state === "action_needed";
                    const isBusy = busyId === product.id;
                    return (
                      <tr
                        key={product.id}
                        className="border-b border-[var(--c-border)] last:border-0"
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-[var(--c-text)]">
                            {product.name}
                          </p>
                          <p className="text-xs text-[var(--c-text3)]">
                            {product.sku}
                            {product.dataMatrixCode &&
                              ` · КМ ${product.dataMatrixCode.slice(0, 18).replace(/[^\x20-\x7E]/g, "·")}…`}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-[var(--c-text2)]">
                            {compliance.assessment.group?.label ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                              meta.bg,
                              meta.color,
                            )}
                          >
                            {meta.icon}
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canOrder && (
                            <button
                              onClick={() =>
                                orderAndIntroduce(
                                  product.id,
                                  product.gtin ??
                                    product.barcode ??
                                    product.sku,
                                  compliance.assessment.group?.id ??
                                    "light_industry",
                                )
                              }
                              disabled={isBusy}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--c-green)] px-3 py-1.5 text-xs font-semibold text-[var(--c-bg)] transition hover:bg-[#25e890] disabled:opacity-60"
                            >
                              {isBusy ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <ShieldCheck size={13} />
                              )}
                              {isBusy ? "Заказ…" : "Заказать коды"}
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

        {/* ── Right rail: signer + readiness checklist ────────────────── */}
        <div className="space-y-4">
          <SignerCard />
          <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
            <h3 className="mb-1 text-sm font-semibold text-[var(--c-text)]">
              Готовность к работе с ЧЗ
            </h3>
            <p className="mb-4 text-xs text-[var(--c-text3)]">
              Что нужно для маркировки
            </p>
            <ul className="space-y-3">
              {checklist
                .filter((c) => c.required)
                .map((item) => (
                  <li key={item.key} className="flex items-start gap-2.5">
                    <Circle
                      size={15}
                      className="mt-0.5 shrink-0 text-[var(--c-text3)]"
                    />
                    <div>
                      <p className="text-sm text-[var(--c-text)]">
                        {item.title}
                      </p>
                      <p className="text-xs text-[var(--c-text3)]">
                        {item.description}
                      </p>
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

// ── Summary card ──────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  state,
}: {
  label: string;
  value: number;
  state: MarkingComplianceState;
}) {
  const meta = STATE_META[state];
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
      <div className={cn("mb-2", meta.color)}>{meta.icon}</div>
      <p className="text-xs text-[var(--c-text2)]">{label}</p>
      <p className={cn("mt-0.5 text-xl font-bold tabular-nums", meta.color)}>
        {value}
      </p>
    </div>
  );
}

// ── Signer card ───────────────────────────────────────────────────────────────

function SignerCard() {
  const [cert, setCert] = useState<{
    subject: string;
    validUntil: string;
  } | null>(null);
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
        <h3 className="text-sm font-semibold text-[var(--c-text)]">
          Электронная подпись (УКЭП)
        </h3>
      </div>
      {cert ? (
        <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] p-3">
          <div className="flex items-center gap-1.5 text-[var(--c-green)]">
            <CheckCircle2 size={14} />
            <span className="text-xs font-medium">Подпись подключена</span>
          </div>
          <p className="mt-1.5 text-xs text-[var(--c-text2)]">{cert.subject}</p>
          <p className="text-xs text-[var(--c-text3)]">
            действует до {cert.validUntil}
          </p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-[var(--c-text3)]">
            Подключите КриптоПро плагин и токен для подписания запросов в ГИС МТ
            (демо-режим использует тестовую подпись).
          </p>
          <button
            onClick={connect}
            disabled={checking}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--c-border2)] py-2 text-sm font-medium text-[var(--c-text2)] transition hover:text-[var(--c-text)] disabled:opacity-60"
          >
            {checking ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <KeyRound size={14} />
            )}
            Подключить подпись
          </button>
        </>
      )}
    </div>
  );
}

// ── DataMatrix graphics ───────────────────────────────────────────────────────

/** Deterministic cell value from a seed string at position i. */
function dmCell(seed: string, i: number, size: number): boolean {
  const row = Math.floor(i / size);
  const col = i % size;
  // Always-on border rows/cols (like real DataMatrix)
  if (row === 0 || col === 0) return true;
  if (row === size - 1) return col % 2 === 0;
  if (col === size - 1) return row % 2 === 1;
  const charCode = seed.charCodeAt(i % seed.length) || 65;
  return (charCode + row * 7 + col * 13) % 3 !== 0;
}

/** Small DataMatrix for table thumbnails (10×10). */
function DataMatrixMini({ seed }: { seed: string }) {
  const SIZE = 10;
  const cells = Array.from({ length: SIZE * SIZE }, (_, i) => dmCell(seed, i, SIZE));
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
        gap: 0,
        width: "100%",
        height: "100%",
        padding: 2,
        background: "white",
      }}
    >
      {cells.map((on, i) => (
        <div key={i} style={{ background: on ? "black" : "white", aspectRatio: "1" }} />
      ))}
    </div>
  );
}

/** Large DataMatrix for the expanded detail view (16×16). */
function DataMatrixLarge({ seed }: { seed: string }) {
  const SIZE = 16;
  const cells = Array.from({ length: SIZE * SIZE }, (_, i) => dmCell(seed, i, SIZE));
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
        gap: "0.5px",
        width: 96,
        height: 96,
        background: "white",
      }}
    >
      {cells.map((on, i) => (
        <div
          key={i}
          style={{ background: on ? "black" : "white", aspectRatio: "1" }}
        />
      ))}
    </div>
  );
}
