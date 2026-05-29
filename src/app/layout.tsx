import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/sellermap/app-shell";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { PWARegister } from "@/components/pwa/PWARegister";
import { Toaster } from "sonner";

// One clean, neutral sans across the whole app (Shopify-admin style).
const inter = Inter({
  variable: "--font-body",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SellerMap",
  description:
    "Физический магазин + WB + Ozon — в одном приложении.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "SellerMap", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
        <PWARegister />
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
