"use client";

import { ShoppingCart, XCircle } from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";

export default function AbandonedCheckoutsPage() {
  return (
    <InventoryShell
      title="Брошенные корзины"
      actions={
        <button className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg2)]">
          Действия
        </button>
      }
    >
      <div className="mx-auto max-w-[1040px]">
        <div className="overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
          {/* Empty state */}
          <div className="flex items-center justify-between gap-6 px-8 py-10">
            <div className="max-w-md">
              <h2 className="text-base font-semibold text-[var(--c-text)]">
                Здесь появятся брошенные корзины
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--c-text2)]">
                Смотрите, когда клиенты добавили товар в корзину, но не оформили заказ.
                Вы можете отправить им ссылку на корзину.
              </p>
            </div>
            <CartArt />
          </div>

          {/* Recover-email footer */}
          <div className="border-t border-[var(--c-border)] bg-[var(--c-bg3)] px-8 py-5">
            <h3 className="text-sm font-semibold text-[var(--c-text)]">
              Восстанавливайте продажи письмом о брошенной корзине
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-[var(--c-text2)]">
              Автоматическое письмо уже создано для вас. Уделите минуту, чтобы проверить
              текст, оформление и список получателей.
            </p>
            <button className="mt-3 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg2)]">
              Проверить письмо
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-[var(--c-text2)]">
          <a href="#" className="underline decoration-[var(--c-text3)] underline-offset-2 hover:text-[var(--c-text)]">
            Подробнее о брошенных корзинах
          </a>
        </p>
      </div>
    </InventoryShell>
  );
}

function CartArt() {
  return (
    <div className="relative hidden h-28 w-28 shrink-0 items-center justify-center rounded-full bg-[var(--c-bg3)] sm:flex">
      <ShoppingCart className="h-10 w-10 text-[var(--c-green)]" />
      <XCircle className="absolute right-4 top-5 h-6 w-6 fill-[var(--c-bg)] text-[var(--c-red)]" />
    </div>
  );
}
