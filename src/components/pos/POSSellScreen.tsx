"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Search,
  X,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  Printer,
  RotateCcw,
  Package,
  ChevronDown,
  Tag,
  Percent,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import { useInventory } from "@/contexts/InventoryContext";
import { cn, formatRub } from "@/lib/utils";
import { getAvailableStock } from "@/mock/inventory";
import type { Product, Order, OrderItem } from "@/mock/inventory";
import { BarcodeInput } from "@/components/ui/BarcodeInput";
import { toast } from "sonner";

// ── Local types ──────────────────────────────────────────────────────────────

interface CartItem {
  product: Product;
  qty: number;
  unitPrice: number;
}

type PaymentMethod = "cash" | "card" | "sbp";
type DiscountMode = "amount" | "pct";

interface ReceiptData {
  orderId: string;
  orderNumber: string;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashTendered: number;
  change: number;
  locationName: string;
  createdAt: Date;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateOrderNumber(): string {
  const ts = Date.now().toString().slice(-6);
  const rnd = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0");
  return `POS-${ts}${rnd}`;
}

function generateId(): string {
  return `pos-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function fmt(n: number): string {
  return formatRub(n);
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDateFull(d: Date): string {
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Наличные",
  card: "Банковская карта",
  sbp: "СБП",
};

// ── Sub-components ───────────────────────────────────────────────────────────

function ProductCard({
  product,
  available,
  onAdd,
}: {
  product: Product;
  available: number;
  onAdd: (p: Product) => void;
}) {
  const outOfStock = getAvailableStock(product) === 0;

  function handleClick() {
    if (outOfStock) {
      toast.error("Товар недоступен — нет в наличии");
      return;
    }
    onAdd(product);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "relative flex flex-col gap-2 rounded-xl p-3 text-left transition-all duration-150 border min-h-[44px]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-green)]",
        outOfStock
          ? "border-[var(--c-border)] bg-[var(--c-bg2)] opacity-50 grayscale cursor-not-allowed"
          : "border-[var(--c-border)] bg-[var(--c-bg2)] hover:border-[var(--c-border2)] hover:bg-[var(--c-bg3)] cursor-pointer active:scale-[0.97]",
      )}
    >
      {/* Image */}
      <div className="w-full aspect-square rounded-lg overflow-hidden bg-[var(--c-bg3)] flex items-center justify-center">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package className="w-8 h-8 text-[var(--c-text3)]" />
        )}
      </div>

      {/* Out-of-stock overlay badge */}
      {outOfStock && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl">
          <span className="bg-[var(--c-red-dim)] text-[var(--c-red)] text-[10px] font-semibold px-2 py-1 rounded-full border border-[var(--c-red)]/30">
            Нет в наличии
          </span>
        </div>
      )}

      {/* Stock badge */}
      <span
        className={cn(
          "absolute top-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
          outOfStock
            ? "bg-[var(--c-red-dim)] text-[var(--c-red)]"
            : available <= 3
              ? "bg-[var(--c-amber-dim)] text-[var(--c-amber)]"
              : "bg-[var(--c-green-dim)] text-[var(--c-green)]",
        )}
      >
        {outOfStock ? "Нет" : `${available} шт`}
      </span>

      {/* Info */}
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-[var(--c-text2)] truncate">{product.sku}</span>
        <span className="text-sm font-medium text-[var(--c-text)] leading-tight line-clamp-2">
          {product.name}
        </span>
        <span className="text-base font-semibold text-[var(--c-green)] mt-1 tabular">
          {fmt(product.price)}
        </span>
      </div>
    </button>
  );
}

function CartRow({
  item,
  maxQty,
  onInc,
  onDec,
  onRemove,
}: {
  item: CartItem;
  maxQty: number;
  onInc: () => void;
  onDec: () => void;
  onRemove: () => void;
}) {
  const lineTotal = item.qty * item.unitPrice;

  return (
    <div className="flex items-start gap-2 py-3 border-b border-[var(--c-border)] last:border-0">
      {/* Name + price */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--c-text)] leading-snug font-medium truncate">
          {item.product.name}
        </p>
        <p className="text-xs text-[var(--c-text3)] mt-0.5">{item.product.sku}</p>
        <p className="text-xs text-[var(--c-text2)] mt-0.5 tabular">{fmt(item.unitPrice)} × шт</p>
      </div>

      {/* Qty controls */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={onDec}
          className="w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--c-bg3)] hover:bg-[var(--c-border2)] text-[var(--c-text2)] transition-colors"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="w-8 text-center text-sm font-semibold text-[var(--c-text)] tabular">
          {item.qty}
        </span>
        <button
          type="button"
          onClick={onInc}
          disabled={item.qty >= maxQty}
          className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
            item.qty >= maxQty
              ? "bg-[var(--c-bg3)] text-[var(--c-text3)] cursor-not-allowed"
              : "bg-[var(--c-bg3)] hover:bg-[var(--c-border2)] text-[var(--c-text2)]",
          )}
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Line total + remove */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0 min-w-[72px]">
        <span className="text-sm font-semibold text-[var(--c-text)] tabular">{fmt(lineTotal)}</span>
        <button
          type="button"
          onClick={onRemove}
          className="text-[var(--c-text3)] hover:text-[var(--c-red)] transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function LocationSelector({
  locations,
  selectedId,
  onChange,
}: {
  locations: { id: string; name: string }[];
  selectedId: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = locations.find((l) => l.id === selectedId);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--c-bg3)] border border-[var(--c-border)] hover:border-[var(--c-border2)] transition-colors text-sm text-[var(--c-text2)]"
      >
        <MapPin className="w-3.5 h-3.5 text-[var(--c-green)]" />
        <span className="max-w-[140px] truncate">{selected?.name ?? selectedId}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 min-w-[200px] rounded-xl bg-[var(--c-bg2)] border border-[var(--c-border2)] shadow-xl overflow-hidden">
          {locations.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => {
                onChange(loc.id);
                setOpen(false);
              }}
              className={cn(
                "w-full px-3 py-2 text-left text-sm transition-colors",
                loc.id === selectedId
                  ? "bg-[var(--c-green-dim)] text-[var(--c-green)]"
                  : "text-[var(--c-text2)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]",
              )}
            >
              {loc.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Receipt Modal ─────────────────────────────────────────────────────────────

function ReceiptModal({
  receipt,
  onNewSale,
}: {
  receipt: ReceiptData;
  onNewSale: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      {/* Print-only style */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #pos-receipt-print { display: block !important; }
        }
        #pos-receipt-print { display: none; }
      `}</style>

