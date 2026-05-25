import Link from "next/link";
import { AppNav } from "./_components/AppNav";
import { calculateAvailableToSell, createInitialStockStatus } from "@/lib/inventory/foundation";

const sampleAvailability = calculateAvailableToSell(
  createInitialStockStatus({
    physical: 128,
    reserved: 17,
    damaged: 4,
    expired: 2,
    inTransit: 23,
  }),
);

const productTracks = [
  {
    title: "Маркетплейс-аналитика",
    description: "Старый трек не удалён: проверка товара, расчёт маржи, упаковка, логистика WB и карта рисков.",
    href: "/marketplace",
    status: "Сохранено",
  },
  {
    title: "Склад для малого бизнеса",
    description: "Новый основной трек: товары, поставщики, остатки, закупки, приёмка, движения и рекомендации.",
    href: "/inventory",
    status: "Главное обновление",
  },
];

export default function HomePage() {
  return (
    <main className="shell">
      <AppNav active="home" />

      <section className="heroBand">
        <div className="heroCopy">
          <h1>SellerMap разделяет маркетплейс и склад в одном продукте.</h1>
          <p>
            Маркетплейс-аналитика остаётся доступной, а новый бизнес-трек помогает владельцу
            управлять товарами, поставщиками, кассой, резервами, закупками и ежедневными решениями.
          </p>
          <div className="actions">
            <Link className="primaryAction" href="/inventory">
              Открыть склад
            </Link>
            <Link className="secondaryAction" href="/marketplace">
              Открыть маркетплейс
            </Link>
          </div>
        </div>

        <div className="availabilityPanel" aria-label="Пример доступного остатка">
          <span className="panelLabel">Формула остатка</span>
          <strong>{sampleAvailability.availableToSell}</strong>
          <p>доступно к продаже из 128 физических единиц</p>
          <code>физический остаток - резерв - брак - просрочка - товар в пути</code>
        </div>
      </section>

      <section className="trackGrid" aria-label="Треки продукта">
        {productTracks.map((track) => (
          <article className="trackCard" key={track.title}>
            <span>{track.status}</span>
            <h2>{track.title}</h2>
            <p>{track.description}</p>
            <Link href={track.href}>Перейти</Link>
          </article>
        ))}
      </section>
    </main>
  );
}
