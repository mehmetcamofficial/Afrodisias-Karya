import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./foundation.css";
import "./editorial.css";
import "./admin.css";
import { CartProvider } from "./components/cart-context";
import { PageTransition } from "./components/page-transition";
import { SITE_URL } from "../lib/site";
import { HelpWidget } from "./components/help-widget";
import { contactConfig } from "../lib/contact-config";
import { getLiveProducts } from "../lib/live-products";
import { isProductionShowcase } from "../lib/showcase-mode";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Altın Dal — Aphrodisias Estate Olive Oil",
    template: "%s · Altın Dal",
  },
  description: "Ataeymir'deki aile zeytinliğimizden, Aphrodisias'ın zamansız coğrafyasına ait premium zeytinyağları.",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "Altın Dal — Aphrodisias Estate",
    images: [{ url: "/hero-tetrapylon-grove.webp", width: 1672, height: 941, alt: "Aphrodisias yakınında gün batımında zeytinlik" }],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#07100b",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const inventory = await getLiveProducts().catch(() => []);
  return (
    <html lang="tr">
      <head>
        {/* Loaded from <head> (not a CSS @import) so it downloads in parallel with the app CSS. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap" />
      </head>
      <body className="antialiased">
        <a className="skip-link" href="#main">İçeriğe geç</a>
        <CartProvider initialProducts={inventory} showcase={isProductionShowcase()}><PageTransition>{children}</PageTransition></CartProvider>
        <HelpWidget config={contactConfig()} />
      </body>
    </html>
  );
}
