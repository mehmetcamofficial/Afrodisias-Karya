import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatPrice } from "../../lib/products";
import type { VitrineEntry } from "../../lib/home-vitrine";

const status = (e: VitrineEntry) => e.live ? formatPrice(e.product, "TRY") : e.published ? "Şu an stokta yok" : "Satış henüz açık değil";
const action = (e: VitrineEntry, featured: boolean) => e.live ? (featured ? "Satın alma seçenekleri" : "Satın al") : e.published ? "Ürünü incele" : (featured ? "Koleksiyonda incele" : "Seriyi incele");

export function HomeVitrine({ entries }: { entries: VitrineEntry[] }) {
  return (
    <section className="home-vitrine" aria-labelledby="vitrine-title">
      <header className="home-vitrine-head">
        <p className="eyebrow">Koleksiyon</p>
        <h2 id="vitrine-title">Bir toprak, <em>üç ifade.</em></h2>
        <p className="home-vitrine-intro">Aynı hasattan üç ambalaj: günlük sofra için cam şişe, aile mutfağı için mat teneke, armağan için hediye kutusu.</p>
        <nav className="home-vitrine-ctas" aria-label="Koleksiyon bağlantıları">
          <Link className="cta cta-primary" href="/koleksiyon">Koleksiyonu keşfedin <ArrowRight size={16} aria-hidden="true" /></Link>
          <Link className="cta cta-ghost" href="/magaza#urunler">Mağazaya git</Link>
        </nav>
      </header>
      <ul className="home-vitrine-grid">
        {entries.map((e, i) => (
          <li key={e.id} className={`home-vitrine-item home-vitrine-${e.series}${i === 0 ? " is-featured" : ""}`} data-state={e.live ? "live" : e.published ? "published" : "preview"}>
            <Link href={e.href} aria-describedby={`vitrine-note-${e.id}`}>
              <span className="home-vitrine-media">
                <Image src={e.image} alt={e.note.startsWith("Onaylı") ? e.product.name : `${e.product.name} — temsili ambalaj görseli`} width={e.w} height={e.h}
                  sizes={i === 0 ? "(max-width: 700px) 46vw, 18vw" : "(max-width: 700px) 30vw, 12vw"} />
                <span className="home-vitrine-plinth" aria-hidden="true" />
              </span>
              <span className="home-vitrine-body">
                <small>{e.family} · {e.product.size}</small>
                <b>{e.product.name}</b>
                <span className="home-vitrine-tagline">{e.product.note}</span>
                <span className="home-vitrine-price">{status(e)}</span>
                <span className={`home-vitrine-action${e.live ? " is-buy" : ""}`}>{action(e, i === 0)} <ArrowRight size={14} aria-hidden="true" /></span>
              </span>
            </Link>
            <p className="home-vitrine-note" id={`vitrine-note-${e.id}`}>{e.note}</p>
          </li>
        ))}
      </ul>
      <nav className="home-vitrine-more" aria-label="Diğer seriler">
        <Link href="/koleksiyon#seri-glass">Tüm cam şişeler</Link>
        <Link href="/koleksiyon#seri-tin">Teneke boyları</Link>
        <Link href="/magaza?kategori=pantry#urunler">Ataeymir lezzetleri</Link>
        <Link href="/magaza?kategori=subscription#urunler">Olive Club ve deneyim</Link>
      </nav>
    </section>
  );
}
