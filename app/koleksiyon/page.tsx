import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCatalogue, publishedProducts } from "../../lib/catalog";
import { categoryLabels } from "../../lib/products";
import { BrandShell } from "../components/site-shell";
import { ProductVisual, productImageNote } from "../components/product-visual";
import { CollectionCards } from "../components/showcase";
import { publishedCollections } from "../../lib/showcase-db";
import { CollectionScene } from "../components/collection-scene";
import { collectionSceneProducts } from "../../lib/collection-scene";

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
  // One catalogue (lib/catalog): published products + editorial previews (no price, stock or purchase).
  const [cat, curated] = await Promise.all([getCatalogue(), publishedCollections()]);
  const published = new Map(publishedProducts(cat).map((item) => [item.id, item]));
  const catalogue = cat.entries.map((e) => e.product);

  return <BrandShell>
    <CollectionScene products={collectionSceneProducts(catalogue, published)}>
      <p>ALTIN DAL · KOLEKSİYON</p>
      <h1>Bir toprağın<br/><em>farklı ifadeleri.</em></h1>
      <span>Cam şişe, mat teneke ve hediye kutusu; aynı topraktan üç ifade. Satış durumu her üründe ayrı değerlendirilir.</span>
      <nav aria-label="Koleksiyonu keşfet">
        <a href="#koleksiyonlar">Serileri keşfet <ArrowRight size={16} aria-hidden="true"/></a>
        <Link href="/magaza#urunler">Yayındaki ürünler</Link>
      </nav>
    </CollectionScene>
    <section className="collection-threshold" id="koleksiyonlar" aria-labelledby="catalog-title">
      <p>KATALOG · SERİLER</p>
      <h2 id="catalog-title">Her ifade, <em>kendi serisinde.</em></h2>
      <p>Cam şişelerden aile boylarına, Ataeymir lezzetlerinden Olive Club’a. Satış durumu her üründe ayrı belirtilir.</p>
      <nav className="collection-category-nav" aria-label="Koleksiyon serileri">
        {categories.map((group) => <a href={`#seri-${group.id}`} key={group.id}>{group.title}<ArrowRight size={14} aria-hidden="true"/></a>)}
      </nav>
      <p className="collection-language"><Link href="/en/collection" hrefLang="en" lang="en">English version</Link></p>
    </section>
    {curated.length > 0 && <section className="cms-collections" aria-labelledby="curated-title">
      <header><p className="eyebrow">KÜRATÖRLÜ KOLEKSİYONLAR</p><h2 id="curated-title">Seçkiler</h2></header>
      <CollectionCards collections={curated} locale="tr"/>
    </section>}
    {categories.map((group) => {
      const items = cat.entries.filter((e) => e.product.category === group.id);
      return <section className="collection-series" id={`seri-${group.id}`} key={group.id} aria-labelledby={`heading-${group.id}`}>
        <header><div><p className="eyebrow">{categoryLabels[group.id]}</p><h2 id={`heading-${group.id}`}>{group.title}</h2><p>{group.intro}</p></div><Link href={`/magaza?kategori=${group.id}#urunler`}>Mağaza filtresine git <ArrowRight size={17} aria-hidden="true"/></Link></header>
        <div className="collection-series-grid">
          {items.map(({ product, state, href }) => {
            const isLive = state !== "preview";
            return <article className="collection-series-card" key={product.id} data-state={state}>
              <div className="collection-series-media"><ProductVisual product={product} sizes="(max-width: 700px) 90vw, (max-width: 1100px) 45vw, 30vw"/></div>
              <div className="collection-series-copy">
                <small>{product.size} · {state === "live" ? "Satışta" : state === "soldout" ? "Tükendi" : "Koleksiyon önizlemesi"}</small>
                <h3>{product.name}</h3>
                <p>{product.content?.tr?.description || product.note}</p>
                {productImageNote(product) && <p className="collection-image-note">{productImageNote(product)}</p>}
                {isLive ? <Link href={href}>Ürün detayını incele <ArrowRight size={16} aria-hidden="true"/></Link>
                  : cat.showcase ? <Link href={href}>Ürün tanıtımını incele <ArrowRight size={16} aria-hidden="true"/></Link>
                  : <span className="collection-pending">Satış henüz açık değil</span>}
              </div>
            </article>;
          })}
        </div>
      </section>;
    })}
    <section className="catalog-route-footer"><h2>Toprağın hikâyesi</h2><p>Hasat yaklaşımını ve Ege mutfağındaki yerini keşfet.</p><Link href="/deneyim">Deneyimi keşfet <ArrowRight size={16} aria-hidden="true"/></Link></section>
  </BrandShell>;
}
