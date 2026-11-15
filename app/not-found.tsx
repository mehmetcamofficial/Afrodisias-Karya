import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandShell } from "./components/site-shell";

export const metadata = { title: "Sayfa bulunamadı — Altın Dal", robots: { index: false } };

/** Branded 404: same shell and palette as the site, with useful ways forward. */
export default function NotFound() {
  return <BrandShell>
    <section className="status-page" aria-labelledby="status-title">
      <p>404 · SAYFA BULUNAMADI</p>
      <h1 id="status-title">Bu patika<br/><em>bir yere çıkmıyor.</em></h1>
      <span>Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir. Buradan devam edebilirsiniz:</span>
      <nav aria-label="Devam et">
        <Link href="/">Ana sayfa <ArrowRight size={16} aria-hidden="true"/></Link>
        <Link href="/koleksiyon">Koleksiyon</Link>
        <Link href="/gunluk">Günlük</Link>
      </nav>
    </section>
  </BrandShell>;
}
