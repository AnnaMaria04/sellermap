"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  PRODUCTS,
  SUPPLIERS,
  LOCATIONS,
  PURCHASE_ORDERS,
  TRANSFERS,
  STOCKTAKES,
  MOVEMENTS,
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
}

const initialState: InventoryState = {
  products: PRODUCTS,
  suppliers: SUPPLIERS,
  locations: LOCATIONS,
  purchaseOrders: PURCHASE_ORDERS,
  transfers: TRANSFERS,
  stocktakes: STOCKTAKES,
  movements: MOVEMENTS,
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
  | { type: "HYDRATE"; state: InventoryState }
  | { type: "RESET_STATE" };

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

    // ── Hydration / demo reset ──────────────────────────────────────────────
    case "HYDRATE":
      return action.state;

    case "RESET_STATE":
      return initialState;

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
    createStocktake: (locationId: string, products: StocktakeItem[], note?: string) => void;
    updateStocktakeCount: (stocktakeId: string, productId: string, qty: number) => void;
    completeStocktake: (stocktakeId: string) => void;
    adjustStock: (productId: string, locationId: string, delta: number, movementType: MovementType, reason?: string) => void;
    updatePrices: (updates: Record<string, { price?: number; costPrice?: number }>) => void;
    addSupplier: (data: Omit<Supplier, "id" | "createdAt">) => void;
    updateSupplier: (id: string, patch: Partial<Supplier>) => void;
    addLocation: (data: Omit<Location, "id">) => void;
    resetDemo: () => void;
  };
  // Computed helpers forwarded for convenience
  getAvailableStock: (product: Product) => number;
  getLocationName: (id: string) => string;
  getSupplierName: (id: string | undefined) => string;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

// ── Persistence ────────────────────────────────────────────────────────────
const STORAGE_KEY = "sellermap-inventory-v1";

function loadPersistedState(): InventoryState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<InventoryState>;
    return {
      products: parsed.products ?? initialState.products,
      suppliers: parsed.suppliers ?? initialState.suppliers,
      locations: parsed.locations ?? initialState.locations,
      purchaseOrders: parsed.purchaseOrders ?? initialState.purchaseOrders,
      transfers: parsed.transfers ?? initialState.transfers,
      stocktakes: parsed.stocktakes ?? initialState.stocktakes,
      movements: parsed.movements ?? initialState.movements,
    };
  } catch {
    return null;
  }
}

export function InventoryProvider({ children }: { children: ReactNode }) {
  // SSR renders the deterministic mock seed; the client rehydrates from
  // localStorage on mount to avoid a hydration mismatch.
  const [state, dispatch] = useReducer(reducer, initialState);
  const hydrated = useRef(false);

  useEffect(() => {
    const persisted = loadPersistedState();
    if (persisted) dispatch({ type: "HYDRATE", state: persisted });
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Quota or serialization failure — non-fatal for a demo.
    }
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
        status: "draft",
        items,
        createdAt: new Date().toISOString(),
        note,
      };
      dispatch({ type: "CREATE_STOCKTAKE", stocktake });
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
    resetDemo: useCallback(() => {
      if (typeof window !== "undefined") {
        try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
      }
      dispatch({ type: "RESET_STATE" });
    }, []),
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
  };

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory(): InventoryContextValue {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within InventoryProvider");
  return ctx;
}
