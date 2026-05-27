import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SellerMap",
    short_name: "SellerMap",
    description: "Физический магазин + WB + Ozon — в одном приложении",
    start_url: "/inventory",
    display: "standalone",
    background_color: "#0c0e0f",
    theme_color: "#0c0e0f",
    lang: "ru",
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
