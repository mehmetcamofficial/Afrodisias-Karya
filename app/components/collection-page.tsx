import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLiveProducts } from "../../lib/live-products";
import { publishedCollection } from "../../lib/showcase-db";
import { isProductionShowcase } from "../../lib/showcase-mode";
import { BrandShell } from "./site-shell";
import { CollectionProducts, resolveProducts, type Locale } from "./showcase";

/** Shared TR/EN collection detail. Only published collections resolve; others 404. */
export async function collectionMetadata(locale: Locale, slug: string): Promise<Metadata> {
  const c = await publishedCollection(locale, slug);
  if (!c) return { robots: { index: false } };
  const text = c[locale];
  const languages: Record<string, string> = { "tr-TR": `/koleksiyon/${c.slugTr}` };
  if (c.slugEn && c.en.title) languages.en = `/en/collection/${c.slugEn}`;
  return {
    title: text.seoTitle || text.title,
    description: text.seoDescription || text.intro.slice(0, 160),
    alternates: { canonical: locale === "tr" ? `/koleksiyon/${c.slugTr}` : `/en/collection/${c.slugEn}`, languages },
    openGraph: { title: text.seoTitle || text.title, description: text.seoDescription || text.intro.slice(0, 160), ...(c.cover ? { images: [{ url: c.cover.url, alt: c.cover.alt }] } : {}) },
  };
}

export async function CollectionPage({ locale, slug, durum }: { locale: Locale; slug: string; durum?: string }) {
  const c = await publishedCollection(locale, slug);
  if (!c || (locale === "en" && !c.en.title)) notFound();
  const text = c[locale];
  const items = resolveProducts(c.productIds, await getLiveProducts());
  const base = locale === "tr" ? `/koleksiyon/${c.slugTr}` : `/en/collection/${c.slugEn}`;
  const other = locale === "tr" ? (c.slugEn && c.en.title ? { href: `/en/collection/${c.slugEn}`, label: "English", lang: "en" } : null) : { href: `/koleksiyon/${c.slugTr}`, label: "Türkçe", lang: "tr" };
  return (
    <BrandShell>
      <div lang={locale}>
        <section className="collection-route-hero cms-collection-hero">
          <p>ALTIN DAL · {locale === "tr" ? "KOLEKSİYON" : "COLLECTION"}</p>
          <h1>{text.title}</h1>
          {text.intro && <span>{text.intro}</span>}
          <nav className="store-hero-actions" aria-label={locale === "tr" ? "Koleksiyon bağlantıları" : "Collection links"}>
            <Link href={locale === "tr" ? "/koleksiyon" : "/en/collection"}>{locale === "tr" ? "Tüm koleksiyonlar" : "All collections"}</Link>
            {other && <Link href={other.href} hrefLang={other.lang} lang={other.lang}>{other.label}</Link>}
          </nav>
        </section>
        <section className="cms-collection-body" aria-label={locale === "tr" ? "Koleksiyondaki ürünler" : "Products in this collection"}>
          <CollectionProducts items={items} locale={locale} showcase={isProductionShowcase()} filter={durum === "satista" ? "available" : "all"} baseHref={base} />
        </section>
      </div>
    </BrandShell>
  );
}
