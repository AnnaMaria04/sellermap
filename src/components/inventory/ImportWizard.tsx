"use client";

import { useState } from "react";
import {
  X,
  Upload,
  FileText,
  Check,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Table,
  Package,
  Download,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onClose: () => void;
}

type Source = "excel" | "csv" | "1c" | "moysklad" | "shopify" | "supplier";
type Step = "source" | "upload" | "map" | "preview" | "done";

const SOURCES: { id: Source; label: string; description: string; emoji: string }[] = [
  { id: "excel", label: "Excel / XLSX", description: "Таблица Microsoft Excel", emoji: "📊" },
  { id: "csv", label: "CSV файл", description: "Универсальный формат разделённых значений", emoji: "📄" },
  { id: "1c", label: "1С Предприятие", description: "Выгрузка из 1С в формате XML/XLS", emoji: "🏢" },
  { id: "moysklad", label: "МойСклад", description: "Экспорт из сервиса МойСклад", emoji: "📦" },
  { id: "shopify", label: "Shopify", description: "CSV экспорт из Shopify", emoji: "🛍️" },
  { id: "supplier", label: "Прайс поставщика", description: "XLS/PDF прайс-лист поставщика", emoji: "🏭" },
];

const SAMPLE_FIELDS = ["Название товара", "SKU", "Штрихкод", "Цена", "Себестоимость", "Остаток", "Единица", "Категория", "Поставщик"];
const SYSTEM_FIELDS = ["name", "sku", "barcode", "price", "costPrice", "stock", "unit", "category", "supplier"];

