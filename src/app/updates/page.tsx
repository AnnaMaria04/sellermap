import { PageSection } from "@/components/sellermap/section";
import { WeeklyUpdateCard } from "@/components/sellermap/weekly-update-card";
import { Card } from "@/components/ui/card";
import { weeklyUpdates } from "@/mock/sellermap";

export default function WeeklyUpdatesPage() {
  return (
    <main className="bg-background">
      <PageSection className="py-10">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-semibold tracking-tight">Недельные AI-обновления</h1>
          <p className="mt-3 max-w-2xl text-[var(--c-text2)]">
            Изменения правил Wildberries, движение стоимости упаковки, заметки по категориям
            и затронутые сохранённые товары.
          </p>
        </div>
        <Card className="mb-6 border-[var(--c-green)] bg-[var(--c-green-dim)]">
          <p className="text-sm font-semibold text-[var(--c-green)]">На этой неделе</p>
          <h2 className="font-display mt-2 text-2xl font-semibold">
            Изменения упаковки могут затронуть 3 сохранённых товара.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--c-text2)]">
            AI-сводка: пересмотрите допущения по упаковке для дорожных аксессуаров
            и мягких товаров до подтверждения объёма закупки у поставщика.
          </p>
        </Card>
        <div className="grid gap-4 lg:grid-cols-3">
          {weeklyUpdates.map((update) => (
            <WeeklyUpdateCard key={update.title} update={update} />
          ))}
        </div>
      </PageSection>
    </main>
  );
}
