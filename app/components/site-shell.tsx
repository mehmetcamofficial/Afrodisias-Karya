"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useEffect, useState } from "react";
import { currencies, type Currency } from "../../lib/products";
import { useCart } from "./cart-context";

const links = [
  ["Hikâyemiz", "/hikayemiz"],
  ["Hasat", "/hasat"],
  ["Günlük", "/gunluk"],
  ["Koleksiyon", "/koleksiyon"],
  ["Deneyim", "/deneyim"],
  ["Mağaza", "/magaza"],
] as const;

export function BrandHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { itemCount, openCart, currency, setCurrency } = useCart();

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  return (
    <header className="brand-header">
      <Link className="brand-logo" href="/" aria-label="Altın Dal ana sayfa">
        <span>AD</span><b>ALTIN DAL<small>APHRODISIAS ESTATE</small></b>
      </Link>
      <nav id="primary-navigation" className={open ? "open" : ""} aria-label="Ana navigasyon">
        {links.map(([label, href]) => (
          <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => setOpen(false)}>{label}</Link>
        ))}
        <Link href="/admin" aria-current={pathname.startsWith("/admin") ? "page" : undefined} onClick={() => setOpen(false)}>Admin</Link>
      </nav>
      <div className="brand-actions">
        <label className="header-currency">
          <span className="sr-only">Para birimi</span>
          <select value={currency} onChange={(event) => setCurrency(event.target.value as Currency)} aria-label="Para birimi seçin">
            {currencies.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
          </select>
        </label>
        <button className="brand-bag" onClick={openCart} aria-label={`Sepeti aç, ${itemCount} ürün`}>
          <ShoppingBag size={18}/>{itemCount > 0 && <i>{itemCount}</i>}
        </button>
        <button className="brand-menu" onClick={() => setOpen((value) => !value)} aria-label="Menüyü aç veya kapat" aria-expanded={open} aria-controls="primary-navigation">
          {open ? <X/> : <Menu/>}
        </button>
      </div>
    </header>
  );
}

export function BrandFooter() {
  return (
    <footer className="brand-footer">
      <Link className="brand-logo" href="/"><span>AD</span><b>ALTIN DAL<small>APHRODISIAS ESTATE</small></b></Link>
      <nav aria-label="Alt navigasyon">{links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav>
      <p>Karacasu · Ataeymir · Aydın<br/>© 2026 Altın Dal</p>
    </footer>
  );
}

export function BrandShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`brand-site ${className}`}><BrandHeader/><main>{children}</main><BrandFooter/></div>;
}
