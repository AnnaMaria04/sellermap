import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ManagerPinState {
  pinHash: string | null;
  discountThresholdPct: number;
  setPin: (pin: string) => void;
  clearPin: () => void;
  verifyPin: (pin: string) => boolean;
  setDiscountThreshold: (pct: number) => void;
}

function hashPin(pin: string): string {
  // Simple deterministic hash — sufficient for a local dev bypass.
  // Not cryptographic; for production this would be bcrypt on the server.
  let h = 5381;
  for (let i = 0; i < pin.length; i++) {
    h = ((h << 5) + h) ^ pin.charCodeAt(i);
    h = h >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export const useManagerPin = create<ManagerPinState>()(
  persist(
    (set, get) => ({
      pinHash: null,
      discountThresholdPct: 10,
      setPin: (pin) => set({ pinHash: hashPin(pin) }),
      clearPin: () => set({ pinHash: null }),
      verifyPin: (pin) => {
        const { pinHash } = get();
        if (!pinHash) return true; // no PIN configured = always allowed
        return hashPin(pin) === pinHash;
      },
      setDiscountThreshold: (pct) => set({ discountThresholdPct: pct }),
    }),
    { name: "manager-pin" },
  ),
);