export function ImportWizard({ onClose }: Props) {
  const [step, setStep] = useState<Step>("source");
  const [source, setSource] = useState<Source | null>(null);
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; errors: number } | null>(null);

  const steps: { id: Step; label: string }[] = [
    { id: "source", label: "Источник" },
    { id: "upload", label: "Файл" },
    { id: "map", label: "Сопоставление" },
    { id: "preview", label: "Предпросмотр" },
    { id: "done", label: "Готово" },
  ];

  const currentStepIdx = steps.findIndex((s) => s.id === step);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setFileName(file.name);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setFileName(file.name);
  }

  function handleImport() {
    setImporting(true);
    setTimeout(() => {
      setImporting(false);
      setImportResult({ created: 12, updated: 3, errors: 1 });
      setStep("done");
    }, 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex h-[90vh] max-h-[700px] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--c-text)]">Импорт товаров</h2>
            <p className="text-xs text-[var(--c-text2)]">Шаг {currentStepIdx + 1} из {steps.length}</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition">
            <X size={18} />
          </button>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-0 border-b border-[var(--c-border)] bg-[var(--c-bg2)] px-6">
          {steps.map((s, i) => {
            const isDone = i < currentStepIdx;
            const isActive = s.id === step;
            return (
              <div key={s.id} className="flex items-center">
                <div className={cn(
                  "flex items-center gap-2 py-3 pr-4 text-xs font-medium transition",
                  isActive ? "text-[var(--c-text)]" : isDone ? "text-[var(--c-green)]" : "text-[var(--c-text3)]",
                )}>
                  <div className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-xs",
                    isActive ? "bg-[var(--c-green)] text-[var(--c-bg)]" :
                    isDone ? "bg-[var(--c-green-dim)] text-[var(--c-green)]" :
                    "bg-[var(--c-bg3)] text-[var(--c-text3)]",
                  )}>
                    {isDone ? <Check size={11} /> : i + 1}
                  </div>
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <ChevronRight size={14} className="mr-4 text-[var(--c-text3)]" />
                )}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step: Source */}
          {step === "source" && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-[var(--c-text2)]">Выберите источник данных</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {SOURCES.map((src) => (
                  <button
                    key={src.id}
                    onClick={() => setSource(src.id)}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-4 text-left transition",
                      source === src.id
                        ? "border-[var(--c-green)] bg-[var(--c-green-dim)]"
                        : "border-[var(--c-border)] bg-[var(--c-bg2)] hover:border-[var(--c-border2)] hover:bg-[var(--c-bg3)]",
                    )}
                  >
                    <span className="text-2xl">{src.emoji}</span>
                    <div>
                      <p className={cn("text-sm font-semibold", source === src.id ? "text-[var(--c-green)]" : "text-[var(--c-text)]")}>
                        {src.label}
                      </p>
                      <p className="text-xs text-[var(--c-text3)] mt-0.5">{src.description}</p>
                    </div>
                    {source === src.id && (
                      <Check size={16} className="ml-auto shrink-0 text-[var(--c-green)]" />
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] p-4">
                <Download size={15} className="text-[var(--c-text3)] shrink-0" />
                <div>
                  <p className="text-xs font-medium text-[var(--c-text2)]">Скачать шаблон</p>
                  <p className="text-xs text-[var(--c-text3)]">Готовый Excel-шаблон для заполнения</p>
                </div>
                <button
                  onClick={() => {
                    const csv = "Название,Артикул,Штрихкод,Категория,Цена,Себестоимость,Остаток\nФутболка оверсайз,TSH-001,4600000000001,Одежда,1490,560,100\n";
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
                    a.download = "шаблон_импорта_товаров.csv";
                    a.click();
                  }}
                  className="ml-auto text-xs text-[var(--c-green)] hover:opacity-80 transition"
                >
                  Скачать
                </button>
              </div>
            </div>
          )}

          {/* Step: Upload */}
          {step === "upload" && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-[var(--c-text2)]">Загрузите файл</h3>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16 transition cursor-pointer",
                  dragging
                    ? "border-[var(--c-green)] bg-[var(--c-green-dim)]"
                    : fileName
                    ? "border-[var(--c-green)] bg-[var(--c-green-dim)]"
                    : "border-[var(--c-border2)] bg-[var(--c-bg3)] hover:border-[var(--c-green)] hover:bg-[var(--c-green-dim)]",
                )}
              >
                {fileName ? (
                  <>
                    <FileText size={32} className="text-[var(--c-green)] mb-3" />
                    <p className="text-sm font-medium text-[var(--c-text)]">{fileName}</p>
                    <p className="text-xs text-[var(--c-text3)] mt-1">Файл выбран</p>
                    <button
                      onClick={() => setFileName("")}
                      className="mt-3 text-xs text-[var(--c-red)] hover:opacity-80 transition"
                    >
                      Удалить
                    </button>
                  </>
                ) : (
                  <>
                    <Upload size={32} className="text-[var(--c-text3)] mb-3" />
                    <p className="text-sm text-[var(--c-text2)]">
                      Перетащите файл или{" "}
                      <label className="cursor-pointer text-[var(--c-green)]">
                        выберите
                        <input type="file" className="hidden" accept=".xlsx,.xls,.csv,.xml" onChange={handleFileSelect} />
                      </label>
                    </p>
                    <p className="mt-1 text-xs text-[var(--c-text3)]">XLS, XLSX, CSV, XML до 25 МБ</p>
                  </>
                )}
              </div>

              {source === "1c" && (
                <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] p-4">
                  <p className="text-xs font-medium text-[var(--c-text2)] mb-2">Инструкция для 1С</p>
                  <ol className="space-y-1 text-xs text-[var(--c-text3)] list-decimal list-inside">
                    <li>Откройте 1С → Склад → Товары</li>
                    <li>Нажмите «Сформировать» → «Выгрузить в Excel»</li>
                    <li>Загрузите полученный файл здесь</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Step: Map */}
          {step === "map" && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-[var(--c-text2)]">Сопоставьте колонки файла с полями системы</h3>
              <div className="overflow-x-auto rounded-xl border border-[var(--c-border)]">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="border-b border-[var(--c-border)] bg-[var(--c-bg3)]">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--c-text2)]">Колонка в файле</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--c-text2)]">Поле в системе</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SAMPLE_FIELDS.map((field, i) => (
                      <tr key={field} className="border-b border-[var(--c-border)] last:border-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Table size={13} className="text-[var(--c-text3)]" />
                            <span className="text-[var(--c-text)]">{field}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={mapping[field] ?? SYSTEM_FIELDS[i] ?? ""}
                            onChange={(e) => setMapping((prev) => ({ ...prev, [field]: e.target.value }))}
                            className="h-8 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-2 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
                          >
                            <option value="">— пропустить —</option>
                            {SYSTEM_FIELDS.map((sf) => (
                              <option key={sf} value={sf}>{sf}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-xl border border-[rgba(31,209,131,0.2)] bg-[var(--c-green-dim)] p-4">
                <Check size={16} className="text-[var(--c-green)] shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[var(--c-green)]">Файл готов к импорту</p>
                  <p className="text-xs text-[var(--c-green)] opacity-80">Найдено 16 строк данных. Ошибок не обнаружено.</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-[var(--c-border)]">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b border-[var(--c-border)] bg-[var(--c-bg3)]">
                        <th className="px-4 py-2 text-left text-xs font-medium text-[var(--c-text2)]">Статус</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-[var(--c-text2)]">Название</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-[var(--c-text2)]">SKU</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-[var(--c-text2)]">Цена</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-[var(--c-text2)]">Остаток</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { status: "create", name: "Новый товар A", sku: "NEW-001", price: "1500", stock: "20" },
                        { status: "update", name: "Органайзер для путешествий", sku: "ORG-001", price: "2950", stock: "110" },
                        { status: "create", name: "Новый товар B", sku: "NEW-002", price: "3200", stock: "8" },
                        { status: "error", name: "—", sku: "INVALID", price: "abc", stock: "" },
                      ].map((row, i) => (
                        <tr key={i} className="border-b border-[var(--c-border)] last:border-0">
                          <td className="px-4 py-2.5">
                            <span className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                              row.status === "create" ? "bg-[var(--c-green-dim)] border-[rgba(31,209,131,0.2)] text-[var(--c-green)]" :
                              row.status === "update" ? "bg-[var(--c-blue-dim)] border-[rgba(77,159,255,0.2)] text-[var(--c-blue)]" :
                              "bg-[var(--c-red-dim)] border-[rgba(240,80,80,0.2)] text-[var(--c-red)]",
                            )}>
                              {row.status === "create" ? "Создать" : row.status === "update" ? "Обновить" : "Ошибка"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-sm text-[var(--c-text)]">{row.name}</td>
                          <td className="px-4 py-2.5 text-xs text-[var(--c-text3)]">{row.sku}</td>
                          <td className="px-4 py-2.5 text-right text-sm text-[var(--c-text)] tabular">{row.price}</td>
                          <td className="px-4 py-2.5 text-right text-sm text-[var(--c-text)] tabular">{row.stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-[rgba(245,166,35,0.2)] bg-[var(--c-amber-dim)] p-4">
                <AlertCircle size={15} className="text-[var(--c-amber)] shrink-0" />
                <p className="text-xs text-[var(--c-amber)]">1 строка с ошибкой будет пропущена. Скачайте отчёт для исправления.</p>
              </div>
            </div>
          )}

          {/* Step: Done */}
          {step === "done" && importResult && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--c-green-dim)] text-[var(--c-green)] mb-4">
                <Check size={28} />
              </div>
              <h3 className="text-xl font-bold text-[var(--c-text)]">Импорт завершён!</h3>
              <p className="mt-2 text-sm text-[var(--c-text2)]">Данные успешно загружены в систему</p>

              <div className="mt-6 grid grid-cols-3 gap-3 w-full max-w-sm">
                <div className="rounded-xl bg-[var(--c-green-dim)] border border-[rgba(31,209,131,0.2)] p-4">
                  <p className="text-2xl font-bold text-[var(--c-green)]">{importResult.created}</p>
                  <p className="text-xs text-[var(--c-green)]">Создано</p>
                </div>
                <div className="rounded-xl bg-[var(--c-blue-dim)] border border-[rgba(77,159,255,0.2)] p-4">
                  <p className="text-2xl font-bold text-[var(--c-blue)]">{importResult.updated}</p>
                  <p className="text-xs text-[var(--c-blue)]">Обновлено</p>
                </div>
                <div className="rounded-xl bg-[var(--c-red-dim)] border border-[rgba(240,80,80,0.2)] p-4">
                  <p className="text-2xl font-bold text-[var(--c-red)]">{importResult.errors}</p>
                  <p className="text-xs text-[var(--c-red)]">Ошибок</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--c-border)] bg-[var(--c-bg2)] px-6 py-4">
          {step !== "done" ? (
            <>
              <button
                onClick={() => {
                  const idx = steps.findIndex((s) => s.id === step);
                  if (idx > 0) setStep(steps[idx - 1].id);
                  else onClose();
                }}
                className="flex h-10 items-center gap-2 rounded-lg border border-[var(--c-border2)] px-4 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
              >
                <ChevronLeft size={15} />
                {currentStepIdx === 0 ? "Отмена" : "Назад"}
              </button>

              {step === "preview" ? (
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="flex h-10 items-center gap-2 rounded-lg bg-[var(--c-green)] px-5 text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition disabled:opacity-60"
                >
                  {importing ? (
                    <><RefreshCw size={14} className="animate-spin" /> Импортируется...</>
                  ) : (
                    <><Check size={14} /> Импортировать</>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => {
                    const idx = steps.findIndex((s) => s.id === step);
                    if (idx < steps.length - 1) setStep(steps[idx + 1].id);
                  }}
                  disabled={(step === "source" && !source) || (step === "upload" && !fileName)}
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-semibold transition",
                    (step === "source" && !source) || (step === "upload" && !fileName)
                      ? "bg-[var(--c-bg3)] text-[var(--c-text3)] cursor-not-allowed"
                      : "bg-[var(--c-green)] text-[var(--c-bg)] hover:bg-[#25e890]",
                  )}
                >
                  Далее
                  <ChevronRight size={15} />
                </button>
              )}
            </>
          ) : (
            <button
              onClick={onClose}
              className="ml-auto flex h-10 items-center gap-2 rounded-lg bg-[var(--c-green)] px-5 text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
            >
              <Package size={15} />
              Перейти к товарам
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
