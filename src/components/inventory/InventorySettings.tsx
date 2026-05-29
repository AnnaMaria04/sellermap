"use client";

import { useState } from "react";
import {
  Settings,
  MapPin,
  Barcode,
  Calculator,
  Bell,
  RefreshCw,
  Tag,
  Shield,
  Download,
  Save,
  RotateCcw,
  AlertCircle,
  Check,
  ChevronDown,
  Building2,
} from "lucide-react";
import { useInventory } from "@/contexts/InventoryContext";
import { useSellerProfile } from "@/hooks/useSellerProfile";
import { exportData } from "@/lib/export";
import { cn } from "@/lib/utils";

const BUSINESS_TYPES = [
  { id: "ooo", label: "ООО" },
  { id: "ip", label: "ИП" },
  { id: "self", label: "Самозанятый" },
  { id: "other", label: "Другое" },
];

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const ROLE_OPTIONS = [
  "Любой сотрудник",
  "Менеджер склада",
  "Руководитель отдела",
  "Директор",
];

interface SettingsState {
  defaultLocationId: string;
  currency: string;
  timezone: string;
  fiscalYearMonth: number;
  lowStockThresholdDays: number;
  reorderSafetyDays: number;
  skuPrefix: string;
  autoIncrement: boolean;
  barcodeFormat: string;
  autoGenerateBarcodes: boolean;
  internalBarcodePrefix: string;
  costMethod: "fifo" | "weighted" | "standard";
  lowStockAlert: boolean;
  outOfStockAlert: boolean;
  overstockAlert: boolean;
  dailyDigestTime: string;
  defaultSafetyStockDays: number;
  defaultLeadTimeDays: number;
  autoCreatePO: boolean;
  minOrderValueAutoPO: number;
  defaultLabelingSystem: string;
  requireLabelingNewProducts: boolean;
  writeOffApprover: string;
  priceEditor: string;
  require2PersonStocktake: boolean;
}

const DEFAULT_SETTINGS: SettingsState = {
  defaultLocationId: "",
  currency: "RUB",
  timezone: "Europe/Moscow",
  fiscalYearMonth: 0,
  lowStockThresholdDays: 14,
  reorderSafetyDays: 3,
  skuPrefix: "ORG-",
  autoIncrement: true,
  barcodeFormat: "EAN-13",
  autoGenerateBarcodes: false,
  internalBarcodePrefix: "INT-",
  costMethod: "fifo",
  lowStockAlert: true,
  outOfStockAlert: true,
  overstockAlert: false,
  dailyDigestTime: "09:00",
  defaultSafetyStockDays: 7,
  defaultLeadTimeDays: 10,
  autoCreatePO: false,
  minOrderValueAutoPO: 10000,
  defaultLabelingSystem: "chestny_znak",
  requireLabelingNewProducts: false,
  writeOffApprover: "Менеджер склада",
  priceEditor: "Любой сотрудник",
  require2PersonStocktake: false,
};

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
        value ? "bg-[var(--c-green)]" : "bg-[var(--c-bg3)]",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
          value ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-[var(--c-border)] px-5 py-4">
        <span className="text-[var(--c-text2)]">{icon}</span>
        <h3 className="text-sm font-semibold text-[var(--c-text)]">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="min-w-0">
        <p className="text-sm text-[var(--c-text)]">{label}</p>
        {hint && <p className="text-xs text-[var(--c-text3)] mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 appearance-none rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] pl-3 pr-8 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--c-text3)]" />
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 w-20 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] tabular text-right focus:border-[var(--c-green)] focus:outline-none"
      />
      {suffix && <span className="text-xs text-[var(--c-text3)]">{suffix}</span>}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  width,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  width?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "h-8 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none",
        width ?? "w-36",
      )}
    />
  );
}

const COST_METHODS: { value: SettingsState["costMethod"]; label: string; description: string }[] = [
  { value: "fifo",     label: "FIFO",                       description: "First In First Out — первым пришёл, первым ушёл. Единственный метод, разрешённый ПБУ 5/01 для большинства компаний в РФ." },
  { value: "weighted", label: "Средневзвешенная стоимость", description: "Себестоимость рассчитывается как среднее взвешенное по всем партиям. Допустима по ПБУ 5/01 и МСФО." },
  { value: "standard", label: "Стандартная стоимость",      description: "Фиксированная плановая себестоимость с отклонениями. Удобна при стабильных ценах поставщика." },
];

