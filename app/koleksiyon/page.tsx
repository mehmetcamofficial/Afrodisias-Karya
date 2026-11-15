import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getLiveProducts } from "../../lib/live-products";
import { products as editorialProducts, categoryLabels, type Product } from "../../lib/products";
import { BrandShell } from "../components/site-shell";
import { ProductVisual, productImageNote } from "../components/product-visual";
import { CollectionCards } from "../components/showcase";
import { publishedCollections } from "../../lib/showcase-db";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Koleksiyon — Altın Dal",
  description: "Cam şişe, mat teneke, aromatik setler ve Ataeymir lezzetlerini keşfedin. Ürünler satışa açılmadan tasarım ve hikâyeleriyle tanışın.",
  alternates: { canonical: "/koleksiyon", languages: { "tr-TR": "/koleksiyon", "en": "/en/collection" } },
};

const categories = [
  { id: "glass", title: "Cam seri", intro: "Sofra, tadım ve hediye için cam şişe formatları." },
  { id: "luxury", title: "Özel seri", intro: "Reserve ve aromatik setlerden oluşan hediye seçenekleri." },
  { id: "tin", title: "Aile boyları", intro: "Mutfakta düzenli kullanım için mat teneke formatları." },
  { id: "pantry", title: "Ataeymir lezzetleri", intro: "Zeytin, ezme ve zeytinyağlı sabunlardan oluşan yan koleksiyon." },
  { id: "subscription", title: "Olive Club", intro: "Henüz açılmamış üyelik ve deneyim konseptleri." },
] as const;

export default async function CollectionPage() {
  // The real, approved catalogue remains authoritative for commerce.
  const [live, curated] = await Promise.all([getLiveProducts(), publishedCollections()]);
  const published = new Map(live.map((item) => [item.id, item]));
  // Editorial concepts are NOT added to getLiveProducts or the order API.
  const catalogue: Product[] = editorialProducts.map((item) => published.get(item.id) ?? {
    ...item, prices: {}, stock: 0, badge: undefined,
  });

  return <BrandShell>
    <section className="collection-route-hero">
      <p>ALTIN DAL · KOLEKSİYON</p>
      <h1>Bir toprağın<br/><em>farklı ifadeleri.</em></h1>
      <span>Cam şişeler, özel setler, aile boyları ve Ataeymir lezzetleri. Koleksiyonu keşfedin; satış durumu her üründe ayrı değerlendirilir.</span>
      <nav className="store-hero-actions" aria-label="Koleksiyonu keşfet">
        <a href="#koleksiyonlar">Serileri keşfet <ArrowRight size={16} aria-hidden="true"/></a>
        <Link href="/magaza#urunler">Yayındaki ürünler</Link>
      </nav>
    </section>
    {curated.length > 0 && <section className="cms-collections" aria-labelledby="curated-title">
      <header><p className="eyebrow">KÜRATÖRLÜ KOLEKSİYONLAR</p><h2 id="curated-title">Seçkiler</h2></header>
      <CollectionCards collections={curated} locale="tr"/>
    </section>}
    <nav className="collection-category-nav" id="koleksiyonlar" aria-label="Koleksiyon serileri">
      {categories.map((group) => <a href={`#seri-${group.id}`} key={group.id}>{group.title}<ArrowRight size={14} aria-hidden="true"/></a>)}
    </nav>
    {categories.map((group) => {
      const items = catalogue.filter((item) => item.category === group.id);
      return <section className="collection-series" id={`seri-${group.id}`} key={group.id} aria-labelledby={`heading-${group.id}`}>
        <header><div><p className="eyebrow">{categoryLabels[group.id]}</p><h2 id={`heading-${group.id}`}>{group.title}</h2><p>{group.intro}</p></div><Link href={`/magaza?kategori=${group.id}#urunler`}>Mağaza filtresine git <ArrowRight size={17} aria-hidden="true"/></Link></header>
        <div className="collection-series-grid">
          {items.map((product) => {
            const isLive = published.has(product.id);
            return <article className="collection-series-card" key={product.id}>
              <div className="collection-series-media"><ProductVisual product={product} sizes="(max-width: 700px) 90vw, (max-width: 1100px) 45vw, 30vw"/></div>
              <div className="collection-series-copy">
                <small>{product.size} · {isLive ? "Yayındaki katalog" : "Koleksiyon önizlemesi"}</small>
                <h3>{product.name}</h3>
                <p>{product.note}</p>
                {productImageNote(product) && <p className="collection-image-note">{productImageNote(product)}</p>}
                {isLive ? <Link href={`/urun/${product.id}`}>Ürün detayını incele <ArrowRight size={16} aria-hidden="true"/></Link> :
                  <span className="collection-pending">Henüz satışa veya ürün detayına açılmadı</span>}
              </div>
            </article>;
          })}
        </div>
      </section>;
    })}
    <section className="catalog-route-footer"><h2>Toprağın hikâyesi</h2><p>Hasat yaklaşımını ve Ege mutfağındaki yerini keşfet.</p><Link href="/deneyim">Deneyimi keşfet <ArrowRight size={16} aria-hidden="true"/></Link></section>
  </BrandShell>;
}
