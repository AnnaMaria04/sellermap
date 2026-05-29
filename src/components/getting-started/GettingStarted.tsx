"use client";

import { useState, type ReactNode } from "react";
import {
  Pencil, Check, Plus, ArrowUp, Sparkles, Tag, Store,
  Truck, Receipt, MapPin, Cpu, ImageIcon,
} from "lucide-react";
import { useSetupStatus } from "./useSetupStatus";
import { useDismissedCards } from "./useDismissedCards";
import { DismissibleCard } from "./DismissibleCard";
import { cn } from "@/lib/utils";

/**
 * Getting-started Home — modelled 1:1 on the Shopify setup screen, adapted to
 * what applies to SellerMap (Russian, marketplaces). Card done-states are
 * derived from live data, so the screen visibly fills in as setup progresses.
 */
export function GettingStarted() {
  const { loading, workspaceName, renameWorkspace, status } = useSetupStatus();
  const { isDismissed, dismiss } = useDismissedCards();

  return (
    <div className="mx-auto w-full max-w-[1040px] px-4 py-6">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <h1 className="text-base font-semibold text-[var(--c-text)]">
          Привет! Давайте начнём.
        </h1>
        <p className="shrink-0 text-sm text-[var(--c-text2)]">
          Вопросы?{" "}
          <a href="tel:+78005553535" className="font-semibold text-[var(--c-text)] hover:underline">
            +7 800 555-35-35
          </a>
        </p>
      </div>

      {/* Ask-anything assistant bar */}
      <AskBar />

      {/* Main setup card */}
      <section className="mt-4 rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
        {/* Store name */}
        <div className="mb-5">
          {loading ? (
            <div className="skeleton h-5 w-44" />
          ) : (
            <StoreName name={workspaceName} onRename={renameWorkspace} />
          )}
        </div>

        {/* Primary tiles */}
        <div className="grid gap-4 sm:grid-cols-2">
          <PrimaryTile
            done={status.catalog}
            illustration={<ProductArt />}
            title="Добавьте первый товар"
            subtitle={
              <>
                Начните с добавления товара и пары ключевых деталей. Не готовы?{" "}
                <a href="/inventory/products" className="text-[var(--c-blue)] hover:underline">
                  Начните с демо-товара
                </a>
              </>
            }
            primary={{ label: "Добавить товар", href: "/inventory/products/new" }}
            secondary={{ label: "Импорт", href: "/inventory/products" }}
          />
          <PrimaryTile
            done={status.marketplace}
            illustration={<MarketplaceArt />}
            title="Подключите маркетплейс"
            subtitle="Подключите Wildberries, Ozon или Я.Маркет — заказы, остатки и цены подтянутся автоматически."
            primary={{ label: "Подключить", href: "/inventory/settings/integrations" }}
          />
        </div>

        {/* Small tiles */}
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <SmallTile
            done={status.payments}
            title="Приём оплаты"
            action={{ label: "Подключить", href: "/inventory/settings/pos" }}
          >
            <div className="flex flex-wrap gap-1.5">
              {["СБП", "Mir Pay", "Карта"].map((p) => (
                <span key={p} className="rounded-md border border-[var(--c-border)] bg-[var(--c-bg2)] px-2 py-0.5 text-xs font-medium text-[var(--c-text2)]">{p}</span>
              ))}
            </div>
          </SmallTile>
          <SmallTile
            done={false}
            title="Тарифы доставки"
            action={{ label: "Проверить", href: "/inventory/settings" }}
          >
            <Truck className="h-6 w-6 text-[var(--c-text3)]" />
          </SmallTile>
          <SmallTile
            done={status.taxes}
            title="Налоги и касса"
            badge="54-ФЗ"
            action={{ label: "Настроить", href: "/inventory/tax" }}
          >
            <Receipt className="h-6 w-6 text-[var(--c-text3)]" />
          </SmallTile>
        </div>

        {/* Sell in person */}
        <h2 className="mb-3 mt-6 text-sm font-semibold text-[var(--c-text)]">Продажи офлайн</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <OfflineTile
            done={status.location}
            icon={<MapPin className="h-6 w-6" />}
            title="Адрес розничной точки"
            subtitle="Добавьте адрес и настройте параметры выдачи заказов."
            action={{ label: "Добавить", href: "/inventory/locations" }}
          />
          <OfflineTile
            done={false}
            icon={<Cpu className="h-6 w-6" />}
            title="Оборудование для кассы"
            subtitle="Подключите надёжное оборудование для приёма платежей."
            action={{ label: "Заказать", href: "/inventory/settings/pos" }}
          />
        </div>
      </section>

      {/* Dismissible promo / help cards */}
      <div className="mt-4 space-y-4">
        {!isDismissed("ai-images") && (
          <DismissibleCard onDismiss={() => dismiss("ai-images")}>
            <div className="flex items-center gap-4 p-5">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-[var(--c-text)]">Генерация изображений товаров за секунды</h3>
                <p className="text-sm text-[var(--c-text3)]">Улучшите визуал с помощью ИИ</p>
                <p className="mt-2 text-sm text-[var(--c-text2)]">
                  Создавайте качественные изображения для карточек, соцсетей и рекламы в один клик.
                </p>
                <button className="mt-3 rounded-lg border border-[var(--c-border2)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg2)]">
                  Сгенерировать изображение
                </button>
              </div>
              <div className="hidden h-28 w-44 shrink-0 items-center justify-center rounded-xl bg-[var(--c-bg3)] sm:flex">
                <ImageIcon className="h-8 w-8 text-[var(--c-text3)]" />
              </div>
            </div>
          </DismissibleCard>
        )}

        {HELP_LINKS.filter((h) => !isDismissed(h.id)).map((h) => (
          <DismissibleCard key={h.id} onDismiss={() => dismiss(h.id)}>
            <div className="flex items-center justify-between gap-4 p-5">
              <div>
                <h3 className="text-sm font-semibold text-[var(--c-text)]">{h.title}</h3>
                <p className="mt-0.5 text-sm text-[var(--c-text2)]">{h.subtitle}</p>
              </div>
              <a href={h.href} className="shrink-0 rounded-lg border border-[var(--c-border2)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg2)]">
                Читать
              </a>
            </div>
          </DismissibleCard>
        ))}
      </div>

      {/* All caught up divider */}
      <div className="my-8 flex items-center gap-3 text-sm text-[var(--c-text3)]">
        <span className="h-px flex-1 bg-[var(--c-border)]" />
        <span className="inline-flex items-center gap-1.5">
          <Check className="h-4 w-4" /> Всё просмотрено
        </span>
        <span className="h-px flex-1 bg-[var(--c-border)]" />
      </div>
    </div>
  );
}

