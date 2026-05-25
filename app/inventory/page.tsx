import { AppNav } from "../_components/AppNav";
import { InventoryWorkspace } from "./InventoryWorkspace";

export default function InventoryPage() {
  return (
    <main className="shell inventoryShell">
      <AppNav active="inventory" />
      <InventoryWorkspace />
    </main>
  );
}
