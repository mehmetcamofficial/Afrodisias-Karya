import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { categoryIntros, postsInCategory, type BlogCategory } from "../../lib/blog";
import { BrandShell } from "./site-shell";
import { JournalCard } from "./journal-card";

export function JournalCategoryPage({ category }: { category: BlogCategory }) {
  const posts = postsInCategory(category);
  return (
    <BrandShell className="journal-site">
      <section className="category-hero">
        <p>ALTIN DAL GÜNLÜĞÜ</p>
        <h1>{category}</h1>
        <span>{categoryIntros[category]}</span>
      </section>
      {posts.length ? (
        <section className="category-list">{posts.map((post) => <JournalCard key={post.slug} post={post} />)}</section>
      ) : (
        <section className="category-empty">
          <p>Bu kategorideki yazılar hazırlanıyor.</p>
          <Link className="text-link" href="/gunluk"><ArrowLeft size={16} aria-hidden="true" /> Günlüğe dön</Link>
        </section>
      )}
    </BrandShell>
  );
}
