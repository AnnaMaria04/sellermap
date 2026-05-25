"use client";

import { useState } from "react";
import {
  Package,
  RefreshCw,
  Archive,
  ShoppingCart,
  DollarSign,
  History,
  BarChart3,
  TrendingUp,
  Percent,
  Truck,
  Calendar,
  Download,
  Plus,
  Trash2,
  Edit2,
  Clock,
  CheckCircle,
  Filter,
  Star,
  ChevronRight,
  X,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PRODUCTS } from "@/mock/inventory";

type ReportType =
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

type ReportFormat = "excel" | "csv" | "pdf";

interface ReportTemplate {
  id: ReportType;
  name: string;
  description: string;
  icon: string;
  lastGenerated?: string;
  estimatedRows: number;
}

interface ScheduledReport {
  id: string;
  reportType: ReportType;
  name: string;
  frequency: "daily" | "weekly" | "monthly";
  format: ReportFormat;
  recipients: string[];
  nextRun: string;
  isActive: boolean;
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  { id: "stock_balance", name: "Остатки товаров", description: "Текущие остатки по всем локациям и складам", icon: "Package", lastGenerated: "2026-05-24", estimatedRows: PRODUCTS.length },
  { id: "turnover", name: "Оборачиваемость", description: "Скорость реализации товаров за период", icon: "RefreshCw", lastGenerated: "2026-05-23", estimatedRows: PRODUCTS.length },
  { id: "dead_stock", name: "Неликвидные товары", description: "Товары без движения более 60 дней", icon: "Archive", estimatedRows: 12 },
  { id: "reorder", name: "Потребность в закупке", description: "Товары ниже точки перезаказа", icon: "ShoppingCart", lastGenerated: "2026-05-22", estimatedRows: 8 },
  { id: "cost_analysis", name: "Анализ себестоимости", description: "Структура затрат по каждому товару", icon: "DollarSign", estimatedRows: PRODUCTS.length },
  { id: "movement_history", name: "История движений", description: "Все приходы, расходы и перемещения за период", icon: "History", lastGenerated: "2026-05-20", estimatedRows: 340 },
  { id: "abc_analysis", name: "ABC-анализ", description: "Классификация товаров по выручке и прибыли", icon: "BarChart3", lastGenerated: "2026-05-18", estimatedRows: PRODUCTS.length },
  { id: "channel_sales", name: "Продажи по каналам", description: "Выручка и количество по Wildberries, Ozon, сайту", icon: "TrendingUp", estimatedRows: 45 },
  { id: "margin_report", name: "Отчёт по марже", description: "Маржинальность каждого товара и категории", icon: "Percent", lastGenerated: "2026-05-21", estimatedRows: PRODUCTS.length },
  { id: "supplier_performance", name: "Поставщики", description: "Своевременность, качество и статистика поставок", icon: "Truck", estimatedRows: 4 },
];

const MOCK_SCHEDULED: ScheduledReport[] = [
  { id: "sch-1", reportType: "stock_balance", name: "Ежедневные остатки", frequency: "daily", format: "excel", recipients: ["manager@store.ru", "warehouse@store.ru"], nextRun: "2026-05-26 08:00", isActive: true },
  { id: "sch-2", reportType: "turnover", name: "Еженедельная оборачиваемость", frequency: "weekly", format: "pdf", recipients: ["director@store.ru"], nextRun: "2026-05-27 09:00", isActive: true },
  { id: "sch-3", reportType: "abc_analysis", name: "Ежемесячный ABC", frequency: "monthly", format: "excel", recipients: ["analyst@store.ru", "director@store.ru"], nextRun: "2026-06-01 10:00", isActive: false },
];

const RECENT_GENERATED = [
  { name: "Остатки товаров", date: "2026-05-24 14:32", format: "excel", rows: PRODUCTS.length },
  { name: "Оборачиваемость", date: "2026-05-23 11:15", format: "excel", rows: PRODUCTS.length },
  { name: "История движений", date: "2026-05-20 09:45", format: "csv", rows: 340 },
  { name: "ABC-анализ", date: "2026-05-18 16:20", format: "excel", rows: PRODUCTS.length },
  { name: "Отчёт по марже", date: "2026-05-21 13:10", format: "pdf", rows: PRODUCTS.length },
];

