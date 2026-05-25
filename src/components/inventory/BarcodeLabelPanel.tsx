"use client";

import { useState } from "react";
import {
  X,
  Printer,
  Download,
  Camera,
  QrCode,
  Tag,
  Settings,
  Check,
  Plus,
  Minus,
  RefreshCw,
  Package,
} from "lucide-react";
import { PRODUCTS, type Product } from "@/mock/inventory";
import { cn } from "@/lib/utils";

interface Props {
  product?: Product;
  onClose?: () => void;
}

type LabelTemplate =
  | "price_tag"
  | "barcode_small"
  | "barcode_large"
  | "shelf_label"
  | "batch_label"
  | "data_matrix"
  | "qr_label";

const TEMPLATES: { id: LabelTemplate; name: string; description: string; size: string; emoji: string }[] = [
  { id: "price_tag",      name: "Ценник",               description: "Название, цена, штрихкод", size: "58×40 мм", emoji: "🏷️" },
  { id: "barcode_small",  name: "Малый штрихкод",        description: "Только штрихкод + SKU",   size: "40×20 мм", emoji: "▌▌▌" },
  { id: "barcode_large",  name: "Большой штрихкод",      description: "Штрихкод + название",     size: "80×50 мм", emoji: "▌▌▌▌" },
  { id: "shelf_label",    name: "Полочный ценник",        description: "Для стеллажей и витрин",  size: "100×30 мм", emoji: "📦" },
  { id: "batch_label",    name: "Партионная этикетка",    description: "Партия + срок годности",  size: "70×50 мм", emoji: "📋" },
  { id: "data_matrix",   name: "Data Matrix",            description: "Честный Знак маркировка", size: "30×30 мм", emoji: "▦" },
  { id: "qr_label",      name: "QR этикетка",            description: "QR-код + название",       size: "50×50 мм", emoji: "▣" },
];

type PrintQty = { productId: string; variantId?: string; qty: number };

