import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { blogPosts } from "../lib/blog";
import { media } from "../lib/media";
import { products } from "../lib/products";
import { BrandFooter, BrandHeader } from "./components/site-shell";
import { CinematicMedia } from "./components/cinematic-media";
import { JournalCard } from "./components/journal-card";
import { Reveal } from "./components/reveal";
import { jsonLdScript, organizationJsonLd } from "../lib/structured-data";

export const metadata = { alternates: { canonical: "/" } };

export default function Home() {
  const featured = products.filter((product) => product.category === "glass").slice(0, 3);
  return (
    <div className="brand-site landing-site">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(organizationJsonLd())} />
      <BrandHeader />
      <main id="main">
        <section className="landing-hero" aria-labelledby="hero-title">
          <CinematicMedia slot={media.hero} priority />
          <div />
          <article>
            <div className="hero-content">
              <p>ATAEYMİR · KARACASU<br />APHRODISIAS ESTATE</p>
              <h1 id="hero-title">Taşın hafızası.<br /><em>Toprağın armağanı.</em></h1>
              <span>Ataeymir’deki aile zeytinliğimizden sınırlı hasat natürel sızma zeytinyağı.</span>
              <nav className="hero-ctas" aria-label="Öne çıkan bağlantılar">
                <Link className="cta cta-primary" href="/koleksiyon">Koleksiyonu Keşfedin <ArrowRight size={17} aria-hidden="true" /></Link>
                <Link className="cta cta-ghost" href="/deneyim">Toprağı Yürüyün <ArrowRight size={17} aria-hidden="true" /></Link>
                <Link className="cta cta-text" href="/hikayemiz">Hikâyemizi Keşfedin <ArrowRight size={17} aria-hidden="true" /></Link>
              </nav>
            </div>
          </article>
          <ArrowDown className="landing-scroll" size={18} aria-hidden="true" />
        </section>

        <section className="landing-origin">
          <Reveal>
            <p>38° N · ATAEYMİR</p>
            <h2>Bir aile bahçesinden,<br />kökeni görünür bir markaya.</h2>
            <span>Aphrodisias’ın zanaat ve ölçü fikri, bugün her şişenin üretim yaklaşımında yaşıyor.</span>
            <Link href="/hikayemiz">Hikâyemizi keşfedin <ArrowRight size={16} aria-hidden="true" /></Link>
          </Reveal>
          <Image src="/hero-tetrapylon-grove.webp" alt="Aphrodisias yakınındaki zeytinlik" width={1672} height={941} sizes="(max-width: 900px) 100vw, 50vw" />
        </section>

        <section className="landing-harvest">
          <CinematicMedia slot={media.grove} playWhenVisible />
          <div />
          <Reveal as="article">
            <p>HASAT · 2026</p>
            <h2>Mevsiminde toplanır.<br />İzi korunur.</h2>
            <Link href="/hasat">Hasadı keşfedin <ArrowRight size={17} aria-hidden="true" /></Link>
          </Reveal>
        </section>

        <section className="landing-products">
          <Reveal as="header">
            <p>THE COLLECTION</p>
            <h2>Üç ifade.<br />Tek bir toprak.</h2>
            <Link href="/koleksiyon">Koleksiyonu görün <ArrowRight size={17} aria-hidden="true" /></Link>
          </Reveal>
          <Image src="/altin-dal-bottle-collection.webp" alt="Altın Dal cam şişe koleksiyonu mermer kaide üzerinde" width={1448} height={1086} sizes="(max-width: 900px) 100vw, 60vw" />
          <div>
            {featured.map((product) => (
              <Link key={product.id} href={`/urun/${product.id}`}>
                <span>{product.size}</span><b>{product.name}</b><small>{product.note}</small>
              </Link>
            ))}
          </div>
        </section>

        <section className="landing-journal">
          <Reveal as="header">
            <p>ALTIN DAL GÜNLÜĞÜ</p>
            <h2>Bahçeden ve<br />Ege sofrasından.</h2>
            <Link href="/gunluk">Günlüğü okuyun <ArrowRight size={17} aria-hidden="true" /></Link>
          </Reveal>
          <div>{blogPosts.slice(0, 2).map((post) => <JournalCard key={post.slug} post={post} />)}</div>
        </section>

        <section className="landing-experience">
          <CinematicMedia slot={media.experience} playWhenVisible />
          <div />
          <Reveal as="article">
            <p>THE APHRODISIAS EXPERIENCE</p>
            <h2>Walk the land.<br /><em>Taste the harvest.</em></h2>
            <span>Aphrodisias, Ataeymir ve yerel sofrayı birleştiren geleceğin kültür rotası.</span>
            <Link href="/deneyim">Deneyimi keşfedin <ArrowRight size={17} aria-hidden="true" /></Link>
          </Reveal>
        </section>

        <section className="landing-final">
          <Reveal as="article">
            <p>ALTIN DAL · APHRODISIAS ESTATE</p>
            <h2>Bu topraktan.<br /><em>Sofranıza.</em></h2>
            <Link href="/magaza">Mağazayı keşfedin <ArrowRight size={18} aria-hidden="true" /></Link>
          </Reveal>
        </section>
      </main>
      <BrandFooter />
    </div>
  );
}
