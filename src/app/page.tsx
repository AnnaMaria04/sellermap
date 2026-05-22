import {
  ArrowRight,
  CheckCircle2,
  Database,
  ScanSearch,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageSection } from "@/components/sellermap/section";
import { ScoreGauge } from "@/components/sellermap/score-gauge";

export default function LandingPage() {
  const steps: Array<[LucideIcon, string, string]> = [
    [ScanSearch, "Проверка", "Вставьте ссылку WB, артикул, название товара или нишу."],
    [Database, "Диагностика", "Система связывает цену, спрос, отзывы, упаковку и риск маржи."],
    [Sparkles, "Решение", "Получите вердикт, список доработок и план запуска."],
  ];

  return (
    <main>
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
        <div>
          <h1 className="font-display max-w-3xl text-4xl font-semibold tracking-tight text-[var(--c-text)] sm:text-6xl">
            Проверьте товар для Wildberries до закупки партии.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--c-text2)]">
            SellerMap анализирует конкуренцию, цены, отзывы, упаковку, логистику
            и качество карточки, чтобы дать понятный вердикт по запуску.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/check">
              Анализировать товар <ArrowRight size={16} />
            </LinkButton>
            <LinkButton href="/result" variant="secondary">
              Смотреть демо-отчёт
            </LinkButton>
          </div>
        </div>
        <Card className="overflow-hidden p-0">
          <div className="grid gap-0 lg:grid-cols-[0.85fr_1fr]">
            <div className="border-r border-[var(--c-border)] bg-[var(--c-green-dim)] p-6">
              <Badge tone="mint">Демо-диагностика</Badge>
              <div className="mt-6">
                <ScoreGauge score={78} />
              </div>
              <p className="font-display mt-5 text-xl font-semibold">
                Перспективно, но упаковку нужно проверить
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--c-text2)]">
                Действие: усилить комплект, подтвердить стоимость упаковки и
                удерживать чистую маржу выше 20%.
              </p>
            </div>
            <div className="space-y-4 p-6">
              {[
                ["Конкуренция", "средняя"],
                ["Риск маржи", "высокий"],
                ["Качество карточки", "слабое"],
                ["Спрос", "сильный"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] p-4">
                  <span className="text-[var(--c-text2)]">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
              <div className="mt-4 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-[var(--c-bg2)] p-3">
                    <p className="text-xs font-semibold text-[var(--c-text3)]">Карта рынка</p>
                    <div className="mt-3 h-24 rounded-lg border border-[var(--c-border)] matrix-grid" />
                  </div>
                  <div className="rounded-lg bg-[var(--c-bg2)] p-3">
                    <p className="text-xs font-semibold text-[var(--c-text3)]">Стек затрат</p>
                    <div className="mt-3 space-y-2">
                      <span className="block h-2 w-4/5 rounded bg-[var(--c-border2)]" />
                      <span className="block h-2 w-3/5 rounded bg-[var(--c-border2)]" />
                      <span className="block h-2 w-2/3 rounded bg-[var(--c-green)]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <PageSection title="От идеи товара к решению о запуске">
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map(([Icon, title, text]) => (
            <Card key={String(title)} className="p-6 shadow-none">
              <Icon className="text-[var(--c-green)]" size={24} />
              <h3 className="font-display mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--c-text2)]">{text}</p>
            </Card>
          ))}
        </div>
      </PageSection>

      <section className="bg-[var(--c-bg2)]">
        <PageSection title="Для продавцов, которым нужен ясный ответ">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {["Начинающий продавец", "Действующий продавец WB", "Исследователь ниш", "Агентство"].map((segment) => (
              <Card key={segment} className="p-5 shadow-none">
                <CheckCircle2 className="text-[var(--c-green)]" size={20} />
                <h3 className="mt-4 font-medium">{segment}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--c-text2)]">
                  Диагностика для решения без перегруза сырыми таблицами.
                </p>
              </Card>
            ))}
          </div>
        </PageSection>
      </section>
    </main>
  );
}
