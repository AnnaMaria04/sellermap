import type { Metadata, Viewport } from "next";
import { Geologica, Unbounded } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/sellermap/app-shell";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { PWARegister } from "@/components/pwa/PWARegister";
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
    "Физический магазин + WB + Ozon — в одном приложении.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "SellerMap", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0c0e0f",
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
        <PWARegister />
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
