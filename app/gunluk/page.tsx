import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { blogCategories, categoryIntros, categorySlugs, featuredPost, postsInCategory, publishedPosts } from "../../lib/blog";
import { BrandShell } from "../components/site-shell";
import { JournalCard, JournalCover, JournalMeta } from "../components/journal-card";

export const metadata: Metadata = {
  title: "Günlük — Tarifler, Zeytinyağı Rehberi ve Hasat Notları",
  description: "Altın Dal Günlüğü: Ege tarifleri, zeytinyağı seçme ve saklama rehberi, hasat günlükleri, üretim ve Aphrodisias coğrafyası üzerine yazılar.",
  alternates: { canonical: "/gunluk" },
};

export default function JournalPage() {
  const featured = featuredPost();
  const latest = publishedPosts.filter((post) => post.slug !== featured?.slug);
  return (
    <BrandShell className="journal-site">
      <section className="journal-hero">
        <p>ALTIN DAL GÜNLÜĞÜ</p>
        <h1>Zeytinyağı, hasat<br />ve Ege sofrası.</h1>
        <span>Bahçeden, mutfaktan ve Aphrodisias’ın kültürel peyzajından notlar.</span>
      </section>

      {featured && (
        <section className="journal-featured" aria-labelledby="featured-title">
          <Link href={`/gunluk/${featured.slug}`} tabIndex={-1} aria-hidden="true"><JournalCover category={featured.category} size="hero" /></Link>
          <div>
            <p className="eyebrow">Öne çıkan · {featured.category}</p>
            <h2 id="featured-title"><Link href={`/gunluk/${featured.slug}`}>{featured.title}</Link></h2>
            <p>{featured.excerpt}</p>
            <JournalMeta post={featured} />
            <Link className="text-link" href={`/gunluk/${featured.slug}`}>Yazıyı okuyun <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        </section>
      )}

      <nav className="journal-categories" aria-label="Günlük kategorileri">
        {blogCategories.map((category, index) => {
          const count = postsInCategory(category).length;
          return (
            <Link key={category} href={`/gunluk/${categorySlugs[category]}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h2>{category}</h2>
              <p>{count ? `${count} yazı` : "Yakında"} · {categoryIntros[category]}</p>
              <ArrowRight aria-hidden="true" />
            </Link>
          );
        })}
      </nav>

      <section className="journal-latest" aria-labelledby="latest-title">
        <p id="latest-title">SON YAZILAR</p>
        <div>{latest.map((post) => <JournalCard key={post.slug} post={post} />)}</div>
      </section>
    </BrandShell>
  );
}
