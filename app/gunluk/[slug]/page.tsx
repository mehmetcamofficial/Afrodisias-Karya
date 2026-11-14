import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { categorySlugs, getPost, publishedPosts, readMinutes, relatedPosts } from "../../../lib/blog";
import { products } from "../../../lib/products";
import { SITE_URL } from "../../../lib/site";
import { breadcrumbJsonLd, jsonLdScript } from "../../../lib/structured-data";
import { BrandShell } from "../../components/site-shell";
import { ArticleBody, JournalCard, JournalCover } from "../../components/journal-card";

// Only published posts are routable; drafts return 404.
export function generateStaticParams() { return publishedPosts.map((post) => ({ slug: post.slug })); }
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
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
  const post = getPost(slug);
  if (!post) notFound();
  const related = relatedPosts(post);
  const mentioned = products.filter((product) => post.relatedProductIds.includes(product.id));
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
        <div className="article-hero-cover"><JournalCover category={post.category} size="hero" /></div>
        <div className="article-body">
          <p className="article-lead">{post.excerpt}</p>
          <ArticleBody blocks={post.body} />
          {mentioned.length > 0 && (
            <aside className="article-products" aria-label="Yazıda geçen ürünler">
              <p className="eyebrow">Yazıda geçen ürünler</p>
              <ul>{mentioned.map((product) => <li key={product.id}><Link href={`/urun/${product.id}`}>{product.name}</Link> <span>{product.size}</span></li>)}</ul>
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