      {/* Screen receipt */}
      <div className="relative w-full max-w-sm bg-[var(--c-bg2)] border border-[var(--c-border2)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Success header */}
        <div className="flex flex-col items-center gap-2 px-6 pt-8 pb-5 bg-[var(--c-green-dim)] border-b border-[var(--c-border)]">
          <CheckCircle2 className="w-12 h-12 text-[var(--c-green)]" />
          <h2 className="text-lg font-semibold text-[var(--c-text)]">Продажа проведена</h2>
          <p className="text-sm text-[var(--c-text2)]">{receipt.orderNumber}</p>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-3 max-h-[55vh] overflow-y-auto">
          {/* Store + date */}
          <div className="flex justify-between text-xs text-[var(--c-text3)]">
            <span>{receipt.locationName}</span>
            <span>
              {formatDateFull(receipt.createdAt)}, {formatTime(receipt.createdAt)}
            </span>
          </div>

          {/* Items */}
          <div className="border border-[var(--c-border)] rounded-xl overflow-hidden">
            {receipt.items.map((item, i) => (
              <div
                key={item.product.id}
                className={cn(
                  "flex items-center justify-between px-3 py-2 text-sm",
                  i % 2 === 0 ? "bg-[var(--c-bg3)]" : "bg-transparent",
                )}
              >
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-[var(--c-text)] truncate">{item.product.name}</p>
                  <p className="text-xs text-[var(--c-text3)]">
                    {item.qty} × {fmt(item.unitPrice)}
                  </p>
                </div>
                <span className="text-[var(--c-text)] font-medium tabular flex-shrink-0">
                  {fmt(item.qty * item.unitPrice)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-[var(--c-text2)]">
              <span>Подытог</span>
              <span className="tabular">{fmt(receipt.subtotal)}</span>
            </div>
            {receipt.discountAmount > 0 && (
              <div className="flex justify-between text-[var(--c-amber)]">
                <span>Скидка</span>
                <span className="tabular">−{fmt(receipt.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base text-[var(--c-text)] border-t border-[var(--c-border)] pt-1.5">
              <span>Итого</span>
              <span className="tabular text-[var(--c-green)]">{fmt(receipt.total)}</span>
            </div>
          </div>

          {/* Payment info */}
          <div className="rounded-xl bg-[var(--c-bg3)] border border-[var(--c-border)] px-3 py-2.5 space-y-1.5 text-sm">
            <div className="flex justify-between text-[var(--c-text2)]">
              <span>Способ оплаты</span>
              <span className="text-[var(--c-text)]">{PAYMENT_METHOD_LABELS[receipt.paymentMethod]}</span>
            </div>
            {receipt.paymentMethod === "cash" && (
              <>
                <div className="flex justify-between text-[var(--c-text2)]">
                  <span>Внесено</span>
                  <span className="text-[var(--c-text)] tabular">{fmt(receipt.cashTendered)}</span>
                </div>
                <div className="flex justify-between text-[var(--c-amber)] font-medium">
                  <span>Сдача</span>
                  <span className="tabular">{fmt(receipt.change)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 pt-3 flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--c-border2)] text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] hover:bg-[var(--c-bg3)] transition-colors"
          >
            <Printer className="w-4 h-4" />
            Печать
          </button>
          <button
            type="button"
            onClick={onNewSale}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--c-green)] text-[var(--c-bg)] text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <RotateCcw className="w-4 h-4" />
            Новый чек
          </button>
        </div>
      </div>

      {/* Hidden print-only version */}
      <div id="pos-receipt-print" aria-hidden="true">
        <div style={{ fontFamily: "monospace", fontSize: 14, padding: 20, maxWidth: 320 }}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <strong>SellerMap Касса</strong>
            <br />
            {receipt.locationName}
            <br />
            {formatDateFull(receipt.createdAt)} {formatTime(receipt.createdAt)}
            <br />
            Чек №{receipt.orderNumber}
          </div>
          <hr />
          {receipt.items.map((item) => (
            <div key={item.product.id} style={{ marginBottom: 4 }}>
              <div>{item.product.name}</div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>
                  {item.qty} × {item.unitPrice} ₽
                </span>
                <span>{item.qty * item.unitPrice} ₽</span>
              </div>
            </div>
          ))}
          <hr />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Подытог</span>
            <span>{receipt.subtotal} ₽</span>
          </div>
          {receipt.discountAmount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Скидка</span>
              <span>−{receipt.discountAmount} ₽</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
            <span>ИТОГО</span>
            <span>{receipt.total} ₽</span>
          </div>
          <hr />
          <div>Оплата: {PAYMENT_METHOD_LABELS[receipt.paymentMethod]}</div>
          {receipt.paymentMethod === "cash" && (
            <>
              <div>Внесено: {receipt.cashTendered} ₽</div>
              <div>Сдача: {receipt.change} ₽</div>
            </>
          )}
          <div style={{ textAlign: "center", marginTop: 16 }}>Спасибо за покупку!</div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function POSSellScreen() {
  const { products, locations, actions } = useInventory();

  // ── State ─────────────────────────────────────────────────────────────────
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("loc-store");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Все");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashTendered, setCashTendered] = useState("");
  const [discount, setDiscount] = useState<{ value: string; mode: DiscountMode }>({
    value: "",
    mode: "amount",
  });
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  // Mobile cart bottom sheet state
  const [cartOpen, setCartOpen] = useState(false);

  // ── Derived data ───────────────────────────────────────────────────────────

  const storeLocations = useMemo(
    () =>
      locations.filter((l) =>
        ["store", "warehouse", "showroom", "backroom"].includes(l.type),
      ),
    [locations],
  );

  // Available stock for a product at the selected location
  const getAvailable = useCallback(
    (p: Product) => Math.max(0, p.stockByLocation[selectedLocation] ?? 0),
    [selectedLocation],
  );

  // Active products only (all channels — POS can sell anything active)
  const activeProducts = useMemo(
    () => products.filter((p) => p.status === "active"),
    [products],
  );

  // Unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(activeProducts.map((p) => p.category))).sort();
    return ["Все", ...cats];
  }, [activeProducts]);

  // Filtered product list
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activeProducts.filter((p) => {
      const matchesCat = activeCategory === "Все" || p.category === activeCategory;
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode ?? "").includes(q) ||
        (p.internalBarcode ?? "").toLowerCase().includes(q)
      );
    });
  }, [activeProducts, searchQuery, activeCategory]);

  // Sort: in-stock first, then alphabetically
  const sortedProducts = useMemo(
    () =>
      [...filteredProducts].sort((a, b) => {
        const aStock = getAvailable(a);
        const bStock = getAvailable(b);
        if (aStock > 0 && bStock === 0) return -1;
        if (aStock === 0 && bStock > 0) return 1;
        return a.name.localeCompare(b.name, "ru");
      }),
    [filteredProducts, getAvailable],
  );

  // ── Cart totals ────────────────────────────────────────────────────────────

  const subtotal = useMemo(
    () => cart.reduce((s, item) => s + item.qty * item.unitPrice, 0),
    [cart],
  );

  const discountAmount = useMemo(() => {
    const val = parseFloat(discount.value) || 0;
    if (discount.mode === "pct") {
      return Math.round((subtotal * Math.min(val, 100)) / 100);
    }
    return Math.min(val, subtotal);
  }, [discount, subtotal]);

  const total = Math.max(0, subtotal - discountAmount);

  const cashTenderedNum = parseFloat(cashTendered) || 0;
  const change = paymentMethod === "cash" ? Math.max(0, cashTenderedNum - total) : 0;
  const canPay =
    cart.length > 0 &&
    !isProcessing &&
    (paymentMethod !== "cash" || cashTenderedNum >= total);

  const cartItemCount = useMemo(
    () => cart.reduce((s, i) => s + i.qty, 0),
    [cart],
  );
  const formatTotal = fmt(total);

  // ── Cart actions ───────────────────────────────────────────────────────────

  const addToCart = useCallback(
    (product: Product) => {
      const available = getAvailable(product);
      if (available === 0) return;
      setCart((prev) => {
        const existing = prev.find((i) => i.product.id === product.id);
        if (existing) {
          if (existing.qty >= available) return prev; // cap at stock
          return prev.map((i) =>
            i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i,
          );
        }
        return [...prev, { product, qty: 1, unitPrice: product.price }];
      });
    },
    [getAvailable],
  );

  const incQty = useCallback(
    (productId: string) => {
      setCart((prev) =>
        prev.map((i) => {
          if (i.product.id !== productId) return i;
          const available = getAvailable(i.product);
          return { ...i, qty: Math.min(i.qty + 1, available) };
        }),
      );
    },
    [getAvailable],
  );

  const decQty = useCallback((productId: string) => {
    setCart((prev) =>
      prev.flatMap((i) => {
        if (i.product.id !== productId) return [i];
        if (i.qty <= 1) return []; // remove
        return [{ ...i, qty: i.qty - 1 }];
      }),
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setDiscount({ value: "", mode: "amount" });
    setCashTendered("");
    setPaymentMethod("cash");
  }, []);

  // ── Payment / checkout ─────────────────────────────────────────────────────

  const handlePay = useCallback(async () => {
    if (!canPay) return;
    setIsProcessing(true);

    try {
      const now = new Date();
      const orderId = generateId();
      const orderNumber = generateOrderNumber();

      const orderItems: OrderItem[] = cart.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        sku: item.product.sku,
        qty: item.qty,
        unitPrice: item.unitPrice,
        unitCost: item.product.costPrice,
      }));

      const revenue = cart.reduce((s, item) => s + item.qty * item.unitPrice, 0);

      const order: Order = {
        id: orderId,
        orderNumber,
        channel: "pos",
        fulfillment: "self",
        status: "delivered",
        items: orderItems,
        locationId: selectedLocation,
        revenue: revenue - discountAmount,
        commissionRate: 0,
        logisticsCost: 0,
        createdAt: now.toISOString(),
        deliveredAt: now.toISOString(),
        note:
          discountAmount > 0
            ? `Скидка ${discount.mode === "pct" ? discount.value + "%" : fmt(discountAmount)}`
            : undefined,
      };

      // Persist order
      actions.createOrder(order);

      // Deduct stock for each item
      for (const item of cart) {
        actions.adjustStock(
          item.product.id,
          selectedLocation,
          -item.qty,
          "sale",
          `POS продажа · ${orderNumber}`,
        );
      }

      // Assemble receipt data
      const locationName =
        storeLocations.find((l) => l.id === selectedLocation)?.name ??
        locations.find((l) => l.id === selectedLocation)?.name ??
        selectedLocation;

      const receiptData: ReceiptData = {
        orderId,
        orderNumber,
        items: [...cart],
        subtotal,
        discountAmount,
        total,
        paymentMethod,
        cashTendered: cashTenderedNum,
        change,
        locationName,
        createdAt: now,
      };

      setReceipt(receiptData);
    } finally {
      setIsProcessing(false);
    }
  }, [
    canPay,
    cart,
    selectedLocation,
    discountAmount,
    discount,
    subtotal,
    total,
    paymentMethod,
    cashTenderedNum,
    change,
    storeLocations,
    locations,
    actions,
  ]);

