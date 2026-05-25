import { InventoryProvider } from "@/contexts/InventoryContext";
import type { ReactNode } from "react";

export default function InventoryLayout({ children }: { children: ReactNode }) {
  return <InventoryProvider>{children}</InventoryProvider>;
}
