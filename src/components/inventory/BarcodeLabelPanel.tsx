"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Printer,
  Download,
  ScanBarcode,
  Tag,
  Check,
  Plus,
  Minus,
  RefreshCw,
  Package,
  Search,
  AlertCircle,
  Copy,
} from "lucide-react";
import { type Product } from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

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

const TEMPLATES: {
  id: LabelTemplate;
  name: string;
  description: string;
  size: string;
  symbol: string;
}[] = [
  { id: "price_tag",     name: "Ценник",              description: "Название, цена, штрихкод", size: "58×40 мм",  symbol: "🏷" },
  { id: "barcode_small", name: "Малый штрихкод",       description: "Только штрихкод + SKU",   size: "40×20 мм",  symbol: "▌▌▌" },
  { id: "barcode_large", name: "Большой штрихкод",     description: "Штрихкод + название",     size: "80×50 мм",  symbol: "▌▌▌▌" },
  { id: "shelf_label",   name: "Полочный ценник",      description: "Для стеллажей и витрин",  size: "100×30 мм", symbol: "📦" },
  { id: "batch_label",   name: "Партионная этикетка",  description: "Партия + срок годности",  size: "70×50 мм",  symbol: "📋" },
  { id: "data_matrix",  name: "Data Matrix",           description: "Честный Знак маркировка", size: "30×30 мм",  symbol: "▦" },
  { id: "qr_label",     name: "QR этикетка",           description: "QR-код + название",       size: "50×50 мм",  symbol: "▣" },
];

type PrintQty = { productId: string; qty: number };

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Deterministic barcode-like number from SKU (13 digits). */
function generateBarcode(sku: string): string {
  return sku
    .split("")
    .map((c) => c.charCodeAt(0).toString())
    .join("")
    .slice(0, 13)
    .padEnd(13, "0");
}

/** Generate CSS barcode bars from a barcode string. */
function barcodePattern(code: string): number[] {
  const widths = [1, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 2, 1];
  return code.split("").map((ch, i) => {
    const digit = parseInt(ch, 10);
    return widths[(i + digit) % widths.length];
  });
}

