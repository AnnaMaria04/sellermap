import { create } from "zustand";
import { persist } from "zustand/middleware";

export type POSPaymentMethod = "cash" | "card" | "sbp";

export interface POSReceiptItem {
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
}

export interface POSReceipt {
  orderId: string;
  orderNumber: string;
  total: number;
  paymentMethod: POSPaymentMethod;
  items: POSReceiptItem[];
  createdAt: string; // ISO
}

export interface POSSession {
  id: string;
  locationId: string;
  locationName: string;
  cashierName: string;
  openedAt: string; // ISO
  openingCash: number;
  salesTotal: number;
  transactionCount: number;
  receipts: POSReceipt[];
}

interface POSSessionState {
  session: POSSession | null;
  startSession: (params: Omit<POSSession, "id" | "openedAt" | "salesTotal" | "transactionCount" | "receipts">) => void;
  endSession: () => void;
  addSale: (amount: number, receipt?: POSReceipt) => void;
}

export const usePOSSession = create<POSSessionState>()(
  persist(
    (set) => ({
      session: null,
      startSession: (params) =>
        set({
          session: {
            ...params,
            id: `pos-${Date.now()}`,
            openedAt: new Date().toISOString(),
            salesTotal: 0,
            transactionCount: 0,
            receipts: [],
          },
        }),
      endSession: () => set({ session: null }),
      addSale: (amount, receipt) =>
        set((s) =>
          s.session
            ? {
                session: {
                  ...s.session,
                  salesTotal: s.session.salesTotal + amount,
                  transactionCount: s.session.transactionCount + 1,
                  receipts: receipt ? [...s.session.receipts, receipt] : s.session.receipts,
                },
              }
            : s
        ),
    }),
    { name: "pos-session" },
  ),
);
