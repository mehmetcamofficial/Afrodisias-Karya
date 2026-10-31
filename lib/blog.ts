export type BlogCategory = "Zeytinyağı Rehberi" | "Hasat Günlükleri" | "Ege Mutfağından Tarifler" | "Aphrodisias Tarihi";

export type BlogPost = {
  slug: string;
  title: string;
  category: BlogCategory;
  excerpt: string;
  author: string;
  readMinutes: number;
  date: string;
  body: string[];
  relatedProductIds: string[];
};

export const blogCategories: BlogCategory[] = [
  "Zeytinyağı Rehberi",
  "Hasat Günlükleri",
  "Ege Mutfağından Tarifler",
  "Aphrodisias Tarihi",
];

export const blogPosts: BlogPost[] = [
  {
    slug: "soguk-sikim-polifenol-degeri",
    title: "Soğuk Sıkım Zeytinyağının Polifenol Değeri Neden Önemlidir?",
    category: "Zeytinyağı Rehberi",
    excerpt: "Acılık ve yakıcılığın arkasındaki kalite göstergesini sade dille anlatıyoruz.",
    author: "Altın Dal Hasat Ekibi",
    readMinutes: 5,
    date: "12 Eylül 2026",
    body: [
      "Polifenoller zeytinyağının aromatik karakterini, yakıcılığını ve oksidasyona karşı dayanımını etkileyen doğal bileşiklerdir.",
      "Erken hasat meyvede polifenol potansiyeli daha yüksek olabilir; bu yüzden doğru zamanda toplama, hızlı sıkım ve ışık-hava kontrolü kalite zincirinin ana adımlarıdır.",
      "Altın Dal lot sayfalarında hasat tarihi, asit oranı ve analiz notlarını görünür kılarak tüketicinin şişeyi sadece etiketinden değil, kökeninden de okumasını hedefler.",
    ],
    relatedProductIds: ["glass-500", "reserve-500"],
  },
  {
    slug: "ege-usulu-enginar-kilavuzu",
    title: "Ege Usulü Enginar Kılavuzu",
    category: "Ege Mutfağından Tarifler",
    excerpt: "Limon, dereotu ve iyi zeytinyağıyla sade ama derin bir Ege tabağı.",
    author: "Altın Dal Mutfak",
    readMinutes: 4,
    date: "10 Eylül 2026",
    body: [
      "Enginarı ağır soslarla kapatmak yerine iyi bir erken hasat zeytinyağıyla parlatmak lezzeti daha temiz taşır.",
      "Soğan, havuç ve bezelyeyi kısa süre çevirin; enginarları ekleyip kısık ateşte pişirin. Serviste taze dereotu ve zeytinyağını son dokunuş olarak kullanın.",
      "500 ml cam şişe günlük mutfak kullanımı için dengeli seçimdir; aromatik set ise soğuk başlangıçlarda farklı bitkisel tonlar denemek isteyenlere uygundur.",
    ],
    relatedProductIds: ["glass-500", "aromatic-set"],
  },
  {
    slug: "ataeymir-hasat-gunlugu-2026",
    title: "Ataeymir Hasat Günlüğü 2026",
    category: "Hasat Günlükleri",
    excerpt: "Karacasu toprağından ilk Altın Dal şişelerine uzanan sezon notları.",
    author: "Ataeymir Bahçe Ekibi",
    readMinutes: 3,
    date: "8 Eylül 2026",
    body: [
      "Bu sezonun hedefi meyveyi zedelemeden toplamak, aynı gün içinde sıkıma ulaştırmak ve lot takibini baştan düzenli kurmak.",
      "Mat teneke aile boyları günlük kullanım için planlanırken, Special Reserve sınırlı şişeleme olarak ayrılıyor.",
      "Hasat sonrası analiz PDF'leri lot yönetim paneline eklenecek ve QR sayfalarından erişilebilir hale getirilecek.",
    ],
    relatedProductIds: ["tin-3l", "reserve-500"],
  },
  {
    slug: "aphrodisias-ve-zeytinlik-hafizasi",
    title: "Aphrodisias ve Zeytinlik Hafızası",
    category: "Aphrodisias Tarihi",
    excerpt: "Mermerin, zanaatin ve toprağın aynı vadide kurduğu sessiz bağ.",
    author: "Altın Dal Editör",
    readMinutes: 6,
    date: "6 Eylül 2026",
    body: [
      "Aphrodisias'ın mirası Altın Dal için dekor değil; ölçü, zanaat ve köken fikrini taşıyan bir referans.",
      "Traverten dokular, koyu zeytin yeşili ve altın detaylar bu yüzden yalnızca görsel tercih değil, markanın coğrafi belleğini yansıtan tasarım dilidir.",
      "Zeytinlik deneyimi sayfası antik kent ziyareti, Ataeymir yürüyüşü ve tadım sofrasını aynı anlatıda buluşturur.",
    ],
    relatedProductIds: ["glass-250", "adopt-tree"],
  },
];

export function getPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}
