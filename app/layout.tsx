import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./foundation.css";
import { CartProvider } from "./components/cart-context";
import { PageTransition } from "./components/page-transition";
import { SITE_URL } from "../lib/site";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="antialiased">
        <a className="skip-link" href="#main">İçeriğe geç</a>
        <CartProvider><PageTransition>{children}</PageTransition></CartProvider>
      </body>
    </html>
  );
}
