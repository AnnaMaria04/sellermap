import { InventoryProvider } from "@/contexts/InventoryContext";
import type { ReactNode } from "react";

export default function POSLayout({ children }: { children: ReactNode }) {
  return <InventoryProvider>{children}</InventoryProvider>;
}
