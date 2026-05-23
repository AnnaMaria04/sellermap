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
  const [wbStatus, setWbStatus] = useState<"idle" | "loading" | "connected" | "missing_token" | "error">("idle");

  async function checkWbStatus() {
    setWbStatus("loading");
    try {
      const response = await fetch("/api/wb/status");
      const data = await response.json();
      setWbStatus(data.status === "connected" ? "connected" : "missing_token");
      if (data.status === "connected") setWbConnected(true);
    } catch {
      setWbStatus("error");
    }
  }

  const officialWbConnected = wbConnected || wbStatus === "connected";

  return (
    <main className="bg-background">
      <PageSection className="py-10">
        <ProductCheckForm />
        <Card className="mt-6 flex flex-wrap items-center justify-between gap-4 p-4 shadow-none">
          <div>
            <p className="font-semibold">Официальный WB API</p>
            <p className="mt-1 text-sm text-[var(--c-text2)]">
              Проверяет наличие серверного WB_API_TOKEN для тарифов, категорий и товаров продавца.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[var(--c-bg3)] px-3 py-1 text-xs font-semibold text-[var(--c-text2)]">
              {wbStatus === "connected"
                ? "подключено"
                : wbStatus === "missing_token"
                  ? "ожидает API ключ"
                  : wbStatus === "error"
                    ? "ошибка подключения"
                    : wbStatus === "loading"
                      ? "проверка..."
                      : "не проверено"}
            </span>
            <button
              type="button"
              onClick={checkWbStatus}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--c-border2)] px-4 text-sm font-medium text-[var(--c-text2)] transition hover:border-white/25 hover:text-[var(--c-text)]"
            >
              Проверить подключение WB API
            </button>
          </div>
        </Card>
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
            const isWbConnected = provider.name === "WBSellerAPIProvider" && officialWbConnected;
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
