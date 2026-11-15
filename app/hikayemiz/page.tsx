import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { BrandShell } from "../components/site-shell";
import { GroveJourney, StoryScroller, type JourneyStep, type StoryChapter } from "../components/story-scroller";

export const metadata = {
  title: "Hikâyemiz — Altın Dal",
  description: "Ataeymir'deki aile zeytinliğinden Aphrodisias'ın zanaat mirasına: Altın Dal'ın kökeni ve zeytinlikten sofraya uzanan yolculuğu.",
  alternates: { canonical: "/hikayemiz" },
};

// Copy is the brand's existing, verified text; no dates, awards or certificates are added.
const chapters: StoryChapter[] = [
  { id: "toprak", eyebrow: "TOPRAK", title: "Ataeymir · Karacasu", image: "/pages/story-valley.webp", alt: "Ataeymir yakınlarında vadi ve zeytinlik — sinematik canlandırma",
    text: "Yirmi dönümlük aile zeytinliği, Aphrodisias’ı çevreleyen vadinin taşlı toprağında büyüyor. Bu coğrafya markanın yalnızca adresi değil, karakteridir." },
  { id: "aphrodisias", eyebrow: "APHRODISIAS", title: "Zanaatın ölçüsü", image: "/pages/story-aphrodisias.webp", alt: "Aphrodisias tetrapylonunun sütunları — editoryal görsel",
    text: "Antik kentin mermer ve heykeltıraşlık mirasını dekor olarak değil; köken, emek, ölçü ve kalıcılık fikri olarak yorumluyoruz.",
    link: { href: "/gunluk/aphrodisias", label: "Aphrodisias yazıları" } },
  { id: "bahce", eyebrow: "BAHÇE", title: "Yaşayan aile hafızası", image: "/pages/story-grove.webp", alt: "Yaşlı bir zeytin ağacının gövdesi — sinematik canlandırma",
    text: "Her ağaç, her parsel ve her hasat günü kayıt altına alınır. Küçük üretim, sezonluk karakter ve izlenebilirlik Altın Dal’ın temelidir." },
  { id: "sise", eyebrow: "BAHÇEDEN ŞİŞEYE", title: "Az mesafe, açık köken", image: "/pages/story-crate.webp", alt: "Ahşap kasada yeni toplanmış yeşil zeytinler — sinematik canlandırma",
    text: "Meyvenin toplandığı andan şişelendiği ana kadar geçen zamanı kısaltıyor; her lotun yolculuğunu görünür kılıyoruz.",
    link: { href: "/hasat", label: "Hasat yaklaşımımız" } },
];

const journey: JourneyStep[] = [
  { id: "toprak", label: "Toprak", title: "Taşlı vadide bir aile zeytinliği", text: "Ağaçlar Aphrodisias’ı çevreleyen vadinin taşlı toprağında büyür; her parsel ayrı izlenir.",
    image: "/pages/story-valley.webp", alt: "Vadide zeytinlik — sinematik canlandırma", href: "/deneyim", cta: "Bölgeyi keşfet" },
  { id: "hasat", label: "Hasat", title: "Mevsiminde, özenle", text: "Zeytinler mevsiminde, zedelenmeyi azaltan yöntemlerle toplanır ve bekletilmeden sıkım noktasına taşınır.",
    image: "/pages/harvest-picking.webp", alt: "Daldan elle toplanan zeytinler — sinematik canlandırma", href: "/hasat", cta: "Hasat sürecini incele" },
  { id: "sikim", label: "Sıkım", title: "Soğuk sıkım", text: "Düşük sıcaklık ve kontrollü oksijen temasıyla soğuk sıkım yapılır.",
    image: "/pages/harvest-pressing.webp", alt: "Akan zeytinyağı — sinematik canlandırma", href: "/hasat#asama-4", cta: "Sıkım aşaması" },
  { id: "sise", label: "Şişe", title: "Her şişe bir lota bağlı", text: "Her şişe hasat tarihi, parsel ve analiz bilgisiyle bir lota bağlanır. Örnek lot kaydı izlenebilirlik sayfasının nasıl çalışacağını gösterir.",
    image: "/pages/harvest-storage.webp", alt: "Koyu cam zeytinyağı şişesi — sinematik canlandırma", href: "/traceability/26-004", cta: "Örnek lot kaydı" },
  { id: "sofra", label: "Sofra", title: "Sofrada üç ifade", text: "Cam şişe, mat teneke ve hediye kutusu: aynı topraktan, farklı kullanım için.",
    image: "/pages/harvest-table.webp", alt: "Taş kâsede zeytinyağı — sinematik canlandırma", href: "/koleksiyon", cta: "Koleksiyonu keşfet" },
];

export default function StoryPage() {
  return <BrandShell>
    <section className="story-hero" aria-labelledby="story-title">
      <Image className="story-hero-image" src="/hero-tetrapylon-grove.webp" alt="Aphrodisias tetrapylonu ve zeytinlik — editoryal görsel" fill priority sizes="100vw" />
      <div className="story-hero-shade" aria-hidden="true" />
      <div className="story-hero-copy">
        <p>ALTIN DAL · APHRODISIAS ESTATE</p>
        <h1 id="story-title">Toprağın hafızası,<br /><em>ailenin emaneti.</em></h1>
        <span>Ataeymir’de başlayan küçük bir üretim hikâyesi: bir vadi, bir antik kent ve kuşaktan kuşağa geçen zeytin ağaçları.</span>
        <a href="#hikaye">Hikâyeyi oku <ArrowDown size={16} aria-hidden="true" /></a>
      </div>
    </section>
    <StoryScroller chapters={chapters} />
    <GroveJourney steps={journey} heading="Beş adımda yolculuk." />
    <section className="story-next" aria-label="Devam et">
      <Link href="/hasat" className="story-next-card">
        <Image src="/pages/harvest-season.webp" alt="" fill sizes="(max-width: 800px) 100vw, 50vw" />
        <span>HASAT</span><b>Meyveden şişeye, aynı özenle.</b><i>Hasat yolculuğu <ArrowRight size={16} aria-hidden="true" /></i>
      </Link>
      <Link href="/koleksiyon" className="story-next-card">
        <Image src="/altin-dal-bottle-collection.webp" alt="" fill sizes="(max-width: 800px) 100vw, 50vw" />
        <span>KOLEKSİYON</span><b>Bir toprağın farklı ifadeleri.</b><i>Koleksiyonu keşfet <ArrowRight size={16} aria-hidden="true" /></i>
      </Link>
    </section>
    <div className="media-note"><p>Sayfadaki görsellerin bir kısmı sinematik canlandırmadır; Altın Dal bahçesinden belgesel kayıt değildir.</p></div>
  </BrandShell>;
}
