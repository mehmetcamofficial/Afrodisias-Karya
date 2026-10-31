import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { blogCategories, blogPosts } from "../../lib/blog";
import { BrandShell } from "../components/site-shell";
import { JournalCard, categorySlugs } from "../components/journal-card";
export default function JournalPage(){return <BrandShell className="journal-site"><section className="journal-hero"><p>ALTIN DAL GÜNLÜĞÜ</p><h1>Zeytinyağı, hasat<br/>ve Ege sofrası.</h1><span>Bahçeden, mutfaktan ve Aphrodisias’ın kültürel peyzajından notlar.</span></section><section className="journal-categories">{blogCategories.map((category,index)=><Link key={category} href={`/gunluk/${categorySlugs[category]}`}><span>0{index+1}</span><h2>{category}</h2><p>{blogPosts.filter(post=>post.category===category).length} yazı</p><ArrowRight/></Link>)}</section><section className="journal-latest"><p>SON YAZILAR</p><div>{blogPosts.slice(0,3).map(post=><JournalCard key={post.slug} post={post}/>)}</div></section></BrandShell>}
