import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "./components/cart-context";
import { PageTransition } from "./components/page-transition";

export const metadata: Metadata = {
  title: "Altın Dal — Aphrodisias Estate Olive Oil",
  description: "Ataeymir'deki aile zeytinliğimizden, Aphrodisias'ın zamansız coğrafyasına ait premium zeytinyağları.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="antialiased"><CartProvider><PageTransition>{children}</PageTransition></CartProvider></body>
    </html>
  );
}