export function InventorySettings() {
  const { actions, products, movements, suppliers, locations } = useInventory();
  const { profile, saveProfile } = useSellerProfile();
  const defaultLocId = locations.find(l => l.isDefault)?.id ?? locations[0]?.id ?? "";
  const [settings, setSettings] = useState<SettingsState>(() => ({
    ...DEFAULT_SETTINGS,
    defaultLocationId: defaultLocId,
  }));
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [profileCompany, setProfileCompany] = useState(profile.company);
  const [profileBizType, setProfileBizType] = useState(profile.businessType);
  const [profileSaved, setProfileSaved] = useState(false);

  function handleResetDemo() {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    actions.resetDemo();
    setConfirmReset(false);
  }

  function update<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setSaved(false);
  }

  function handleSave() {
    setSaved(true);
    setHasChanges(false);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    setSettings(DEFAULT_SETTINGS);
    setHasChanges(false);
    setSaved(false);
  }

  function handleExport(label: string) {
    const today = new Date().toISOString().slice(0, 10);
    if (label === "Все товары") {
      exportData({
        filename: `products_${today}`,
        title: "Товары",
        format: "excel",
        columns: [
          { key: "sku", label: "Артикул" },
          { key: "name", label: "Название" },
          { key: "category", label: "Категория" },
          { key: "price", label: "Цена, ₽", align: "right" },
          { key: "costPrice", label: "Себестоимость, ₽", align: "right" },
          { key: "totalPhysical", label: "Остаток", align: "right" },
          { key: "status", label: "Статус" },
        ],
        rows: products as unknown as Record<string, unknown>[],
      });
    } else if (label === "История движений") {
      exportData({
        filename: `movements_${today}`,
        title: "История движений",
        format: "csv",
        columns: [
          { key: "createdAt", label: "Дата" },
          { key: "type", label: "Тип" },
          { key: "sku", label: "Артикул" },
          { key: "productName", label: "Товар" },
          { key: "qtyDelta", label: "Изменение", align: "right" },
          { key: "userName", label: "Пользователь" },
        ],
        rows: movements as unknown as Record<string, unknown>[],
      });
    } else if (label === "Поставщики") {
      exportData({
        filename: `suppliers_${today}`,
        title: "Поставщики",
        format: "excel",
        columns: [
          { key: "name", label: "Название" },
          { key: "country", label: "Страна" },
          { key: "city", label: "Город" },
          { key: "email", label: "Email" },
          { key: "phone", label: "Телефон" },
          { key: "leadTimeDays", label: "Срок, дн.", align: "right" },
          { key: "rating", label: "Рейтинг", align: "right" },
        ],
        rows: suppliers as unknown as Record<string, unknown>[],
      });
    }
  }

  return (
    <div className="space-y-5 pb-28">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--c-text)]">Общие настройки</h1>
          <p className="text-sm text-[var(--c-text2)] mt-0.5">Управляйте правилами учёта, уведомлениями и разрешениями</p>
        </div>
        {hasChanges && (
          <span className="flex items-center gap-1.5 rounded-full border border-[rgba(245,166,35,0.3)] bg-[var(--c-amber-dim)] px-3 py-1 text-xs font-medium text-[var(--c-amber)]">
            <AlertCircle size={11} />
            Есть несохранённые изменения
          </span>
        )}
      </div>

      <SectionCard icon={<Building2 size={15} />} title="Профиль компании">
        <Field label="Название компании" hint="Отображается в отчётах и документах">
          <input
            type="text"
            value={profileCompany}
            onChange={(e) => { setProfileCompany(e.target.value); setProfileSaved(false); }}
            placeholder="ООО «Мой Магазин» или имя ИП"
            className="h-8 w-48 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
          />
        </Field>
        <Field label="Форма собственности">
          <div className="flex gap-2">
            {BUSINESS_TYPES.map((bt) => (
              <button
                key={bt.id}
                onClick={() => { setProfileBizType(bt.id); setProfileSaved(false); }}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                  profileBizType === bt.id
                    ? "border-[var(--c-green)] bg-[var(--c-green-dim)] text-[var(--c-green)]"
                    : "border-[var(--c-border)] bg-[var(--c-bg3)] text-[var(--c-text2)] hover:text-[var(--c-text)]",
                )}
              >
                {bt.label}
              </button>
            ))}
          </div>
        </Field>
        <div className="flex justify-end">
          <button
            onClick={async () => {
              await saveProfile({ company: profileCompany, businessType: profileBizType });
              setProfileSaved(true);
              setTimeout(() => setProfileSaved(false), 2000);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--c-green)] px-4 py-1.5 text-xs font-semibold text-[var(--c-bg)] hover:opacity-90 transition"
          >
            {profileSaved ? <><Check size={12} /> Сохранено</> : <><Save size={12} /> Сохранить</>}
          </button>
        </div>
      </SectionCard>

      <SectionCard icon={<Settings size={15} />} title="Основные настройки">
        <Field label="Локация по умолчанию" hint="Используется при создании новых поступлений">
          <SelectInput
            value={settings.defaultLocationId}
            onChange={(v) => update("defaultLocationId", v)}
            options={locations.map((l) => ({ value: l.id, label: l.name }))}
          />
        </Field>
        <Field label="Валюта" hint="Основная валюта для цен и себестоимости">
          <SelectInput
            value={settings.currency}
            onChange={(v) => update("currency", v)}
            options={[
              { value: "RUB", label: "₽ Российский рубль" },
              { value: "USD", label: "$ Доллар США" },
              { value: "EUR", label: "€ Евро" },
            ]}
          />
        </Field>
        <Field label="Часовой пояс">
          <SelectInput
            value={settings.timezone}
            onChange={(v) => update("timezone", v)}
            options={[
              { value: "Europe/Moscow", label: "Москва (UTC+3)" },
              { value: "Asia/Yekaterinburg", label: "Екатеринбург (UTC+5)" },
              { value: "Asia/Novosibirsk", label: "Новосибирск (UTC+7)" },
              { value: "Asia/Vladivostok", label: "Владивосток (UTC+10)" },
            ]}
          />
        </Field>
        <Field label="Начало финансового года">
          <SelectInput
            value={String(settings.fiscalYearMonth)}
            onChange={(v) => update("fiscalYearMonth", Number(v))}
            options={MONTHS.map((m, i) => ({ value: String(i), label: m }))}
          />
        </Field>
        <Field label="Порог низкого остатка" hint="Количество дней запаса, ниже которого товар считается на исходе">
          <NumberInput value={settings.lowStockThresholdDays} onChange={(v) => update("lowStockThresholdDays", v)} min={1} max={90} suffix="дн." />
        </Field>
        <Field label="Запас безопасности при заказе" hint="Дополнительный буфер к точке перезаказа">
          <NumberInput value={settings.reorderSafetyDays} onChange={(v) => update("reorderSafetyDays", v)} min={0} max={30} suffix="дн." />
        </Field>
      </SectionCard>

      <SectionCard icon={<Barcode size={15} />} title="Артикул и штрихкоды">
        <Field label="Префикс артикула" hint="Добавляется автоматически при создании нового товара">
          <TextInput value={settings.skuPrefix} onChange={(v) => update("skuPrefix", v)} placeholder="ORG-" width="w-28" />
        </Field>
        <Field label="Автоинкремент номера">
          <Toggle value={settings.autoIncrement} onChange={(v) => update("autoIncrement", v)} />
        </Field>
        <Field label="Формат штрихкода">
          <SelectInput
            value={settings.barcodeFormat}
            onChange={(v) => update("barcodeFormat", v)}
            options={[
              { value: "EAN-13", label: "EAN-13" },
              { value: "EAN-8", label: "EAN-8" },
              { value: "Code128", label: "Code 128" },
              { value: "QR", label: "QR-код" },
            ]}
          />
        </Field>
        <Field label="Генерировать штрихкод автоматически" hint="При создании товара без явно указанного штрихкода">
          <Toggle value={settings.autoGenerateBarcodes} onChange={(v) => update("autoGenerateBarcodes", v)} />
        </Field>
        <Field label="Префикс внутреннего штрихкода" hint="Используется при генерации штрихкодов для товаров без EAN-13">
          <TextInput value={settings.internalBarcodePrefix} onChange={(v) => update("internalBarcodePrefix", v)} placeholder="INT-" width="w-28" />
        </Field>
      </SectionCard>

      <SectionCard icon={<Calculator size={15} />} title="Метод учёта себестоимости">
        <p className="text-xs text-[var(--c-text3)] -mt-1">Метод применяется ко всем новым движениям товаров. Смена метода не пересчитывает исторические данные.</p>
        <div className="space-y-2 mt-1">
          {COST_METHODS.map((m) => (
            <label
              key={m.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition",
                settings.costMethod === m.value
                  ? "border-[var(--c-green)] bg-[var(--c-green-dim)]"
                  : "border-[var(--c-border)] bg-[var(--c-bg3)] hover:border-[var(--c-border2)]",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition",
                  settings.costMethod === m.value
                    ? "border-[var(--c-green)] bg-[var(--c-green)]"
                    : "border-[var(--c-border2)]",
                )}
              >
                {settings.costMethod === m.value && <span className="h-1.5 w-1.5 rounded-full bg-[var(--c-bg)]" />}
              </span>
              <input
                type="radio"
                className="sr-only"
                value={m.value}
                checked={settings.costMethod === m.value}
                onChange={() => update("costMethod", m.value)}
              />
              <div>
                <p className="text-sm font-semibold text-[var(--c-text)]">{m.label}</p>
                <p className="text-xs text-[var(--c-text3)] mt-0.5">{m.description}</p>
              </div>
            </label>
          ))}
        </div>
      </SectionCard>

      <SectionCard icon={<Bell size={15} />} title="Уведомления об остатках">
        <Field label="Уведомление о низком остатке" hint={`Срабатывает при запасе менее ${settings.lowStockThresholdDays} дней`}>
          <Toggle value={settings.lowStockAlert} onChange={(v) => update("lowStockAlert", v)} />
        </Field>
        <Field label="Уведомление об отсутствии товара">
          <Toggle value={settings.outOfStockAlert} onChange={(v) => update("outOfStockAlert", v)} />
        </Field>
        <Field label="Уведомление о переизбытке" hint="Когда запас превышает 90 дней продаж">
          <Toggle value={settings.overstockAlert} onChange={(v) => update("overstockAlert", v)} />
        </Field>
        <Field label="Время ежедневного дайджеста">
          <input
            type="time"
            value={settings.dailyDigestTime}
            onChange={(e) => update("dailyDigestTime", e.target.value)}
            className="h-8 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
          />
        </Field>
      </SectionCard>

      <SectionCard icon={<RefreshCw size={15} />} title="Точки перезаказа">
        <Field label="Запас безопасности по умолчанию" hint="Минимальный буфер для автоматической точки перезаказа">
          <NumberInput value={settings.defaultSafetyStockDays} onChange={(v) => update("defaultSafetyStockDays", v)} min={0} max={60} suffix="дн." />
        </Field>
        <Field label="Стандартное время поставки" hint="Среднее количество дней от заказа до поступления">
          <NumberInput value={settings.defaultLeadTimeDays} onChange={(v) => update("defaultLeadTimeDays", v)} min={1} max={120} suffix="дн." />
        </Field>
        <Field label="Автоматически создавать заказ" hint="Создаёт черновик заказа поставщику при достижении точки перезаказа">
          <Toggle value={settings.autoCreatePO} onChange={(v) => update("autoCreatePO", v)} />
        </Field>
        <Field
          label="Минимальная сумма авто-заказа"
          hint="Авто-заказ не создаётся, если сумма ниже порога"
        >
          <NumberInput
            value={settings.minOrderValueAutoPO}
            onChange={(v) => update("minOrderValueAutoPO", v)}
            min={0}
            suffix="₽"
          />
        </Field>
      </SectionCard>

      <SectionCard icon={<Tag size={15} />} title="Маркировка">
        <Field label="Система маркировки по умолчанию">
          <SelectInput
            value={settings.defaultLabelingSystem}
            onChange={(v) => update("defaultLabelingSystem", v)}
            options={[
              { value: "chestny_znak", label: "Честный Знак" },
              { value: "egais", label: "ЕГАИС" },
              { value: "mercury", label: "Меркурий" },
              { value: "none", label: "Без маркировки" },
            ]}
          />
        </Field>
        <Field label="Требовать маркировку для новых товаров" hint="При создании товара маркировка будет включена по умолчанию">
          <Toggle value={settings.requireLabelingNewProducts} onChange={(v) => update("requireLabelingNewProducts", v)} />
        </Field>
      </SectionCard>

      <SectionCard icon={<Shield size={15} />} title="Разрешения">
        <Field label="Кто может согласовывать списания" hint="Пользователи с более низкой ролью не могут подтверждать списания без одобрения">
          <SelectInput
            value={settings.writeOffApprover}
            onChange={(v) => update("writeOffApprover", v)}
            options={ROLE_OPTIONS.map((r) => ({ value: r, label: r }))}
          />
        </Field>
        <Field label="Кто может редактировать цены">
          <SelectInput
            value={settings.priceEditor}
            onChange={(v) => update("priceEditor", v)}
            options={ROLE_OPTIONS.map((r) => ({ value: r, label: r }))}
          />
        </Field>
        <Field label="Инвентаризация двумя сотрудниками" hint="Результаты инвентаризации должны быть подтверждены двумя разными пользователями">
          <Toggle value={settings.require2PersonStocktake} onChange={(v) => update("require2PersonStocktake", v)} />
        </Field>
      </SectionCard>

      <SectionCard icon={<Download size={15} />} title="Экспорт данных">
        <p className="text-xs text-[var(--c-text3)] -mt-1">Скачайте актуальные данные в формате Excel / CSV для внешних систем или резервного копирования.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { label: "Все товары", desc: "Товары, цены, SKU, остатки" },
            { label: "История движений", desc: "Поступления, продажи, списания" },
            { label: "Поставщики", desc: "Контакты, условия, рейтинги" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => handleExport(item.label)}
              className="flex items-center gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] px-4 py-3 text-left transition hover:border-[var(--c-border2)] hover:bg-[var(--c-bg2)]"
            >
              <Download size={14} className="text-[var(--c-text3)] shrink-0" />
              <div>
                <p className="text-sm font-medium text-[var(--c-text)]">{item.label}</p>
                <p className="text-xs text-[var(--c-text3)]">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard icon={<RotateCcw size={15} />} title="Демо-данные">
        <p className="text-xs text-[var(--c-text3)] -mt-1">
          Все изменения склада сохраняются локально в браузере. Сбросьте данные, чтобы вернуть исходный демонстрационный набор товаров, поставщиков и движений.
        </p>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-[rgba(240,80,80,0.2)] bg-[var(--c-red-dim)] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[var(--c-text)]">Сбросить демо-данные</p>
            <p className="text-xs text-[var(--c-text3)]">Удалит все внесённые изменения и восстановит исходные товары</p>
          </div>
          <button
            onClick={handleResetDemo}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold transition",
              confirmReset
                ? "bg-[var(--c-red)] text-white hover:opacity-90"
                : "border border-[rgba(240,80,80,0.4)] text-[var(--c-red)] hover:bg-[rgba(240,80,80,0.1)]",
            )}
          >
            <RotateCcw size={14} />
            {confirmReset ? "Подтвердить сброс" : "Сбросить"}
          </button>
        </div>
      </SectionCard>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--c-border)] bg-[var(--c-bg)]/95 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-sm text-[var(--c-text3)] hover:text-[var(--c-text)] transition"
          >
            <RotateCcw size={13} />
            Сбросить к умолчаниям
          </button>
          <button
            onClick={handleSave}
            className={cn(
              "flex h-10 items-center gap-2 rounded-xl px-6 text-sm font-semibold transition",
              saved
                ? "bg-[var(--c-green)] text-[var(--c-bg)]"
                : "bg-[var(--c-green)] text-[var(--c-bg)] hover:opacity-90",
            )}
          >
            {saved ? <><Check size={15} /> Сохранено</> : <><Save size={15} /> Сохранить настройки</>}
          </button>
        </div>
      </div>
    </div>
  );
}
