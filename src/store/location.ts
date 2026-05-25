import { create } from "zustand";
import { persist } from "zustand/middleware";

interface LocationState {
  activeLocationId: string | null;
  setActiveLocation: (id: string) => void;
  clearActiveLocation: () => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      activeLocationId: null,
      setActiveLocation: (id) => set({ activeLocationId: id }),
      clearActiveLocation: () => set({ activeLocationId: null }),
    }),
    { name: "sellermap-active-location" },
  ),
);
