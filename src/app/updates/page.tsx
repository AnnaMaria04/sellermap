import { PageSection } from "@/components/sellermap/section";
import { WeeklyUpdateCard } from "@/components/sellermap/weekly-update-card";
import { Card } from "@/components/ui/card";
import { getPersonalizedUpdates } from "@/services/marketplaceIntelligence";

export const dynamic = "force-dynamic";

export default async function WeeklyUpdatesPage() {
  const weeklyUpdates = await getPersonalizedUpdates(12);
  const highImpact = weeklyUpdates.filter((update) => update.severity === "high").length;
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
          <p className="text-sm font-semibold text-[var(--c-green)]">Персональные обновления</p>
          <h2 className="font-display mt-2 text-2xl font-semibold">
            {weeklyUpdates.length ? `${highImpact} сильных сигналов и ${weeklyUpdates.length} обновлений по сохранённым товарам.` : "Пока нет сохранённых сигналов."}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--c-text2)]">
            Обновления строятся из сохранённых анализов, WB-снимков, отслеживаемых ключей и правил SellerMap.
            Если AI-ключ не подключён, используется честная deterministic-сводка.
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
