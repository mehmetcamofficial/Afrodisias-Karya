import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { categorySlugs, getPost, publishedPosts, readMinutes, relatedPosts } from "../../../lib/blog";
import { cmsPostBySlug } from "../../../lib/blog-db";
import { getCatalogue } from "../../../lib/catalog";
import { SITE_URL } from "../../../lib/site";
import { breadcrumbJsonLd, jsonLdScript } from "../../../lib/structured-data";
import { BrandShell } from "../../components/site-shell";
import { ArticleBody, JournalCard, JournalCover } from "../../components/journal-card";

// Code posts are pre-rendered; CMS posts render on demand and only when
// published (or scheduled with a past publish time). Drafts return 404.
export function generateStaticParams() { return publishedPosts.map((post) => ({ slug: post.slug })); }
export const dynamicParams = true;
export const revalidate = 300;

const findPost = async (slug: string) => getPost(slug) ?? (await cmsPostBySlug(slug)) ?? undefined;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await findPost(slug);
  if (!post) return {};
  const title = post.seoTitle ?? post.title;
  const description = post.seoDescription ?? post.excerpt;
  return {
    title: { absolute: post.seoTitle ?? `${post.title} · Altın Dal` },
    description,
    alternates: { canonical: `/gunluk/${post.slug}` },
    openGraph: { type: "article", title, description, url: `/gunluk/${post.slug}`, publishedTime: post.isoDate, authors: [post.author], section: post.category },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await findPost(slug);
  if (!post) notFound();
  const related = relatedPosts(post);
  // Same catalogue rules as the store: a preview links to its collection series (never a 404) and is never shown as for sale.
  const mentioned = (await getCatalogue()).entries.filter((e) => post.relatedProductIds.includes(e.id));
  const articleLd = {
    "@context": "https://schema.org", "@type": "Article", headline: post.title, description: post.seoDescription ?? post.excerpt,
    datePublished: post.isoDate, author: { "@type": "Organization", name: post.author }, articleSection: post.category,
    mainEntityOfPage: `${SITE_URL}/gunluk/${post.slug}`, publisher: { "@type": "Organization", name: "Altın Dal — Aphrodisias Estate" },
  };
  return (
    <BrandShell className="journal-site">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript([articleLd, breadcrumbJsonLd([{ name: "Ana sayfa", path: "/" }, { name: "Günlük", path: "/gunluk" }, { name: post.category, path: `/gunluk/${categorySlugs[post.category]}` }, { name: post.title, path: `/gunluk/${post.slug}` }])])} />
      <article className="article-page">
        <header>
          <p><Link href={`/gunluk/${categorySlugs[post.category]}`}>{post.category}</Link></p>
          <h1>{post.title}</h1>
          <div><span>{post.author}</span><span><time dateTime={post.isoDate}>{post.date}</time></span><span>{readMinutes(post)} dk okuma</span></div>
        </header>
        <div className="article-hero-cover"><JournalCover category={post.category} post={post} size="hero" /></div>
        <div className="article-body">
          <p className="article-lead">{post.excerpt}</p>
          <ArticleBody blocks={post.body} />
          {post.video && <video className="article-video" src={post.video} controls preload="none" playsInline />}
          {post.gallery && post.gallery.length > 0 && (
            <div className="article-gallery">
              {post.gallery.map((item) => (
                // eslint-disable-next-line @next/next/no-img-element -- editor-supplied URLs; dimensions unknown
                <figure key={item.src}><img src={item.src} alt={item.alt} loading="lazy" decoding="async" />{item.credit && <figcaption>{item.credit}</figcaption>}</figure>
              ))}
            </div>
          )}
          {mentioned.length > 0 && (
            <aside className="article-products" aria-label="Yazıda geçen ürünler">
              <p className="eyebrow">Yazıda geçen ürünler</p>
              <ul>{mentioned.map(({ product, href, state }) => <li key={product.id} data-state={state}><Link href={href}>{product.name}</Link> <span>{product.size}{state === "preview" ? " · Satış henüz açık değil" : state === "soldout" ? " · Tükendi" : ""}</span></li>)}</ul>
            </aside>
          )}
          <Link href="/gunluk"><ArrowLeft size={16} aria-hidden="true" /> Günlüğe dön</Link>
        </div>
        {related.length > 0 && (
          <section className="article-related" aria-labelledby="related-title">
            <h2 id="related-title">İlgili yazılar</h2>
            <div>{related.map((item) => <JournalCard key={item.slug} post={item} />)}</div>
          </section>
        )}
        <nav className="article-pagination" aria-label="Diğer yazılar">
          <Link href="/gunluk"><small>TÜM YAZILAR</small>Altın Dal Günlüğü <ArrowRight size={16} aria-hidden="true" /></Link>
        </nav>
      </article>
    </BrandShell>
  );
}
