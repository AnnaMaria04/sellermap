"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { useInventory } from "@/contexts/InventoryContext";
import type { Product, ProductType, ProductStatus } from "@/mock/inventory";

const schema = z.object({
  name: z.string().min(1, "Название обязательно"),
  sku: z.string().min(1, "Артикул обязателен"),
  barcode: z.string().optional(),
  category: z.string().min(1, "Выберите категорию"),
  productType: z.enum(["product", "ingredient", "bundle", "packaging"]),
  price: z.number({ error: "Укажите цену" }).min(0),
  costPrice: z.number({ error: "Укажите себестоимость" }).min(0),
  description: z.string().optional(),
  status: z.enum(["active", "draft"]),
});

type FormValues = z.infer<typeof schema>;

function generateSku(name: string): string {
  const base = name.toUpperCase().replace(/[^A-ZА-Я0-9]/g, "").slice(0, 4) || "SKU";
  const suffix = Math.floor(1000 + Math.random() * 9000).toString();
  return base + "-" + suffix;
}

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  product: "Товар",
  ingredient: "Ингредиент",
  bundle: "Комплект",
  packaging: "Упаковка",
};

export default function NewProductPage() {
  const router = useRouter();
  const { products, actions } = useInventory();

  // Derive unique categories from existing products
  const categories = Array.from(new Set(products.map((p) => p.category))).sort();

  const skuTouchedRef = useRef(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      sku: "",
      barcode: "",
      category: "",
      productType: "product",
      price: 0,
      costPrice: 0,
      description: "",
      status: "active",
    },
  });

  const nameValue = watch("name");

  // Prefill from sessionStorage if navigated from /result "Добавить в склад"
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("prefill_product");
      if (raw) {
        const data = JSON.parse(raw) as { name?: string; buyPrice?: number; sellPrice?: number };
        if (data.name) setValue("name", data.name, { shouldValidate: false });
        if (typeof data.sellPrice === "number") setValue("price", data.sellPrice, { shouldValidate: false });
        if (typeof data.buyPrice === "number") setValue("costPrice", data.buyPrice, { shouldValidate: false });
        // Auto-generate SKU from prefilled name
        if (data.name) {
          setValue("sku", generateSku(data.name), { shouldValidate: false });
        }
        sessionStorage.removeItem("prefill_product");
      }
    } catch {
      // ignore
    }
  }, [setValue]);

  // Auto-generate SKU from name when name changes and SKU hasn't been manually edited
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    if (!skuTouchedRef.current && newName) {
      setValue("sku", generateSku(newName), { shouldValidate: false });
    }
  };

  const onSubmit = async (data: FormValues) => {
    const now = new Date().toISOString().split("T")[0];
    const id = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const margin =
      data.price > 0
        ? Math.round(((data.price - data.costPrice) / data.price) * 1000) / 10
        : 0;

    const newProduct: Product = {
      id,
      name: data.name,
      sku: data.sku,
      barcode: data.barcode || undefined,
      category: data.category,
      productType: data.productType as ProductType,
      status: data.status as ProductStatus,
      description: data.description || undefined,
      price: data.price,
      costPrice: data.costPrice,
      margin,
      hasVariants: false,
      variants: [],
      channels: [],
      tags: [],
      requiresLabeling: false,
      stockByLocation: {},
      reservedUnits: 0,
      damagedUnits: 0,
      inTransitUnits: 0,
      totalPhysical: 0,
      createdAt: now,
      updatedAt: now,
    };

    actions.addProduct(newProduct);
    toast.success("Товар создан");
    router.push("/inventory/products/" + newProduct.id);
  };

  return (
    <InventoryShell title="Новый товар" subtitle="Заполните данные о товаре">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="max-w-2xl space-y-6">

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
              Название <span className="text-[var(--c-red)]">*</span>
            </label>
            <input
              type="text"
              {...register("name")}
              onChange={(e) => {
                register("name").onChange(e);
                handleNameChange(e);
              }}
              placeholder="Например: Футболка оверсайз"
              className={`h-10 w-full rounded-lg border bg-[var(--c-bg2)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] outline-none transition focus:border-[var(--c-green)] ${
                errors.name ? "border-[var(--c-red)]" : "border-[var(--c-border2)]"
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-[var(--c-red)]">{errors.name.message}</p>
            )}
          </div>

          {/* SKU */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
              Артикул (SKU) <span className="text-[var(--c-red)]">*</span>
            </label>
            <input
              type="text"
              {...register("sku")}
              onFocus={() => { skuTouchedRef.current = true; }}
              placeholder="Например: TSH-OV-001"
              className={`h-10 w-full rounded-lg border bg-[var(--c-bg2)] px-3 font-mono text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] outline-none transition focus:border-[var(--c-green)] ${
                errors.sku ? "border-[var(--c-red)]" : "border-[var(--c-border2)]"
              }`}
            />
            {errors.sku && (
              <p className="mt-1 text-xs text-[var(--c-red)]">{errors.sku.message}</p>
            )}
          </div>

          {/* Barcode */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
              Штрихкод
            </label>
            <input
              type="text"
              {...register("barcode")}
              placeholder="EAN-13 или другой"
              className="h-10 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 font-mono text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] outline-none transition focus:border-[var(--c-green)]"
            />
          </div>

          {/* Category */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
              Категория <span className="text-[var(--c-red)]">*</span>
            </label>
            <input
              type="text"
              list="categories-list"
              {...register("category")}
              placeholder="Выберите или введите категорию"
              className={`h-10 w-full rounded-lg border bg-[var(--c-bg2)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] outline-none transition focus:border-[var(--c-green)] ${
                errors.category ? "border-[var(--c-red)]" : "border-[var(--c-border2)]"
              }`}
            />
            <datalist id="categories-list">
              {categories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
            {errors.category && (
              <p className="mt-1 text-xs text-[var(--c-red)]">{errors.category.message}</p>
            )}
          </div>

          {/* Product Type */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
              Тип товара <span className="text-[var(--c-red)]">*</span>
            </label>
            <select
              {...register("productType")}
              className={`h-10 w-full rounded-lg border bg-[var(--c-bg2)] px-3 text-sm text-[var(--c-text)] outline-none transition focus:border-[var(--c-green)] ${
                errors.productType ? "border-[var(--c-red)]" : "border-[var(--c-border2)]"
              }`}
            >
              {Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {errors.productType && (
              <p className="mt-1 text-xs text-[var(--c-red)]">{errors.productType.message}</p>
            )}
          </div>

          {/* Price + Cost */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
                Цена продажи, ₽ <span className="text-[var(--c-red)]">*</span>
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                {...register("price", { valueAsNumber: true })}
                className={`h-10 w-full rounded-lg border bg-[var(--c-bg2)] px-3 text-sm text-[var(--c-text)] tabular outline-none transition focus:border-[var(--c-green)] ${
                  errors.price ? "border-[var(--c-red)]" : "border-[var(--c-border2)]"
                }`}
              />
              {errors.price && (
                <p className="mt-1 text-xs text-[var(--c-red)]">{errors.price.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
                Себестоимость, ₽ <span className="text-[var(--c-red)]">*</span>
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                {...register("costPrice", { valueAsNumber: true })}
                className={`h-10 w-full rounded-lg border bg-[var(--c-bg2)] px-3 text-sm text-[var(--c-text)] tabular outline-none transition focus:border-[var(--c-green)] ${
                  errors.costPrice ? "border-[var(--c-red)]" : "border-[var(--c-border2)]"
                }`}
              />
              {errors.costPrice && (
                <p className="mt-1 text-xs text-[var(--c-red)]">{errors.costPrice.message}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
              Описание
            </label>
            <textarea
              {...register("description")}
              rows={4}
              placeholder="Опишите товар..."
              className="w-full resize-none rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] outline-none transition focus:border-[var(--c-green)]"
            />
          </div>

          {/* Status */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
              Статус
            </label>
            <select
              {...register("status")}
              className="h-10 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 text-sm text-[var(--c-text)] outline-none transition focus:border-[var(--c-green)]"
            >
              <option value="active">Активный</option>
              <option value="draft">Черновик</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-10 items-center rounded-lg border border-[var(--c-border2)] px-4 text-sm font-medium text-[var(--c-text2)] transition hover:border-white/25 hover:text-[var(--c-text)]"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-10 items-center gap-2 rounded-lg bg-[var(--c-green)] px-5 text-sm font-semibold text-[var(--c-bg)] shadow-sm transition hover:bg-[#25e890] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {isSubmitting ? "Создание..." : "Создать товар"}
            </button>
          </div>
        </div>
      </form>
    </InventoryShell>
  );
}
