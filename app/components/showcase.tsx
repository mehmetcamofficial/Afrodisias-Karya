import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CmsCollection, CmsExperienceSection } from "../../db/postgres/showcase-repository";
import { categoryLabels, formatPrice, hasListedPrice, products as catalogue, type Product } from "../../lib/products";
import { experienceKindLabels } from "../../lib/showcase-validation";
import { ArticleBody } from "./journal-card";
import { LazyVideo } from "./lazy-video";
import { ProductVisual, productImageNote } from "./product-visual";

export type Locale = "tr" | "en";
const t = {
  tr: { onSale: "Satışta", outOfStock: "Tükendi", notYet: "Henüz satışa açılmadı", details: "Ürün detayı", all: "Tümü", available: "Satışta olanlar", preview: "Önizleme", products: "ürün", empty: "Bu filtrede ürün yok.", related: "İlgili ürün ve koleksiyonlar", collection: "Koleksiyon", conceptNote: "Görsel temsili tasarımdır." },
  en: { onSale: "Available", outOfStock: "Sold out", notYet: "Not yet on sale", details: "Product details", all: "All", available: "Available", preview: "Preview", products: "products", empty: "No products match this filter.", related: "Related products and collections", collection: "Collection", conceptNote: "Image is a representative design." },
} as const;

export type ResolvedProduct = { product: Product; live: boolean };

/** Joins CMS product ids with live availability; presentation (photo mapping) comes from the verified catalogue. */
export function resolveProducts(ids: string[], live: Product[]): ResolvedProduct[] {
  const liveById = new Map(live.map((item) => [item.id, item]));
  return ids.flatMap((id): ResolvedProduct[] => {
    const liveItem = liveById.get(id);
    if (liveItem) return [{ product: liveItem, live: true }];
    const presentation = catalogue.find((item) => item.id === id);
    return presentation ? [{ product: { ...presentation, prices: {}, stock: 0, badge: undefined }, live: false }] : [];
  });
}

export const collectionHref = (c: CmsCollection, locale: Locale) => (locale === "tr" ? `/koleksiyon/${c.slugTr}` : `/en/collection/${c.slugEn}`);

