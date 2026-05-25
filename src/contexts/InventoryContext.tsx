"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { loadWorkspace, saveWorkspace } from "@/lib/supabase/inventory-store";
import {
  PRODUCTS,
  SUPPLIERS,
  LOCATIONS,
  PURCHASE_ORDERS,
  TRANSFERS,
  STOCKTAKES,
  MOVEMENTS,
  RESERVATIONS,
  RETURNS,
  BUNDLES,
  REPLENISHMENT_RULES,
  BATCHES,
  ORDERS,
  CUSTOMERS,
  getAvailableStock,
  type Product,
  type Supplier,
  type Location,
  type PurchaseOrder,
  type PurchaseOrderStatus,
  type Transfer,
  type Stocktake,
  type StocktakeItem,
  type StockMovement,
  type MovementType,
  type Reservation,
  type ReservationSource,
  type ProductReturn,
  type ReturnStatus,
  type ReturnItem,
  type ReturnItemAction,
  type Bundle,
  type BundleComponent,
  type ReplenishmentRule,
  type TriggerType,
  type InventoryBatch,
  type BatchStatus,
  type Order,
  type OrderStatus,
  type Customer,
  type CustomerTier,
} from "@/mock/inventory";

// ── State ────────────────────────────────────────────────────────────────────

export interface InventoryState {
  products: Product[];
  suppliers: Supplier[];
  locations: Location[];
  purchaseOrders: PurchaseOrder[];
  transfers: Transfer[];
  stocktakes: Stocktake[];
  movements: StockMovement[];
  reservations: Reservation[];
  returns: ProductReturn[];
  bundles: Bundle[];
  replenishmentRules: ReplenishmentRule[];
  batches: InventoryBatch[];
  orders: Order[];
  customers: Customer[];
}

const initialState: InventoryState = {
  products: PRODUCTS,
  suppliers: SUPPLIERS,
  locations: LOCATIONS,
  purchaseOrders: PURCHASE_ORDERS,
  transfers: TRANSFERS,
  stocktakes: STOCKTAKES,
  movements: MOVEMENTS,
  reservations: RESERVATIONS,
  returns: RETURNS,
  bundles: BUNDLES,
  replenishmentRules: REPLENISHMENT_RULES,
  batches: BATCHES,
  orders: ORDERS,
  customers: CUSTOMERS,
};

// ── Actions ──────────────────────────────────────────────────────────────────

type InventoryAction =
  | { type: "ADD_PRODUCT"; product: Product }
  | { type: "UPDATE_PRODUCT"; id: string; patch: Partial<Product> }
  | { type: "DELETE_PRODUCT"; id: string }
  | { type: "ARCHIVE_PRODUCT"; id: string }
  | { type: "ADD_PURCHASE_ORDER"; po: PurchaseOrder }
  | { type: "UPDATE_PO_STATUS"; id: string; status: PurchaseOrderStatus }
  | { type: "RECEIVE_PO_ITEMS"; poId: string; received: Record<string, number>; locationId: string }
  | { type: "CREATE_TRANSFER"; transfer: Transfer }
  | { type: "RECEIVE_TRANSFER"; id: string }
  | { type: "CREATE_STOCKTAKE"; stocktake: Stocktake }
  | { type: "UPDATE_STOCKTAKE_COUNT"; stocktakeId: string; productId: string; qty: number }
  | { type: "COMPLETE_STOCKTAKE"; stocktakeId: string }
  | { type: "ADJUST_STOCK"; productId: string; locationId: string; delta: number; movementType: MovementType; reason?: string; userId?: string; userName?: string; referenceId?: string }
  | { type: "UPDATE_PRICES"; updates: Record<string, { price?: number; costPrice?: number }> }
  | { type: "ADD_SUPPLIER"; supplier: Supplier }
  | { type: "UPDATE_SUPPLIER"; id: string; patch: Partial<Supplier> }
  | { type: "ADD_LOCATION"; location: Location }
  | { type: "ADD_MOVEMENT"; movement: StockMovement }
  | { type: "CREATE_RESERVATION"; reservation: Reservation }
  | { type: "RELEASE_RESERVATION"; id: string }
  | { type: "FULFILL_RESERVATION"; id: string }
  | { type: "EXTEND_RESERVATION"; id: string; expiresAt: string }
  | { type: "HYDRATE"; state: InventoryState }
  | { type: "RESET_STATE" }
  // Returns
  | { type: "CREATE_RETURN"; returnRecord: ProductReturn }
  | { type: "PROCESS_RETURN"; id: string }
  | { type: "UPDATE_RETURN_STATUS"; id: string; status: ReturnStatus }
  // Bundles
  | { type: "CREATE_BUNDLE"; bundle: Bundle }
  | { type: "UPDATE_BUNDLE"; id: string; patch: Partial<Bundle> }
  | { type: "DELETE_BUNDLE"; id: string }
  | { type: "ASSEMBLE_BUNDLE"; bundleId: string; qty: number; locationId: string }
  // Replenishment rules
  | { type: "CREATE_RULE"; rule: ReplenishmentRule }
  | { type: "UPDATE_RULE"; id: string; patch: Partial<ReplenishmentRule> }
  | { type: "DELETE_RULE"; id: string }
  // Batches
  | { type: "REGISTER_BATCH"; batch: InventoryBatch }
  | { type: "UPDATE_BATCH"; id: string; patch: Partial<InventoryBatch> }
  | { type: "WRITE_OFF_BATCH"; id: string }
  | { type: "QUARANTINE_BATCH"; id: string }
  | { type: "WRITE_OFF_ALL_EXPIRED" }
  // Orders
  | { type: "CREATE_ORDER"; order: Order }
  | { type: "UPDATE_ORDER_STATUS"; id: string; status: OrderStatus }
  | { type: "FULFILL_ORDER"; id: string }
  | { type: "CANCEL_ORDER"; id: string }
  | { type: "IMPORT_ORDERS"; orders: Order[] }
  // Customers
  | { type: "CREATE_CUSTOMER"; customer: Customer }
  | { type: "UPDATE_CUSTOMER"; id: string; patch: Partial<Customer> }
  | { type: "ADD_LOYALTY_POINTS"; id: string; points: number };

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function applyStockDelta(product: Product, locationId: string, delta: number): Product {
  const prev = product.stockByLocation[locationId] ?? 0;
  const next = Math.max(0, prev + delta);
  const newByLocation = { ...product.stockByLocation, [locationId]: next };
  const newTotal = Object.values(newByLocation).reduce((s, v) => s + v, 0);
  return {
    ...product,
    stockByLocation: newByLocation,
    totalPhysical: newTotal,
    updatedAt: new Date().toISOString().split("T")[0],
  };
}

