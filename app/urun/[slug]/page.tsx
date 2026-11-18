import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { publishedPosts } from "../../../lib/blog";
import { catalogueEntry, getCatalogue, publishedProducts, previewEntries, type Catalogue } from "../../../lib/catalog";
import { categoryLabels, packagingLabels, sizeSiblings, storageGuidance, type Product } from "../../../lib/products";
import { breadcrumbJsonLd, jsonLdScript, productJsonLd } from "../../../lib/structured-data";
import { BrandShell } from "../../components/site-shell";
import { ProductDetailClient } from "../../components/product-detail-client";
import { ProductGallery } from "../../components/product-gallery";
import { ProductVisual } from "../../components/product-visual";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entry = catalogueEntry(await getCatalogue(), slug);
  if (!entry) return {};
  const product = entry.product;
  const description = `${product.name} (${product.size}) — ${product.note}. Ataeymir, Karacasu.`;
  return {
    title: product.name,
    description,
    alternates: { canonical: `/urun/${product.id}` },
    openGraph: { title: `${product.name} · Altın Dal`, description, url: `/urun/${product.id}`, ...(product.image ? { images: [{ url: product.image.src, alt: product.image.alt }] } : {}) },
  };
}

/** Same category first; never show the same picture twice in the row. */
function relatedProducts(product: Product, all: Product[]) {
  const others = all.filter((item) => item.id !== product.id);
  const ordered = [...others.filter((item) => item.category === product.category), ...others.filter((item) => item.category !== product.category)];
  const seen = new Set(product.image ? [product.image.src] : []);
  return ordered.filter((item) => {
    const key = item.image?.src ?? `none:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 3);
}

/** Pages exist for published products; previews send visitors to their collection series (never a 404). */
const pageProducts = (cat: Catalogue) => cat.showcase ? previewEntries(cat).map((e) => e.product) : publishedProducts(cat);

const PACKAGING_TR: Record<string, string> = {
  glass_bottle: "Koyu renkli cam şişe", tin: "Mat teneke", gift_box: "Hediye kutusu", jar: "Cam kavanoz", pouch: "Poşet",
  box: "Kutu", set: "Set", subscription: "Abonelik gönderimi", experience: "Deneyim programı",
};

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = await getCatalogue();
  const entry = catalogueEntry(cat, slug);
  if (!entry) notFound();
  if (entry.state === "preview" && !cat.showcase) redirect(entry.href);
  const all = pageProducts(cat);
  const product = entry.product;
  const showcase = cat.showcase;
  const tr = product.content?.tr;
  // Published database fields first; the editorial catalogue only where the database is silent.
  const packaging = product.packaging ? PACKAGING_TR[product.packaging] : packagingLabels[product.id];
  const storage = tr?.storage || storageGuidance(product);
  const notStated = "Belirtilmedi";
  const related = relatedProducts(product, all);
  const sizes = sizeSiblings(product, all);
  const recipes = publishedPosts.filter((post) => post.relatedProductIds.includes(product.id)).slice(0, 2);

  return (
    <BrandShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript([
        ...(entry.state === "preview" ? [] : [productJsonLd(product)]),
        breadcrumbJsonLd([{ name: "Ana sayfa", path: "/" }, { name: "Mağaza", path: "/magaza" }, { name: product.name, path: `/urun/${product.id}` }]),
      ])} />
      <nav className="breadcrumbs" aria-label="Sayfa konumu">
        <Link href="/">Ana sayfa</Link><span aria-hidden="true">/</span>
        <Link href={`/magaza?kategori=${product.category}`}>{categoryLabels[product.category]}</Link><span aria-hidden="true">/</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <section className="product-page">
        <ProductGallery product={product} />
        <article>
          <p>ALTIN DAL · {categoryLabels[product.category].toLocaleUpperCase("tr-TR")}</p>
          <h1>{product.name}</h1>
          <span>{product.size} · Ataeymir, Karacasu</span>
          <p>{tr?.description || `${product.note}.`}</p>
          {sizes.length > 1 && (
            <nav className="size-switcher" aria-label="Boy seçenekleri">
              <span>Boy</span>
              <ul>{sizes.map((item) => (
                <li key={item.id}>{item.id === product.id
                  ? <span aria-current="page">{item.size}</span>
                  : <Link href={`/urun/${item.id}`}>{item.size}</Link>}</li>
              ))}</ul>
            </nav>
          )}
          <ProductDetailClient product={product} showcase={showcase} />

          <div className="product-details">
            <details open>
              <summary>Ürün ve ambalaj</summary>
              <dl>
                <div><dt>Hacim / miktar</dt><dd>{product.size}</dd></div>
                <div><dt>Ambalaj</dt><dd>{packaging ?? "Ambalaj bilgisi doğrulanıyor"}</dd></div>
                {(product.netVolumeMl || product.netWeightG) && <div><dt>Net miktar</dt><dd>{product.netVolumeMl ? `${product.netVolumeMl} ml` : `${product.netWeightG} g`}</dd></div>}
                <div><dt>İçerik</dt><dd>{tr?.ingredients || notStated}</dd></div>
                <div><dt>Lot</dt><dd>{product.lot ?? "Şişelemede atanacak"}</dd></div>
                <div><dt>Görsel</dt><dd>{product.image?.kind === "variant" ? "Ürün fotoğrafı" : product.image?.kind === "range" ? "Seri fotoğrafı" : product.image?.kind === "editorial" ? "Atmosfer görseli" : product.image?.kind === "concept" ? "AI ile oluşturulmuş konsept tasarım" : "Görsel yok"}</dd></div>
              </dl>
            </details>
            {storage && (
              <details>
                <summary>Saklama önerisi</summary>
                <p>{storage}</p>
              </details>
            )}
            {tr?.usage && (
              <details>
                <summary>Kullanım</summary>
                <p>{tr.usage}</p>
              </details>
            )}
            <details>
              <summary>Köken</summary>
              <p>{tr?.origin || "Ataeymir, Karacasu (Aydın) — Aphrodisias antik kentiyle aynı vadideki aile zeytinliği."} Lot bazlı analiz bilgileri lot sayfalarında yayımlanır.</p>
              <Link className="text-link" href="/traceability/26-004">Örnek lot kaydını görün <ArrowRight size={14} aria-hidden="true" /></Link>
            </details>
            <details>
              <summary>Satış ve teslimat durumu</summary>
              <p>{showcase
                ? "Online satış henüz açık değil. Fiyat, stok, kargo ve teslimat koşulları satış açıldığında bu sayfada yayımlanacak."
                : "Ödeme altyapısı henüz etkin değil; siparişler ödeme bekliyor olarak kaydedilir. Kargo ücreti ve teslim süresi ödeme adımında belirlenecek."}</p>
            </details>
          </div>
        </article>
      </section>

      {recipes.length > 0 && (
        <section className="product-recipes" aria-labelledby="recipes-title">
          <p className="eyebrow">Günlükten</p>
          <h2 id="recipes-title">Bu ürünle ilgili yazılar</h2>
          <ul>{recipes.map((post) => <li key={post.slug}><Link href={`/gunluk/${post.slug}`}><span><small>{post.category}</small>{post.title}</span><ArrowRight size={16} aria-hidden="true" /></Link></li>)}</ul>
        </section>
      )}

      {related.length > 0 && (
        <section className="product-related" aria-labelledby="related-products-title">
          <h2 id="related-products-title">Koleksiyondan</h2>
          <ul>
            {related.map((item) => (
              <li key={item.id}>
                <Link href={`/urun/${item.id}`}>
                  <span className="product-related-media"><ProductVisual product={item} sizes="(max-width: 700px) 50vw, 25vw" /></span>
                  <small>{categoryLabels[item.category]} · {item.size}</small>
                  <b>{item.name}</b>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </BrandShell>
  );
}
