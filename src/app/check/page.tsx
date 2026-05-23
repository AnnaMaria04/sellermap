"use client";

import { useState } from "react";
import { ProductCheckForm } from "@/components/sellermap/product-check-form";
import { PageSection } from "@/components/sellermap/section";
import { Card } from "@/components/ui/card";
import { dataProviders } from "@/lib/providers";

const statusLabels = {
  active: "активен",
  ready: "готов",
  placeholder: "не подключён",
  connected: "подключено",
};

const providerLabels: Record<string, string> = {
  ManualInputProvider: "Ручной ввод",
  CSVUploadProvider: "CSV-импорт",
  WBSellerAPIProvider: "WB API",
  MPStatsProvider: "MPStats",
  YandexAIProvider: "YandexGPT",
};

const acceptedInputs = ["Ссылка Wildberries", "Название товара", "Категория / ниша"];

export default function ProductCheckPage() {
  const [wbConnected, setWbConnected] = useState(false);

  return (
    <main className="bg-background">
      <PageSection className="py-10">
        <ProductCheckForm onWbConnect={() => setWbConnected(true)} />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {acceptedInputs.map((item) => (
            <Card key={item} className="p-4 shadow-none">
              <p className="text-xs font-semibold text-[var(--c-green)]">Принимает</p>
              <p className="mt-1 font-semibold">{item}</p>
            </Card>
          ))}
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-5">
          {dataProviders.map((provider) => {
            const isWbConnected = provider.name === "WBSellerAPIProvider" && wbConnected;
            const statusText = isWbConnected ? "подключено" : statusLabels[provider.status];
            const statusColor = isWbConnected
              ? "text-[var(--c-green)]"
              : provider.status === "active"
                ? "text-[var(--c-green)]"
                : "text-[var(--c-text3)]";
            return (
              <Card key={provider.name} className="p-4 shadow-none">
                <p className="text-sm font-semibold">{providerLabels[provider.name]}</p>
                <p className={`mt-1 text-xs font-semibold uppercase tracking-wide ${statusColor}`}>
                  {statusText}
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--c-text2)]">
                  {provider.description}
                </p>
              </Card>
            );
          })}
        </div>
      </PageSection>
    </main>
  );
}