const HELP_LINKS = [
  { id: "help-wb", title: "Как подключить Wildberries", subtitle: "Пошаговая инструкция по подключению магазина WB.", href: "#" },
  { id: "help-sbp", title: "Настройка СБП", subtitle: "Принимайте оплату по QR без терминала.", href: "#" },
  { id: "help-54fz", title: "54-ФЗ за 5 минут", subtitle: "Подключите онлайн-кассу и фискализацию.", href: "#" },
];

// ── Ask bar ────────────────────────────────────────────────────────────────
function AskBar() {
  const [value, setValue] = useState("");
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] px-4 py-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--c-bg3)] text-[var(--c-text2)]">
        <Sparkles className="h-4 w-4" />
      </span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Спросите что угодно…"
        className="flex-1 bg-transparent text-sm text-[var(--c-text)] outline-none placeholder:text-[var(--c-text3)]"
      />
      <button aria-label="Добавить" className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--c-text2)] hover:bg-[var(--c-bg3)]">
        <Plus className="h-4 w-4" />
      </button>
      <button
        aria-label="Отправить"
        disabled={!value.trim()}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--c-bg3)] text-[var(--c-text2)] transition disabled:opacity-50 enabled:hover:bg-[var(--c-text)] enabled:hover:text-[var(--c-bg)]"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Store name inline edit ───────────────────────────────────────────────────
function StoreName({ name, onRename }: { name: string; onRename: (n: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  if (editing) {
    return (
      <form
        onSubmit={(e) => { e.preventDefault(); onRename(draft); setEditing(false); }}
        className="flex items-center gap-2"
      >
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { onRename(draft); setEditing(false); }}
          placeholder="Название магазина"
          className="rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-1 text-sm font-semibold text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]"
        />
        <button type="submit" className="rounded-md p-1 text-[var(--c-green)] hover:bg-[var(--c-bg3)]">
          <Check className="h-4 w-4" />
        </button>
      </form>
    );
  }

  return (
    <button
      onClick={() => { setDraft(name); setEditing(true); }}
      className="group inline-flex items-center gap-2 text-sm font-semibold text-[var(--c-text)]"
    >
      {name || "Добавить название магазина"}
      <Pencil className="h-3.5 w-3.5 text-[var(--c-text3)] transition group-hover:text-[var(--c-text)]" />
    </button>
  );
}

// ── Tiles ─────────────────────────────────────────────────────────────────────
interface Cta { label: string; href: string }

function DoneBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--c-green-dim)] px-2 py-0.5 text-xs font-medium text-[var(--c-green)]">
      <Check className="h-3 w-3" /> Готово
    </span>
  );
}