function reducer(state: InventoryState, action: InventoryAction): InventoryState {
  switch (action.type) {
    // ── Products ──────────────────────────────────────────────────────────────
    case "ADD_PRODUCT":
      return { ...state, products: [action.product, ...state.products] };

    case "UPDATE_PRODUCT":
      return {
        ...state,
        products: state.products.map((p) =>
          p.id === action.id ? { ...p, ...action.patch, updatedAt: new Date().toISOString().split("T")[0] } : p,
        ),
      };

    case "DELETE_PRODUCT":
      return { ...state, products: state.products.filter((p) => p.id !== action.id) };

    case "ARCHIVE_PRODUCT":
      return {
        ...state,
        products: state.products.map((p) =>
          p.id === action.id ? { ...p, status: "archived", updatedAt: new Date().toISOString().split("T")[0] } : p,
        ),
      };

    // ── Purchase Orders ───────────────────────────────────────────────────────
    case "ADD_PURCHASE_ORDER":
      return { ...state, purchaseOrders: [action.po, ...state.purchaseOrders] };

    case "UPDATE_PO_STATUS": {
      const now = new Date().toISOString();
      return {
        ...state,
        purchaseOrders: state.purchaseOrders.map((po) =>
          po.id === action.id
            ? {
                ...po,
                status: action.status,
                updatedAt: now,
                ...(action.status === "closed" ? { receivedAt: now } : {}),
              }
            : po,
        ),
      };
    }

    case "RECEIVE_PO_ITEMS": {
      const { poId, received, locationId } = action;
      const now = new Date().toISOString();
      const po = state.purchaseOrders.find((o) => o.id === poId);
      if (!po) return state;

      // Update PO received quantities
      const updatedItems = po.items.map((item) => {
        const qty = received[item.productId] ?? 0;
        return { ...item, receivedQty: item.receivedQty + qty };
      });
      const allReceived = updatedItems.every((i) => i.receivedQty >= i.qty);
      const anyReceived = updatedItems.some((i) => i.receivedQty > 0);
      const newStatus: PurchaseOrderStatus = allReceived
        ? "closed"
        : anyReceived
          ? "partially_received"
          : po.status;

      const updatedPOs = state.purchaseOrders.map((o) =>
        o.id === poId
          ? { ...o, items: updatedItems, status: newStatus, updatedAt: now, ...(allReceived ? { receivedAt: now } : {}) }
          : o,
      );

      // Apply stock deltas
      let products = state.products;
      const movements: StockMovement[] = [];
      for (const [productId, qty] of Object.entries(received)) {
        if (!qty) continue;
        const product = products.find((p) => p.id === productId);
        if (!product) continue;
        const before = (product.stockByLocation[locationId] ?? 0) + product.inTransitUnits;
        products = products.map((p) =>
          p.id === productId ? applyStockDelta(p, locationId, qty) : p,
        );
        const after = (products.find((p) => p.id === productId)?.stockByLocation[locationId] ?? 0);
        movements.push({
          id: uid("mv"),
          type: "receipt",
          productId,
          productName: product.name,
          sku: product.sku,
          qtyBefore: before,
          qtyAfter: after,
          qtyDelta: qty,
          locationId,
          userId: "u-current",
          userName: "Текущий пользователь",
          createdAt: now,
          reason: `Приёмка по заказу ${poId}`,
          referenceId: poId,
          referenceType: "purchase_order",
        });
      }

      return {
        ...state,
        products,
        purchaseOrders: updatedPOs,
        movements: [...movements, ...state.movements],
      };
    }

    // ── Transfers ─────────────────────────────────────────────────────────────
    case "CREATE_TRANSFER":
      return { ...state, transfers: [action.transfer, ...state.transfers] };

    case "RECEIVE_TRANSFER": {
      const transfer = state.transfers.find((t) => t.id === action.id);
      if (!transfer) return state;
      const now = new Date().toISOString();

      let products = state.products;
      const movements: StockMovement[] = [];

      for (const item of transfer.items) {
        const qty = item.qty;
        const product = products.find((p) => p.id === item.productId);
        if (!product) continue;
        const fromBefore = product.stockByLocation[transfer.fromLocationId] ?? 0;
        // Remove from source
        products = products.map((p) =>
          p.id === item.productId ? applyStockDelta(p, transfer.fromLocationId, -qty) : p,
        );
        // Add to destination
        products = products.map((p) =>
          p.id === item.productId ? applyStockDelta(p, transfer.toLocationId, qty) : p,
        );
        const updated = products.find((p) => p.id === item.productId);
        movements.push({
          id: uid("mv"),
          type: "transfer",
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          qtyBefore: fromBefore,
          qtyAfter: updated?.stockByLocation[transfer.fromLocationId] ?? 0,
          qtyDelta: -qty,
          locationId: transfer.fromLocationId,
          userId: "u-current",
          userName: "Текущий пользователь",
          createdAt: now,
          reason: `Перемещение на ${transfer.toLocationId}`,
          referenceId: action.id,
          referenceType: "transfer",
        });
      }

      const updatedTransfers = state.transfers.map((t) =>
        t.id === action.id ? { ...t, status: "received" as const, receivedAt: now } : t,
      );

      return {
        ...state,
        products,
        transfers: updatedTransfers,
        movements: [...movements, ...state.movements],
      };
    }

    // ── Stocktakes ────────────────────────────────────────────────────────────
    case "CREATE_STOCKTAKE":
      return { ...state, stocktakes: [action.stocktake, ...state.stocktakes] };

    case "UPDATE_STOCKTAKE_COUNT":
      return {
        ...state,
        stocktakes: state.stocktakes.map((s) =>
          s.id !== action.stocktakeId
            ? s
            : {
                ...s,
                items: s.items.map((i) =>
                  i.productId === action.productId
                    ? { ...i, countedQty: action.qty, variance: action.qty - i.systemQty }
                    : i,
                ),
              },
        ),
      };

    case "COMPLETE_STOCKTAKE": {
      const stocktake = state.stocktakes.find((s) => s.id === action.stocktakeId);
      if (!stocktake) return state;
      const now = new Date().toISOString();

      let products = state.products;
      const movements: StockMovement[] = [];

      for (const item of stocktake.items) {
        if (item.countedQty === null) continue;
        const variance = item.countedQty - item.systemQty;
        if (variance === 0) continue;
        const product = products.find((p) => p.id === item.productId);
        if (!product) continue;
        const before = product.stockByLocation[stocktake.locationId] ?? 0;
        products = products.map((p) =>
          p.id === item.productId ? applyStockDelta(p, stocktake.locationId, variance) : p,
        );
        movements.push({
          id: uid("mv"),
          type: "stocktake",
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          qtyBefore: before,
          qtyAfter: before + variance,
          qtyDelta: variance,
          locationId: stocktake.locationId,
          userId: "u-current",
          userName: "Текущий пользователь",
          createdAt: now,
          reason: "Инвентаризация",
          referenceId: action.stocktakeId,
          referenceType: "stocktake",
        });
      }

      const updatedStocktakes = state.stocktakes.map((s) =>
        s.id === action.stocktakeId
          ? { ...s, status: "completed" as const, completedAt: now }
          : s,
      );

      return {
        ...state,
        products,
        stocktakes: updatedStocktakes,
        movements: [...movements, ...state.movements],
      };
    }

    // ── Stock Adjustment ──────────────────────────────────────────────────────
    case "ADJUST_STOCK": {
      const { productId, locationId, delta, movementType, reason, userId, userName, referenceId } = action;
      const product = state.products.find((p) => p.id === productId);
      if (!product) return state;
      const before = product.stockByLocation[locationId] ?? 0;
      const products = state.products.map((p) =>
        p.id === productId ? applyStockDelta(p, locationId, delta) : p,
      );
      const after = products.find((p) => p.id === productId)?.stockByLocation[locationId] ?? 0;
      const movement: StockMovement = {
        id: uid("mv"),
        type: movementType,
        productId,
        productName: product.name,
        sku: product.sku,
        qtyBefore: before,
        qtyAfter: after,
        qtyDelta: delta,
        locationId,
        userId: userId ?? "u-current",
        userName: userName ?? "Текущий пользователь",
        createdAt: new Date().toISOString(),
        reason,
        referenceId,
      };
      return {
        ...state,
        products,
        movements: [movement, ...state.movements],
      };
    }

    // ── Prices ────────────────────────────────────────────────────────────────
    case "UPDATE_PRICES": {
      const now = new Date().toISOString().split("T")[0];
      return {
        ...state,
        products: state.products.map((p) => {
          const upd = action.updates[p.id];
          if (!upd) return p;
          const newPrice = upd.price ?? p.price;
          const newCost = upd.costPrice ?? p.costPrice;
          const margin = newPrice > 0 ? Math.round(((newPrice - newCost) / newPrice) * 100 * 10) / 10 : 0;
          return { ...p, price: newPrice, costPrice: newCost, margin, updatedAt: now };
        }),
      };
    }

    // ── Suppliers ─────────────────────────────────────────────────────────────
    case "ADD_SUPPLIER":
      return { ...state, suppliers: [...state.suppliers, action.supplier] };

    case "UPDATE_SUPPLIER":
      return {
        ...state,
        suppliers: state.suppliers.map((s) =>
          s.id === action.id ? { ...s, ...action.patch } : s,
        ),
      };

    // ── Locations ─────────────────────────────────────────────────────────────
    case "ADD_LOCATION":
      return { ...state, locations: [...state.locations, action.location] };

    // ── Movements ─────────────────────────────────────────────────────────────
    case "ADD_MOVEMENT":
      return { ...state, movements: [action.movement, ...state.movements] };

    // ── Reservations ──────────────────────────────────────────────────────────
    case "CREATE_RESERVATION": {
      const r = action.reservation;
      const now = new Date().toISOString();
      const product = state.products.find((p) => p.id === r.productId);
      const movement: StockMovement | null = product
        ? {
            id: uid("mv"),
            type: "reserve",
            productId: r.productId,
            productName: r.productName,
            sku: r.sku,
            qtyBefore: product.reservedUnits,
            qtyAfter: product.reservedUnits + r.qty,
            qtyDelta: r.qty,
            locationId: r.locationId,
            userId: "u-current",
            userName: "Текущий пользователь",
            createdAt: now,
            reason: `Резерв ${r.source}${r.orderRef ? ` · ${r.orderRef}` : ""}`,
            referenceId: r.id,
          }
        : null;
      return {
        ...state,
        reservations: [r, ...state.reservations],
        products: state.products.map((p) =>
          p.id === r.productId ? { ...p, reservedUnits: p.reservedUnits + r.qty } : p,
        ),
        movements: movement ? [movement, ...state.movements] : state.movements,
      };
    }

    case "RELEASE_RESERVATION": {
      const res = state.reservations.find((r) => r.id === action.id);
      if (!res || res.status !== "active") return state;
      return {
        ...state,
        reservations: state.reservations.map((r) =>
          r.id === action.id ? { ...r, status: "cancelled" } : r,
        ),
        products: state.products.map((p) =>
          p.id === res.productId ? { ...p, reservedUnits: Math.max(0, p.reservedUnits - res.qty) } : p,
        ),
      };
    }

    case "FULFILL_RESERVATION": {
      const res = state.reservations.find((r) => r.id === action.id);
      if (!res || res.status !== "active") return state;
      const now = new Date().toISOString();
      const product = state.products.find((p) => p.id === res.productId);
      let products = state.products.map((p) =>
        p.id === res.productId ? { ...p, reservedUnits: Math.max(0, p.reservedUnits - res.qty) } : p,
      );
      // Goods ship: physical stock leaves the reservation's location.
      products = products.map((p) =>
        p.id === res.productId ? applyStockDelta(p, res.locationId, -res.qty) : p,
      );
      const movement: StockMovement | null = product
        ? {
            id: uid("mv"),
            type: "sale",
            productId: res.productId,
            productName: res.productName,
            sku: res.sku,
            qtyBefore: product.stockByLocation[res.locationId] ?? 0,
            qtyAfter: Math.max(0, (product.stockByLocation[res.locationId] ?? 0) - res.qty),
            qtyDelta: -res.qty,
            locationId: res.locationId,
            userId: "u-current",
            userName: "Текущий пользователь",
            createdAt: now,
            reason: `Отгрузка по резерву${res.orderRef ? ` · ${res.orderRef}` : ""}`,
            referenceId: res.id,
          }
        : null;
      return {
        ...state,
        products,
        reservations: state.reservations.map((r) =>
          r.id === action.id ? { ...r, status: "fulfilled", fulfilledAt: now } : r,
        ),
        movements: movement ? [movement, ...state.movements] : state.movements,
      };
    }

    case "EXTEND_RESERVATION":
      return {
        ...state,
        reservations: state.reservations.map((r) =>
          r.id === action.id && r.status === "active"
            ? { ...r, expiresAt: action.expiresAt }
            : r,
        ),
      };

    // ── Hydration / demo reset ──────────────────────────────────────────────
    case "HYDRATE":
      return action.state;

    case "RESET_STATE":
      return initialState;

    // ── Returns ───────────────────────────────────────────────────────────────
    case "CREATE_RETURN":
      return { ...state, returns: [action.returnRecord, ...state.returns] };

    case "UPDATE_RETURN_STATUS":
      return {
        ...state,
        returns: state.returns.map((r) =>
          r.id === action.id ? { ...r, status: action.status } : r,
        ),
      };

    case "PROCESS_RETURN": {
      const ret = state.returns.find((r) => r.id === action.id);
      if (!ret) return state;
      const now = new Date().toISOString();
      let products = state.products;
      const newMovements: StockMovement[] = [];
      for (const item of ret.items) {
        const product = products.find((p) => p.id === item.productId);
        if (!product) continue;
        const before = product.stockByLocation[ret.locationId] ?? 0;
        if (item.action === "restock") {
          products = products.map((p) =>
            p.id === item.productId ? applyStockDelta(p, ret.locationId, item.qty) : p,
          );
        } else if (item.action === "write_off") {
          // write-off: no stock increase, just track the movement
        }
        newMovements.push({
          id: uid("mv"),
          type: item.action === "restock" ? "return" : "write_off",
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          qtyBefore: before,
          qtyAfter: item.action === "restock" ? before + item.qty : before,
          qtyDelta: item.action === "restock" ? item.qty : 0,
          locationId: ret.locationId,
          userId: "u-current",
          userName: "Текущий пользователь",
          createdAt: now,
          reason: `Возврат: ${item.condition}`,
          referenceId: ret.id,
          referenceType: "return" as const,
        });
      }
      return {
        ...state,
        products,
        returns: state.returns.map((r) =>
          r.id === action.id ? { ...r, status: "restocked" as const, processedAt: now } : r,
        ),
        movements: [...newMovements, ...state.movements],
      };
    }

    // ── Bundles ───────────────────────────────────────────────────────────────
    case "CREATE_BUNDLE":
      return { ...state, bundles: [action.bundle, ...state.bundles] };

    case "UPDATE_BUNDLE":
      return {
        ...state,
        bundles: state.bundles.map((b) =>
          b.id === action.id ? { ...b, ...action.patch } : b,
        ),
      };

    case "DELETE_BUNDLE":
      return { ...state, bundles: state.bundles.filter((b) => b.id !== action.id) };

    case "ASSEMBLE_BUNDLE": {
      const bundle = state.bundles.find((b) => b.id === action.bundleId);
      if (!bundle) return state;
      const now = new Date().toISOString();
      let products = state.products;
      const newMovements: StockMovement[] = [];
      for (const comp of bundle.components) {
        const needed = comp.qty * action.qty;
        const product = products.find((p) => p.id === comp.productId);
        if (!product) continue;
        const before = product.stockByLocation[action.locationId] ?? 0;
        products = products.map((p) =>
          p.id === comp.productId ? applyStockDelta(p, action.locationId, -needed) : p,
        );
        newMovements.push({
          id: uid("mv"),
          type: "adjustment",
          productId: comp.productId,
          productName: comp.productName,
          sku: comp.sku,
          qtyBefore: before,
          qtyAfter: Math.max(0, before - needed),
          qtyDelta: -needed,
          locationId: action.locationId,
          userId: "u-current",
          userName: "Текущий пользователь",
          createdAt: now,
          reason: `Сборка комплекта «${bundle.name}» ×${action.qty}`,
        });
      }
      return { ...state, products, movements: [...newMovements, ...state.movements] };
    }

    // ── Replenishment Rules ───────────────────────────────────────────────────
    case "CREATE_RULE":
      return { ...state, replenishmentRules: [action.rule, ...state.replenishmentRules] };

    case "UPDATE_RULE":
      return {
        ...state,
        replenishmentRules: state.replenishmentRules.map((r) =>
          r.id === action.id ? { ...r, ...action.patch } : r,
        ),
      };

    case "DELETE_RULE":
      return { ...state, replenishmentRules: state.replenishmentRules.filter((r) => r.id !== action.id) };

    // ── Batches ───────────────────────────────────────────────────────────────
    case "REGISTER_BATCH":
      return { ...state, batches: [action.batch, ...state.batches] };

    case "UPDATE_BATCH":
      return {
        ...state,
        batches: state.batches.map((b) =>
          b.id === action.id ? { ...b, ...action.patch } : b,
        ),
      };

    case "WRITE_OFF_BATCH":
      return {
        ...state,
        batches: state.batches.map((b) =>
          b.id === action.id ? { ...b, remainingQty: 0, status: "expired" as const } : b,
        ),
      };

    case "QUARANTINE_BATCH":
      return {
        ...state,
        batches: state.batches.map((b) =>
          b.id === action.id ? { ...b, status: "quarantine" as const } : b,
        ),
      };

    case "WRITE_OFF_ALL_EXPIRED":
      return {
        ...state,
        batches: state.batches.map((b) =>
          b.status === "expired" ? { ...b, remainingQty: 0 } : b,
        ),
      };

    // ── Orders ────────────────────────────────────────────────────────────────
    case "CREATE_ORDER":
      return { ...state, orders: [action.order, ...state.orders] };

    case "IMPORT_ORDERS": {
      const existing = new Set(state.orders.map((o) => o.orderNumber));
      const fresh = action.orders.filter((o) => !existing.has(o.orderNumber));
      return { ...state, orders: [...fresh, ...state.orders] };
    }

    case "UPDATE_ORDER_STATUS": {
      const now = new Date().toISOString();
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.id
            ? {
                ...o,
                status: action.status,
                ...(action.status === "shipped" ? { shippedAt: now } : {}),
                ...(action.status === "delivered" ? { deliveredAt: now } : {}),
              }
            : o,
        ),
      };
    }

    case "CANCEL_ORDER":
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.id ? { ...o, status: "cancelled" as const } : o,
        ),
      };

    case "FULFILL_ORDER": {
      const order = state.orders.find((o) => o.id === action.id);
      if (!order || order.status === "shipped" || order.status === "delivered" || order.status === "cancelled") {
        return state;
      }
      const now = new Date().toISOString();
      let products = state.products;
      const newMovements: StockMovement[] = [];
      for (const item of order.items) {
        const product = products.find((p) => p.id === item.productId);
        if (!product) continue;
        const before = product.stockByLocation[order.locationId] ?? 0;
        products = products.map((p) =>
          p.id === item.productId ? applyStockDelta(p, order.locationId, -item.qty) : p,
        );
        const after = products.find((p) => p.id === item.productId)?.stockByLocation[order.locationId] ?? 0;
        newMovements.push({
          id: uid("mv"),
          type: "sale",
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          qtyBefore: before,
          qtyAfter: after,
          qtyDelta: -item.qty,
          locationId: order.locationId,
          userId: "u-current",
          userName: "Текущий пользователь",
          createdAt: now,
          reason: `Отгрузка заказа ${order.orderNumber}`,
          referenceId: order.id,
          referenceType: "sale",
        });
      }
      return {
        ...state,
        products,
        movements: [...newMovements, ...state.movements],
        orders: state.orders.map((o) =>
          o.id === action.id ? { ...o, status: "shipped" as const, shippedAt: now } : o,
        ),
      };
    }

    // ── Customers ─────────────────────────────────────────────────────────────
    case "CREATE_CUSTOMER":
      return { ...state, customers: [action.customer, ...state.customers] };
    case "UPDATE_CUSTOMER":
      return { ...state, customers: state.customers.map((c) => c.id === action.id ? { ...c, ...action.patch } : c) };
    case "ADD_LOYALTY_POINTS":
      return { ...state, customers: state.customers.map((c) => c.id === action.id ? { ...c, loyaltyPoints: c.loyaltyPoints + action.points } : c) };

    default:
      return state;
  }
}

