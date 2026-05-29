import { ProductCheckForm } from "@/components/sellermap/product-check-form";
import { PageSection } from "@/components/sellermap/section";
import { Card } from "@/components/ui/card";
import { dataProviders } from "@/lib/providers";

export default function ProductCheckPage() {
  const acceptedInputs = ["Ссылка Wildberries", "Название товара", "Категория / ниша"];
  const statusLabels = {
    active: "активен",
    ready: "готов",
    placeholder: "не подключён",
  };
  const providerLabels = {
    ManualInputProvider: "Ручной ввод",
    CSVUploadProvider: "CSV-импорт",
    WBSellerAPIProvider: "WB API",
    MPStatsProvider: "MPStats",
    YandexAIProvider: "YandexGPT",
  };

  return (
    <main className="bg-background">
      <PageSection className="py-10">
        <ProductCheckForm />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {acceptedInputs.map((item) => (
            <Card key={item} className="p-4 shadow-none">
              <p className="text-xs font-semibold text-[var(--c-green)]">Принимает</p>
              <p className="mt-1 font-semibold">{item}</p>
            </Card>
          ))}
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-5">
          {dataProviders.map((provider) => (
            <Card key={provider.name} className="p-4 shadow-none">
              <p className="text-sm font-semibold">{providerLabels[provider.name]}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[var(--c-green)]">
                {statusLabels[provider.status]}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--c-text2)]">
                {provider.description}
              </p>
            </Card>
          ))}
        </div>
      </PageSection>
    </main>
  );
}
