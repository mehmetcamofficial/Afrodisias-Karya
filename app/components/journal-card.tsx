import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { categorySlugs, readMinutes, type BlogCategory, type BlogPost } from "../../lib/blog";

export { categorySlugs };

/**
 * Typographic covers replace the stock photos that were repeated on every
 * card. Each category has its own tone and line motif (decorative only).
 */
const motifs: Record<BlogCategory, React.ReactNode> = {
  "Ege Mutfağından Tarifler": <><circle cx="60" cy="60" r="34" /><circle cx="60" cy="60" r="22" /><path d="M26 60h68" /></>,
  "Zeytinyağı Rehberi": <><path d="M60 20c18 26 26 40 26 54a26 26 0 0 1-52 0c0-14 8-28 26-54Z" /><path d="M50 78a12 12 0 0 0 12 10" /></>,
  "Hasat Günlükleri": <><path d="M20 96C40 70 70 46 100 24" /><ellipse cx="46" cy="58" rx="16" ry="7" transform="rotate(-35 46 58)" /><ellipse cx="74" cy="44" rx="16" ry="7" transform="rotate(35 74 44)" /><ellipse cx="70" cy="70" rx="9" ry="12" /></>,
  "Üretim": <><rect x="30" y="34" width="60" height="58" rx="4" /><path d="M42 34V22h36v12M30 56h60" /></>,
  "Aphrodisias Tarihi": <><path d="M24 96V48a36 36 0 0 1 72 0v48" /><path d="M38 96V52a22 22 0 0 1 44 0v44M18 96h84" /></>,
  "Marka Hikâyeleri": <><path d="M60 98V28" /><path d="M60 46c-14-4-22-12-24-22 12 0 20 6 24 14M60 64c14-4 22-12 24-22-12 0-20 6-24 14M60 80c-12-3-19-10-21-18 10 0 17 5 21 11" /></>,
};

export function JournalCover({ category, size = "card" }: { category: BlogCategory; size?: "card" | "hero" }) {
  return (
    <div className={`journal-cover journal-cover-${categorySlugs[category]} journal-cover-${size}`} aria-hidden="true">
      <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">{motifs[category]}</svg>
      <span>{category}</span>
    </div>
  );
}

export function JournalMeta({ post }: { post: BlogPost }) {
  return <small className="journal-meta">{post.date} · {readMinutes(post)} dk okuma</small>;
}

export function JournalCard({ post }: { post: BlogPost }) {
  return (
    <article className="journal-card">
      <Link href={`/gunluk/${post.slug}`} tabIndex={-1} aria-hidden="true"><JournalCover category={post.category} /></Link>
      <div>
        <p>{post.category}</p>
        <JournalMeta post={post} />
        <h2><Link href={`/gunluk/${post.slug}`}>{post.title}</Link></h2>
        <p>{post.excerpt}</p>
        <Link className="journal-read" href={`/gunluk/${post.slug}`}>Oku <span className="sr-only">: {post.title}</span><ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
    </article>
  );
}

/** Renders body blocks: paragraphs, "## " headings, "- " lists, "> " quotes. */
export function ArticleBody({ blocks }: { blocks: string[] }) {
  const nodes: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) nodes.push(<ul key={`ul-${nodes.length}`}>{list.map((item) => <li key={item}>{item}</li>)}</ul>);
    list = [];
  };
  blocks.forEach((block, index) => {
    if (block.startsWith("- ")) { list.push(block.slice(2)); return; }
    flush();
    if (block.startsWith("## ")) nodes.push(<h2 key={index}>{block.slice(3)}</h2>);
    else if (block.startsWith("> ")) nodes.push(<blockquote key={index}>{block.slice(2)}</blockquote>);
    else nodes.push(<p key={index}>{block}</p>);
  });
  flush();
  return <>{nodes}</>;
}
