import Link from "next/link";
import { Map, Search } from "lucide-react";
import { LinkButton } from "@/components/ui/button";

const nav = [
  ["Product Check", "/check"],
  ["Result", "/result"],
  ["Dashboard", "/dashboard"],
  ["Reports", "/reports"],
  ["Updates", "/updates"],
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-light-gray bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-dark-green text-mint">
              <Map size={20} />
            </span>
            <span>SellerMap</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-charcoal hover:bg-soft-green hover:text-dark-green"
              >
                {label}
              </Link>
            ))}
          </nav>
          <LinkButton href="/check" className="h-10 px-4">
            <Search size={16} />
            Analyze
          </LinkButton>
        </div>
      </header>
      {children}
    </div>
  );
}
