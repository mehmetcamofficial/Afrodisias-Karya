"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, Boxes, ChevronRight, ExternalLink, Inbox, LayoutDashboard, PackageCheck, QrCode } from "lucide-react";

const links = [
  ["Genel Bakış", "/admin", LayoutDashboard],
  ["Ürünler", "/admin/urunler", Boxes],
  ["Siparişler", "/admin/siparisler", PackageCheck],
  ["QR & Lot", "/admin/qr-lot", QrCode],
  ["Blog & Tarifler", "/admin/blog", BookOpenText],
  ["Talepler", "/admin/talepler", Inbox],
] as const;

export function AdminShell({ children, title, kicker }: { children: React.ReactNode; title: string; kicker: string }) {
  const path = usePathname();
  return (
    <main id="main" className="admin-page">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin"><span>AD</span><div><b>ALTIN DAL</b><small>YÖNETİM MERKEZİ</small></div></Link>
        <nav aria-label="Yönetim navigasyonu">
          <small>OPERASYON</small>
          {links.map(([label, href, Icon]) => <Link key={href} href={href} className={path === href ? "active" : ""} aria-current={path === href ? "page" : undefined}><Icon size={18}/><span>{label}</span><ChevronRight size={14}/></Link>)}
        </nav>
        <div className="admin-sidebar-foot"><span>Ödeme kapalı</span><small>Durum ayrıntıları Genel Bakış ekranında</small></div>
      </aside>
      <section className="admin-workspace">
        <header className="admin-topbar">
          <div><Link href="/">Siteye dön <ExternalLink size={14}/></Link><Link href="/magaza">Mağazayı aç</Link></div>
        </header>
        <nav className="admin-mobile-tabs" aria-label="Yönetim navigasyonu (mobil)">{links.map(([label, href]) => <Link key={href} href={href} className={path === href ? "active" : ""} aria-current={path === href ? "page" : undefined}>{label}</Link>)}</nav>
        <div className="admin-title"><div><p>{kicker}</p><h1>{title}</h1></div><span className="admin-date">2026 Hasat Sezonu</span></div>
        <div className="admin-content">{children}</div>
      </section>
    </main>
  );
}