export function CollectionCards({ collections, locale }: { collections: CmsCollection[]; locale: Locale }) {
  const visible = collections.filter((c) => locale === "tr" || (c.slugEn && c.en.title));
  if (!visible.length) return null;
  return (
    <div className="cms-collection-grid">
      {visible.map((c) => {
        const text = c[locale];
        return (
          <article className="cms-collection-card" key={c.id}>
            {c.cover && (
              // eslint-disable-next-line @next/next/no-img-element -- editor-supplied URL
              <img src={c.cover.url} alt={c.cover.alt} loading="lazy" decoding="async" />
            )}
            <div>
              <small>{t[locale].collection} · {c.productIds.length} {t[locale].products}</small>
              <h3><Link href={collectionHref(c, locale)}>{text.title}</Link></h3>
              {text.intro && <p>{text.intro}</p>}
              {c.cover?.credit && <p className="cms-credit">{c.cover.credit}{c.cover.license ? ` · ${c.cover.license}` : ""}</p>}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function CollectionProducts({ items, locale, showcase, filter, baseHref }: { items: ResolvedProduct[]; locale: Locale; showcase: boolean; filter: "all" | "available"; baseHref: string }) {
  const shown = filter === "available" ? items.filter((item) => item.live && item.product.stock > 0) : items;
  return (
    <>
      <nav className="cms-collection-filter" aria-label={locale === "tr" ? "Ürün filtresi" : "Product filter"}>
        <Link href={baseHref} aria-current={filter === "all" ? "page" : undefined}>{t[locale].all} ({items.length})</Link>
        <Link href={`${baseHref}?durum=satista`} aria-current={filter === "available" ? "page" : undefined}>{t[locale].available} ({items.filter((i) => i.live && i.product.stock > 0).length})</Link>
      </nav>
      {shown.length === 0 ? <p className="cms-collection-empty" role="status">{t[locale].empty}</p> : (
        <ol className="cms-collection-products">
          {shown.map(({ product, live }) => {
            const note = productImageNote(product);
            const price = live && !showcase && hasListedPrice(product, "TRY") ? formatPrice(product, "TRY") : null;
            const status = !live ? t[locale].notYet : product.stock > 0 ? t[locale].onSale : t[locale].outOfStock;
            return (
              <li key={product.id} className={live ? "is-live" : "is-preview"}>
                <div className="cms-collection-media"><ProductVisual product={product} sizes="(max-width: 700px) 90vw, 30vw" /></div>
                <div className="cms-collection-copy">
                  <small>{categoryLabels[product.category]} · {product.size}</small>
                  <h3>{product.name}</h3>
                  <p className="cms-collection-status" data-status={!live ? "preview" : product.stock > 0 ? "available" : "sold-out"}>{status}{price ? ` · ${price}` : ""}</p>
                  {note && <p className="collection-image-note">{locale === "tr" ? note : t.en.conceptNote}</p>}
                  {live ? <Link href={`/urun/${product.id}`}>{t[locale].details} <ArrowRight size={16} aria-hidden="true" /></Link> : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}

export function ExperienceSections({ sections, locale, collections, live }: { sections: CmsExperienceSection[]; locale: Locale; collections: CmsCollection[]; live: Product[] }) {
  const visible = sections.filter((s) => s[locale].title);
  if (!visible.length) return null;
  return (
    <div className="cms-experience">
      {visible.map((section) => {
        const text = section[locale];
        const relatedProducts = resolveProducts(section.relatedProductIds, live);
        const relatedCollections = collections.filter((c) => section.relatedCollectionIds.includes(c.id) && (locale === "tr" || c.slugEn));
        return (
          <section key={section.id} className="cms-experience-section" id={`bolum-${section.id}`} aria-labelledby={`exp-${section.id}`}>
            <header>
              <p className="eyebrow">{experienceKindLabels[section.kind][locale]}</p>
              <h2 id={`exp-${section.id}`}>{text.title}</h2>
              {text.lead && <p className="cms-experience-lead">{text.lead}</p>}
            </header>
            {section.media.length > 0 && (
              <div className="cms-experience-media">
                {section.media.map((m, index) => (
                  <figure key={`${m.url}-${index}`}>
                    {m.type === "video"
                      ? <LazyVideo src={m.url} poster={m.poster} label={m.alt} captions={m.captionsUrl || undefined} />
                      // eslint-disable-next-line @next/next/no-img-element -- editor-supplied URL with explicit alt
                      : <img src={m.url} alt={m.alt} loading="lazy" decoding="async" />}
                    {(m.credit || m.type === "video") && <figcaption>{m.type === "video" ? m.alt : ""}{m.credit ? ` ${m.credit}${m.license ? ` · ${m.license}` : ""}` : ""}</figcaption>}
                  </figure>
                ))}
              </div>
            )}
            {text.bodyMd && <div className="cms-experience-body article-body"><ArticleBody blocks={text.bodyMd.split("\n").map((l) => l.trim()).filter(Boolean)} /></div>}
            {(relatedProducts.length > 0 || relatedCollections.length > 0) && (
              <aside className="cms-experience-related" aria-label={t[locale].related}>
                <p className="eyebrow">{t[locale].related}</p>
                <ul>
                  {relatedCollections.map((c) => <li key={c.id}><Link href={collectionHref(c, locale)}>{c[locale].title}</Link></li>)}
                  {relatedProducts.map(({ product, live: isLive }) => <li key={product.id}>{isLive ? <Link href={`/urun/${product.id}`}>{product.name}</Link> : <span>{product.name} · {t[locale].notYet}</span>}</li>)}
                </ul>
              </aside>
            )}
          </section>
        );
      })}
    </div>
  );
}