function PrimaryTile({
  illustration, title, subtitle, primary, secondary, done,
}: {
  illustration: ReactNode; title: string; subtitle: ReactNode; primary: Cta; secondary?: Cta; done?: boolean;
}) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
      <div className={cn("mb-4 flex h-40 items-center justify-center overflow-hidden rounded-lg bg-[var(--c-bg2)]", done && "opacity-60")}>
        {illustration}
      </div>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--c-text)]">
        {title} {done && <DoneBadge />}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-[var(--c-text2)]">{subtitle}</p>
      <div className="mt-auto flex items-center gap-3 pt-4">
        <a href={primary.href} className={cn(
          "rounded-lg px-3.5 py-2 text-sm font-medium transition",
          done ? "border border-[var(--c-border2)] text-[var(--c-text)] hover:bg-[var(--c-bg)]" : "bg-[var(--c-text)] text-[var(--c-bg)] hover:opacity-90",
        )}>
          {done ? "Изменить" : primary.label}
        </a>
        {!done && secondary && (
          <a href={secondary.href} className="text-sm font-medium text-[var(--c-text2)] hover:text-[var(--c-text)]">
            {secondary.label}
          </a>
        )}
      </div>
    </div>
  );
}

function SmallTile({
  title, badge, action, done, children,
}: {
  title: string; badge?: string; action: Cta; done?: boolean; children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--c-text)]">{title}</h3>
        {done ? <DoneBadge /> : badge && (
          <span className="inline-flex items-center gap-1 rounded-md bg-[var(--c-bg3)] px-1.5 py-0.5 text-xs font-medium text-[var(--c-text2)]">{badge}</span>
        )}
      </div>
      <div className="mt-3 flex min-h-[28px] items-center">{children}</div>
      <a href={action.href} className="mt-3 inline-flex rounded-lg border border-[var(--c-border2)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg)]">
        {done ? "Изменить" : action.label}
      </a>
    </div>
  );
}

function OfflineTile({
  icon, title, subtitle, action, done,
}: {
  icon: ReactNode; title: string; subtitle: string; action: Cta; done?: boolean;
}) {
  return (
    <div className="flex gap-4 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-[var(--c-bg3)] text-[var(--c-text2)]">
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--c-text)]">{title} {done && <DoneBadge />}</h3>
        <p className="mt-0.5 text-sm text-[var(--c-text2)]">{subtitle}</p>
        <a href={action.href} className="mt-2 inline-flex rounded-lg border border-[var(--c-border2)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg)]">
          {done ? "Изменить" : action.label}
        </a>
      </div>
    </div>
  );
}

// ── Illustrations (token-based, no new colors) ───────────────────────────────
function ProductArt() {
  return (
    <svg width="160" height="120" viewBox="0 0 160 120" fill="none" aria-hidden>
      <rect x="34" y="20" width="92" height="92" rx="8" fill="var(--c-bg2)" stroke="var(--c-border2)" />
      <rect x="46" y="28" width="68" height="60" rx="6" fill="var(--c-bg)" stroke="var(--c-border2)" strokeDasharray="4 4" />
      <Tag x={70} y={46} width={20} height={20} className="text-[var(--c-text3)]" />
      <rect x="52" y="98" width="56" height="6" rx="3" fill="var(--c-border2)" />
    </svg>
  );
}

function MarketplaceArt() {
  return (
    <svg width="180" height="120" viewBox="0 0 180 120" fill="none" aria-hidden>
      <rect x="30" y="22" width="120" height="80" rx="8" fill="var(--c-bg2)" stroke="var(--c-border2)" />
      <rect x="30" y="22" width="120" height="16" rx="8" fill="var(--c-bg3)" />
      <rect x="44" y="48" width="92" height="40" rx="6" fill="var(--c-bg)" stroke="var(--c-border2)" />
      <Store x={80} y={58} width={20} height={20} className="text-[var(--c-text3)]" />
    </svg>
  );
}
