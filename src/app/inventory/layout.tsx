import { InventoryProvider } from "@/contexts/InventoryContext";
import { OnboardingGate } from "@/components/inventory/OnboardingGate";
import { ModuleGuard } from "@/components/inventory/ModuleGuard";
import type { ReactNode } from "react";

export default function InventoryLayout({ children }: { children: ReactNode }) {
  return (
    <InventoryProvider>
      <OnboardingGate>
        <ModuleGuard>{children}</ModuleGuard>
      </OnboardingGate>
    </InventoryProvider>
  );
}
