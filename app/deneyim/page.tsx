import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandShell } from "../components/site-shell";
import Image from "next/image";
import { ExperienceExplorer } from "../components/experience-explorer";
import { getLiveProducts } from "../../lib/live-products";
import { publishedCollections, publishedExperience } from "../../lib/showcase-db";
import { ExperienceSections } from "../components/showcase";

export const metadata = {
  title: "Deneyim — Aphrodisias & Ege Sofrası",
  description: "Aphrodisias kültürü, Ataeymir hasadı ve Ege sofrasını üç bölümlü çevrimiçi keşif deneyimiyle tanıyın. Fiziksel etkinlik henüz rezervasyona açık değil.",
  alternates: { canonical: "/deneyim", languages: { "tr-TR": "/deneyim", en: "/en/experience" } },
};

export const dynamic = "force-dynamic";

const routes = [
  { id: "tarih", number: "01", label: "Kültürel miras", hint: "Aphrodisias ve zanaat", image: "/pages/route-heritage.webp" },
  { id: "hasat", number: "02", label: "Zeytinlik ve hasat", hint: "Toprak, ağaç, mevsim", image: "/pages/route-grove.webp" },
  { id: "tadim", number: "03", label: "Tadım ve Ege sofrası", hint: "Aroma ve gastronomi", image: "/pages/route-table.webp" },
];

export default async function ExperiencePage() {
  const [sections, collections, live] = await Promise.all([publishedExperience(), publishedCollections(), getLiveProducts()]);
  return <BrandShell>
    <section className="route-hero-panels" aria-labelledby="experience-title">
      <div className="route-hero-copy">
        <p>THE APHRODISIAS EXPERIENCE</p>
        <h1 id="experience-title">Şişenin<br/><em>ötesinde.</em></h1>
        <span>Bir coğrafyayı üç rotadan keşfedin: kültürü, zeytinliği ve sofrasıyla.</span>
        <nav className="experience-hero-links">
          <a href="#kesfet">Keşfe başla <ArrowRight size={16} aria-hidden="true"/></a>
          <Link href="/koleksiyon">Koleksiyona bak</Link>
          <Link className="experience-language" href="/en/experience" hrefLang="en" lang="en">English</Link>
        </nav>
      </div>
      <nav className="route-hero-routes" aria-label="Deneyim rotaları">
        {routes.map((route) => <a key={route.id} href={`#rota-${route.id}`} className={`route-panel route-panel-${route.id}`}>
          <Image src={route.image} alt="" fill sizes="(max-width: 800px) 100vw, 22vw" priority/>
          <span>{route.number}</span><b>{route.label}</b><i>{route.hint}</i>
        </a>)}
      </nav>
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
