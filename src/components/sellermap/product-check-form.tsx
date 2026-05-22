"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Upload, WandSparkles, Link as LinkIcon, Database } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const schema = z.object({
  productUrl: z.string().optional(),
  productName: z.string().min(2, "Product name is useful for demo analysis."),
  category: z.string().optional(),
  purchaseCost: z.coerce.number().optional(),
  sellingPrice: z.coerce.number().optional(),
  packagingCost: z.coerce.number().optional(),
  weight: z.string().optional(),
  dimensions: z.string().optional(),
});

export function ProductCheckForm() {
  const {
    register,
    formState: { errors },
  } = useForm<z.input<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      productName: "Foldable travel cosmetic organizer",
      category: "Travel accessories",
      purchaseCost: 900,
      sellingPrice: 2490,
      packagingCost: 95,
    },
  });

  return (
    <Card className="p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Analyze product</h1>
          <p className="mt-2 max-w-2xl text-neutral-600">
            Enter a Wildberries link, product name, or niche. Demo mode uses
            mock data until live integrations are connected.
          </p>
        </div>
        <span className="hidden rounded-full bg-soft-green px-3 py-1 text-xs font-semibold text-dark-green sm:inline-flex">
          Demo-ready
        </span>
      </div>

      <form className="grid gap-4 md:grid-cols-2">
        <label className="md:col-span-2">
          <span className="mb-2 block text-sm font-semibold">Wildberries product URL</span>
          <Input placeholder="https://wildberries.ru/catalog/..." {...register("productUrl")} />
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold">Product name</span>
          <Input {...register("productName")} />
          {errors.productName && (
            <span className="mt-1 block text-xs text-risk">{errors.productName.message}</span>
          )}
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold">Category / niche</span>
          <Input {...register("category")} />
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold">Purchase cost</span>
          <Input type="number" {...register("purchaseCost")} />
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold">Expected selling price</span>
          <Input type="number" {...register("sellingPrice")} />
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold">Packaging cost</span>
          <Input type="number" {...register("packagingCost")} />
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold">Weight</span>
          <Input placeholder="0.4 kg" {...register("weight")} />
        </label>
        <label className="md:col-span-2">
          <span className="mb-2 block text-sm font-semibold">Dimensions</span>
          <Input placeholder="30 x 20 x 8 cm" {...register("dimensions")} />
        </label>
      </form>

      <div className="mt-6 flex flex-wrap gap-3">
        <LinkButton href="/result">
          <WandSparkles size={16} />
          Analyze Product
        </LinkButton>
        <Button variant="secondary">
          <Upload size={16} />
          Upload CSV
        </Button>
        <Button variant="secondary">
          <Database size={16} />
          Connect Wildberries API
        </Button>
        <LinkButton href="/result" variant="ghost">
          <LinkIcon size={16} />
          Use demo product
        </LinkButton>
      </div>
      <p className="mt-4 text-sm text-neutral-500">
        Data availability depends on connected sources.
      </p>
    </Card>
  );
}
