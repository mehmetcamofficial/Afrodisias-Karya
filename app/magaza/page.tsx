import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandShell } from "../components/site-shell";
import { Storefront } from "../components/storefront";
import { isCategory, type ProductCategory } from "../../lib/products";
import { isSort } from "../../lib/store-query";
import { getLiveProducts } from "../../lib/live-products";
import { isProductionShowcase } from "../../lib/showcase-mode";
import "../components/editorial-pages.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "Mağaza", description: "Altın Dal cam seri zeytinyağları, özel seri kutular, mat teneke aile boyları ve Ataeymir lezzetleri.", alternates: { canonical: "/magaza" } };

/** Quick doors into the three packaging families; images are the disclosed representative cut-outs. */
const doors: Array<{ category: ProductCategory; image: string; title: string }> = [
  { category: "glass", image: "/collection/scene/scene-bottle.webp", title: "Cam seri" },
  { category: "tin", image: "/collection/scene/scene-tin.webp", title: "Aile boyları" },
  { category: "luxury", image: "/collection/scene/scene-giftbox.webp", title: "Özel seri" },
];

export default async function StorePage({ searchParams }: { searchParams: Promise<{ kategori?: string; q?: string; siralama?: string }> }) {
  const { kategori, q, siralama } = await searchParams;
  const products = await getLiveProducts();
  const count = (category: ProductCategory) => products.filter((product) => product.category === category).length;
  const liveDoors = doors.filter((door) => count(door.category) > 0);
  return <BrandShell>
    <section className="store-showcase" aria-labelledby="store-title">
      <div className="store-showcase-copy">
        <p>ALTIN DAL MAĞAZA</p>
        <h1 id="store-title">Bahçeden<br /><em>sofranıza.</em></h1>
        <span>Cam seri, özel kutular, aile boyları ve Ataeymir lezzetleri. Satış durumu ve fiyat yalnızca doğrulanmış ürünlerde gösterilir.</span>
        <nav className="store-hero-actions" aria-label="Ürünleri keşfet"><a href="#urunler">Ürünleri gör</a><Link href="/koleksiyon">Koleksiyon</Link></nav>
      </div>
      {liveDoors.length > 0 && <nav className="store-doors" aria-label="Ambalaj aileleri">
        {liveDoors.map((door) => <Link key={door.category} href={`/magaza?kategori=${door.category}#urunler`} className={`store-door store-door-${door.category}`}>
          <Image src={door.image} alt="" width={240} height={300} sizes="(max-width: 700px) 30vw, 160px" />
          <b>{door.title}</b><span>{count(door.category)} ürün <ArrowRight size={14} aria-hidden="true" /></span>
        </Link>)}
      </nav>}
      <p className="store-showcase-note">Vitrin görselleri temsilidir; ürün fotoğrafı olarak doğrulanmamıştır.</p>
    </section>
    <div className="store-page" id="urunler"><Storefront key={isCategory(kategori) ? kategori : "all"} products={products} showcase={isProductionShowcase()} initialCategory={isCategory(kategori) ? kategori : "all"} initialQuery={typeof q === "string" ? q.slice(0, 80) : ""} initialSort={isSort(siralama) ? siralama : "featured"} /></div>
  </BrandShell>;
}
