import type { Metadata } from "next";
import { Geologica, Unbounded } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/sellermap/app-shell";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { Toaster } from "sonner";

const geologica = Geologica({
  variable: "--font-body",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500"],
});

const unbounded = Unbounded({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "SellerMap",
  description:
    "Инструмент анализа товаров для продавцов Wildberries и Ozon.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geologica.variable} ${unbounded.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