/** Build the complete HTML string for the print window. */
function buildPrintHTML(
  items: { product: Product; qty: number }[],
  template: LabelTemplate,
  opts: {
    showLogo: boolean;
    showSku: boolean;
    showBarcode: boolean;
    showPrice: boolean;
    customPrice: string;
    showSale: boolean;
    salePercent: number;
  },
): string {
  const labelCss = `
    @page { margin: 4mm; }
    body { margin: 0; font-family: Arial, sans-serif; background: white; }
    .page { display: flex; flex-wrap: wrap; gap: 4mm; padding: 4mm; }
    .label {
      box-sizing: border-box;
      border: 0.5px solid #ccc;
      background: white;
      overflow: hidden;
      page-break-inside: avoid;
      display: flex;
      flex-direction: column;
    }
    .label-price-tag { width: 58mm; min-height: 40mm; padding: 2mm 3mm; gap: 1mm; }
    .label-barcode-small { width: 40mm; min-height: 20mm; padding: 1.5mm; align-items: center; }
    .label-barcode-large { width: 80mm; min-height: 50mm; padding: 3mm; gap: 1.5mm; }
    .label-shelf { width: 100mm; height: 30mm; flex-direction: row; align-items: center; padding: 2mm 3mm; gap: 3mm; }
    .label-batch { width: 70mm; min-height: 50mm; padding: 3mm; gap: 1.5mm; }
    .label-dm { width: 30mm; min-height: 30mm; padding: 2mm; align-items: center; gap: 1mm; }
    .label-qr { width: 50mm; min-height: 50mm; padding: 3mm; align-items: center; gap: 1.5mm; }
    .logo { font-size: 7px; font-weight: bold; color: #16a34a; letter-spacing: 0.5px; }
    .name { font-size: 9px; font-weight: bold; line-height: 1.3; }
    .sku { font-size: 7px; color: #888; font-family: monospace; }
    .barcode-num { font-size: 7px; font-family: monospace; color: #444; text-align: center; margin-top: 1px; }
    .price { font-size: 16px; font-weight: 900; margin-top: auto; }
    .price-sale { font-size: 16px; font-weight: 900; color: #dc2626; }
    .price-orig { font-size: 8px; color: #aaa; text-decoration: line-through; }
    .bars { display: flex; align-items: flex-end; gap: 0.5px; height: 20px; justify-content: center; }
    .bar { background: black; border-radius: 0.5px; }
    .dm-grid { display: grid; grid-template-columns: repeat(10, 1fr); gap: 0.5px; padding: 1px; background: white; }
    .dm-cell { aspect-ratio: 1; }
    .qr-grid { display: grid; grid-template-columns: repeat(15, 1fr); gap: 0.3px; padding: 1px; background: white; }
    .qr-cell { aspect-ratio: 1; }
    .batch-info { font-size: 7.5px; background: #f5f5f5; padding: 1.5mm; border-radius: 1mm; }
    @media print { .label { border: none; } }
  `;

  function renderBars(code: string): string {
    const pattern = barcodePattern(code);
    return pattern
      .map((w) => `<div class="bar" style="width:${w * 1.5}px;height:${14 + w * 2}px"></div>`)
      .join("");
  }

  function renderDM(): string {
    // Deterministic pseudo-random pattern seeded by position
    const cells = Array.from({ length: 100 }, (_, i) => {
      const row = Math.floor(i / 10);
      const col = i % 10;
      if (row === 0 || col === 0) return true; // border rows
      if (row === 9) return col % 2 === 0;
      return (row * 7 + col * 13) % 3 !== 0;
    });
    return `<div class="dm-grid">${cells.map((on) => `<div class="dm-cell" style="background:${on ? "black" : "white"}"></div>`).join("")}</div>`;
  }

  function renderLabel(product: Product): string {
    const displayPrice = opts.customPrice
      ? parseFloat(opts.customPrice)
      : product.price;
    const salePrice =
      opts.showSale
        ? Math.round(displayPrice * (1 - opts.salePercent / 100))
        : null;
    const code = generateBarcode(product.sku);
    const barcodeVal = product.barcode ?? code;

    const logoHtml = opts.showLogo
      ? `<div class="logo">SELLERMAP</div>`
      : "";
    const skuHtml = opts.showSku
      ? `<div class="sku">${product.sku}</div>`
      : "";
    const barcodeHtml = opts.showBarcode
      ? `<div class="bars">${renderBars(code)}</div><div class="barcode-num">${barcodeVal}</div>`
      : "";
    const priceHtml = opts.showPrice
      ? salePrice !== null
        ? `<div style="margin-top:auto"><span class="price-sale">${salePrice.toLocaleString("ru-RU")} ₽</span> <span class="price-orig">${displayPrice.toLocaleString("ru-RU")} ₽</span></div>`
        : `<div class="price" style="margin-top:auto">${displayPrice.toLocaleString("ru-RU")} ₽</div>`
      : "";

    if (template === "price_tag") {
      return `
        <div class="label label-price-tag">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div class="name" style="max-width:70%;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${product.name}</div>
            ${opts.showLogo ? `<div class="logo" style="text-align:right">SELLERMAP</div>` : ""}
          </div>
          ${skuHtml}
          ${barcodeHtml}
          ${priceHtml}
        </div>`;
    }

    if (template === "barcode_small") {
      return `
        <div class="label label-barcode-small">
          ${barcodeHtml || `<div class="bars">${renderBars(code)}</div><div class="barcode-num">${barcodeVal}</div>`}
          ${skuHtml}
        </div>`;
    }

    if (template === "shelf_label") {
      return `
        <div class="label label-shelf">
          ${opts.showBarcode ? `<div>${`<div class="bars" style="height:16px">${renderBars(code)}</div>`}</div>` : ""}
          <div style="flex:1;min-width:0">
            <div class="name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${product.name}</div>
            ${skuHtml}
          </div>
          ${opts.showPrice ? (salePrice !== null
            ? `<div style="text-align:right;flex-shrink:0"><span class="price-sale" style="font-size:14px">${salePrice.toLocaleString("ru-RU")} ₽</span><br><span class="price-orig">${displayPrice.toLocaleString("ru-RU")} ₽</span></div>`
            : `<div class="price" style="flex-shrink:0;font-size:14px">${displayPrice.toLocaleString("ru-RU")} ₽</div>`) : ""}
        </div>`;
    }

    if (template === "data_matrix") {
      return `
        <div class="label label-dm">
          ${renderDM()}
          ${skuHtml}
          ${opts.showPrice ? `<div class="price" style="font-size:10px">${displayPrice.toLocaleString("ru-RU")} ₽</div>` : ""}
        </div>`;
    }

    // barcode_large, batch_label, qr_label, default
    return `
      <div class="label label-barcode-large">
        ${logoHtml}
        <div class="name">${product.name}</div>
        ${skuHtml}
        ${template === "batch_label" && product.batchNumber
          ? `<div class="batch-info">Партия: ${product.batchNumber}${product.expiryDate ? `<br>Годен до: ${product.expiryDate}` : ""}</div>`
          : ""}
        ${barcodeHtml}
        ${priceHtml}
      </div>`;
  }

  const labelsHtml = items
    .flatMap(({ product, qty }) => Array.from({ length: qty }, () => renderLabel(product)))
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>Этикетки — SellerMap</title>
  <style>${labelCss}</style>
</head>
<body>
  <div class="page">${labelsHtml}</div>
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
</body>
</html>`;
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function BarcodeLabelPanel({ product: initialProduct, onClose }: Props) {
  const { products } = useInventory();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(
    initialProduct ?? null,
  );
  const [template, setTemplate] = useState<LabelTemplate>("price_tag");
  const [printItems, setPrintItems] = useState<PrintQty[]>(
    initialProduct ? [{ productId: initialProduct.id, qty: 1 }] : [],
  );
  const [printing, setPrinting] = useState(false);
  const [printed, setPrinted] = useState(false);
  const [customPrice, setCustomPrice] = useState<string>("");
  const [showSale, setShowSale] = useState(false);
  const [salePercent, setSalePercent] = useState("10");
  const [showLogo, setShowLogo] = useState(true);
  const [showSku, setShowSku] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showPrice, setShowPrice] = useState(true);

  // Barcode scanner state
  const [scanInput, setScanInput] = useState("");
  const [scanResult, setScanResult] = useState<
    | { status: "found"; product: Product }
    | { status: "not_found"; query: string }
    | null
  >(null);
  const scanRef = useRef<HTMLInputElement>(null);

  // Auto-focus the scanner input when panel opens
  useEffect(() => {
    const timer = setTimeout(() => scanRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, []);

  function addProduct(p: Product) {
    if (printItems.find((i) => i.productId === p.id)) return;
    setPrintItems((prev) => [...prev, { productId: p.id, qty: 1 }]);
    setSelectedProduct(p);
  }

  function updateQty(productId: string, delta: number) {
    setPrintItems((prev) =>
      prev.map((i) =>
        i.productId === productId
          ? { ...i, qty: Math.min(100, Math.max(1, i.qty + delta)) }
          : i,
      ),
    );
  }

  function removeItem(productId: string) {
    setPrintItems((prev) => prev.filter((i) => i.productId !== productId));
    if (selectedProduct?.id === productId) setSelectedProduct(null);
  }

  // Barcode scan: searches by barcode field, internalBarcode, or SKU
  function handleScan(e: React.FormEvent) {
    e.preventDefault();
    const q = scanInput.trim();
    if (!q) return;

    const found = products.find(
      (p) =>
        p.barcode === q ||
        p.internalBarcode === q ||
        p.sku.toLowerCase() === q.toLowerCase() ||
        generateBarcode(p.sku) === q,
    );

    setScanResult(found ? { status: "found", product: found } : { status: "not_found", query: q });
    setScanInput("");
    // Keep scanner focused for rapid scanning
    scanRef.current?.focus();
  }

  function addScannedProduct() {
    if (scanResult?.status === "found") {
      addProduct(scanResult.product);
      setScanResult(null);
    }
  }

  function handlePrint() {
    if (printItems.length === 0) return;
    const items = printItems
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return product ? { product, qty: item.qty } : null;
      })
      .filter((x): x is { product: Product; qty: number } => x !== null);

    if (items.length === 0) return;

    setPrinting(true);

    const html = buildPrintHTML(items, template, {
      showLogo,
      showSku,
      showBarcode,
      showPrice,
      customPrice,
      showSale,
      salePercent: parseInt(salePercent) || 0,
    });

    const win = window.open("", "_blank", "width=900,height=650");
    if (win) {
      win.document.write(html);
      win.document.close();
    }

    setTimeout(() => {
      setPrinting(false);
      setPrinted(true);
      setTimeout(() => setPrinted(false), 2500);
    }, 800);
  }

  const totalLabels = printItems.reduce((s, i) => s + i.qty, 0);
  const previewProduct = selectedProduct ?? products[0];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative ml-auto flex h-full w-full max-w-2xl flex-col bg-[var(--c-bg)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--c-text)]">
              Печать этикеток
            </h2>
            <p className="text-xs text-[var(--c-text2)]">
              Настройте шаблон и распечатайте этикетки
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 p-6">
            {/* ── Barcode scanner ─────────────────────────────────────── */}
            <div>
              <h3 className="mb-3 border-b border-[var(--c-border)] pb-2 text-sm font-semibold text-[var(--c-text)]">
                Сканировать штрихкод
              </h3>
              <form onSubmit={handleScan} className="flex gap-2">
                <div className="relative flex-1">
                  <ScanBarcode
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)]"
                  />
                  <input
                    ref={scanRef}
                    type="text"
                    value={scanInput}
                    onChange={(e) => {
                      setScanInput(e.target.value);
                      setScanResult(null);
                    }}
                    placeholder="Поднесите сканер или введите штрихкод/SKU..."
                    className="h-9 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] pl-9 pr-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-xs text-[var(--c-text2)] transition hover:text-[var(--c-text)]"
                >
                  <Search size={13} />
                  Найти
                </button>
              </form>

              {/* Scan result */}
              {scanResult && (
                <div
                  className={cn(
                    "mt-2 flex items-center gap-3 rounded-lg border px-3 py-2.5",
                    scanResult.status === "found"
                      ? "border-[rgba(52,211,153,0.25)] bg-[var(--c-green-dim)]"
                      : "border-[rgba(240,80,80,0.2)] bg-[var(--c-red-dim)]",
                  )}
                >
                  {scanResult.status === "found" ? (
                    <>
                      <Check
                        size={15}
                        className="shrink-0 text-[var(--c-green)]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--c-text)] truncate">
                          {scanResult.product.name}
                        </p>
                        <p className="text-xs text-[var(--c-text3)]">
                          {scanResult.product.sku} ·{" "}
                          {scanResult.product.price.toLocaleString("ru-RU")} ₽
                        </p>
                      </div>
                      <button
                        onClick={addScannedProduct}
                        className="shrink-0 rounded-lg bg-[var(--c-green)] px-3 py-1 text-xs font-semibold text-[var(--c-bg)] transition hover:bg-[#25e890]"
                      >
                        + Добавить
                      </button>
                    </>
                  ) : (
                    <>
                      <AlertCircle
                        size={15}
                        className="shrink-0 text-[var(--c-red)]"
                      />
                      <p className="text-sm text-[var(--c-text2)]">
                        Товар не найден:{" "}
                        <span className="font-mono text-xs text-[var(--c-text)]">
                          {scanResult.query}
                        </span>
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ── Template selection ──────────────────────────────────── */}
            <div>
              <h3 className="mb-3 border-b border-[var(--c-border)] pb-2 text-sm font-semibold text-[var(--c-text)]">
                Шаблон этикетки
              </h3>
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
                    <span className="text-xl leading-none">{t.symbol}</span>
                    <div>
                      <p
                        className={cn(
                          "text-xs font-semibold leading-tight",
                          template === t.id
                            ? "text-[var(--c-green)]"
                            : "text-[var(--c-text)]",
                        )}
                      >
                        {t.name}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[var(--c-text3)]">
                        {t.size}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Label preview ────────────────────────────────────────── */}
            <div>
              <h3 className="mb-3 border-b border-[var(--c-border)] pb-2 text-sm font-semibold text-[var(--c-text)]">
                Предпросмотр
              </h3>
              <div className="flex items-center justify-center rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] py-10">
                {previewProduct ? (
                  <LabelPreview
                    template={template}
                    product={previewProduct}
                    showLogo={showLogo}
                    showSku={showSku}
                    showBarcode={showBarcode}
                    showPrice={showPrice}
                    customPrice={customPrice}
                    showSale={showSale}
                    salePercent={parseInt(salePercent) || 0}
                  />
                ) : (
                  <p className="text-xs text-[var(--c-text3)]">
                    Выберите товар для предпросмотра
                  </p>
                )}
              </div>
            </div>

            {/* ── Settings ─────────────────────────────────────────────── */}
            <div>
              <h3 className="mb-3 border-b border-[var(--c-border)] pb-2 text-sm font-semibold text-[var(--c-text)]">
                Настройки
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <ToggleSetting
                    label="Показывать логотип"
                    checked={showLogo}
                    onChange={setShowLogo}
                  />
                  <ToggleSetting
                    label="Показывать SKU"
                    checked={showSku}
                    onChange={setShowSku}
                  />
                  <ToggleSetting
                    label="Штрихкод"
                    checked={showBarcode}
                    onChange={setShowBarcode}
                  />
                  <ToggleSetting
                    label="Цена"
                    checked={showPrice}
                    onChange={setShowPrice}
                  />
                  <ToggleSetting
                    label="Акционная цена"
                    checked={showSale}
                    onChange={setShowSale}
                  />
                </div>

                {showSale && (
                  <div className="flex items-center gap-3 rounded-lg border border-[rgba(245,166,35,0.2)] bg-[var(--c-amber-dim)] px-4 py-3">
                    <span className="text-sm text-[var(--c-amber)]">
                      Скидка:
                    </span>
                    <input
                      type="number"
                      value={salePercent}
                      onChange={(e) => setSalePercent(e.target.value)}
                      className="w-20 rounded-lg border border-[rgba(245,166,35,0.3)] bg-transparent px-2 py-1 text-center text-sm text-[var(--c-amber)] focus:outline-none"
                      min={1}
                      max={99}
                    />
                    <span className="text-sm text-[var(--c-amber)]">%</span>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
                    Переопределить цену
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--c-text3)]">
                      ₽
                    </span>
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

            {/* ── Products to print ─────────────────────────────────────── */}
            <div>
              <h3 className="mb-3 border-b border-[var(--c-border)] pb-2 text-sm font-semibold text-[var(--c-text)]">
                Товары для печати
              </h3>

              {printItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--c-border2)] bg-[var(--c-bg3)] py-8 text-center">
                  <Package size={24} className="mb-2 text-[var(--c-text3)]" />
                  <p className="text-sm text-[var(--c-text3)]">
                    Добавьте товары для печати этикеток
                  </p>
                  <p className="mt-1 text-xs text-[var(--c-text3)]">
                    Сканируйте штрихкод или выберите вручную
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {printItems.map((item) => {
                    const p = products.find((p) => p.id === item.productId);
                    if (!p) return null;
                    const code = generateBarcode(p.sku);
                    return (
                      <div
                        key={item.productId}
                        onClick={() => setSelectedProduct(p)}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition",
                          selectedProduct?.id === p.id
                            ? "border-[var(--c-green)] bg-[var(--c-green-dim)]"
                            : "border-[var(--c-border)] bg-[var(--c-bg3)] hover:border-[var(--c-border2)]",
                        )}
                      >
                        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)]">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm">
                              📦
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[var(--c-text)]">
                            {p.name}
                          </p>
                          <p className="font-mono text-[10px] text-[var(--c-text3)]">
                            {code}
                          </p>
                        </div>
                        {/* Qty stepper */}
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateQty(item.productId, -1);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--c-border2)] text-[var(--c-text2)] transition hover:text-[var(--c-text)]"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-10 text-center text-sm font-semibold tabular-nums text-[var(--c-text)]">
                            {item.qty}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateQty(item.productId, 1);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--c-border2)] text-[var(--c-text2)] transition hover:text-[var(--c-text)]"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItem(item.productId);
                          }}
                          className="text-[var(--c-text3)] transition hover:text-[var(--c-red)]"
                        >
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

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="border-t border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          {totalLabels > 0 && (
            <p className="mb-3 text-center text-xs text-[var(--c-text2)]">
              Будет напечатано{" "}
              <span className="font-semibold text-[var(--c-text)]">
                {totalLabels}
              </span>{" "}
              {totalLabels === 1
                ? "этикетка"
                : totalLabels < 5
                  ? "этикетки"
                  : "этикеток"}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (printItems.length === 0) return;
                const items = printItems
                  .map((item) => {
                    const p = products.find((p) => p.id === item.productId);
                    return p ? { product: p, qty: item.qty } : null;
                  })
                  .filter((x): x is { product: Product; qty: number } => x !== null);
                const html = buildPrintHTML(items, template, {
                  showLogo, showSku, showBarcode, showPrice,
                  customPrice, showSale,
                  salePercent: parseInt(salePercent) || 0,
                });
                const blob = new Blob([html], { type: "text/html" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "etiketi_sellermap.html";
                a.click();
                URL.revokeObjectURL(url);
              }}
              disabled={printItems.length === 0}
              className={cn(
                "flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border text-sm transition",
                printItems.length > 0
                  ? "border-[var(--c-border2)] text-[var(--c-text2)] hover:text-[var(--c-text)]"
                  : "border-[var(--c-border)] text-[var(--c-text3)] cursor-not-allowed opacity-50",
              )}
            >
              <Download size={14} />
              Скачать HTML
            </button>
            <button
              onClick={handlePrint}
              disabled={printItems.length === 0 || printing}
              className={cn(
                "flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition",
                printItems.length > 0 && !printing
                  ? "bg-[var(--c-green)] text-[var(--c-bg)] hover:bg-[#25e890]"
                  : "cursor-not-allowed bg-[var(--c-bg3)] text-[var(--c-text3)]",
              )}
            >
              {printing ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Открываю окно...
                </>
              ) : printed ? (
                <>
                  <Check size={14} />
                  Отправлено на печать!
                </>
              ) : (
                <>
                  <Printer size={14} />
                  Напечатать
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Label Preview Component ───────────────────────────────────────────────────

interface LabelPreviewProps {
  template: LabelTemplate;
  product: Product;
  showLogo: boolean;
  showSku: boolean;
  showBarcode: boolean;
  showPrice: boolean;
  customPrice: string;
  showSale: boolean;
  salePercent: number;
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
}: LabelPreviewProps) {
  const displayPrice = customPrice ? parseFloat(customPrice) : product.price;
  const salePrice =
    showSale ? Math.round(displayPrice * (1 - salePercent / 100)) : null;
  const barcodeNum = product.barcode ?? generateBarcode(product.sku);

  const base =
    "bg-white text-black rounded-lg border border-gray-200 shadow-lg flex flex-col overflow-hidden select-none";

  if (template === "price_tag") {
    return (
      <div className={cn(base, "w-56 p-3 gap-1.5")}>
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-xs font-bold leading-tight flex-1">
            {product.name}
          </p>
          {showLogo && (
            <span className="text-[8px] font-bold text-green-600 shrink-0">
              SELLERMAP
            </span>
          )}
        </div>
        {showSku && (
          <p className="font-mono text-[9px] text-gray-400">{product.sku}</p>
        )}
        {showBarcode && (
          <div className="flex flex-col items-center py-1 gap-0.5">
            <BarcodeGraphic code={barcodeNum} />
            <span className="font-mono text-[8px] text-gray-500">
              {barcodeNum}
            </span>
          </div>
        )}
        {showPrice && (
          <div className="mt-auto flex items-baseline gap-2">
            {salePrice !== null ? (
              <>
                <span className="text-xl font-black text-red-600">
                  {salePrice.toLocaleString("ru-RU")} ₽
                </span>
                <span className="text-xs text-gray-400 line-through">
                  {displayPrice.toLocaleString("ru-RU")} ₽
                </span>
              </>
            ) : (
              <span className="text-xl font-black">
                {displayPrice.toLocaleString("ru-RU")} ₽
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  if (template === "barcode_small") {
    return (
      <div className={cn(base, "w-32 items-center gap-1 p-2")}>
        <BarcodeGraphic code={barcodeNum} wide />
        <span className="font-mono text-[8px] text-gray-500">{barcodeNum}</span>
        {showSku && (
          <p className="font-mono text-[9px] text-gray-400">{product.sku}</p>
        )}
      </div>
    );
  }

  if (template === "shelf_label") {
    return (
      <div className={cn(base, "h-12 w-80 flex-row items-center gap-3 px-3")}>
        {showBarcode && (
          <div className="w-16 shrink-0">
            <BarcodeGraphic code={barcodeNum} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold">{product.name}</p>
          {showSku && (
            <p className="font-mono text-[9px] text-gray-400">{product.sku}</p>
          )}
        </div>
        {showPrice && (
          <div className="shrink-0 text-right">
            {salePrice !== null ? (
              <>
                <p className="text-base font-black text-red-600">
                  {salePrice.toLocaleString("ru-RU")} ₽
                </p>
                <p className="text-[9px] text-gray-400 line-through">
                  {displayPrice.toLocaleString("ru-RU")} ₽
                </p>
              </>
            ) : (
              <p className="text-base font-black">
                {displayPrice.toLocaleString("ru-RU")} ₽
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (template === "data_matrix") {
    return (
      <div className={cn(base, "w-28 items-center gap-1 p-2")}>
        <div className="flex h-20 w-20 items-center justify-center rounded border border-gray-200 bg-gray-50">
          <DataMatrixGraphic seed={product.sku} />
        </div>
        {showSku && (
          <p className="font-mono text-[9px] text-center text-gray-500">
            {product.sku}
          </p>
        )}
        {showPrice && (
          <p className="text-xs font-bold text-center">
            {displayPrice.toLocaleString("ru-RU")} ₽
          </p>
        )}
      </div>
    );
  }

  if (template === "qr_label") {
    return (
      <div className={cn(base, "w-36 items-center gap-1.5 p-3")}>
        {showLogo && (
          <div className="text-[8px] font-bold text-green-600">SELLERMAP</div>
        )}
        <div className="flex h-24 w-24 items-center justify-center rounded border border-gray-200 bg-gray-50">
          <QRGraphic seed={product.sku} />
        </div>
        <p className="text-center text-[10px] font-bold leading-tight">
          {product.name}
        </p>
        {showPrice && (
          <p className="text-sm font-black">
            {displayPrice.toLocaleString("ru-RU")} ₽
          </p>
        )}
      </div>
    );
  }

  // barcode_large, batch_label, default
  return (
    <div className={cn(base, "w-52 gap-1.5 p-3")}>
      <div className="flex items-start justify-between gap-1">
        {showLogo && (
          <div className="text-[8px] font-bold text-green-600">SELLERMAP</div>
        )}
      </div>
      <p className="text-xs font-bold">{product.name}</p>
      {showSku && (
        <p className="font-mono text-[9px] text-gray-400">{product.sku}</p>
      )}
      {template === "batch_label" && product.batchNumber && (
        <div className="rounded bg-gray-100 px-2 py-1">
          <p className="text-[9px] text-gray-600">Партия: {product.batchNumber}</p>
          {product.expiryDate && (
            <p className="text-[9px] text-gray-600">
              Годен до: {product.expiryDate}
            </p>
          )}
        </div>
      )}
      {showBarcode && (
        <div className="flex flex-col items-center gap-0.5 py-1">
          <BarcodeGraphic code={barcodeNum} wide />
          <span className="font-mono text-[8px] text-gray-500">{barcodeNum}</span>
        </div>
      )}
      {showPrice && (
        <p className="mt-auto text-base font-black">
          {displayPrice.toLocaleString("ru-RU")} ₽
        </p>
      )}
    </div>
  );
}

// ── Barcode graphic ───────────────────────────────────────────────────────────

function BarcodeGraphic({ code, wide }: { code: string; wide?: boolean }) {
  const displayCode = wide ? code : code.slice(0, 9);
  const pattern = barcodePattern(displayCode);
  // Interleave bars and gaps
  return (
    <div className="flex items-end gap-px" style={{ height: 28 }}>
      {pattern.map((w, i) => {
        const isBar = i % 2 === 0;
        const h = isBar ? 14 + w * 3 : 0;
        return (
          <div
            key={i}
            className={isBar ? "rounded-[0.5px] bg-black" : ""}
            style={{ width: w * 2, height: h }}
          />
        );
      })}
    </div>
  );
}

// ── DataMatrix placeholder ────────────────────────────────────────────────────

function DataMatrixGraphic({ seed }: { seed: string }) {
  // Deterministic pattern from seed — no Math.random so it's stable on re-render
  const cells = Array.from({ length: 100 }, (_, i) => {
    const row = Math.floor(i / 10);
    const col = i % 10;
    if (row === 0 || col === 0) return true;
    if (row === 9) return col % 2 === 0;
    const charCode = seed.charCodeAt(i % seed.length) || 65;
    return (charCode + row * 3 + col * 7) % 3 !== 0;
  });
  return (
    <div
      className="grid gap-px bg-white p-0.5"
      style={{ gridTemplateColumns: "repeat(10,1fr)", width: 60, height: 60 }}
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

// ── QR placeholder ────────────────────────────────────────────────────────────

function QRGraphic({ seed }: { seed: string }) {
  const SIZE = 15;
  const cells = Array.from({ length: SIZE * SIZE }, (_, i) => {
    const row = Math.floor(i / SIZE);
    const col = i % SIZE;
    // Finder patterns (top-left, top-right, bottom-left corners)
    if (
      (row < 7 && col < 7) ||
      (row < 7 && col >= SIZE - 7) ||
      (row >= SIZE - 7 && col < 7)
    ) {
      return true;
    }
    const charCode = seed.charCodeAt(i % seed.length) || 65;
    return (charCode + row * 5 + col * 11) % 2 === 0;
  });
  return (
    <div
      className="grid gap-px bg-white p-0.5"
      style={{ gridTemplateColumns: `repeat(${SIZE},1fr)`, width: 84, height: 84 }}
    >
      {cells.map((on, i) => (
        <div key={i} style={{ background: on ? "black" : "white", aspectRatio: "1" }} />
      ))}
    </div>
  );
}

// ── Toggle setting ────────────────────────────────────────────────────────────

function ToggleSetting({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5">
      <div
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 rounded-full transition",
          checked ? "bg-[var(--c-green)]" : "bg-[var(--c-border2)]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
            checked ? "left-5" : "left-0.5",
          )}
        />
      </div>
      <span className="text-xs text-[var(--c-text2)]">{label}</span>
    </label>
  );
}

// ── Product picker ────────────────────────────────────────────────────────────

function ProductPickerInline({ onSelect }: { onSelect: (p: Product) => void }) {
  const { products } = useInventory();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const results = products
    .filter(
      (p) =>
        q &&
        (p.name.toLowerCase().includes(q.toLowerCase()) ||
          p.sku.toLowerCase().includes(q.toLowerCase())),
    )
    .slice(0, 6);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-xl border border-dashed border-[var(--c-border2)] bg-[var(--c-bg3)] px-4 py-2.5 text-sm text-[var(--c-text2)] transition hover:border-[var(--c-green)]"
      >
        <Plus size={14} />
        Добавить товар для печати
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-xl">
          <div className="border-b border-[var(--c-border)] p-3">
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
              <p className="py-4 text-center text-xs text-[var(--c-text3)]">
                Не найдено
              </p>
            )}
            {(results.length > 0 ? results : products.slice(0, 6)).map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onSelect(p);
                  setOpen(false);
                  setQ("");
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--c-text)] transition hover:bg-[var(--c-bg3)]"
              >
                <Package size={13} className="text-[var(--c-text3)]" />
                <span className="min-w-0 flex-1 truncate text-left">
                  {p.name}
                </span>
                <span className="shrink-0 font-mono text-xs text-[var(--c-text3)]">
                  {p.sku}
                </span>
              </button>
            ))}
          </div>
          <div className="border-t border-[var(--c-border)] p-2">
            <button
              onClick={() => setOpen(false)}
              className="w-full text-center text-xs text-[var(--c-text3)] transition hover:text-[var(--c-text)]"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
