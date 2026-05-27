"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  RefreshCw,
  Plus,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  Unplug,
  Eye,
  EyeOff,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AVAILABLE_ADAPTERS, getAdapter } from "@/lib/integrations/registry";
import {
  type ChannelAdapter,
  type ChannelKind,
  type Connection,
  type RawExternalProduct,
  type SyncLogEntry,
} from "@/lib/integrations/types";
import { useInventory } from "@/contexts/InventoryContext";
import { type Product, type SalesChannel, type Order } from "@/mock/inventory";
import { createClient } from "@/lib/supabase/client";
import {
  loadIntegrations,
  saveIntegration,
  updateIntegrationSync,
  deleteIntegration,
  type PersistedIntegration,
} from "@/lib/supabase/integrations-store";

type IntegrationStatus = "connected" | "disconnected" | "error" | "syncing";

/** Returns a human-readable relative time string in Russian. */
function relativeTime(isoOrStamp: string): string {
  const now = Date.now();
  // Support both ISO ("2024-01-01T12:00:00.000Z") and short stamps ("2024-01-01 12:00")
  const parsed = isoOrStamp.includes("T") ? isoOrStamp : isoOrStamp.replace(" ", "T");
  const then = new Date(parsed).getTime();
  if (isNaN(then)) return isoOrStamp;
  const diffMin = Math.round((now - then) / 60_000);
  if (diffMin < 1) return "только что";
  if (diffMin < 60) return `${diffMin} мин. назад`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH} ч. назад`;
  const diffD = Math.round(diffH / 24);
  return `${diffD} дн. назад`;
}

/** Returns last 4 chars of a credential value, masked as ****xxxx. */
function maskCredential(value: string): string {
  if (!value || value.length < 4) return "••••";
  return `••••${value.slice(-4)}`;
}

/** A live, in-component representation of an established connection. */
interface ConnectedIntegration {
  id: string;
  kind: ChannelKind;
  name: string;
  status: IntegrationStatus;
  /** Credentials live in component state only — never logged or persisted. */
  credentials: Record<string, string>;
  autoSync: boolean;
  intervalMinutes: number;
  connectedAt?: string;
  lastSync?: string;
  log: SyncLogEntry[];
}

/** Visual identity per channel — abbreviation + brand colors. */
const PLATFORM_VISUAL: Record<ChannelKind, { abbr: string; bg: string; color: string }> = {
  wildberries: { abbr: "WB", bg: "#6b21a8", color: "#fff" },
  ozon: { abbr: "OZ", bg: "#1d4ed8", color: "#fff" },
  yandex_market: { abbr: "ЯМ", bg: "#b45309", color: "#fff" },
  moysklad: { abbr: "МС", bg: "#0f766e", color: "#fff" },
  "1c": { abbr: "1С", bg: "#c2410c", color: "#fff" },
  cdek: { abbr: "СД", bg: "#166534", color: "#fff" },
  yookassa: { abbr: "ЮK", bg: "#374151", color: "#fff" },
};

const ENTITY_LABELS: Record<string, string> = {
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

function visual(kind: ChannelKind) {
  return PLATFORM_VISUAL[kind] ?? { abbr: "??", bg: "#374151", color: "#fff" };
}

function nowStamp(): string {
  return new Date().toISOString().slice(0, 16).replace("T", " ");
}

/** Map a marketplace channel kind to an internal SalesChannel where possible. */
function channelForKind(kind: ChannelKind): SalesChannel[] {
  if (kind === "wildberries" || kind === "ozon" || kind === "yandex_market") return [kind];
  return [];
}

/** Build a minimal-but-valid Product from a pulled external product. */
function toProduct(raw: RawExternalProduct, kind: ChannelKind): Product {
  const today = new Date().toISOString().split("T")[0];
  const stock = raw.stock ?? 0;
  return {
    id: `imp-${kind}-${raw.externalId}`,
    name: raw.name,
    category: "Импорт",
    productType: "product",
    status: "active",
    sku: raw.sku ?? raw.externalId,
    barcode: raw.barcode,
    hasVariants: false,
    variants: [],
    price: raw.price ?? 0,
    costPrice: 0,
    channels: channelForKind(kind),
    tags: ["импорт", kind],
    requiresLabeling: false,
    createdAt: today,
    updatedAt: today,
    stockByLocation: stock > 0 ? { "loc-main": stock } : {},
    reservedUnits: 0,
    damagedUnits: 0,
    inTransitUnits: 0,
    totalPhysical: stock,
  };
}

/** Convert component-local ConnectedIntegration to the DB-persisted shape. */
function toPersistedIntegration(ci: ConnectedIntegration): PersistedIntegration {
  return {
    id: ci.id,
    kind: ci.kind,
    name: ci.name,
    credentials: ci.credentials,
    autoSync: ci.autoSync,
    intervalMinutes: ci.intervalMinutes,
    connectedAt: ci.connectedAt ?? new Date().toISOString(),
    lastSyncAt: ci.lastSync,
    status: ci.status,
  };
}

/** Rehydrate a PersistedIntegration back into a ConnectedIntegration. */
function fromPersistedIntegration(pi: PersistedIntegration): ConnectedIntegration {
  return {
    id: pi.id,
    kind: pi.kind,
    name: pi.name,
    status: pi.status as ConnectedIntegration["status"],
    credentials: pi.credentials,
    autoSync: pi.autoSync,
    intervalMinutes: pi.intervalMinutes,
    connectedAt: pi.connectedAt,
    lastSync: pi.lastSyncAt,
    log: [],
  };
}

export function IntegrationHub() {
  const { products, actions } = useInventory();

  const [integrations, setIntegrations] = useState<ConnectedIntegration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState<ConnectedIntegration | null>(null);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [addKind, setAddKind] = useState<ChannelKind | null>(null);
  const [credInput, setCredInput] = useState<Record<string, string>>({});
  const [addAutoSync, setAddAutoSync] = useState(true);
  const [addInterval, setAddInterval] = useState(60);
  const [revealCred, setRevealCred] = useState<Record<string, boolean>>({});
  const [testResult, setTestResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [disconnectConfirm, setDisconnectConfirm] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [editSettings, setEditSettings] = useState({ autoSync: true, interval: 60 });

  const selectedAdapter: ChannelAdapter | undefined = addKind ? getAdapter(addKind) : undefined;

  // Load persisted integrations on mount
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id;
      if (!userId) {
        setIsLoading(false);
        return;
      }
      loadIntegrations(supabase, userId)
        .then((rows) => {
          setIntegrations(rows.map(fromPersistedIntegration));
        })
        .catch(() => {/* silently ignore — works offline */})
        .finally(() => setIsLoading(false));
    }).catch(() => setIsLoading(false));
  }, []);

  function resetAddForm() {
    setAddKind(null);
    setCredInput({});
    setRevealCred({});
    setAddAutoSync(true);
    setAddInterval(60);
    setTestResult(null);
    setTesting(false);
  }

  /** Build a Connection from the current add form. */
  function buildConnection(kind: ChannelKind, credentials: Record<string, string>): Connection {
    return { kind, credentials, autoSync: addAutoSync, intervalMinutes: addInterval };
  }

  async function handleConnect() {
    if (!selectedAdapter || !addKind) return;
    const conn = buildConnection(addKind, credInput);
    setTesting(true);
    setTestResult(null);
    const result = await selectedAdapter.testConnection(conn);
    setTesting(false);
    setTestResult(result);
    if (!result.ok) return;

    const newInt: ConnectedIntegration = {
      id: `int-${addKind}-${Date.now()}`,
      kind: addKind,
      name: selectedAdapter.meta.name,
      status: "connected",
      credentials: { ...credInput },
      autoSync: addAutoSync,
      intervalMinutes: addInterval,
      connectedAt: new Date().toISOString().split("T")[0],
      log: [],
    };
    setIntegrations((list) => [...list, newInt]);
    setShowAddPicker(false);
    resetAddForm();

    // Persist to Supabase (fire-and-forget — in-memory state is already updated)
    const supabase = createClient();
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        const userId = data.user?.id;
        if (!userId) return;
        saveIntegration(supabase, userId, toPersistedIntegration(newInt)).catch(() => {});
      });
    }

    // Immediately pull products so connecting actually imports data (one step).
    void runSync(newInt);
  }

  async function handleSync(id: string) {
    const integration = integrations.find((i) => i.id === id);
    if (integration) await runSync(integration);
  }

  /** Pull products through the adapter and upsert them into inventory by SKU. */
  async function runSync(integration: ConnectedIntegration) {
    const adapter = getAdapter(integration.kind);
    if (!adapter) return;
    const id = integration.id;

    setSyncing(id);
    setIntegrations((list) => list.map((i) => (i.id === id ? { ...i, status: "syncing" } : i)));

    const conn = buildConnection(integration.kind, integration.credentials);
    const result = await adapter.pullProducts(conn);

    let imported = 0;
    if (result.ok && result.products) {
      for (const raw of result.products) {
        const sku = raw.sku ?? raw.externalId;
        const existing = products.find((p) => p.sku === sku);
        if (existing) {
          const patch: Partial<Product> = {};
          if (raw.price !== undefined) patch.price = raw.price;
          if (raw.stock !== undefined) {
            const byLoc = { ...existing.stockByLocation, "loc-main": raw.stock };
            patch.stockByLocation = byLoc;
            patch.totalPhysical = Object.values(byLoc).reduce((s, v) => s + v, 0);
          }
          if (Object.keys(patch).length > 0) actions.updateProduct(existing.id, patch);
        } else {
          actions.addProduct(toProduct(raw, integration.kind));
        }
        imported++;
      }
    }

    // Also pull orders/sales (e.g. WB Statistics) so revenue/P&L are real.
    if (adapter.pullOrders) {
      try {
        const ores = await adapter.pullOrders(conn);
        if (ores.ok && ores.orders?.length) {
          actions.importOrders(ores.orders as Order[]);
          imported += ores.orders.length;
        }
      } catch {
        // non-fatal — products already imported
      }
    }

    const entry: SyncLogEntry = {
      at: nowStamp(),
      entity: result.entity,
      status: result.ok ? "ok" : "error",
      count: imported,
      message: result.message,
    };

    const syncedAt = nowStamp();
    const newStatus: ConnectedIntegration["status"] = result.ok ? "connected" : "error";

    setSyncing(null);
    setIntegrations((list) =>
      list.map((i) =>
        i.id === id
          ? {
              ...i,
              status: newStatus,
              lastSync: syncedAt,
              log: [entry, ...i.log].slice(0, 20),
            }
          : i,
      ),
    );

    // Persist sync result to Supabase
    const supabase = createClient();
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        const userId = data.user?.id;
        if (!userId) return;
        updateIntegrationSync(supabase, id, userId, syncedAt, newStatus).catch(() => {});
      });
    }
  }

  function openSettings(integration: ConnectedIntegration) {
    setSettingsOpen(integration);
    setEditSettings({ autoSync: integration.autoSync, interval: integration.intervalMinutes });
    setRevealCred({});
  }

  function saveSettings() {
    if (!settingsOpen) return;
    const updated: ConnectedIntegration = {
      ...settingsOpen,
      autoSync: editSettings.autoSync,
      intervalMinutes: editSettings.interval,
    };
    setIntegrations((list) =>
      list.map((i) => (i.id === settingsOpen.id ? updated : i)),
    );
    setSettingsOpen(null);

    // Persist updated settings to Supabase
    const supabase = createClient();
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        const userId = data.user?.id;
        if (!userId) return;
        saveIntegration(supabase, userId, toPersistedIntegration(updated)).catch(() => {});
      });
    }
  }

  function disconnect(id: string) {
    setIntegrations((list) => list.filter((i) => i.id !== id));
    setDisconnectConfirm(null);
    setSettingsOpen(null);

    // Remove from Supabase (fire-and-forget)
    const supabase = createClient();
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        const userId = data.user?.id;
        if (!userId) return;
        deleteIntegration(supabase, id, userId).catch(() => {});
      });
    }
  }

  function getStatusLabel(status: IntegrationStatus, isSyncing: boolean) {
    if (isSyncing || status === "syncing") return "Синхронизация...";
    if (status === "connected") return "Подключено";
    if (status === "error") return "Ошибка";
    return "Не подключено";
  }

  // Aggregate every log entry across connected integrations for the history feed.
  const history = integrations
    .flatMap((i) => i.log.map((l) => ({ ...l, platform: i.name })))
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 12);

  return (
    <div style={{ background: "var(--c-bg)", color: "var(--c-text)", minHeight: "100%" }} className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Хаб интеграций</h2>
          <p style={{ color: "var(--c-text2)" }} className="text-sm mt-0.5">
            {isLoading ? "Загрузка..." : `${integrations.length} из ${AVAILABLE_ADAPTERS.length} платформ подключено`}
          </p>
        </div>
        <button onClick={() => setShowAddPicker(true)}
          style={{ background: "var(--c-blue)", color: "#fff" }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
          <Plus size={15} />
          Добавить интеграцию
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ background: "var(--c-bg2)", border: "1px solid var(--c-border)" }}
              className="rounded-2xl p-5 flex flex-col gap-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div style={{ background: "var(--c-bg3)" }} className="w-11 h-11 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div style={{ background: "var(--c-bg3)" }} className="h-4 rounded w-32" />
                  <div style={{ background: "var(--c-bg3)" }} className="h-3 rounded w-20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div style={{ background: "var(--c-bg3)" }} className="h-8 rounded-lg" />
                <div style={{ background: "var(--c-bg3)" }} className="h-8 rounded-lg" />
              </div>
              <div className="flex gap-2 pt-1 border-t" style={{ borderColor: "var(--c-border)" }}>
                <div style={{ background: "var(--c-bg3)" }} className="h-7 rounded-lg w-24" />
                <div style={{ background: "var(--c-bg3)" }} className="h-7 rounded-lg w-40" />
              </div>
            </div>
          ))}
        </div>
      ) : integrations.length === 0 ? (
        <div style={{ background: "var(--c-bg2)", border: "1px dashed var(--c-border)", color: "var(--c-text3)" }}
          className="rounded-2xl p-10 text-center text-sm">
          Нет подключённых интеграций. Нажмите «Добавить интеграцию», чтобы подключить маркетплейс.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {integrations.map((integration) => {
            const cfg = visual(integration.kind);
            const isSyncing = syncing === integration.id || integration.status === "syncing";
            const hasError = integration.status === "error";
            const adapter = getAdapter(integration.kind);
            const lastEntry = integration.log[0];

            // Health dot color: blue=syncing, red=error, amber=stale (>24h or no sync), green=healthy
            const healthColor = isSyncing
              ? "var(--c-blue)"
              : hasError
              ? "var(--c-red)"
              : integration.status === "connected"
              ? (() => {
                  if (!integration.lastSync) return "var(--c-amber)";
                  const stamp = integration.lastSync.includes("T")
                    ? integration.lastSync
                    : integration.lastSync.replace(" ", "T");
                  const diffH = (Date.now() - new Date(stamp).getTime()) / 3_600_000;
                  return diffH > 24 ? "var(--c-amber)" : "var(--c-green)";
                })()
              : "var(--c-text3)";

            // Pick first password field to preview (masked)
            const previewField = adapter?.meta.credentialFields.find((f) => f.type === "password");
            const previewValue = previewField ? integration.credentials[previewField.key] : undefined;

            return (
              <div key={integration.id}
                style={{ background: "var(--c-bg2)", border: `1px solid ${hasError ? "var(--c-red)" : "var(--c-border)"}` }}
                className="rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* Platform badge with health indicator dot */}
                    <div className="relative shrink-0">
                      <div style={{ background: cfg.bg, color: cfg.color }}
                        className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm">
                        {cfg.abbr}
                      </div>
                      <span
                        className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2", isSyncing && "animate-pulse")}
                        style={{ background: healthColor, borderColor: "var(--c-bg2)" }}
                      />
                    </div>
                    <div>
                      <div className="font-semibold">{integration.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs" style={{
                          color: hasError ? "var(--c-red)"
                            : isSyncing ? "var(--c-blue)"
                            : integration.status === "connected" ? "var(--c-green)"
                            : "var(--c-text3)",
                        }}>
                          {getStatusLabel(integration.status, isSyncing)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Relative last-sync timestamp */}
                  {integration.lastSync && (
                    <div className="flex items-center gap-1 text-xs shrink-0" style={{ color: "var(--c-text3)" }}>
                      <Clock size={11} />
                      {relativeTime(integration.lastSync)}
                    </div>
                  )}
                </div>

                {/* Masked credential preview */}
                {previewValue && (
                  <div style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)" }}
                    className="rounded-lg px-3 py-1.5 flex items-center justify-between gap-2">
                    <span className="text-xs truncate" style={{ color: "var(--c-text3)" }}>
                      {previewField?.label ?? "API-ключ"}
                    </span>
                    <span className="text-xs font-mono shrink-0" style={{ color: "var(--c-text2)" }}>
                      {maskCredential(previewValue)}
                    </span>
                  </div>
                )}

                {adapter && (
                  <div className="grid grid-cols-2 gap-2">
                    {adapter.meta.capabilities.map((cap) => (
                      <div key={cap} style={{ background: "var(--c-bg3)" }} className="rounded-lg px-3 py-2 flex items-center justify-between">
                        <span className="text-xs" style={{ color: "var(--c-text2)" }}>{ENTITY_LABELS[cap] ?? cap}</span>
                      </div>
                    ))}
                  </div>
                )}

                {hasError && lastEntry && (
                  <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid var(--c-red)" }} className="rounded-xl p-3 flex items-start gap-2">
                    <AlertTriangle size={14} style={{ color: "var(--c-red)", marginTop: 1, flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium" style={{ color: "var(--c-red)" }}>Ошибка синхронизации</div>
                      <div className="text-xs mt-0.5 truncate" style={{ color: "var(--c-text2)" }}>
                        {lastEntry.message ?? "Не удалось получить данные"}
                      </div>
                    </div>
                  </div>
                )}

                {lastEntry && !hasError && (
                  <div className="text-xs" style={{ color: "var(--c-text3)" }}>
                    Синхронизировано {relativeTime(lastEntry.at)} · {ENTITY_LABELS[lastEntry.entity] ?? lastEntry.entity} · {lastEntry.count} записей
                  </div>
                )}

                {!lastEntry && integration.lastSync && !hasError && (
                  <div className="text-xs" style={{ color: "var(--c-text3)" }}>
                    Синхронизировано {relativeTime(integration.lastSync)}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: "var(--c-border)" }}>
                  <button onClick={() => openSettings(integration)}
                    style={{ background: "var(--c-bg3)", color: "var(--c-text2)", border: "1px solid var(--c-border)" }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs hover:opacity-80 transition-opacity">
                    <Settings size={12} />
                    Настроить
                  </button>
                  <button onClick={() => handleSync(integration.id)} disabled={isSyncing}
                    style={{
                      background: isSyncing ? "var(--c-bg3)" : "rgba(59,130,246,0.1)",
                      color: isSyncing ? "var(--c-text3)" : "var(--c-blue)",
                      border: `1px solid ${isSyncing ? "var(--c-border)" : "rgba(59,130,246,0.25)"}`,
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity disabled:cursor-not-allowed">
                    <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
                    {isSyncing ? "Синхронизация..." : "Синхронизировать сейчас"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div>
        <div className="text-sm font-semibold mb-3" style={{ color: "var(--c-text2)" }}>ИСТОРИЯ СИНХРОНИЗАЦИЙ</div>
        <div style={{ background: "var(--c-bg2)", border: "1px solid var(--c-border)" }} className="rounded-xl overflow-hidden">
          {history.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs" style={{ color: "var(--c-text3)" }}>
              Пока нет синхронизаций.
            </div>
          ) : (
            history.map((h, i) => (
              <div key={i} className={cn("flex items-center justify-between px-4 py-3 text-sm", i < history.length - 1 && "border-b")}
                style={{ borderColor: "var(--c-border)" }}>
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: h.status === "ok" ? "var(--c-green)" : "var(--c-red)" }} />
                  <div>
                    <span className="font-medium text-xs">{h.platform}</span>
                    <span className="text-xs mx-1.5" style={{ color: "var(--c-text3)" }}>·</span>
                    <span className="text-xs" style={{ color: "var(--c-text2)" }}>{ENTITY_LABELS[h.entity] ?? h.entity}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {h.count > 0 && (
                    <span className="text-xs" style={{ color: "var(--c-text3)" }}>{h.count} записей</span>
                  )}
                  <span className="text-xs" style={{ color: "var(--c-text3)" }}>{h.at}</span>
                  {h.status === "ok"
                    ? <CheckCircle size={13} style={{ color: "var(--c-green)" }} />
                    : <AlertTriangle size={13} style={{ color: "var(--c-red)" }} />}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="ml-auto w-full max-w-lg h-full overflow-y-auto" style={{ background: "var(--c-bg2)", borderLeft: "1px solid var(--c-border)" }}>
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b" style={{ background: "var(--c-bg2)", borderColor: "var(--c-border)" }}>
              <div className="flex items-center gap-3">
                <div style={{ background: visual(settingsOpen.kind).bg, color: visual(settingsOpen.kind).color }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm">
                  {visual(settingsOpen.kind).abbr}
                </div>
                <div className="font-semibold">{settingsOpen.name}</div>
              </div>
              <button onClick={() => setSettingsOpen(null)} style={{ color: "var(--c-text3)" }} className="hover:opacity-70">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)" }} className="rounded-xl p-4 space-y-3">
                <div className="text-xs font-semibold" style={{ color: "var(--c-text3)" }}>УЧЁТНЫЕ ДАННЫЕ</div>
                {getAdapter(settingsOpen.kind)?.meta.credentialFields.map((field) => (
                  <div key={field.key}>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text2)" }}>{field.label}</label>
                    <div className="flex items-center gap-2">
                      <div style={{ background: "var(--c-bg2)", border: "1px solid var(--c-border)", color: "var(--c-text2)" }}
                        className="flex-1 rounded-lg px-3 py-2 text-xs font-mono truncate">
                        {revealCred[field.key] ? (settingsOpen.credentials[field.key] || "—") : "••••••••••••••••"}
                      </div>
                      <button onClick={() => setRevealCred((r) => ({ ...r, [field.key]: !r[field.key] }))} style={{ color: "var(--c-text3)" }} className="p-2 hover:opacity-70">
                        {revealCred[field.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                ))}
                {settingsOpen.connectedAt && (
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--c-text3)" }}>
                    <CheckCircle size={11} style={{ color: "var(--c-green)" }} />
                    Подключено {settingsOpen.connectedAt}
                  </div>
                )}
              </div>

              <div style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)" }} className="rounded-xl p-4 space-y-4">
                <div className="text-xs font-semibold" style={{ color: "var(--c-text3)" }}>НАСТРОЙКИ СИНХРОНИЗАЦИИ</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Автосинхронизация</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--c-text3)" }}>Автоматически обновлять данные</div>
                  </div>
                  <button onClick={() => setEditSettings((s) => ({ ...s, autoSync: !s.autoSync }))}
                    style={{ background: editSettings.autoSync ? "var(--c-green)" : "var(--c-bg2)", border: "1px solid var(--c-border)" }}
                    className="w-10 h-6 rounded-full transition-colors relative shrink-0">
                    <span style={{ background: "#fff", left: editSettings.autoSync ? "calc(100% - 20px)" : "2px" }} className="absolute top-1 w-4 h-4 rounded-full transition-all" />
                  </button>
                </div>
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: "var(--c-text2)" }}>Интервал синхронизации</label>
                  <div className="flex flex-wrap gap-2">
                    {INTERVAL_OPTIONS.map((opt) => (
                      <button key={opt.value} onClick={() => setEditSettings((s) => ({ ...s, interval: opt.value }))}
                        style={{ background: editSettings.interval === opt.value ? "var(--c-blue)" : "var(--c-bg2)", border: "1px solid var(--c-border)", color: editSettings.interval === opt.value ? "#fff" : "var(--c-text2)" }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-colors">
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {settingsOpen.log.length > 0 && (
                <div style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)" }} className="rounded-xl p-4 space-y-3">
                  <div className="text-xs font-semibold" style={{ color: "var(--c-text3)" }}>ЖУРНАЛ СИНХРОНИЗАЦИЙ</div>
                  {settingsOpen.log.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: entry.status === "ok" ? "var(--c-green)" : "var(--c-red)" }} />
                        <div>
                          <div className="text-sm">{ENTITY_LABELS[entry.entity] ?? entry.entity}</div>
                          <div className="text-xs" style={{ color: "var(--c-text3)" }}>
                            {entry.count} записей · {entry.at}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs" style={{ color: entry.status === "ok" ? "var(--c-green)" : "var(--c-red)" }}>
                        {entry.status === "ok" ? "ОК" : "Ошибка"}
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

              <div className="pt-2 border-t" style={{ borderColor: "var(--c-border)" }}>
                <button onClick={() => setDisconnectConfirm(settingsOpen.id)}
                  style={{ color: "var(--c-red)" }}
                  className="flex items-center gap-2 text-sm hover:opacity-70 transition-opacity">
                  <Unplug size={14} />
                  Отключить интеграцию
                </button>
              </div>
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
              <span>После отключения синхронизация остановится. Повторное подключение потребует ввода учётных данных.</span>
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
          <div style={{ background: "var(--c-bg2)", border: "1px solid var(--c-border)" }} className="rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--c-border)" }}>
              <div className="font-semibold">{selectedAdapter ? `Подключить ${selectedAdapter.meta.name}` : "Выбрать платформу"}</div>
              <button onClick={() => { setShowAddPicker(false); resetAddForm(); }} style={{ color: "var(--c-text3)" }} className="hover:opacity-70">
                <X size={18} />
              </button>
            </div>

            {!selectedAdapter ? (
              <div className="p-5 grid grid-cols-3 gap-3">
                {AVAILABLE_ADAPTERS.map((adapter) => {
                  const cfg = visual(adapter.meta.kind);
                  const already = integrations.some((i) => i.kind === adapter.meta.kind);
                  return (
                    <button key={adapter.meta.kind} onClick={() => !already && setAddKind(adapter.meta.kind)} disabled={already}
                      style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)", opacity: already ? 0.4 : 1 }}
                      className="flex flex-col items-center gap-3 p-4 rounded-xl hover:border-blue-500 transition-colors disabled:cursor-not-allowed">
                      <div style={{ background: cfg.bg, color: cfg.color }} className="w-12 h-12 rounded-xl flex items-center justify-center font-bold">
                        {cfg.abbr}
                      </div>
                      <div className="text-xs font-medium text-center">{adapter.meta.name}</div>
                      {already && <div className="text-xs" style={{ color: "var(--c-green)" }}>Подключено</div>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)" }} className="rounded-xl p-3 space-y-1">
                  <div className="text-xs" style={{ color: "var(--c-text2)" }}>{selectedAdapter.meta.authModel}</div>
                  <a href={selectedAdapter.meta.docsUrl} target="_blank" rel="noreferrer"
                    className="text-xs hover:underline" style={{ color: "var(--c-blue)" }}>
                    Документация API
                  </a>
                </div>

                {selectedAdapter.meta.credentialFields.map((field) => (
                  <div key={field.key}>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text2)" }}>{field.label}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type={field.type === "password" && !revealCred[field.key] ? "password" : "text"}
                        value={credInput[field.key] ?? ""}
                        onChange={(e) => setCredInput((c) => ({ ...c, [field.key]: e.target.value }))}
                        placeholder={field.hint ?? "Введите значение..."}
                        style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                        className="w-full rounded-lg px-3 py-2 text-sm outline-none font-mono placeholder:font-sans placeholder:opacity-40" />
                      {field.type === "password" && (
                        <button onClick={() => setRevealCred((r) => ({ ...r, [field.key]: !r[field.key] }))} style={{ color: "var(--c-text3)" }} className="p-2 hover:opacity-70">
                          {revealCred[field.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      )}
                    </div>
                    {field.hint && <div className="text-xs mt-1" style={{ color: "var(--c-text3)" }}>{field.hint}</div>}
                  </div>
                ))}

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Автосинхронизация</div>
                    <div className="text-xs" style={{ color: "var(--c-text3)" }}>Автоматически обновлять остатки и цены</div>
                  </div>
                  <button onClick={() => setAddAutoSync((v) => !v)}
                    style={{ background: addAutoSync ? "var(--c-green)" : "var(--c-bg3)", border: "1px solid var(--c-border)" }}
                    className="w-10 h-6 rounded-full transition-colors relative">
                    <span style={{ background: "#fff", left: addAutoSync ? "calc(100% - 20px)" : "2px" }} className="absolute top-1 w-4 h-4 rounded-full transition-all" />
                  </button>
                </div>

                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: "var(--c-text2)" }}>Интервал синхронизации</label>
                  <div className="flex flex-wrap gap-2">
                    {INTERVAL_OPTIONS.map((opt) => (
                      <button key={opt.value} onClick={() => setAddInterval(opt.value)}
                        style={{ background: addInterval === opt.value ? "var(--c-blue)" : "var(--c-bg3)", border: "1px solid var(--c-border)", color: addInterval === opt.value ? "#fff" : "var(--c-text2)" }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {testResult && (
                  <div style={{
                    background: testResult.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                    border: `1px solid ${testResult.ok ? "var(--c-green)" : "var(--c-red)"}`,
                  }} className="rounded-xl p-3 flex items-start gap-2">
                    {testResult.ok
                      ? <CheckCircle size={14} style={{ color: "var(--c-green)", marginTop: 1, flexShrink: 0 }} />
                      : <AlertTriangle size={14} style={{ color: "var(--c-red)", marginTop: 1, flexShrink: 0 }} />}
                    <div className="text-xs" style={{ color: "var(--c-text2)" }}>{testResult.message}</div>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button onClick={resetAddForm}
                    style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)", color: "var(--c-text2)" }}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-80">
                    Назад
                  </button>
                  <button onClick={handleConnect} disabled={testing}
                    style={{ background: testing ? "var(--c-bg3)" : "var(--c-blue)", color: testing ? "var(--c-text3)" : "#fff" }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    <Zap size={14} className={testing ? "animate-pulse" : ""} />
                    {testing ? "Проверка..." : "Подключить"}
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
