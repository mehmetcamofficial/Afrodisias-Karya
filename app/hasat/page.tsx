import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { BrandShell } from "../components/site-shell";
import { HarvestLoop, HarvestTimeline, type HarvestStage } from "../components/harvest-journey";

export const metadata = {
  title: "Hasat — Meyveden şişeye",
  description: "Altın Dal hasadı altı aşamada: ağaç ve toprak, hasat zamanı, toplama, soğuk sıkım, saklama ve sofraya yolculuk.",
  alternates: { canonical: "/hasat" },
};

// Stage copy merges the brand's existing harvest protocol text; no temperatures, acidity or certificates are added.
const stages: HarvestStage[] = [
  { id: "agac", label: "Ağaç ve toprak", title: "Taşlı toprakta yaşlı ağaçlar", image: "/pages/harvest-tree.webp", alt: "Gün ışığında yaşlı zeytin ağaçları — sinematik canlandırma",
    text: "Zeytinlik, Aphrodisias’ı çevreleyen vadinin taşlı toprağında büyür. Her ağaç ve her parsel kayıt altına alınır." },
  { id: "zaman", label: "Hasat zamanı", title: "Meyveyi dinlemek", image: "/pages/harvest-season.webp", alt: "Dalda olgunlaşan yeşil zeytinler — sinematik canlandırma",
    text: "Meyvenin rengi, sertliği ve aromatik gelişimi parsel bazında izlenir; hasat günü buna göre belirlenir." },
  { id: "toplama", label: "Toplama", title: "Elle, zedelemeden", image: "/pages/harvest-picking.webp", alt: "Daldan elle toplanan zeytinler — sinematik canlandırma",
    text: "Zeytinler mevsiminde, zedelenmeyi azaltan yöntemlerle toplanır. Kasalar bekletilmeden, hava alacak biçimde sıkım noktasına taşınır." },
  { id: "sikim", label: "Sıkım ve üretim", title: "Soğuk sıkım", image: "/pages/harvest-pressing.webp", alt: "İnce bir akışla dökülen zeytinyağı — sinematik canlandırma",
    text: "Düşük sıcaklık ve kontrollü oksijen temasıyla soğuk sıkım yapılır." },
  { id: "saklama", label: "Saklama", title: "Işıktan ve ısıdan uzak", image: "/pages/harvest-storage.webp", alt: "Koyu cam zeytinyağı şişesi — sinematik canlandırma",
    text: "Yağ ışık ve ısıdan korunarak paslanmaz çelik tanklarda dinlendirilir. Her şişe hasat tarihi, parsel ve analiz bilgisiyle bir lota bağlanır.",
    links: [{ href: "/traceability/26-004", label: "Örnek lot kaydı" }] },
  { id: "sofra", label: "Sofraya", title: "Sofrada üç ifade", image: "/pages/harvest-table.webp", alt: "Taş kâsede zeytinyağı — sinematik canlandırma",
    text: "Cam şişe, mat teneke ve hediye kutusu formatlarıyla, aynı topraktan farklı kullanımlar için.",
    links: [{ href: "/koleksiyon", label: "Koleksiyon" }, { href: "/gunluk/tarifler", label: "Ege tarifleri" }] },
];

export default function HarvestPage() {
  return <BrandShell>
    <section className="harvest-hero" aria-labelledby="harvest-title">
      <HarvestLoop webm="/video/harvest-loop.webm" mp4="/video/harvest-loop.mp4" poster="/pages/harvest-poster.webp" alt="Dalda yeşil zeytinler — sinematik canlandırma" />
      <div className="harvest-hero-shade" aria-hidden="true" />
      <div className="harvest-hero-copy">
        <p>HASAT</p>
        <h1 id="harvest-title">Meyveden şişeye,<br /><em>aynı özenle.</em></h1>
        <span>Ağaçtan sofraya altı aşama: her biri bir sonrakinin kalitesini belirler.</span>
        <a href="#asama-1">Yolculuğu izle <ArrowDown size={16} aria-hidden="true" /></a>
      </div>
    </section>
    <HarvestTimeline stages={stages} />
    <section className="harvest-finale" aria-labelledby="harvest-finale-title">
      <div>
        <p className="story-eyebrow">İZLENEBİLİRLİK</p>
        <h2 id="harvest-finale-title">Şişenin ardındaki<br /><em>veriyi görün.</em></h2>
        <p>Lot sayfası, bir şişenin parsel, hasat ve analiz bilgisini nasıl göstereceğini örnek bir kayıtla anlatır.</p>
      </div>
      <nav aria-label="Hasattan sonra">
        <Link href="/traceability/26-004">Örnek lotu inceleyin <ArrowRight size={17} aria-hidden="true" /></Link>
        <Link href="/magaza#urunler">Ürünleri keşfedin <ArrowRight size={17} aria-hidden="true" /></Link>
        <Link href="/hikayemiz">Hikâyemiz <ArrowRight size={17} aria-hidden="true" /></Link>
      </nav>
    </section>
    <div className="media-note"><p>Hareketli ve sabit görüntüler sinematik canlandırmadır; Altın Dal bahçesinden belgesel kayıt değildir.</p></div>
  </BrandShell>;
}
