import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BlogPost } from "../../lib/blog";

const images:Record<BlogPost["category"],string>={
 "Zeytinyağı Rehberi":"/altin-dal-bottle-collection.webp",
 "Hasat Günlükleri":"/hero-tetrapylon-grove.webp",
 "Ege Mutfağından Tarifler":"/altin-dal-gift-box.webp",
 "Aphrodisias Tarihi":"/hero-tetrapylon-grove.webp",
};
export const categorySlugs:Record<BlogPost["category"],string>={
 "Zeytinyağı Rehberi":"zeytinyagi","Hasat Günlükleri":"hasat","Ege Mutfağından Tarifler":"tarifler","Aphrodisias Tarihi":"aphrodisias",
};
export function JournalCard({post}:{post:BlogPost}){return <article className="journal-card"><Link href={`/gunluk/${post.slug}`}><img src={images[post.category]} alt=""/></Link><div><p>{post.category}</p><small>{post.date} · {post.readMinutes} dk</small><h2><Link href={`/gunluk/${post.slug}`}>{post.title}</Link></h2><p>{post.excerpt}</p><Link className="journal-read" href={`/gunluk/${post.slug}`}>Oku <ArrowRight size={16}/></Link></div></article>}
