"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, Boxes, ChevronRight, ExternalLink, LayoutDashboard, PackageCheck, QrCode, Settings } from "lucide-react";

const links = [
  ["Genel Bakış", "/admin", LayoutDashboard],
  ["Ürünler", "/admin/urunler", Boxes],
  ["Siparişler", "/admin/siparisler", PackageCheck],
  ["QR & Lot", "/admin/qr-lot", QrCode],
  ["Blog & Tarifler", "/admin/blog", BookOpenText],
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
        <div className="admin-sidebar-foot"><span><i/> Sistem aktif</span><small>Son kontrol: şimdi</small></div>
      </aside>
      <section className="admin-workspace">
        <header className="admin-topbar">
          <div><Link href="/">Siteye dön <ExternalLink size={14}/></Link><Link href="/magaza">Mağazayı aç</Link></div>
          <button aria-label="Yönetim ayarları"><Settings size={18}/></button>
        </header>
        <div className="admin-mobile-tabs">{links.map(([label, href]) => <Link key={href} href={href} className={path === href ? "active" : ""}>{label}</Link>)}</div>
        <div className="admin-title"><div><p>{kicker}</p><h1>{title}</h1></div><span className="admin-date">2026 Hasat Sezonu</span></div>
        <div className="admin-content">{children}</div>
      </section>
    </main>
  );
}
