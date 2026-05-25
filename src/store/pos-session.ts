import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface POSSession {
  id: string;
  locationId: string;
  locationName: string;
  cashierName: string;
  openedAt: string; // ISO
  openingCash: number;
  salesTotal: number; // running total for this session
  transactionCount: number;
}

interface POSSessionState {
  session: POSSession | null;
  startSession: (params: Omit<POSSession, "id" | "openedAt" | "salesTotal" | "transactionCount">) => void;
  endSession: () => void;
  addSale: (amount: number) => void;
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
          },
        }),
      endSession: () => set({ session: null }),
      addSale: (amount) =>
        set((s) =>
          s.session
            ? { session: { ...s.session, salesTotal: s.session.salesTotal + amount, transactionCount: s.session.transactionCount + 1 } }
            : s
        ),
    }),
    { name: "pos-session" },
  ),
);
