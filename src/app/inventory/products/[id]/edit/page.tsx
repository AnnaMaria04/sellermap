"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { ProductForm } from "@/components/inventory/ProductForm";
import { useInventory } from "@/contexts/InventoryContext";

interface Props { params: Promise<{ id: string }> }

export default function EditProductPage({ params }: Props) {
  const { id } = use(params);
  const { products } = useInventory();
  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <InventoryShell>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package size={48} className="mb-4 text-[var(--c-text3)]" />
          <h1 className="text-xl font-bold text-[var(--c-text)]">Товар не найден</h1>
          <p className="mt-2 text-sm text-[var(--c-text2)]">Товар с ID {id} не существует</p>
          <Link href="/inventory/products" className="mt-4 flex items-center gap-2 text-sm text-[var(--c-green)] hover:opacity-80 transition">
            <ArrowLeft size={14} />
            Назад к товарам
          </Link>
        </div>
      </InventoryShell>
    );
  }

  return <ProductForm mode="edit" initial={product} />;
}