export function BarcodeLabelPanel({ product: initialProduct, onClose }: Props) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct ?? null);
  const [template, setTemplate] = useState<LabelTemplate>("price_tag");
  const [printItems, setPrintItems] = useState<PrintQty[]>(
    initialProduct ? [{ productId: initialProduct.id, qty: 1 }] : [],
  );
  const [showPreview, setShowPreview] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printed, setPrinted] = useState(false);
  const [customPrice, setCustomPrice] = useState<string>("");
  const [showSale, setShowSale] = useState(false);
  const [salePercent, setSalePercent] = useState("10");
  const [showLogo, setShowLogo] = useState(true);
  const [showSku, setShowSku] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showPrice, setShowPrice] = useState(true);

  function addProduct(p: Product) {
    if (printItems.find((i) => i.productId === p.id)) return;
    setPrintItems((prev) => [...prev, { productId: p.id, qty: 1 }]);
    setSelectedProduct(p);
  }

  function updateQty(productId: string, delta: number) {
    setPrintItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, qty: Math.max(1, i.qty + delta) } : i,
      ),
    );
  }

  function removeItem(productId: string) {
    setPrintItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  function handlePrint() {
    setPrinting(true);
    setTimeout(() => {
      setPrinting(false);
      setPrinted(true);
      setTimeout(() => setPrinted(false), 2000);
    }, 1200);
  }

  const totalLabels = printItems.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative ml-auto flex h-full w-full max-w-2xl flex-col bg-[var(--c-bg)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--c-text)]">Печать этикеток</h2>
            <p className="text-xs text-[var(--c-text2)]">Настройте шаблон и распечатайте этикетки</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Template selection */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-[var(--c-text)] border-b border-[var(--c-border)] pb-2">Шаблон этикетки</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTemplate(t.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition",
                      template === t.id
                        ? "border-[var(--c-green)] bg-[var(--c-green-dim)]"
                        : "border-[var(--c-border)] bg-[var(--c-bg2)] hover:border-[var(--c-border2)] hover:bg-[var(--c-bg3)]",
                    )}
                  >
                    <span className="text-xl">{t.emoji}</span>
                    <div>
                      <p className={cn("text-xs font-semibold leading-tight", template === t.id ? "text-[var(--c-green)]" : "text-[var(--c-text)]")}>
                        {t.name}
                      </p>
                      <p className="text-[10px] text-[var(--c-text3)] mt-0.5">{t.size}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Label preview */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-[var(--c-text)] border-b border-[var(--c-border)] pb-2">Предпросмотр</h3>
              <div className="flex items-center justify-center rounded-xl bg-[var(--c-bg3)] border border-[var(--c-border)] py-10">
                <LabelPreview
                  template={template}
                  product={selectedProduct ?? PRODUCTS[0]}
                  showLogo={showLogo}
                  showSku={showSku}
                  showBarcode={showBarcode}
                  showPrice={showPrice}
                  customPrice={customPrice}
                  showSale={showSale}
                  salePercent={parseInt(salePercent) || 0}
                />
              </div>
            </div>

            {/* Settings */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-[var(--c-text)] border-b border-[var(--c-border)] pb-2">Настройки</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <ToggleSetting label="Показывать логотип" checked={showLogo} onChange={setShowLogo} />
                  <ToggleSetting label="Показывать SKU" checked={showSku} onChange={setShowSku} />
                  <ToggleSetting label="Штрихкод" checked={showBarcode} onChange={setShowBarcode} />
                  <ToggleSetting label="Цена" checked={showPrice} onChange={setShowPrice} />
                  <ToggleSetting label="Акционная цена" checked={showSale} onChange={setShowSale} />
                </div>

                {showSale && (
                  <div className="flex items-center gap-3 rounded-lg bg-[var(--c-amber-dim)] border border-[rgba(245,166,35,0.2)] px-4 py-3">
                    <span className="text-sm text-[var(--c-amber)]">Скидка:</span>
                    <input
                      type="number"
                      value={salePercent}
                      onChange={(e) => setSalePercent(e.target.value)}
                      className="w-20 rounded-lg border border-[rgba(245,166,35,0.3)] bg-transparent px-2 py-1 text-sm text-[var(--c-amber)] text-center focus:outline-none"
                      min={1}
                      max={99}
                    />
                    <span className="text-sm text-[var(--c-amber)]">%</span>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">Переопределить цену</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--c-text3)]">₽</span>
                    <input
                      type="number"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      placeholder="Из карточки товара"
                      className="h-9 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] pl-7 pr-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Products to print */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-[var(--c-text)] border-b border-[var(--c-border)] pb-2">Товары для печати</h3>

              {printItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--c-border2)] bg-[var(--c-bg3)] py-8 text-center">
                  <Package size={24} className="text-[var(--c-text3)] mb-2" />
                  <p className="text-sm text-[var(--c-text3)]">Добавьте товары для печати этикеток</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {printItems.map((item) => {
                    const p = PRODUCTS.find((p) => p.id === item.productId);
                    if (!p) return null;
                    return (
                      <div key={item.productId} className="flex items-center gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] px-4 py-3">
                        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-[var(--c-bg2)] border border-[var(--c-border)]">
                          {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-sm">📦</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--c-text)] truncate">{p.name}</p>
                          <p className="text-xs text-[var(--c-text3)]">{p.sku}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => updateQty(item.productId, -1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--c-border2)] text-[var(--c-text2)] hover:text-[var(--c-text)] transition">
                            <Minus size={12} />
                          </button>
                          <span className="w-10 text-center text-sm font-semibold text-[var(--c-text)] tabular">{item.qty}</span>
                          <button onClick={() => updateQty(item.productId, 1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--c-border2)] text-[var(--c-text2)] hover:text-[var(--c-text)] transition">
                            <Plus size={12} />
                          </button>
                        </div>
                        <button onClick={() => removeItem(item.productId)} className="text-[var(--c-text3)] hover:text-[var(--c-red)] transition">
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-3">
                <ProductPickerInline onSelect={addProduct} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          {totalLabels > 0 && (
            <p className="mb-3 text-xs text-center text-[var(--c-text2)]">
              Будет напечатано {totalLabels} этикеток
            </p>
          )}
          <div className="flex gap-2">
            <button
              className="flex flex-1 h-10 items-center justify-center gap-2 rounded-lg border border-[var(--c-border2)] text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
            >
              <Download size={14} />
              Скачать PDF
            </button>
            <button
              onClick={handlePrint}
              disabled={printItems.length === 0 || printing}
              className={cn(
                "flex flex-1 h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition",
                printItems.length > 0 && !printing
                  ? "bg-[var(--c-green)] text-[var(--c-bg)] hover:bg-[#25e890]"
                  : "bg-[var(--c-bg3)] text-[var(--c-text3)] cursor-not-allowed",
              )}
            >
              {printing ? (
                <><RefreshCw size={14} className="animate-spin" /> Печать...</>
              ) : printed ? (
                <><Check size={14} /> Отправлено!</>
              ) : (
                <><Printer size={14} /> Напечатать</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LabelPreview({
  template,
  product,
  showLogo,
  showSku,
  showBarcode,
  showPrice,
  customPrice,
  showSale,
  salePercent,
}: {
  template: LabelTemplate;
  product: Product;
  showLogo: boolean;
  showSku: boolean;
  showBarcode: boolean;
  showPrice: boolean;
  customPrice: string;
  showSale: boolean;
  salePercent: number;
}) {
  const displayPrice = customPrice ? parseFloat(customPrice) : product.price;
  const salePrice = showSale ? Math.round(displayPrice * (1 - salePercent / 100)) : null;

  const baseStyle = "bg-white text-black rounded-lg border border-gray-200 shadow-lg flex flex-col overflow-hidden";

  if (template === "price_tag") {
    return (
      <div className={cn(baseStyle, "w-56 p-3 gap-1.5")}>
        {showLogo && <div className="text-[8px] font-bold text-green-600">SELLERMAP</div>}
        <p className="text-xs font-bold leading-tight line-clamp-2">{product.name}</p>
        {showSku && <p className="text-[9px] text-gray-400">{product.sku}</p>}
        {showBarcode && (
          <div className="flex justify-center py-1">
            <BarcodeGraphic />
          </div>
        )}
        {showPrice && (
          <div className="flex items-baseline gap-2 mt-auto">
            {salePrice !== null ? (
              <>
                <span className="text-xl font-black text-red-600">{salePrice.toLocaleString("ru-RU")} ₽</span>
                <span className="text-xs text-gray-400 line-through">{displayPrice.toLocaleString("ru-RU")} ₽</span>
              </>
            ) : (
              <span className="text-xl font-black">{displayPrice.toLocaleString("ru-RU")} ₽</span>
            )}
          </div>
        )}
      </div>
    );
  }

  if (template === "data_matrix") {
    return (
      <div className={cn(baseStyle, "w-28 p-2 items-center gap-1")}>
        <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center border border-gray-200">
          <DataMatrixGraphic />
        </div>
        {showSku && <p className="text-[9px] text-center text-gray-500 font-mono">{product.sku}</p>}
        {showPrice && <p className="text-xs font-bold text-center">{displayPrice.toLocaleString("ru-RU")} ₽</p>}
      </div>
    );
  }

  if (template === "shelf_label") {
    return (
      <div className={cn(baseStyle, "w-80 h-12 flex-row items-center px-3 gap-3")}>
        {showBarcode && <div className="w-16 shrink-0"><BarcodeGraphic /></div>}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold truncate">{product.name}</p>
          {showSku && <p className="text-[9px] text-gray-400">{product.sku}</p>}
        </div>
        {showPrice && (
          <div className="shrink-0 text-right">
            {salePrice !== null ? (
              <>
                <p className="text-base font-black text-red-600">{salePrice.toLocaleString("ru-RU")} ₽</p>
                <p className="text-[9px] text-gray-400 line-through">{displayPrice.toLocaleString("ru-RU")} ₽</p>
              </>
            ) : (
              <p className="text-base font-black">{displayPrice.toLocaleString("ru-RU")} ₽</p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (template === "barcode_small") {
    return (
      <div className={cn(baseStyle, "w-32 p-2 items-center gap-1")}>
        <BarcodeGraphic wide />
        {showSku && <p className="text-[9px] font-mono text-gray-500">{product.sku}</p>}
      </div>
    );
  }

  if (template === "qr_label") {
    return (
      <div className={cn(baseStyle, "w-36 p-3 items-center gap-1.5")}>
        {showLogo && <div className="text-[8px] font-bold text-green-600">SELLERMAP</div>}
        <div className="w-24 h-24 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
          <QRGraphic />
        </div>
        <p className="text-[10px] font-bold text-center leading-tight">{product.name}</p>
        {showPrice && <p className="text-sm font-black">{displayPrice.toLocaleString("ru-RU")} ₽</p>}
      </div>
    );
  }

  // Default / batch_label / barcode_large
  return (
    <div className={cn(baseStyle, "w-52 p-3 gap-1.5")}>
      {showLogo && <div className="text-[8px] font-bold text-green-600">SELLERMAP</div>}
      <p className="text-xs font-bold">{product.name}</p>
      {showSku && <p className="text-[9px] text-gray-400">{product.sku}</p>}
      {template === "batch_label" && product.batchNumber && (
        <div className="rounded bg-gray-100 px-2 py-1">
          <p className="text-[9px] text-gray-600">Партия: {product.batchNumber}</p>
          {product.expiryDate && <p className="text-[9px] text-gray-600">Годен до: {product.expiryDate}</p>}
        </div>
      )}
      {showBarcode && <div className="flex justify-center py-1"><BarcodeGraphic wide /></div>}
      {showPrice && <p className="text-base font-black mt-auto">{displayPrice.toLocaleString("ru-RU")} ₽</p>}
    </div>
  );
}

function BarcodeGraphic({ wide }: { wide?: boolean }) {
  const bars = Array.from({ length: wide ? 30 : 20 }, (_, i) => ({
    w: [1, 1, 2, 1, 3, 1, 2, 1, 1, 2, 1, 1, 2, 3, 1, 2, 1, 1, 2, 1, 3, 2, 1, 1, 2, 1, 1, 3, 2, 1][i % 30],
    type: i % 3 === 0 ? "bar" : "gap",
  }));
  return (
    <div className="flex items-end gap-px h-8">
      {bars.map((b, i) => (
        <div
          key={i}
          className={cn("rounded-sm", b.type === "bar" ? "bg-black" : "bg-transparent")}
          style={{ width: b.w * 2, height: b.type === "bar" ? (12 + (b.w * 4)) : 0 }}
        />
      ))}
    </div>
  );
}

function DataMatrixGraphic() {
  const cells = Array.from({ length: 100 }, (_, i) => Math.random() > 0.5);
  return (
    <div className="grid grid-cols-10 gap-px p-1 bg-white">
      {cells.map((on, i) => (
        <div key={i} className={cn("w-1.5 h-1.5", on ? "bg-black" : "bg-white")} />
      ))}
    </div>
  );
}

function QRGraphic() {
  const cells = Array.from({ length: 225 }, (_, i) => {
    const row = Math.floor(i / 15);
    const col = i % 15;
    if ((row < 7 && col < 7) || (row < 7 && col > 7) || (row > 7 && col < 7)) return "finder";
    return Math.random() > 0.5 ? "on" : "off";
  });
  return (
    <div className="grid grid-cols-15 gap-px p-1 bg-white" style={{ gridTemplateColumns: "repeat(15, 1fr)" }}>
      {cells.map((cell, i) => (
        <div key={i} className={cn("w-1 h-1", cell === "finder" || cell === "on" ? "bg-black" : "bg-white")} />
      ))}
    </div>
  );
}

function ToggleSetting({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 rounded-full transition",
          checked ? "bg-[var(--c-green)]" : "bg-[var(--c-border2)]",
        )}
      >
        <span className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
          checked ? "left-5" : "left-0.5",
        )} />
      </div>
      <span className="text-xs text-[var(--c-text2)]">{label}</span>
    </label>
  );
}

function ProductPickerInline({ onSelect }: { onSelect: (p: Product) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const results = PRODUCTS.filter((p) =>
    q && (p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase())),
  ).slice(0, 5);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-xl border border-dashed border-[var(--c-border2)] bg-[var(--c-bg3)] px-4 py-2.5 text-sm text-[var(--c-text2)] hover:border-[var(--c-green)] transition"
      >
        <Plus size={14} />
        Добавить товар для печати
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-xl">
          <div className="p-3 border-b border-[var(--c-border)]">
            <input
              autoFocus
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск товара..."
              className="h-8 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {results.length === 0 && q && (
              <p className="py-4 text-center text-xs text-[var(--c-text3)]">Не найдено</p>
            )}
            {results.length === 0 && !q && PRODUCTS.slice(0, 5).map((p) => (
              <button key={p.id} onClick={() => { onSelect(p); setOpen(false); setQ(""); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--c-text)] hover:bg-[var(--c-bg3)] transition">
                <Package size={13} className="text-[var(--c-text3)]" />
                <span className="flex-1 text-left">{p.name}</span>
                <span className="text-xs text-[var(--c-text3)]">{p.sku}</span>
              </button>
            ))}
            {results.map((p) => (
              <button key={p.id} onClick={() => { onSelect(p); setOpen(false); setQ(""); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--c-text)] hover:bg-[var(--c-bg3)] transition">
                <Package size={13} className="text-[var(--c-text3)]" />
                <span className="flex-1 text-left">{p.name}</span>
                <span className="text-xs text-[var(--c-text3)]">{p.sku}</span>
              </button>
            ))}
          </div>
          <div className="p-2 border-t border-[var(--c-border)]">
            <button onClick={() => setOpen(false)} className="w-full text-xs text-center text-[var(--c-text3)] hover:text-[var(--c-text)] transition">
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
