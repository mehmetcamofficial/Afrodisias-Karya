import { blogPosts, type BlogCategory } from "../../lib/blog";
import { BrandShell } from "./site-shell";
import { JournalCard } from "./journal-card";
const intros:Record<BlogCategory,string>={
 "Hasat Günlükleri":"Ataeymir’de mevsimin ritmi, bahçe kararları ve ilk şişelere uzanan notlar.",
 "Ege Mutfağından Tarifler":"Mevsim sebzeleri, sade teknikler ve iyi zeytinyağıyla Ege sofrası.",
 "Aphrodisias Tarihi":"Mermer, zanaat ve yaşayan kırsal peyzaj arasındaki bağ.",
 "Zeytinyağı Rehberi":"Zeytinyağını seçmek, saklamak ve tatmak için açık bilgiler.",
};
export function JournalCategoryPage({category}:{category:BlogCategory}){const posts=blogPosts.filter(post=>post.category===category);return <BrandShell className="journal-site"><section className="category-hero"><p>ALTIN DAL GÜNLÜĞÜ</p><h1>{category}</h1><span>{intros[category]}</span></section><section className="category-list">{posts.map(post=><JournalCard key={post.slug} post={post}/>)}</section></BrandShell>}