  const handleNewSale = useCallback(() => {
    setReceipt(null);
    clearCart();
  }, [clearCart]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {receipt && <ReceiptModal receipt={receipt} onNewSale={handleNewSale} />}

      <div className="fixed inset-0 z-[100] flex bg-[var(--c-bg)] overflow-hidden">
        {/* ── LEFT PANEL (product grid) ───────────────────────────────────── */}
        {/* On mobile: full width. On tablet+: 60% with right border */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-[var(--c-border)]">
          {/* Top bar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--c-border)] bg-[var(--c-bg2)] flex-shrink-0">
            <div className="flex items-center gap-2 mr-2">
              <ShoppingCart className="w-5 h-5 text-[var(--c-green)]" />
              <span className="font-semibold text-[var(--c-text)] text-sm hidden sm:block">
                SellerMap Касса
              </span>
            </div>

            <LocationSelector
              locations={
                storeLocations.length > 0
                  ? storeLocations
                  : locations
              }
              selectedId={selectedLocation}
              onChange={(id) => {
                setSelectedLocation(id);
                setCart([]); // reset cart on location change
              }}
            />

            <div className="flex-1" />

            <Link
              href="/inventory"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] hover:bg-[var(--c-bg3)] border border-[var(--c-border)] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Закрыть
            </Link>
          </div>

          {/* Search / Barcode */}
          <div className="px-4 py-3 border-b border-[var(--c-border)] flex-shrink-0 space-y-2">
            <BarcodeInput
              placeholder="Поиск или сканирование штрихкода..."
              onScan={(code) => {
                const found = activeProducts.find(
                  (p) =>
                    p.barcode === code ||
                    p.sku === code ||
                    p.variants.some((v) => v.sku === code),
                );
                if (found) {
                  addToCart(found);
                  toast.success(`Добавлено: ${found.name}`);
                } else {
                  toast.error(`Товар не найден: ${code}`);
                }
              }}
              className="w-full"
            />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--c-text3)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по названию, артикулу, штрихкоду..."
                className="h-11 w-full pl-9 pr-9 rounded-xl bg-[var(--c-bg3)] border border-[var(--c-border)] text-base text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:outline-none focus:border-[var(--c-green)] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)] hover:text-[var(--c-text2)]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex-shrink-0 overflow-x-auto border-b border-[var(--c-border)] bg-[var(--c-bg2)]">
            <div className="flex gap-1 px-4 py-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "flex-shrink-0 px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap",
                    activeCategory === cat
                      ? "bg-[var(--c-green)] text-[var(--c-bg)] font-medium"
                      : "text-[var(--c-text2)] hover:text-[var(--c-text)] hover:bg-[var(--c-bg3)]",
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {sortedProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-[var(--c-text3)]">
                <Package className="w-10 h-10 opacity-40" />
                <p className="text-sm">Товары не найдены</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {sortedProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    available={getAvailable(p)}
                    onAdd={addToCart}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL (CART) — tablet+: fixed 40% sidebar ─────────── */}
        <div className="hidden md:flex md:w-[40%] flex-shrink-0 flex-col bg-[var(--c-bg2)]">
          {/* Cart header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--c-border)] flex-shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-[var(--c-text2)]" />
              <span className="font-semibold text-sm text-[var(--c-text)]">Корзина</span>
              {cart.length > 0 && (
                <span className="text-xs bg-[var(--c-green-dim)] text-[var(--c-green)] px-1.5 py-0.5 rounded-full font-medium">
                  {cartItemCount} шт
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-[var(--c-text3)] hover:text-[var(--c-red)] transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Очистить
              </button>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto px-4 min-h-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-[var(--c-text3)]">
                <ShoppingCart className="w-10 h-10 opacity-30" />
                <p className="text-sm text-center">
                  Добавьте товары
                  <br />
                  из каталога слева
                </p>
              </div>
            ) : (
              <div>
                {cart.map((item) => (
                  <CartRow
                    key={item.product.id}
                    item={item}
                    maxQty={getAvailable(item.product)}
                    onInc={() => incQty(item.product.id)}
                    onDec={() => decQty(item.product.id)}
                    onRemove={() => removeFromCart(item.product.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Bottom panel: discount + totals + payment */}
          <div className="border-t border-[var(--c-border)] flex-shrink-0">
            {/* Discount */}
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-[var(--c-text3)]" />
                <span className="text-xs text-[var(--c-text3)] flex-1">Скидка</span>
                {/* Mode toggle */}
                <div className="flex rounded-lg overflow-hidden border border-[var(--c-border)] text-xs">
                  <button
                    type="button"
                    onClick={() => setDiscount((d) => ({ ...d, mode: "amount" }))}
                    className={cn(
                      "px-2.5 py-1 transition-colors flex items-center gap-1",
                      discount.mode === "amount"
                        ? "bg-[var(--c-green)] text-[var(--c-bg)] font-medium"
                        : "text-[var(--c-text3)] hover:text-[var(--c-text2)]",
                    )}
                  >
                    ₽
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscount((d) => ({ ...d, mode: "pct" }))}
                    className={cn(
                      "px-2.5 py-1 transition-colors flex items-center gap-1 border-l border-[var(--c-border)]",
                      discount.mode === "pct"
                        ? "bg-[var(--c-green)] text-[var(--c-bg)] font-medium"
                        : "text-[var(--c-text3)] hover:text-[var(--c-text2)]",
                    )}
                  >
                    <Percent className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="mt-1.5 relative">
                <input
                  type="number"
                  min="0"
                  max={discount.mode === "pct" ? 100 : undefined}
                  value={discount.value}
                  onChange={(e) => setDiscount((d) => ({ ...d, value: e.target.value }))}
                  placeholder={discount.mode === "pct" ? "0" : "0"}
                  className="w-full px-3 py-1.5 rounded-lg bg-[var(--c-bg3)] border border-[var(--c-border)] text-base text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:outline-none focus:border-[var(--c-amber)] transition-colors tabular"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--c-text3)]">
                  {discount.mode === "pct" ? "%" : "₽"}
                </span>
              </div>
            </div>

            {/* Totals */}
            <div className="px-4 pb-3 space-y-1.5">
              <div className="flex justify-between text-sm text-[var(--c-text2)]">
                <span>Подытог</span>
                <span className="tabular">{fmt(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-[var(--c-amber)]">
                  <span>Скидка</span>
                  <span className="tabular">−{fmt(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg text-[var(--c-text)] pt-1 border-t border-[var(--c-border)]">
                <span>Итого</span>
                <span className="tabular text-[var(--c-green)]">{fmt(total)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div className="px-4 pb-3">
              <p className="text-xs text-[var(--c-text3)] mb-2">Способ оплаты</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: "cash", label: "Наличные", Icon: Banknote },
                    { id: "card", label: "Карта", Icon: CreditCard },
                    { id: "sbp", label: "СБП", Icon: Smartphone },
                  ] as const
                ).map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPaymentMethod(id)}
                    className={cn(
                      "flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all",
                      paymentMethod === id
                        ? "border-[var(--c-green)] bg-[var(--c-green-dim)] text-[var(--c-green)]"
                        : "border-[var(--c-border)] bg-[var(--c-bg3)] text-[var(--c-text2)] hover:border-[var(--c-border2)] hover:text-[var(--c-text)]",
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash tendered / SBP info */}
            {paymentMethod === "cash" && (
              <div className="px-4 pb-3 space-y-2">
                <div>
                  <p className="text-xs text-[var(--c-text3)] mb-1">Внесено покупателем, ₽</p>
                  <input
                    type="number"
                    min={total}
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    placeholder={total > 0 ? String(Math.ceil(total)) : "0"}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--c-bg3)] border border-[var(--c-border)] text-base text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:outline-none focus:border-[var(--c-green)] transition-colors tabular"
                  />
                </div>
                {cashTenderedNum > 0 && cashTenderedNum >= total && (
                  <div className="flex justify-between items-center px-3 py-2 rounded-xl bg-[var(--c-amber-dim)] border border-[var(--c-amber)]/30">
                    <span className="text-sm text-[var(--c-amber)]">Сдача</span>
                    <span className="text-sm font-semibold text-[var(--c-amber)] tabular">
                      {fmt(change)}
                    </span>
                  </div>
                )}
                {cashTenderedNum > 0 && cashTenderedNum < total && (
                  <div className="flex justify-between items-center px-3 py-2 rounded-xl bg-[var(--c-red-dim)] border border-[var(--c-red)]/30">
                    <span className="text-sm text-[var(--c-red)]">Не хватает</span>
                    <span className="text-sm font-semibold text-[var(--c-red)] tabular">
                      {fmt(total - cashTenderedNum)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {(paymentMethod === "card" || paymentMethod === "sbp") && (
              <div className="px-4 pb-3">
                <div className="flex justify-between items-center px-3 py-2.5 rounded-xl bg-[var(--c-blue-dim)] border border-[var(--c-blue)]/30">
                  <span className="text-sm text-[var(--c-blue)]">
                    {paymentMethod === "card" ? "К оплате картой" : "К оплате по СБП"}
                  </span>
                  <span className="text-sm font-semibold text-[var(--c-blue)] tabular">
                    {fmt(total)}
                  </span>
                </div>
              </div>
            )}

            {/* Pay button */}
            <div className="px-4 pb-4">
              <button
                type="button"
                onClick={handlePay}
                disabled={!canPay}
                className={cn(
                  "w-full py-3.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2",
                  canPay
                    ? "bg-[var(--c-green)] text-[var(--c-bg)] hover:opacity-90 active:scale-[0.98]"
                    : "bg-[var(--c-bg3)] text-[var(--c-text3)] cursor-not-allowed border border-[var(--c-border)]",
                )}
              >
                {isProcessing ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-[var(--c-bg)] border-t-transparent animate-spin" />
                    Проводим...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {cart.length === 0
                      ? "Добавьте товары"
                      : paymentMethod === "cash" && cashTendered === ""
                        ? "Введите сумму"
                        : paymentMethod === "cash" && cashTenderedNum < total
                          ? "Недостаточно средств"
                          : "Провести продажу"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE: Floating cart button ────────────────────────────────────── */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 right-4 z-40 md:hidden">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="flex items-center gap-2 rounded-full bg-[var(--c-green)] px-4 py-3 text-sm font-semibold text-white shadow-lg"
          >
            <ShoppingCart size={18} />
            <span>{cartItemCount} шт</span>
            <span className="font-bold">{formatTotal}</span>
          </button>
        </div>
      )}

      {/* ── MOBILE: Cart bottom sheet ────────────────────────────────────────── */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setCartOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 flex h-[80vh] flex-col rounded-t-2xl bg-[var(--c-bg)] shadow-2xl overflow-hidden">
            {/* Drag handle */}
            <div className="flex justify-center pt-2 pb-1 flex-shrink-0">
              <div className="h-1 w-10 rounded-full bg-[var(--c-border2)]" />
            </div>
            {/* Bottom sheet header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--c-border)] flex-shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-[var(--c-text2)]" />
                <span className="font-semibold text-sm text-[var(--c-text)]">Корзина</span>
                {cartItemCount > 0 && (
                  <span className="text-xs bg-[var(--c-green-dim)] text-[var(--c-green)] px-1.5 py-0.5 rounded-full font-medium">
                    {cartItemCount} шт
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--c-text3)] hover:text-[var(--c-text)] hover:bg-[var(--c-bg3)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Cart items list */}
            <div className="flex-1 overflow-y-auto px-4 bg-[var(--c-bg2)]">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-3 text-[var(--c-text3)]">
                  <ShoppingCart className="w-8 h-8 opacity-30" />
                  <p className="text-sm text-center">Добавьте товары из каталога</p>
                </div>
              ) : (
                <div>
                  {cart.map((item) => (
                    <CartRow
                      key={item.product.id}
                      item={item}
                      maxQty={getAvailable(item.product)}
                      onInc={() => incQty(item.product.id)}
                      onDec={() => decQty(item.product.id)}
                      onRemove={() => removeFromCart(item.product.id)}
                    />
                  ))}
                </div>
              )}
            </div>
            {/* Payment section */}
            <div className="flex-shrink-0 border-t border-[var(--c-border)] bg-[var(--c-bg2)]">
              {/* Discount */}
              <div className="px-4 pt-3 pb-2">
                <div className="flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-[var(--c-text3)]" />
                  <span className="text-xs text-[var(--c-text3)] flex-1">Скидка</span>
                  <div className="flex rounded-lg overflow-hidden border border-[var(--c-border)] text-xs">
                    <button
                      type="button"
                      onClick={() => setDiscount((d) => ({ ...d, mode: "amount" }))}
                      className={cn(
                        "px-2.5 py-1 transition-colors",
                        discount.mode === "amount"
                          ? "bg-[var(--c-green)] text-[var(--c-bg)] font-medium"
                          : "text-[var(--c-text3)]",
                      )}
                    >
                      ₽
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscount((d) => ({ ...d, mode: "pct" }))}
                      className={cn(
                        "px-2.5 py-1 transition-colors border-l border-[var(--c-border)]",
                        discount.mode === "pct"
                          ? "bg-[var(--c-green)] text-[var(--c-bg)] font-medium"
                          : "text-[var(--c-text3)]",
                      )}
                    >
                      <Percent className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="mt-1.5 relative">
                  <input
                    type="number"
                    min="0"
                    max={discount.mode === "pct" ? 100 : undefined}
                    value={discount.value}
                    onChange={(e) => setDiscount((d) => ({ ...d, value: e.target.value }))}
                    placeholder="0"
                    className="h-11 w-full px-3 rounded-lg bg-[var(--c-bg3)] border border-[var(--c-border)] text-base text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:outline-none focus:border-[var(--c-amber)] transition-colors tabular"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--c-text3)]">
                    {discount.mode === "pct" ? "%" : "₽"}
                  </span>
                </div>
              </div>
              {/* Totals */}
              <div className="px-4 pb-2 space-y-1">
                <div className="flex justify-between text-sm text-[var(--c-text2)]">
                  <span>Подытог</span>
                  <span className="tabular">{fmt(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-[var(--c-amber)]">
                    <span>Скидка</span>
                    <span className="tabular">−{fmt(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-base text-[var(--c-text)] pt-1 border-t border-[var(--c-border)]">
                  <span>Итого</span>
                  <span className="tabular text-[var(--c-green)]">{fmt(total)}</span>
                </div>
              </div>
              {/* Payment method */}
              <div className="px-4 pb-2">
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: "cash", label: "Наличные", Icon: Banknote },
                      { id: "card", label: "Карта", Icon: CreditCard },
                      { id: "sbp", label: "СБП", Icon: Smartphone },
                    ] as const
                  ).map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPaymentMethod(id)}
                      className={cn(
                        "flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all",
                        paymentMethod === id
                          ? "border-[var(--c-green)] bg-[var(--c-green-dim)] text-[var(--c-green)]"
                          : "border-[var(--c-border)] bg-[var(--c-bg3)] text-[var(--c-text2)]",
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Cash input */}
              {paymentMethod === "cash" && (
                <div className="px-4 pb-2 space-y-2">
                  <input
                    type="number"
                    min={total}
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    placeholder={total > 0 ? String(Math.ceil(total)) : "Внесено покупателем, ₽"}
                    className="h-11 w-full px-3 rounded-xl bg-[var(--c-bg3)] border border-[var(--c-border)] text-base text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:outline-none focus:border-[var(--c-green)] transition-colors tabular"
                  />
                  {cashTenderedNum > 0 && cashTenderedNum >= total && (
                    <div className="flex justify-between items-center px-3 py-2 rounded-xl bg-[var(--c-amber-dim)] border border-[var(--c-amber)]/30">
                      <span className="text-sm text-[var(--c-amber)]">Сдача</span>
                      <span className="text-sm font-semibold text-[var(--c-amber)] tabular">{fmt(change)}</span>
                    </div>
                  )}
                </div>
              )}
              {/* Pay button */}
              <div className="px-4 pb-4">
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={!canPay}
                  className={cn(
                    "w-full h-12 rounded-xl text-base font-semibold transition-all flex items-center justify-center gap-2",
                    canPay
                      ? "bg-[var(--c-green)] text-[var(--c-bg)] hover:opacity-90 active:scale-[0.98]"
                      : "bg-[var(--c-bg3)] text-[var(--c-text3)] cursor-not-allowed border border-[var(--c-border)]",
                  )}
                >
                  {isProcessing ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-[var(--c-bg)] border-t-transparent animate-spin" />
                      Проводим...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      {cart.length === 0
                        ? "Добавьте товары"
                        : paymentMethod === "cash" && cashTendered === ""
                          ? "Введите сумму"
                          : paymentMethod === "cash" && cashTenderedNum < total
                            ? "Недостаточно средств"
                            : "Провести продажу"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