// ── Context ──────────────────────────────────────────────────────────────────

interface InventoryContextValue extends InventoryState {
  actions: {
    addProduct: (product: Product) => void;
    updateProduct: (id: string, patch: Partial<Product>) => void;
    deleteProduct: (id: string) => void;
    archiveProduct: (id: string) => void;
    addPurchaseOrder: (data: Omit<PurchaseOrder, "id" | "createdAt" | "updatedAt">) => void;
    updatePOStatus: (id: string, status: PurchaseOrderStatus) => void;
    receivePOItems: (poId: string, received: Record<string, number>, locationId: string) => void;
    createTransfer: (data: Omit<Transfer, "id" | "createdAt">) => void;
    receiveTransfer: (id: string) => void;
    createStocktake: (locationId: string, products: StocktakeItem[], note?: string) => string;
    updateStocktakeCount: (stocktakeId: string, productId: string, qty: number) => void;
    completeStocktake: (stocktakeId: string) => void;
    adjustStock: (productId: string, locationId: string, delta: number, movementType: MovementType, reason?: string) => void;
    updatePrices: (updates: Record<string, { price?: number; costPrice?: number }>) => void;
    addSupplier: (data: Omit<Supplier, "id" | "createdAt">) => void;
    updateSupplier: (id: string, patch: Partial<Supplier>) => void;
    addLocation: (data: Omit<Location, "id">) => void;
    createReservation: (data: {
      productId: string; locationId: string; qty: number;
      source: ReservationSource; orderRef?: string; customerName?: string;
      expiresAt?: string; note?: string;
    }) => void;
    releaseReservation: (id: string) => void;
    fulfillReservation: (id: string) => void;
    extendReservation: (id: string, expiresAt: string) => void;
    resetDemo: () => void;
    createReturn: (returnRecord: ProductReturn) => void;
    processReturn: (id: string) => void;
    updateReturnStatus: (id: string, status: ReturnStatus) => void;
    createBundle: (bundle: Bundle) => void;
    updateBundle: (id: string, patch: Partial<Bundle>) => void;
    deleteBundle: (id: string) => void;
    assembleBundle: (bundleId: string, qty: number, locationId: string) => void;
    createRule: (rule: ReplenishmentRule) => void;
    updateRule: (id: string, patch: Partial<ReplenishmentRule>) => void;
    deleteRule: (id: string) => void;
    registerBatch: (batch: InventoryBatch) => void;
    updateBatch: (id: string, patch: Partial<InventoryBatch>) => void;
    writeOffBatch: (id: string) => void;
    quarantineBatch: (id: string) => void;
    writeOffAllExpired: () => void;
    createOrder: (order: Order) => void;
    updateOrderStatus: (id: string, status: OrderStatus) => void;
    fulfillOrder: (id: string) => void;
    cancelOrder: (id: string) => void;
    importOrders: (orders: Order[]) => void;
    createCustomer: (data: Omit<Customer, "id" | "createdAt">) => void;
    updateCustomer: (id: string, patch: Partial<Customer>) => void;
    addLoyaltyPoints: (id: string, points: number) => void;
  };
  // Computed helpers forwarded for convenience
  getAvailableStock: (product: Product) => number;
  getLocationName: (id: string) => string;
  getSupplierName: (id: string | undefined) => string;
  /** False until the seller's workspace has been loaded from Supabase. */
  ready: boolean;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  // SSR renders the deterministic mock seed; the client loads the seller's
  // workspace from Supabase on mount. A fresh account is seeded with the demo
  // data so there's something to explore immediately.
  const [state, dispatch] = useReducer(reducer, initialState);
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);
  const ownerId = useRef<string | null>(null);
  // createClient() returns null when env vars are absent (SSR prerender).
  // Initialised lazily inside the effect so it only runs client-side.
  const supabase = useRef<ReturnType<typeof createClient>>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest-state ref so action creators can read current data without
  // re-creating themselves on every state change.
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    supabase.current = createClient();
    let cancelled = false;
    (async () => {
      if (!supabase.current) {
        // Env vars not configured — run in demo/in-memory mode.
        hydrated.current = true;
        setReady(true);
        return;
      }
      const { data: { user } } = await supabase.current.auth.getUser();
      if (cancelled) return;
      if (!user) {
        // No session (e.g. SSR/demo) — keep the in-memory seed, don't persist.
        hydrated.current = true;
        setReady(true);
        return;
      }
      ownerId.current = user.id;
      try {
        const remote = await loadWorkspace(supabase.current, user.id);
        if (cancelled) return;
        if (remote) {
          dispatch({ type: "HYDRATE", state: remote });
        } else {
          // Fresh account: seed Supabase with the demo workspace.
          await saveWorkspace(supabase.current, user.id, initialState);
        }
      } catch {
        // Network/load failure — fall back to the in-memory seed.
      } finally {
        if (!cancelled) {
          hydrated.current = true;
          setReady(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Debounced persistence to Supabase after any mutation.
  useEffect(() => {
    if (!hydrated.current || !ownerId.current || !supabase.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const id = ownerId.current;
      const sb = supabase.current;
      if (!id || !sb) return;
      saveWorkspace(sb, id, stateRef.current).catch(() => {
        // Transient failure — the next mutation will retry the full sync.
      });
    }, 700);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state]);

  const actions: InventoryContextValue["actions"] = {
    addProduct: useCallback(
      (product) => dispatch({ type: "ADD_PRODUCT", product }),
      [],
    ),
    updateProduct: useCallback(
      (id, patch) => dispatch({ type: "UPDATE_PRODUCT", id, patch }),
      [],
    ),
    deleteProduct: useCallback(
      (id) => dispatch({ type: "DELETE_PRODUCT", id }),
      [],
    ),
    archiveProduct: useCallback(
      (id) => dispatch({ type: "ARCHIVE_PRODUCT", id }),
      [],
    ),
    addPurchaseOrder: useCallback((data) => {
      const po: PurchaseOrder = {
        ...data,
        id: uid("po"),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      dispatch({ type: "ADD_PURCHASE_ORDER", po });
    }, []),
    updatePOStatus: useCallback(
      (id, status) => dispatch({ type: "UPDATE_PO_STATUS", id, status }),
      [],
    ),
    receivePOItems: useCallback(
      (poId, received, locationId) =>
        dispatch({ type: "RECEIVE_PO_ITEMS", poId, received, locationId }),
      [],
    ),
    createTransfer: useCallback((data) => {
      const transfer: Transfer = {
        ...data,
        id: uid("tr"),
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: "CREATE_TRANSFER", transfer });
    }, []),
    receiveTransfer: useCallback(
      (id) => dispatch({ type: "RECEIVE_TRANSFER", id }),
      [],
    ),
    createStocktake: useCallback((locationId, items, note) => {
      const stocktake: Stocktake = {
        id: uid("st"),
        locationId,
        status: "in_progress",
        items,
        createdAt: new Date().toISOString(),
        note,
      };
      dispatch({ type: "CREATE_STOCKTAKE", stocktake });
      return stocktake.id;
    }, []),
    updateStocktakeCount: useCallback(
      (stocktakeId, productId, qty) =>
        dispatch({ type: "UPDATE_STOCKTAKE_COUNT", stocktakeId, productId, qty }),
      [],
    ),
    completeStocktake: useCallback(
      (stocktakeId) => dispatch({ type: "COMPLETE_STOCKTAKE", stocktakeId }),
      [],
    ),
    adjustStock: useCallback(
      (productId, locationId, delta, movementType, reason) =>
        dispatch({ type: "ADJUST_STOCK", productId, locationId, delta, movementType, reason }),
      [],
    ),
    updatePrices: useCallback(
      (updates) => dispatch({ type: "UPDATE_PRICES", updates }),
      [],
    ),
    addSupplier: useCallback((data) => {
      const supplier: Supplier = {
        ...data,
        id: uid("sup"),
        createdAt: new Date().toISOString().split("T")[0],
      };
      dispatch({ type: "ADD_SUPPLIER", supplier });
    }, []),
    updateSupplier: useCallback(
      (id, patch) => dispatch({ type: "UPDATE_SUPPLIER", id, patch }),
      [],
    ),
    addLocation: useCallback((data) => {
      const location: Location = { ...data, id: uid("loc") };
      dispatch({ type: "ADD_LOCATION", location });
    }, []),
    createReservation: useCallback((data) => {
      const product = stateRef.current.products.find((p) => p.id === data.productId);
      const reservation: Reservation = {
        id: uid("res"),
        productId: data.productId,
        productName: product?.name ?? data.productId,
        sku: product?.sku ?? "—",
        locationId: data.locationId,
        qty: data.qty,
        source: data.source,
        orderRef: data.orderRef,
        customerName: data.customerName,
        status: "active",
        createdAt: new Date().toISOString().split("T")[0],
        expiresAt: data.expiresAt,
        note: data.note,
      };
      dispatch({ type: "CREATE_RESERVATION", reservation });
    }, []),
    releaseReservation: useCallback(
      (id) => dispatch({ type: "RELEASE_RESERVATION", id }),
      [],
    ),
    fulfillReservation: useCallback(
      (id) => dispatch({ type: "FULFILL_RESERVATION", id }),
      [],
    ),
    extendReservation: useCallback(
      (id, expiresAt) => dispatch({ type: "EXTEND_RESERVATION", id, expiresAt }),
      [],
    ),
    resetDemo: useCallback(() => {
      dispatch({ type: "RESET_STATE" });
      const id = ownerId.current;
      const sb = supabase.current;
      if (id && sb) {
        saveWorkspace(sb, id, initialState).catch(() => {});
      }
    }, []),
    createReturn: useCallback((returnRecord) => dispatch({ type: "CREATE_RETURN", returnRecord }), []),
    processReturn: useCallback((id) => dispatch({ type: "PROCESS_RETURN", id }), []),
    updateReturnStatus: useCallback((id, status) => dispatch({ type: "UPDATE_RETURN_STATUS", id, status }), []),
    createBundle: useCallback((bundle) => dispatch({ type: "CREATE_BUNDLE", bundle }), []),
    updateBundle: useCallback((id, patch) => dispatch({ type: "UPDATE_BUNDLE", id, patch }), []),
    deleteBundle: useCallback((id) => dispatch({ type: "DELETE_BUNDLE", id }), []),
    assembleBundle: useCallback((bundleId, qty, locationId) => dispatch({ type: "ASSEMBLE_BUNDLE", bundleId, qty, locationId }), []),
    createRule: useCallback((rule) => dispatch({ type: "CREATE_RULE", rule }), []),
    updateRule: useCallback((id, patch) => dispatch({ type: "UPDATE_RULE", id, patch }), []),
    deleteRule: useCallback((id) => dispatch({ type: "DELETE_RULE", id }), []),
    registerBatch: useCallback((batch) => dispatch({ type: "REGISTER_BATCH", batch }), []),
    updateBatch: useCallback((id, patch) => dispatch({ type: "UPDATE_BATCH", id, patch }), []),
    writeOffBatch: useCallback((id) => dispatch({ type: "WRITE_OFF_BATCH", id }), []),
    quarantineBatch: useCallback((id) => dispatch({ type: "QUARANTINE_BATCH", id }), []),
    writeOffAllExpired: useCallback(() => dispatch({ type: "WRITE_OFF_ALL_EXPIRED" }), []),
    createOrder: useCallback((order) => dispatch({ type: "CREATE_ORDER", order }), []),
    updateOrderStatus: useCallback((id, status) => dispatch({ type: "UPDATE_ORDER_STATUS", id, status }), []),
    fulfillOrder: useCallback((id) => dispatch({ type: "FULFILL_ORDER", id }), []),
    cancelOrder: useCallback((id) => dispatch({ type: "CANCEL_ORDER", id }), []),
    importOrders: useCallback((orders) => dispatch({ type: "IMPORT_ORDERS", orders }), []),
    createCustomer: useCallback((data) => {
      const customer: Customer = { ...data, id: uid("cust"), createdAt: new Date().toISOString().split("T")[0] };
      dispatch({ type: "CREATE_CUSTOMER", customer });
    }, []),
    updateCustomer: useCallback((id, patch) => dispatch({ type: "UPDATE_CUSTOMER", id, patch }), []),
    addLoyaltyPoints: useCallback((id, points) => dispatch({ type: "ADD_LOYALTY_POINTS", id, points }), []),
  };

  const value: InventoryContextValue = {
    ...state,
    actions,
    getAvailableStock,
    getLocationName: (id) => state.locations.find((l) => l.id === id)?.name ?? id,
    getSupplierName: (id) => {
      if (!id) return "—";
      return state.suppliers.find((s) => s.id === id)?.name ?? id;
    },
    ready,
  };

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory(): InventoryContextValue {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within InventoryProvider");
  return ctx;
}