const POPULAR_TYPES: ReportType[] = ["stock_balance", "turnover", "abc_analysis"];

const ICON_MAP: Record<string, React.ElementType> = {
  Package, RefreshCw, Archive, ShoppingCart, DollarSign,
  History, BarChart3, TrendingUp, Percent, Truck,
};

const FREQ_LABELS: Record<string, string> = { daily: "Ежедневно", weekly: "Еженедельно", monthly: "Ежемесячно" };
const FORMAT_LABELS: Record<string, string> = { excel: "Excel", csv: "CSV", pdf: "PDF" };
const TYPE_LABELS: Record<ReportType, string> = {
  stock_balance: "Остатки", turnover: "Оборачиваемость", dead_stock: "Неликвид",
  reorder: "Закупка", cost_analysis: "Себестоимость", movement_history: "Движения",
  abc_analysis: "ABC", channel_sales: "Каналы", margin_report: "Маржа", supplier_performance: "Поставщики",
};

export function InventoryReportsPanel() {
  const [filterType, setFilterType] = useState<ReportType | "all">("all");
  const [configReport, setConfigReport] = useState<ReportTemplate | null>(null);
  const [dateFrom, setDateFrom] = useState("2026-05-01");
  const [dateTo, setDateTo] = useState("2026-05-25");
  const [location, setLocation] = useState("all");
  const [category, setCategory] = useState("all");
  const [format, setFormat] = useState<ReportFormat>("excel");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [scheduled, setScheduled] = useState<ScheduledReport[]>(MOCK_SCHEDULED);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editSchedule, setEditSchedule] = useState<ScheduledReport | null>(null);
  const [newSched, setNewSched] = useState({ reportType: "stock_balance" as ReportType, name: "", frequency: "weekly" as "daily" | "weekly" | "monthly", format: "excel" as ReportFormat, recipients: "", startDate: "2026-05-26" });

  const filteredTemplates = REPORT_TEMPLATES.filter(t => filterType === "all" || t.id === filterType);

  function startGenerate() {
    setGenerating(true);
    setProgress(0);
    setDone(false);
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 18 + 8;
      if (p >= 100) {
        clearInterval(iv);
        setProgress(100);
        setGenerating(false);
        setDone(true);
      } else {
        setProgress(Math.round(p));
      }
    }, 220);
  }

  function toggleSchedule(id: string) {
    setScheduled(s => s.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  }

  function deleteSchedule(id: string) {
    setScheduled(s => s.filter(r => r.id !== id));
  }

  function saveSchedule() {
    if (editSchedule) {
      setScheduled(s => s.map(r => r.id === editSchedule.id ? {
        ...r,
        reportType: newSched.reportType,
        name: newSched.name || r.name,
        frequency: newSched.frequency,
        format: newSched.format,
        recipients: newSched.recipients.split(",").map(e => e.trim()).filter(Boolean),
        nextRun: newSched.startDate + " 08:00",
      } : r));
      setEditSchedule(null);
    } else {
      const entry: ScheduledReport = {
        id: "sch-" + Date.now(),
        reportType: newSched.reportType,
        name: newSched.name || TYPE_LABELS[newSched.reportType],
        frequency: newSched.frequency,
        format: newSched.format,
        recipients: newSched.recipients.split(",").map(e => e.trim()).filter(Boolean),
        nextRun: newSched.startDate + " 08:00",
        isActive: true,
      };
      setScheduled(s => [...s, entry]);
    }
    setShowScheduleForm(false);
    setNewSched({ reportType: "stock_balance", name: "", frequency: "weekly", format: "excel", recipients: "", startDate: "2026-05-26" });
  }

  function openEdit(r: ScheduledReport) {
    setEditSchedule(r);
    setNewSched({ reportType: r.reportType, name: r.name, frequency: r.frequency, format: r.format, recipients: r.recipients.join(", "), startDate: r.nextRun.split(" ")[0] });
    setShowScheduleForm(true);
  }

  const IconComp = configReport ? ICON_MAP[configReport.icon] : null;

  return (
    <div style={{ background: "var(--c-bg)", color: "var(--c-text)", minHeight: "100%" }} className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Отчёты и аналитика</h2>
          <p style={{ color: "var(--c-text2)" }} className="text-sm mt-0.5">Формирование и выгрузка отчётов по складу</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as ReportType | "all")}
            style={{ background: "var(--c-bg2)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
            className="rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option value="all">Все типы</option>
            {REPORT_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <Filter size={16} style={{ color: "var(--c-text3)" }} />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Star size={15} style={{ color: "var(--c-amber)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--c-text2)" }}>Популярные отчёты</span>
        </div>
        <div className="flex gap-3">
          {REPORT_TEMPLATES.filter(t => POPULAR_TYPES.includes(t.id)).map(t => {
            const Ic = ICON_MAP[t.icon];
            return (
              <button
                key={t.id}
                onClick={() => { setConfigReport(t); setDone(false); setProgress(0); }}
                style={{ background: "var(--c-bg2)", border: "1px solid var(--c-blue)", color: "var(--c-blue)" }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
              >
                {Ic && <Ic size={15} />}
                {t.name}
                <ChevronRight size={13} />
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--c-text2)" }}>ВСЕ ШАБЛОНЫ ОТЧЁТОВ</h3>
        <div className="grid grid-cols-2 gap-3">
          {filteredTemplates.map(t => {
            const Ic = ICON_MAP[t.icon];
            const isPopular = POPULAR_TYPES.includes(t.id);
            return (
              <div
                key={t.id}
                style={{ background: "var(--c-bg2)", border: `1px solid ${isPopular ? "var(--c-blue)" : "var(--c-border)"}` }}
                className="rounded-xl p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div style={{ background: "var(--c-bg3)", color: "var(--c-blue)" }} className="w-9 h-9 rounded-lg flex items-center justify-center">
                      {Ic && <Ic size={18} />}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{t.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--c-text3)" }}>{t.estimatedRows} строк</div>
                    </div>
                  </div>
                  {isPopular && <Star size={13} style={{ color: "var(--c-amber)" }} />}
                </div>
                <p className="text-xs" style={{ color: "var(--c-text2)" }}>{t.description}</p>
                {t.lastGenerated && (
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--c-text3)" }}>
                    <Clock size={11} />
                    Последний: {t.lastGenerated}
                  </div>
                )}
                <button
                  onClick={() => { setConfigReport(t); setDone(false); setProgress(0); setGenerating(false); }}
                  style={{ background: "var(--c-blue)", color: "#fff" }}
                  className="mt-auto w-full py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  Сформировать
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {configReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
        >
          <div style={{ background: "var(--c-bg2)", border: "1px solid var(--c-border)" }} className="rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--c-border)" }}>
              <div className="flex items-center gap-3">
                <div style={{ background: "var(--c-bg3)", color: "var(--c-blue)" }} className="w-9 h-9 rounded-lg flex items-center justify-center">
                  {IconComp && <IconComp size={18} />}
                </div>
                <div>
                  <div className="font-semibold">{configReport.name}</div>
                  <div className="text-xs" style={{ color: "var(--c-text3)" }}>{configReport.description}</div>
                </div>
              </div>
              <button onClick={() => setConfigReport(null)} style={{ color: "var(--c-text3)" }} className="hover:opacity-70">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text2)" }}>Дата от</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text2)" }}>Дата до</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text2)" }}>Локация</label>
                <select value={location} onChange={e => setLocation(e.target.value)}
                  style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="all">Все локации</option>
                  <option value="loc-warehouse">Основной склад</option>
                  <option value="loc-store">Магазин на Арбате</option>
                  <option value="loc-showroom">Шоурум</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text2)" }}>Категория товаров</label>
                <select value={category} onChange={e => setCategory(e.target.value)}
                  style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="all">Все категории</option>
                  <option value="Аксессуары">Аксессуары</option>
                  <option value="Одежда">Одежда</option>
                  <option value="Кофе">Кофе</option>
                  <option value="Упаковка">Упаковка</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: "var(--c-text2)" }}>Формат</label>
                <div className="flex gap-2">
                  {(["excel", "csv", "pdf"] as ReportFormat[]).map(f => (
                    <button key={f} onClick={() => setFormat(f)}
                      style={{ background: format === f ? "var(--c-blue)" : "var(--c-bg3)", border: "1px solid var(--c-border)", color: format === f ? "#fff" : "var(--c-text2)" }}
                      className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors">
                      {FORMAT_LABELS[f]}
                    </button>
                  ))}
                </div>
              </div>
              {generating && (
                <div>
                  <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--c-text2)" }}>
                    <span>Формирование отчёта...</span>
                    <span>{progress}%</span>
                  </div>
                  <div style={{ background: "var(--c-bg3)" }} className="h-2 rounded-full overflow-hidden">
                    <div style={{ width: `${progress}%`, background: "var(--c-blue)" }} className="h-full rounded-full transition-all duration-200" />
                  </div>
                </div>
              )}
              {done && (
                <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid var(--c-green)" }} className="rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} style={{ color: "var(--c-green)" }} />
                    <span className="text-sm font-medium" style={{ color: "var(--c-green)" }}>Готово — скачать</span>
                  </div>
                  <button style={{ color: "var(--c-blue)" }} className="flex items-center gap-1.5 text-sm hover:opacity-70">
                    <Download size={15} />
                    .{format}
                  </button>
                </div>
              )}
              {!done && !generating && (
                <button onClick={startGenerate}
                  style={{ background: "var(--c-blue)", color: "#fff" }}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                  Генерировать отчёт
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: "var(--c-text2)" }}>ПОСЛЕДНИЕ СФОРМИРОВАННЫЕ ОТЧЁТЫ</h3>
        </div>
        <div style={{ background: "var(--c-bg2)", border: "1px solid var(--c-border)" }} className="rounded-xl overflow-hidden">
          {RECENT_GENERATED.map((r, i) => (
            <div key={i} className={cn("flex items-center justify-between px-4 py-3", i < RECENT_GENERATED.length - 1 && "border-b")}
              style={{ borderColor: "var(--c-border)" }}>
              <div className="flex items-center gap-3">
                <div style={{ background: "var(--c-bg3)", color: "var(--c-text3)" }} className="w-7 h-7 rounded-lg flex items-center justify-center">
                  <Download size={13} />
                </div>
                <div>
                  <div className="text-sm font-medium">{r.name}</div>
                  <div className="text-xs" style={{ color: "var(--c-text3)" }}>{r.date} · {r.rows} строк</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span style={{ background: "var(--c-bg3)", color: "var(--c-text2)" }} className="text-xs px-2 py-0.5 rounded-full uppercase">{r.format}</span>
                <button style={{ color: "var(--c-blue)" }} className="text-xs flex items-center gap-1 hover:opacity-70">
                  <Download size={13} />
                  Скачать
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: "var(--c-text2)" }}>РАСПИСАНИЕ ОТЧЁТОВ</h3>
          <button
            onClick={() => { setShowScheduleForm(true); setEditSchedule(null); setNewSched({ reportType: "stock_balance", name: "", frequency: "weekly", format: "excel", recipients: "", startDate: "2026-05-26" }); }}
            style={{ background: "var(--c-blue)", color: "#fff" }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={14} />
            Добавить в расписание
          </button>
        </div>
        <div style={{ border: "1px solid var(--c-border)" }} className="rounded-xl overflow-hidden">
          <div style={{ background: "var(--c-bg3)", borderBottom: "1px solid var(--c-border)", color: "var(--c-text3)" }} className="grid grid-cols-7 px-4 py-2 text-xs font-medium">
            {["Название", "Тип", "Частота", "Формат", "Получатели", "Следующий запуск", ""].map((h, i) => (
              <div key={i} style={{ color: "var(--c-text3)" }}>{h}</div>
            ))}
          </div>
          {scheduled.map((r, i) => (
            <div key={r.id} className={cn("grid grid-cols-7 items-center px-4 py-3 text-sm", i < scheduled.length - 1 && "border-b")}
              style={{ background: "var(--c-bg2)", borderColor: "var(--c-border)" }}>
              <div className="font-medium truncate pr-2">{r.name}</div>
              <div>
                <span style={{ background: "var(--c-bg3)", color: "var(--c-blue)" }} className="text-xs px-2 py-0.5 rounded-full">{TYPE_LABELS[r.reportType]}</span>
              </div>
              <div style={{ color: "var(--c-text2)" }}>{FREQ_LABELS[r.frequency]}</div>
              <div style={{ color: "var(--c-text2)" }} className="uppercase text-xs">{r.format}</div>
              <div className="flex items-center gap-1 min-w-0">
                <Mail size={11} style={{ color: "var(--c-text3)", flexShrink: 0 }} />
                <span className="text-xs truncate" style={{ color: "var(--c-text2)" }}>{r.recipients.length} адр.</span>
              </div>
              <div style={{ color: "var(--c-text3)" }} className="text-xs">{r.nextRun}</div>
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => toggleSchedule(r.id)}
                  style={{ background: r.isActive ? "var(--c-green)" : "var(--c-bg3)" }}
                  className="w-9 h-5 rounded-full transition-colors relative"
                >
                  <span style={{ background: "#fff", left: r.isActive ? "calc(100% - 18px)" : "2px" }} className="absolute top-0.5 w-4 h-4 rounded-full transition-all" />
                </button>
                <button onClick={() => openEdit(r)} style={{ color: "var(--c-text3)" }} className="hover:opacity-70 p-1">
                  <Edit2 size={13} />
                </button>
                <button onClick={() => deleteSchedule(r.id)} style={{ color: "var(--c-red)" }} className="hover:opacity-70 p-1">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showScheduleForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div style={{ background: "var(--c-bg2)", border: "1px solid var(--c-border)" }} className="rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--c-border)" }}>
              <div className="font-semibold">{editSchedule ? "Редактировать расписание" : "Добавить в расписание"}</div>
              <button onClick={() => { setShowScheduleForm(false); setEditSchedule(null); }} style={{ color: "var(--c-text3)" }} className="hover:opacity-70">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text2)" }}>Тип отчёта</label>
                <select value={newSched.reportType} onChange={e => setNewSched(s => ({ ...s, reportType: e.target.value as ReportType }))}
                  style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none">
                  {REPORT_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text2)" }}>Название</label>
                <input value={newSched.name} onChange={e => setNewSched(s => ({ ...s, name: e.target.value }))} placeholder="Введите название..."
                  style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none placeholder:opacity-40" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text2)" }}>Частота</label>
                  <select value={newSched.frequency} onChange={e => setNewSched(s => ({ ...s, frequency: e.target.value as "daily" | "weekly" | "monthly" }))}
                    style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none">
                    <option value="daily">Ежедневно</option>
                    <option value="weekly">Еженедельно</option>
                    <option value="monthly">Ежемесячно</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text2)" }}>Формат</label>
                  <select value={newSched.format} onChange={e => setNewSched(s => ({ ...s, format: e.target.value as ReportFormat }))}
                    style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none">
                    <option value="excel">Excel</option>
                    <option value="csv">CSV</option>
                    <option value="pdf">PDF</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text2)" }}>Email получателей (через запятую)</label>
                <input value={newSched.recipients} onChange={e => setNewSched(s => ({ ...s, recipients: e.target.value }))} placeholder="email1@store.ru, email2@store.ru"
                  style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none placeholder:opacity-40" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text2)" }}>Начало с</label>
                <input type="date" value={newSched.startDate} onChange={e => setNewSched(s => ({ ...s, startDate: e.target.value }))}
                  style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => { setShowScheduleForm(false); setEditSchedule(null); }}
                  style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)", color: "var(--c-text2)" }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:opacity-80">Отмена</button>
                <button onClick={saveSchedule}
                  style={{ background: "var(--c-blue)", color: "#fff" }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90">
                  {editSchedule ? "Сохранить" : "Добавить"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
