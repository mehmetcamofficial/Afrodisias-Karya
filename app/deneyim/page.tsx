import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandShell } from "../components/site-shell";
import { CinematicMedia } from "../components/cinematic-media";
import { ExperienceExplorer } from "../components/experience-explorer";
import { media } from "../../lib/media";
import { getLiveProducts } from "../../lib/live-products";
import { publishedCollections, publishedExperience } from "../../lib/showcase-db";
import { ExperienceSections } from "../components/showcase";

export const metadata = {
  title: "Deneyim — Aphrodisias & Ege Sofrası",
  description: "Aphrodisias kültürü, Ataeymir hasadı ve Ege sofrasını üç bölümlü çevrimiçi keşif deneyimiyle tanıyın. Fiziksel etkinlik henüz rezervasyona açık değil.",
  alternates: { canonical: "/deneyim", languages: { "tr-TR": "/deneyim", en: "/en/experience" } },
};

export const dynamic = "force-dynamic";

export default async function ExperiencePage() {
  const [sections, collections, live] = await Promise.all([publishedExperience(), publishedCollections(), getLiveProducts()]);
  return <BrandShell>
    <section className="experience-route-hero">
      <CinematicMedia slot={{ ...media.experience, poster: "/hero-tetrapylon-grove.webp" }} priority/>
      <div/>
      <article>
        <p>THE APHRODISIAS EXPERIENCE</p>
        <h1>Şişenin<br/><em>ötesinde.</em></h1>
        <span>Bir coğrafyayı kültürü, zeytinliği ve sofrasıyla keşfedin.</span>
        <nav className="experience-hero-links">
          <a href="#kesfet">Keşfe başla <ArrowRight size={16} aria-hidden="true"/></a>
          <Link href="/koleksiyon">Koleksiyona bak</Link>
          <Link className="experience-language" href="/en/experience" hrefLang="en" lang="en">English</Link>
        </nav>
      </article>
    </section>
    <div id="kesfet"><ExperienceExplorer/></div>
    {sections.length > 0 && <section className="cms-experience-wrap" aria-labelledby="stories-title">
      <header className="experience-explorer-intro"><p className="eyebrow">HİKÂYELER</p><h2 id="stories-title">Bölgeden, bahçeden, sofradan.</h2></header>
      <ExperienceSections sections={sections} locale="tr" collections={collections} live={live}/>
    </section>}
    <section className="experience-future">
      <p>GELECEK PROGRAM</p>
      <h2>Bir günlük kültür ve<br/>zeytinyağı rotası.</h2>
      <p>Küçük gruplar için kültürel miras, bölge hikâyesi ve tadımı bir araya getiren fiziksel deneyim fikri üzerinde çalışıyoruz. Şu anda tur, tarih seçimi veya rezervasyon sunulmuyor.</p>
      <Link href="/gunluk/aphrodisias">Kültür yazılarını keşfet <ArrowRight size={17} aria-hidden="true"/></Link>
    </section>
  </BrandShell>;
}
