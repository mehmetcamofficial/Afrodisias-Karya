"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, ShoppingBag, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { blogCategories, categorySlugs } from "../../lib/blog";
import { categoryLabels, currencies, type Currency, type ProductCategory } from "../../lib/products";
import { useCart } from "./cart-context";

const links = [
  ["Hikâyemiz", "/hikayemiz"],
  ["Hasat", "/hasat"],
  ["Günlük", "/gunluk"],
  ["Koleksiyon", "/koleksiyon"],
  ["Deneyim", "/deneyim"],
  ["Mağaza", "/magaza"],
] as const;

/** Megamenu groups: every entry points at a real page or a real store filter. */
const groups: Record<string, { title: string; items: Array<[string, string]> }> = {
  "/magaza": { title: "Mağaza", items: [["Tüm ürünler", "/magaza"], ...(Object.entries(categoryLabels) as Array<[ProductCategory, string]>).map(([key, label]): [string, string] => [label, `/magaza?kategori=${key}`]), ["Koleksiyonlar", "/koleksiyon"]] },
  "/gunluk": { title: "Günlük", items: [["Tüm yazılar", "/gunluk"], ...blogCategories.map((category): [string, string] => [category, `/gunluk/${categorySlugs[category]}`])] },
};

export function BrandHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const expandedRef = useRef<string | null>(null);
  useEffect(() => { expandedRef.current = expanded; }, [expanded]);
  const { showcase, itemCount, openCart, currency, setCurrency } = useCart();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // First Escape closes an open submenu (focus back to its toggle); the next closes the mobile menu.
      const current = expandedRef.current;
      if (current) {
        setExpanded(null);
        navRef.current?.querySelector<HTMLButtonElement>(`[data-menu="${current}"]`)?.focus();
      } else setOpen(false);
    };
    const onClick = (event: MouseEvent) => { if (navRef.current && !navRef.current.contains(event.target as Node)) setExpanded(null); };
    window.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => { window.removeEventListener("keydown", onKey); document.removeEventListener("click", onClick); };
  }, []);
  const close = () => { setOpen(false); setExpanded(null); };

  return (
    <header className="brand-header">
      <Link className="brand-logo" href="/">
        <span aria-hidden="true">AD</span><b>ALTIN DAL<small>APHRODISIAS ESTATE</small></b>
      </Link>
      <nav ref={navRef} id="primary-navigation" className={open ? "open" : ""} aria-label="Ana navigasyon">
        {links.map(([label, href]) => {
          const group = groups[href];
          if (!group) return <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={close}>{label}</Link>;
          const panelId = `menu-${href.slice(1)}`;
          return (
            <div key={href} className={`nav-group${expanded === href ? " is-open" : ""}`}>
              <Link href={href} aria-current={pathname === href ? "page" : undefined} onClick={close}>{label}</Link>
              <button type="button" className="nav-group-toggle" data-menu={href} aria-expanded={expanded === href} aria-controls={panelId}
                aria-label={`${group.title} alt menüsü`} onClick={() => setExpanded((current) => (current === href ? null : href))}>
                <ChevronDown size={14} aria-hidden="true" />
              </button>
              <div id={panelId} className="megamenu" hidden={expanded !== href}>
                <ul>{group.items.map(([itemLabel, itemHref]) => <li key={itemHref}><Link href={itemHref} onClick={close}>{itemLabel}</Link></li>)}</ul>
              </div>
            </div>
          );
        })}
      </nav>
      <div className="brand-actions">
        {!showcase && <label className="header-currency">
          <span className="sr-only">Para birimi</span>
          <select value={currency} onChange={(event) => setCurrency(event.target.value as Currency)} aria-label="Para birimi seçin">
            {currencies.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
          </select>
        </label>}
        {!showcase && <button className="brand-bag" onClick={openCart} aria-label={`Sepeti aç, ${itemCount} ürün`}>
          <ShoppingBag size={18}/>{itemCount > 0 && <i>{itemCount}</i>}
        </button>}
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
      <Link className="brand-logo" href="/"><span aria-hidden="true">AD</span><b>ALTIN DAL<small>APHRODISIAS ESTATE</small></b></Link>
      <nav aria-label="Alt navigasyon">{links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav>
      <p>Karacasu · Ataeymir · Aydın<br/>© 2026 Altın Dal · <Link className="footer-utility" href="/admin">Yönetim</Link></p>
    </footer>
  );
}

export function BrandShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`brand-site ${className}`}><BrandHeader/><main id="main">{children}</main><BrandFooter/></div>;
}
