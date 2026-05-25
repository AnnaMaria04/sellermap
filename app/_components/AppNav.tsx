import Link from "next/link";

export function AppNav({ active }: { active: "home" | "inventory" | "marketplace" }) {
  return (
    <nav className="topbar" aria-label="Основная навигация">
      <Link className="brand" href="/">
        SellerMap
      </Link>
      <div className="navLinks">
        <Link href="/" aria-current={active === "home" ? "page" : undefined}>
          Главная
        </Link>
        <Link href="/marketplace" aria-current={active === "marketplace" ? "page" : undefined}>
          Маркетплейс
        </Link>
        <Link href="/inventory" aria-current={active === "inventory" ? "page" : undefined}>
          Склад
        </Link>
      </div>
    </nav>
  );
}
