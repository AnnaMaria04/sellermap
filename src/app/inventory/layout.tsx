import { InventoryProvider } from "@/contexts/InventoryContext";
import { OnboardingGate } from "@/components/inventory/OnboardingGate";
import type { ReactNode } from "react";

export default function InventoryLayout({ children }: { children: ReactNode }) {
  return (
    <InventoryProvider>
      <OnboardingGate>{children}</OnboardingGate>
    </InventoryProvider>
  );
}
