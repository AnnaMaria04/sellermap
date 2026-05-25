"use client";

import { useState } from "react";
import {
  Settings,
  RefreshCw,
  Plus,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  Unplug,
  ChevronRight,
  RotateCcw,
  Eye,
  EyeOff,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type IntegrationStatus = "connected" | "disconnected" | "error" | "syncing";
type SyncDirection = "both" | "import" | "export";

interface IntegrationSync {
  type: "stock" | "prices" | "orders" | "products";
  lastSync?: string;
  nextSync?: string;
  status: "ok" | "error" | "pending";
  errorMessage?: string;
  syncedCount?: number;
}

interface Integration {
  id: string;
  name: string;
  platform: "wildberries" | "ozon" | "yandex_market" | "moysklad" | "1c" | "shopify" | "custom_api";
  status: IntegrationStatus;
  apiKeyMasked?: string;
  warehouseId?: string;
  sellerId?: string;
  syncs: IntegrationSync[];
  syncDirection: SyncDirection;
  autoSync: boolean;
  syncIntervalMinutes: number;
  connectedAt?: string;
  lastActivity?: string;
}

const MOCK_INTEGRATIONS: Integration[] = [
  {
    id: "int-wb",
    name: "Wildberries",
    platform: "wildberries",
    status: "syncing",
    apiKeyMasked: "eyJ0eXAi...Xk4tMA",
    warehouseId: "WB-509438",
    sellerId: "1234567",
    syncs: [
      { type: "stock", lastSync: "2026-05-25 14:22", nextSync: "2026-05-25 15:22", status: "ok", syncedCount: 247 },
      { type: "prices", lastSync: "2026-05-25 14:22", nextSync: "2026-05-25 15:22", status: "ok", syncedCount: 247 },
      { type: "orders", lastSync: "2026-05-25 14:20", status: "ok", syncedCount: 18 },
      { type: "products", lastSync: "2026-05-25 12:00", status: "pending", syncedCount: 247 },
    ],
    syncDirection: "both",
    autoSync: true,
    syncIntervalMinutes: 60,
    connectedAt: "2025-03-15",
    lastActivity: "2 мин назад",
  },
  {
    id: "int-ozon",
    name: "Ozon",
    platform: "ozon",
    status: "connected",
    apiKeyMasked: "Api-Key: 8fa2...d91c",
    warehouseId: "OZ-882211",
    sellerId: "9876543",
    syncs: [
      { type: "stock", lastSync: "2026-05-25 13:45", status: "ok", syncedCount: 189 },
      { type: "prices", lastSync: "2026-05-25 13:45", status: "ok", syncedCount: 189 },
      { type: "orders", lastSync: "2026-05-25 13:40", status: "ok", syncedCount: 7 },
      { type: "products", lastSync: "2026-05-25 11:00", status: "ok", syncedCount: 189 },
    ],
    syncDirection: "both",
    autoSync: true,
    syncIntervalMinutes: 60,
    connectedAt: "2025-04-01",
    lastActivity: "42 мин назад",
  },
  {
    id: "int-ym",
    name: "Яндекс Маркет",
    platform: "yandex_market",
    status: "disconnected",
    syncs: [],
    syncDirection: "both",
    autoSync: false,
    syncIntervalMinutes: 60,
  },
  {
    id: "int-ms",
    name: "МойСклад",
    platform: "moysklad",
    status: "error",
    apiKeyMasked: "Token: c8d2...f44a",
    syncs: [
      { type: "stock", lastSync: "2026-05-25 10:00", status: "error", errorMessage: "Превышен лимит API запросов (429 Too Many Requests). Повторите через 15 мин." },
      { type: "products", lastSync: "2026-05-25 10:00", status: "ok", syncedCount: 94 },
      { type: "orders", lastSync: "2026-05-25 09:55", status: "ok", syncedCount: 12 },
    ],
    syncDirection: "both",
    autoSync: true,
    syncIntervalMinutes: 30,
    connectedAt: "2025-05-10",
    lastActivity: "4 ч назад",
  },
  {
    id: "int-1c",
    name: "1С: Предприятие",
    platform: "1c",
    status: "disconnected",
    syncs: [],
    syncDirection: "import",
    autoSync: false,
    syncIntervalMinutes: 1440,
  },
];

const PLATFORM_CONFIG: Record<string, { label: string; abbr: string; bg: string; color: string }> = {
  wildberries: { label: "Wildberries", abbr: "WB", bg: "#6b21a8", color: "#fff" },
  ozon: { label: "Ozon", abbr: "OZ", bg: "#1d4ed8", color: "#fff" },
  yandex_market: { label: "Яндекс Маркет", abbr: "ЯМ", bg: "#b45309", color: "#fff" },
  moysklad: { label: "МойСклад", abbr: "МС", bg: "#0f766e", color: "#fff" },
  "1c": { label: "1С", abbr: "1С", bg: "#c2410c", color: "#fff" },
  shopify: { label: "Shopify", abbr: "SH", bg: "#166534", color: "#fff" },
  custom_api: { label: "Custom API", abbr: "API", bg: "#374151", color: "#fff" },
};

const SYNC_TYPE_LABELS: Record<string, string> = {
  stock: "Остатки",
  prices: "Цены",
  orders: "Заказы",
  products: "Товары",
};

const INTERVAL_OPTIONS = [
  { value: 15, label: "15 мин" },
  { value: 30, label: "30 мин" },
  { value: 60, label: "1 час" },
  { value: 120, label: "2 часа" },
  { value: 1440, label: "Раз в день" },
];

const DIRECTION_LABELS: Record<SyncDirection, string> = {
  both: "Двусторонняя",
  import: "Только импорт",
  export: "Только экспорт",
};

const SYNC_HISTORY = [
  { time: "2026-05-25 14:22", platform: "Wildberries", type: "Остатки", result: "ok", count: 247 },
  { time: "2026-05-25 14:20", platform: "Wildberries", type: "Заказы", result: "ok", count: 18 },
  { time: "2026-05-25 13:45", platform: "Ozon", type: "Цены", result: "ok", count: 189 },
  { time: "2026-05-25 10:00", platform: "МойСклад", type: "Остатки", result: "error", count: 0 },
  { time: "2026-05-25 09:55", platform: "МойСклад", type: "Заказы", result: "ok", count: 12 },
];

const ALL_PLATFORMS = ["wildberries", "ozon", "yandex_market", "moysklad", "1c", "shopify"] as const;

export function IntegrationHub() {
  const [integrations, setIntegrations] = useState<Integration[]>(MOCK_INTEGRATIONS);
  const [settingsOpen, setSettingsOpen] = useState<Integration | null>(null);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [addPlatform, setAddPlatform] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ apiKey: "", warehouseId: "", sellerId: "", autoSync: true, interval: 60, direction: "both" as SyncDirection });
  const [showApiKey, setShowApiKey] = useState(false);
  const [disconnectConfirm, setDisconnectConfirm] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [editSettings, setEditSettings] = useState({ autoSync: true, interval: 60, direction: "both" as SyncDirection });

  function handleSync(id: string) {
    setSyncing(id);
    setTimeout(() => {
      setSyncing(null);
      setIntegrations(list => list.map(i => i.id === id
        ? { ...i, lastActivity: "только что", syncs: i.syncs.map(s => ({ ...s, status: "ok" as "ok", errorMessage: undefined })) }
        : i));
    }, 2200);
  }

  function openSettings(integration: Integration) {
    setSettingsOpen(integration);
    setEditSettings({ autoSync: integration.autoSync, interval: integration.syncIntervalMinutes, direction: integration.syncDirection });
    setShowApiKey(false);
  }

  function saveSettings() {
    if (!settingsOpen) return;
    setIntegrations(list => list.map(i => i.id === settingsOpen.id
      ? { ...i, autoSync: editSettings.autoSync, syncIntervalMinutes: editSettings.interval, syncDirection: editSettings.direction }
      : i));
    setSettingsOpen(null);
  }

  function disconnect(id: string) {
    setIntegrations(list => list.map(i => i.id === id
      ? { ...i, status: "disconnected", apiKeyMasked: undefined, connectedAt: undefined, lastActivity: undefined, syncs: [] }
      : i));
    setDisconnectConfirm(null);
    setSettingsOpen(null);
  }

  function connectPlatform() {
    if (!addPlatform) return;
    const cfg = PLATFORM_CONFIG[addPlatform];
    const newInt: Integration = {
      id: "int-" + Date.now(),
      name: cfg.label,
      platform: addPlatform as Integration["platform"],
      status: "connected",
      apiKeyMasked: addForm.apiKey.slice(0, 6) + "..." + addForm.apiKey.slice(-4),
      warehouseId: addForm.warehouseId || undefined,
      sellerId: addForm.sellerId || undefined,
      syncs: [
        { type: "stock", status: "pending" },
        { type: "prices", status: "pending" },
        { type: "orders", status: "pending" },
        { type: "products", status: "pending" },
      ],
      syncDirection: addForm.direction,
      autoSync: addForm.autoSync,
      syncIntervalMinutes: addForm.interval,
      connectedAt: "2026-05-25",
      lastActivity: "только что",
    };
    setIntegrations(list => [...list, newInt]);
    setShowAddPicker(false);
    setAddPlatform(null);
    setAddForm({ apiKey: "", warehouseId: "", sellerId: "", autoSync: true, interval: 60, direction: "both" });
  }

  function getStatusDot(status: IntegrationStatus, isSyncing: boolean) {
    if (isSyncing) return <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--c-blue)" }} />;
    if (status === "connected") return <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--c-green)" }} />;
    if (status === "error") return <span className="inline-block w-2 h-2 rounded-full" style={{ background: "var(--c-red)" }} />;
    if (status === "syncing") return <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--c-blue)" }} />;
    return <span className="inline-block w-2 h-2 rounded-full" style={{ background: "var(--c-text3)" }} />;
  }

  function getStatusLabel(status: IntegrationStatus, isSyncing: boolean) {
    if (isSyncing) return "Синхронизация...";
    if (status === "connected" || status === "syncing") return "Подключено";
    if (status === "error") return "Ошибка";
    return "Не подключено";
  }

  function getSyncStatusColor(s: "ok" | "error" | "pending") {
    if (s === "ok") return "var(--c-green)";
    if (s === "error") return "var(--c-red)";
    return "var(--c-text3)";
  }

  const connectedCount = integrations.filter(i => i.status === "connected" || i.status === "syncing" || i.status === "error").length;

  return (
    <div style={{ background: "var(--c-bg)", color: "var(--c-text)", minHeight: "100%" }} className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Хаб интеграций</h2>
          <p style={{ color: "var(--c-text2)" }} className="text-sm mt-0.5">
            {connectedCount} из {integrations.length} платформ подключено
          </p>
        </div>
        <button onClick={() => setShowAddPicker(true)}
          style={{ background: "var(--c-blue)", color: "#fff" }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
          <Plus size={15} />
          Добавить интеграцию
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {integrations.map(integration => {
          const cfg = PLATFORM_CONFIG[integration.platform];
          const isSyncing = syncing === integration.id || integration.status === "syncing";
          const hasError = integration.status === "error";
          return (
            <div key={integration.id}
              style={{ background: "var(--c-bg2)", border: `1px solid ${hasError ? "var(--c-red)" : "var(--c-border)"}` }}
              className="rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div style={{ background: cfg.bg, color: cfg.color }} className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0">
                    {cfg.abbr}
                  </div>
                  <div>
                    <div className="font-semibold">{integration.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {getStatusDot(integration.status, isSyncing)}
                      <span className="text-xs" style={{ color: hasError ? "var(--c-red)" : isSyncing ? "var(--c-blue)" : integration.status === "connected" ? "var(--c-green)" : "var(--c-text3)" }}>
                        {getStatusLabel(integration.status, isSyncing)}
                      </span>
                    </div>
                  </div>
                </div>
                {integration.lastActivity && (
                  <div className="flex items-center gap-1 text-xs" style={{ color: "var(--c-text3)" }}>
                    <Clock size={11} />
                    {integration.lastActivity}
                  </div>
                )}
              </div>

              {integration.syncs.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {integration.syncs.map(s => (
                    <div key={s.type} style={{ background: "var(--c-bg3)" }} className="rounded-lg px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: getSyncStatusColor(s.status) }} />
                        <span className="text-xs" style={{ color: "var(--c-text2)" }}>{SYNC_TYPE_LABELS[s.type]}</span>
                      </div>
                      {s.syncedCount !== undefined && (
                        <span className="text-xs font-medium" style={{ color: "var(--c-text3)" }}>{s.syncedCount}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {integration.status === "disconnected" && (
                <div style={{ background: "var(--c-bg3)", color: "var(--c-text3)" }} className="rounded-xl p-3 text-xs text-center">
                  <span>Не подключено. Нажмите «Настроить» для подключения.</span>
                </div>
              )}

              {hasError && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid var(--c-red)" }} className="rounded-xl p-3 flex items-start gap-2">
                  <AlertTriangle size={14} style={{ color: "var(--c-red)", marginTop: 1, flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium" style={{ color: "var(--c-red)" }}>Ошибка синхронизации</div>
                    <div className="text-xs mt-0.5 truncate" style={{ color: "var(--c-text2)" }}>
                      {integration.syncs.find(s => s.status === "error")?.errorMessage}
                    </div>
                  </div>
                  <button onClick={() => handleSync(integration.id)} style={{ color: "var(--c-red)", flexShrink: 0 }} className="text-xs flex items-center gap-1 hover:opacity-70 whitespace-nowrap">
                    <RotateCcw size={11} />
                    Повторить
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: "var(--c-border)" }}>
                <button onClick={() => openSettings(integration)}
                  style={{ background: "var(--c-bg3)", color: "var(--c-text2)", border: "1px solid var(--c-border)" }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs hover:opacity-80 transition-opacity">
                  <Settings size={12} />
                  Настроить
                </button>
                {(integration.status === "connected" || integration.status === "error" || integration.status === "syncing") && (
                  <button onClick={() => handleSync(integration.id)} disabled={isSyncing}
                    style={{ background: "var(--c-bg3)", color: isSyncing ? "var(--c-text3)" : "var(--c-blue)", border: "1px solid var(--c-border)" }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs hover:opacity-80 transition-opacity disabled:cursor-not-allowed">
                    <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
                    {isSyncing ? "Синхронизация..." : "Синхронизировать"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <div className="text-sm font-semibold mb-3" style={{ color: "var(--c-text2)" }}>ИСТОРИЯ СИНХРОНИЗАЦИЙ</div>
        <div style={{ background: "var(--c-bg2)", border: "1px solid var(--c-border)" }} className="rounded-xl overflow-hidden">
          {SYNC_HISTORY.map((h, i) => (
            <div key={i} className={cn("flex items-center justify-between px-4 py-3 text-sm", i < SYNC_HISTORY.length - 1 && "border-b")}
              style={{ borderColor: "var(--c-border)" }}>
              <div className="flex items-center gap-3">
                <span className={cn("w-2 h-2 rounded-full shrink-0")} style={{ background: h.result === "ok" ? "var(--c-green)" : "var(--c-red)" }} />
                <div>
                  <span className="font-medium text-xs">{h.platform}</span>
                  <span className="text-xs mx-1.5" style={{ color: "var(--c-text3)" }}>·</span>
                  <span className="text-xs" style={{ color: "var(--c-text2)" }}>{h.type}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {h.count > 0 && (
                  <span className="text-xs" style={{ color: "var(--c-text3)" }}>{h.count} записей</span>
                )}
                <span className="text-xs" style={{ color: "var(--c-text3)" }}>{h.time}</span>
                {h.result === "ok"
                  ? <CheckCircle size={13} style={{ color: "var(--c-green)" }} />
                  : <AlertTriangle size={13} style={{ color: "var(--c-red)" }} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="ml-auto w-full max-w-lg h-full overflow-y-auto" style={{ background: "var(--c-bg2)", borderLeft: "1px solid var(--c-border)" }}>
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b" style={{ background: "var(--c-bg2)", borderColor: "var(--c-border)" }}>
              <div className="flex items-center gap-3">
                <div style={{ background: PLATFORM_CONFIG[settingsOpen.platform].bg, color: PLATFORM_CONFIG[settingsOpen.platform].color }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm">
                  {PLATFORM_CONFIG[settingsOpen.platform].abbr}
                </div>
                <div className="font-semibold">{settingsOpen.name}</div>
              </div>
              <button onClick={() => setSettingsOpen(null)} style={{ color: "var(--c-text3)" }} className="hover:opacity-70">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {settingsOpen.apiKeyMasked && (
                <div style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)" }} className="rounded-xl p-4 space-y-3">
                  <div className="text-xs font-semibold" style={{ color: "var(--c-text3)" }}>УЧЁТНЫЕ ДАННЫЕ</div>
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text2)" }}>API-ключ</label>
                    <div className="flex items-center gap-2">
                      <div style={{ background: "var(--c-bg2)", border: "1px solid var(--c-border)", color: "var(--c-text2)" }}
                        className="flex-1 rounded-lg px-3 py-2 text-xs font-mono">
                        {showApiKey ? settingsOpen.apiKeyMasked : "••••••••••••••••"}
                      </div>
                      <button onClick={() => setShowApiKey(v => !v)} style={{ color: "var(--c-text3)" }} className="p-2 hover:opacity-70">
                        {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  {settingsOpen.warehouseId && (
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text2)" }}>ID склада</label>
                      <div style={{ background: "var(--c-bg2)", border: "1px solid var(--c-border)", color: "var(--c-text2)" }}
                        className="rounded-lg px-3 py-2 text-xs font-mono">{settingsOpen.warehouseId}</div>
                    </div>
                  )}
                  {settingsOpen.sellerId && (
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text2)" }}>ID продавца</label>
                      <div style={{ background: "var(--c-bg2)", border: "1px solid var(--c-border)", color: "var(--c-text2)" }}
                        className="rounded-lg px-3 py-2 text-xs font-mono">{settingsOpen.sellerId}</div>
                    </div>
                  )}
                  {settingsOpen.connectedAt && (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--c-text3)" }}>
                      <CheckCircle size={11} style={{ color: "var(--c-green)" }} />
                      Подключено {settingsOpen.connectedAt}
                    </div>
                  )}
                </div>
              )}

              <div style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)" }} className="rounded-xl p-4 space-y-4">
                <div className="text-xs font-semibold" style={{ color: "var(--c-text3)" }}>НАСТРОЙКИ СИНХРОНИЗАЦИИ</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Автосинхронизация</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--c-text3)" }}>Автоматически обновлять данные</div>
                  </div>
                  <button onClick={() => setEditSettings(s => ({ ...s, autoSync: !s.autoSync }))}
                    style={{ background: editSettings.autoSync ? "var(--c-green)" : "var(--c-bg2)", border: "1px solid var(--c-border)" }}
                    className="w-10 h-6 rounded-full transition-colors relative shrink-0">
                    <span style={{ background: "#fff", left: editSettings.autoSync ? "calc(100% - 20px)" : "2px" }} className="absolute top-1 w-4 h-4 rounded-full transition-all" />
                  </button>
                </div>
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: "var(--c-text2)" }}>Интервал синхронизации</label>
                  <div className="flex flex-wrap gap-2">
                    {INTERVAL_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => setEditSettings(s => ({ ...s, interval: opt.value }))}
                        style={{ background: editSettings.interval === opt.value ? "var(--c-blue)" : "var(--c-bg2)", border: "1px solid var(--c-border)", color: editSettings.interval === opt.value ? "#fff" : "var(--c-text2)" }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-colors">
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: "var(--c-text2)" }}>Направление синхронизации</label>
                  <div className="flex gap-2">
                    {(["both", "import", "export"] as SyncDirection[]).map(d => (
                      <button key={d} onClick={() => setEditSettings(s => ({ ...s, direction: d }))}
                        style={{ background: editSettings.direction === d ? "var(--c-blue)" : "var(--c-bg2)", border: "1px solid var(--c-border)", color: editSettings.direction === d ? "#fff" : "var(--c-text2)" }}
                        className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors">
                        {DIRECTION_LABELS[d]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {settingsOpen.syncs.length > 0 && (
                <div style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)" }} className="rounded-xl p-4 space-y-3">
                  <div className="text-xs font-semibold" style={{ color: "var(--c-text3)" }}>ТИПЫ СИНХРОНИЗАЦИИ</div>
                  {settingsOpen.syncs.map(s => (
                    <div key={s.type} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: getSyncStatusColorLocal(s.status) }} />
                        <div>
                          <div className="text-sm">{SYNC_TYPE_LABELS[s.type]}</div>
                          {s.lastSync && (
                            <div className="text-xs" style={{ color: "var(--c-text3)" }}>
                              {s.syncedCount !== undefined ? `${s.syncedCount} синхронизировано, ` : ""}{s.lastSync}
                            </div>
                          )}
                          {s.status === "error" && s.errorMessage && (
                            <div className="text-xs mt-0.5" style={{ color: "var(--c-red)" }}>{s.errorMessage}</div>
                          )}
                        </div>
                      </div>
                      <span className="text-xs" style={{ color: s.status === "ok" ? "var(--c-green)" : s.status === "error" ? "var(--c-red)" : "var(--c-text3)" }}>
                        {s.status === "ok" ? "ОК" : s.status === "error" ? "Ошибка" : "Ожидание"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={saveSettings}
                  style={{ background: "var(--c-blue)", color: "#fff" }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90">
                  Сохранить настройки
                </button>
              </div>

              {(settingsOpen.status === "connected" || settingsOpen.status === "error" || settingsOpen.status === "syncing") && (
                <div className="pt-2 border-t" style={{ borderColor: "var(--c-border)" }}>
                  <button onClick={() => setDisconnectConfirm(settingsOpen.id)}
                    style={{ color: "var(--c-red)" }}
                    className="flex items-center gap-2 text-sm hover:opacity-70 transition-opacity">
                    <Unplug size={14} />
                    Отключить интеграцию
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {disconnectConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div style={{ background: "var(--c-bg2)", border: "1px solid var(--c-border)" }} className="rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div style={{ background: "rgba(239,68,68,0.1)", color: "var(--c-red)" }} className="w-10 h-10 rounded-full flex items-center justify-center">
                <Unplug size={18} />
              </div>
              <div>
                <div className="font-semibold">Отключить интеграцию?</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--c-text2)" }}>Данные и настройки будут удалены</div>
              </div>
            </div>
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--c-text2)" }} className="rounded-xl p-3 text-xs">
              <span>После отключения синхронизация остановится. Повторное подключение потребует ввода API-ключа.</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDisconnectConfirm(null)}
                style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)", color: "var(--c-text2)" }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:opacity-80">Отмена</button>
              <button onClick={() => disconnect(disconnectConfirm)}
                style={{ background: "var(--c-red)", color: "#fff" }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90">
                Отключить
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div style={{ background: "var(--c-bg2)", border: "1px solid var(--c-border)" }} className="rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--c-border)" }}>
              <div className="font-semibold">{addPlatform ? `Подключить ${PLATFORM_CONFIG[addPlatform].label}` : "Выбрать платформу"}</div>
              <button onClick={() => { setShowAddPicker(false); setAddPlatform(null); }} style={{ color: "var(--c-text3)" }} className="hover:opacity-70">
                <X size={18} />
              </button>
            </div>

            {!addPlatform ? (
              <div className="p-5 grid grid-cols-3 gap-3">
                {ALL_PLATFORMS.map(p => {
                  const cfg = PLATFORM_CONFIG[p];
                  const already = integrations.some(i => i.platform === p && i.status !== "disconnected");
                  return (
                    <button key={p} onClick={() => !already && setAddPlatform(p)} disabled={already}
                      style={{ background: "var(--c-bg3)", border: `1px solid ${already ? "var(--c-border)" : "var(--c-border)"}`, opacity: already ? 0.4 : 1 }}
                      className="flex flex-col items-center gap-3 p-4 rounded-xl hover:border-blue-500 transition-colors disabled:cursor-not-allowed">
                      <div style={{ background: cfg.bg, color: cfg.color }} className="w-12 h-12 rounded-xl flex items-center justify-center font-bold">
                        {cfg.abbr}
                      </div>
                      <div className="text-xs font-medium text-center">{cfg.label}</div>
                      {already && <div className="text-xs" style={{ color: "var(--c-green)" }}>Подключено</div>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text2)" }}>API-ключ</label>
                  <input value={addForm.apiKey} onChange={e => setAddForm(f => ({ ...f, apiKey: e.target.value }))} placeholder="Введите API-ключ..."
                    style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none font-mono placeholder:font-sans placeholder:opacity-40" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text2)" }}>ID склада</label>
                    <input value={addForm.warehouseId} onChange={e => setAddForm(f => ({ ...f, warehouseId: e.target.value }))} placeholder="Необязательно"
                      style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                      className="w-full rounded-lg px-3 py-2 text-sm outline-none placeholder:opacity-40" />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text2)" }}>ID продавца</label>
                    <input value={addForm.sellerId} onChange={e => setAddForm(f => ({ ...f, sellerId: e.target.value }))} placeholder="Необязательно"
                      style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                      className="w-full rounded-lg px-3 py-2 text-sm outline-none placeholder:opacity-40" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Автосинхронизация</div>
                    <div className="text-xs" style={{ color: "var(--c-text3)" }}>Автоматически обновлять остатки и цены</div>
                  </div>
                  <button onClick={() => setAddForm(f => ({ ...f, autoSync: !f.autoSync }))}
                    style={{ background: addForm.autoSync ? "var(--c-green)" : "var(--c-bg3)", border: "1px solid var(--c-border)" }}
                    className="w-10 h-6 rounded-full transition-colors relative">
                    <span style={{ background: "#fff", left: addForm.autoSync ? "calc(100% - 20px)" : "2px" }} className="absolute top-1 w-4 h-4 rounded-full transition-all" />
                  </button>
                </div>
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: "var(--c-text2)" }}>Направление</label>
                  <div className="flex gap-2">
                    {(["both", "import", "export"] as SyncDirection[]).map(d => (
                      <button key={d} onClick={() => setAddForm(f => ({ ...f, direction: d }))}
                        style={{ background: addForm.direction === d ? "var(--c-blue)" : "var(--c-bg3)", border: "1px solid var(--c-border)", color: addForm.direction === d ? "#fff" : "var(--c-text2)" }}
                        className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors">
                        {DIRECTION_LABELS[d]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setAddPlatform(null)}
                    style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)", color: "var(--c-text2)" }}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-80">
                    Назад
                  </button>
                  <button onClick={connectPlatform} disabled={!addForm.apiKey}
                    style={{ background: addForm.apiKey ? "var(--c-blue)" : "var(--c-bg3)", color: addForm.apiKey ? "#fff" : "var(--c-text3)" }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    <Zap size={14} />
                    Подключить
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getSyncStatusColorLocal(s: "ok" | "error" | "pending") {
  if (s === "ok") return "var(--c-green)";
  if (s === "error") return "var(--c-red)";
  return "var(--c-text3)";
}
