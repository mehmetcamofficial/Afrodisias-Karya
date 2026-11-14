/**
 * Altın Dal Journal content.
 *
 * Publishing rule: only posts with `status: "published"` are listed, routed,
 * included in the sitemap or linked anywhere public. Drafts are visible ONLY
 * in the admin-guarded Journal manager and its preview route, and are never
 * published automatically — an editor must change the status in code review.
 *
 * Body blocks: plain strings are paragraphs; "## " starts a sub-heading;
 * "- " starts a list item (consecutive items form one list); "> " is a quote.
 */
export type BlogCategory =
  | "Ege Mutfağından Tarifler"
  | "Zeytinyağı Rehberi"
  | "Hasat Günlükleri"
  | "Üretim"
  | "Aphrodisias Tarihi"
  | "Marka Hikâyeleri";

export type BlogStatus = "published" | "draft";

export type BlogPost = {
  slug: string;
  title: string;
  category: BlogCategory;
  excerpt: string;
  author: string;
  status: BlogStatus;
  /** Display date (Turkish). Drafts carry the last edit date. */
  date: string;
  /** ISO date for metadata / sorting. */
  isoDate: string;
  featured?: boolean;
  /** Editorial photograph; never claim to document the exact product, lot, or harvest. */
  cover?: { src: string; alt: string; credit?: string };
  seoTitle?: string;
  seoDescription?: string;
  body: string[];
  relatedProductIds: string[];
  /** Editorial checks an editor must complete before publishing (admin only). */
  reviewNotes?: string[];
};

export const blogCategories: BlogCategory[] = [
  "Ege Mutfağından Tarifler",
  "Zeytinyağı Rehberi",
  "Hasat Günlükleri",
  "Üretim",
  "Aphrodisias Tarihi",
  "Marka Hikâyeleri",
];

export const categorySlugs: Record<BlogCategory, string> = {
  "Ege Mutfağından Tarifler": "tarifler",
  "Zeytinyağı Rehberi": "zeytinyagi",
  "Hasat Günlükleri": "hasat",
  "Üretim": "uretim",
  "Aphrodisias Tarihi": "aphrodisias",
  "Marka Hikâyeleri": "marka",
};

export const categoryIntros: Record<BlogCategory, string> = {
  "Ege Mutfağından Tarifler": "Mevsim sebzeleri, sade teknikler ve iyi zeytinyağıyla Ege sofrası.",
  "Zeytinyağı Rehberi": "Zeytinyağını seçmek, saklamak ve tatmak için açık bilgiler.",
  "Hasat Günlükleri": "Ataeymir’de mevsimin ritmi, bahçe kararları ve ilk şişelere uzanan notlar.",
  "Üretim": "Meyveden şişeye: sıkım, dinlendirme ve etiketteki terimlerin anlamı.",
  "Aphrodisias Tarihi": "Mermer, zanaat ve yaşayan kırsal peyzaj arasındaki bağ.",
  "Marka Hikâyeleri": "Altın Dal’ın kökeni, insanları ve neden böyle üretildiği.",
};

export const blogPosts: BlogPost[] = [
  // ------------------------------------------------------------ published
  {
    slug: "soguk-sikim-polifenol-degeri",
    title: "Soğuk Sıkım Zeytinyağının Polifenol Değeri Neden Önemlidir?",
    category: "Zeytinyağı Rehberi",
    excerpt: "Acılık ve yakıcılığın arkasındaki kalite göstergesini sade dille anlatıyoruz.",
    author: "Altın Dal Hasat Ekibi",
    status: "published",
    date: "12 Eylül 2026",
    isoDate: "2026-09-12",
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
    status: "published",
    date: "10 Eylül 2026",
    isoDate: "2026-09-10",
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
    status: "published",
    date: "8 Eylül 2026",
    isoDate: "2026-09-08",
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
    status: "published",
    date: "6 Eylül 2026",
    isoDate: "2026-09-06",
    featured: true,
    body: [
      "Aphrodisias'ın mirası Altın Dal için dekor değil; ölçü, zanaat ve köken fikrini taşıyan bir referans.",
      "Traverten dokular, koyu zeytin yeşili ve altın detaylar bu yüzden yalnızca görsel tercih değil, markanın coğrafi belleğini yansıtan tasarım dilidir.",
      "Zeytinlik deneyimi sayfası antik kent ziyareti, Ataeymir yürüyüşü ve tadım sofrasını aynı anlatıda buluşturur.",
    ],
    relatedProductIds: ["glass-250", "adopt-tree"],
  },

  // ---------------------------------------------------------------- drafts
  {
    slug: "zeytinyagli-kereviz",
    title: "Zeytinyağlı Kereviz: Portakallı Ege Klasiği",
    category: "Ege Mutfağından Tarifler",
    excerpt: "Kök kereviz, havuç ve portakal suyuyla hafif, parlak bir zeytinyağlı; ertesi gün daha da güzel.",
    author: "Altın Dal Mutfak",
    status: "draft",
    date: "14 Kasım 2026",
    isoDate: "2026-11-14",
    seoTitle: "Zeytinyağlı Kereviz Tarifi (Portakallı) · Altın Dal",
    seoDescription: "Kök kereviz, havuç, bezelye ve portakal suyuyla hazırlanan klasik Ege usulü zeytinyağlı kereviz tarifi; püf noktaları ve servis önerileri.",
    body: [
      "Zeytinyağlılar Ege mutfağının en sabırlı yemekleridir: az malzeme, kısık ateş ve iyi bir zeytinyağı. Kereviz, portakal suyunun asiditesiyle birleşince hem tatlı hem ferah bir tabağa dönüşür.",
      "## Malzemeler (4 kişilik)",
      "- 2 orta boy kök kereviz",
      "- 2 havuç",
      "- 1 kuru soğan",
      "- 1 su bardağı bezelye (taze ya da donuk)",
      "- 1 portakalın suyu ve yarım limonun suyu",
      "- 1 tatlı kaşığı toz şeker",
      "- Yarım çay bardağı zeytinyağı, servis için ayrıca",
      "- Tuz, bir tutam dereotu",
      "## Hazırlık",
      "Kerevizleri soyup iri küpler halinde doğrayın ve kararmaması için limonlu suda bekletin. Soğanı ince, havucu kerevizle uyumlu küpler halinde kesin.",
      "Geniş bir tencerede zeytinyağını ılıtın; soğanı rengi dönmeden, yalnızca yumuşayana kadar çevirin. Havucu ve süzülmüş kerevizleri ekleyip birkaç dakika karıştırın.",
      "Portakal suyu, limon suyu, şeker, tuz ve sebzelerin yarısına gelecek kadar sıcak su ekleyin. Kapağı kapalı, kısık ateşte kerevizler yumuşayana kadar pişirin; bezelyeyi son on dakikada katın.",
      "## Püf noktası",
      "Zeytinyağlılar ılık ya da oda sıcaklığında servis edilir. Ocaktan aldıktan sonra kapağı kapalı soğumaya bırakın; servis ederken üzerine dereotu ve bir tur çiğ zeytinyağı gezdirin.",
      "> İyi bir zeytinyağlı, pişerken kullanılan yağ kadar servisteki son damla zeytinyağıyla da tanımlanır.",
    ],
    relatedProductIds: ["glass-500", "glass-750"],
    reviewNotes: [
      "Tarifi mutfakta deneyip porsiyon ve süreleri doğrulayın.",
      "Yemek fotoğrafı ekleyin (yalnızca gerçekten pişirilmiş tabak).",
    ],
  },
  {
    slug: "kirma-yesil-zeytin-salatasi",
    title: "Kırma Yeşil Zeytin Salatası: Ceviz, Nar ve Maydanozla",
    category: "Ege Mutfağından Tarifler",
    excerpt: "Kahvaltıdan mezeye uzanan, beş dakikada hazırlanan çıtır ve ekşimsi bir salata.",
    author: "Altın Dal Mutfak",
    status: "draft",
    date: "14 Kasım 2026",
    isoDate: "2026-11-14",
    seoTitle: "Kırma Yeşil Zeytin Salatası Tarifi · Altın Dal",
    seoDescription: "Kırma yeşil zeytin, ceviz, nar ekşisi ve maydanozla hazırlanan pratik Ege mezesi; malzemeler ve hazırlık adımları.",
    body: [
      "Kırma yeşil zeytin salatası, Ege ve Güneydoğu sofralarının buluştuğu yerde durur: zeytinin tuzlu tazeliği, cevizin yağlı dokusu ve nar ekşisinin keskinliği.",
      "## Malzemeler",
      "- 2 su bardağı kırma yeşil zeytin (çekirdekleri çıkarılmış)",
      "- Yarım su bardağı iri kırılmış ceviz",
      "- 3–4 dal taze soğan",
      "- Yarım demet maydanoz",
      "- 1 yemek kaşığı nar ekşisi",
      "- 2 yemek kaşığı zeytinyağı",
      "- İsteğe göre pul biber ve nar taneleri",
      "## Hazırlık",
      "Zeytinler çok tuzluysa birkaç saat soğuk suda bekletip süzün. Çekirdeklerini çıkarıp kabaca doğrayın.",
      "Taze soğanı ve maydanozu ince kıyın. Tüm malzemeleri geniş bir kapta birleştirin; nar ekşisi ve zeytinyağını ekleyip hafifçe karıştırın.",
      "Servisten önce on dakika dinlendirin. Üzerine nar taneleri serperek servis edin.",
    ],
    relatedProductIds: ["green-olive", "glass-250"],
    reviewNotes: [
      "Kırma yeşil zeytin ürününün gerçek tuz seviyesine göre 'bekletme' önerisini doğrulayın.",
      "Ürün ambalaj fotoğrafı yoksa yazıda ürün görseli kullanmayın.",
    ],
  },
  {
    slug: "zeytinyagi-nasil-saklanir",
    title: "Zeytinyağı Nasıl Saklanır? Işık, Isı ve Hava",
    category: "Zeytinyağı Rehberi",
    excerpt: "Zeytinyağının üç düşmanı ve evde tazeliği korumak için basit kurallar.",
    author: "Altın Dal Editör",
    status: "draft",
    date: "14 Kasım 2026",
    isoDate: "2026-11-14",
    featured: true,
    seoTitle: "Zeytinyağı Nasıl Saklanır? Işık, Isı ve Hava Rehberi",
    seoDescription: "Zeytinyağını ışıktan, ısıdan ve havadan korumanın yolları: doğru kap, doğru yer, açıldıktan sonra tüketim ve büyük boy ambalaj ipuçları.",
    body: [
      "Zeytinyağı şarap gibi yıllandıkça iyileşen bir ürün değildir. Şişelendiği andan itibaren aromasını korumak, onu doğru saklamakla ilgilidir. Üç temel etken vardır: ışık, ısı ve hava.",
      "## Işık",
      "Doğrudan güneş ışığı ve güçlü yapay ışık, yağın oksidasyonunu hızlandırır. Koyu renkli cam, teneke ya da ışık geçirmeyen kaplar tercih edin; şişeyi tezgâhta pencere önünde bırakmayın.",
      "## Isı",
      "Yağ serin ve sabit sıcaklıkta daha uzun süre tazeliğini korur. Ocak ve fırın yanındaki dolaplar uygun değildir. Buzdolabında saklamak gerekmez; soğukta bulanıklaşma ya da donma görülebilir ve oda sıcaklığına dönünce geçer.",
      "## Hava",
      "Açılmış bir kapta yağın hava ile teması arttıkça tazelik azalır. Kapağı her kullanımdan sonra kapatın. Büyük boy teneke kullanıyorsanız günlük ihtiyaç için küçük, koyu renkli bir şişeye aktarmak teneke içindeki yağın havayla temasını azaltır.",
      "## Pratik kurallar",
      "- Serin, karanlık bir dolapta saklayın.",
      "- Kapağı açık bırakmayın.",
      "- Açılan şişeyi makul bir sürede tüketin.",
      "- Etiketteki hasat ya da şişeleme tarihini kontrol edin.",
    ],
    relatedProductIds: ["tin-3l", "tin-5l", "glass-500"],
    reviewNotes: [
      "Etiketteki tarih bilgisinin (hasat/şişeleme/son tüketim) Altın Dal ambalajında gerçekten bulunduğunu doğrulayın.",
    ],
  },
  {
    slug: "zeytinyagi-nasil-tadilir",
    title: "Zeytinyağı Nasıl Tadılır? Meyvemsilik, Acılık ve Yakıcılık",
    category: "Zeytinyağı Rehberi",
    excerpt: "Evde küçük bir kadehle yapılabilecek basit bir tadım ve doğru kelimeler.",
    author: "Altın Dal Editör",
    status: "draft",
    date: "14 Kasım 2026",
    isoDate: "2026-11-14",
    seoTitle: "Zeytinyağı Tadımı: Meyvemsilik, Acılık ve Yakıcılık Nasıl Anlaşılır?",
    seoDescription: "Evde zeytinyağı tadımı için adım adım yöntem: ısıtma, koklama, tatma ve meyvemsilik, acılık, yakıcılık kavramlarının anlamı.",
    body: [
      "Profesyonel tadım panelleri belirli kurallarla çalışır; ancak temel yaklaşımı evde de uygulayabilirsiniz. Amaç bir yağı 'iyi' ya da 'kötü' diye etiketlemek değil, onu tanımayı öğrenmektir.",
      "## Hazırlık",
      "Küçük bir kadehe bir iki yemek kaşığı yağ koyun. Kadehin ağzını elinizle kapatıp avucunuzda birkaç dakika ılıtın; ısınan yağ aromasını daha kolay verir.",
      "## Koklama",
      "Kapağı açın ve kısa, derin nefeslerle koklayın. Taze kesilmiş çimen, yeşil domates, enginar ya da yeşil elma gibi notalar 'meyvemsilik' olarak adlandırılır.",
      "## Tatma",
      "Küçük bir yudum alın, ağzınızın her yerine yayın ve dişlerinizin arasından hafifçe hava çekin. Dilin arkasında hissedilen acılık ve boğazda hissedilen yakıcılık, özellikle erken hasat yağlarda belirgin olabilir.",
      "## Üç temel kavram",
      "- Meyvemsilik: sağlıklı, taze zeytinden gelen koku ve tat.",
      "- Acılık: dilde hissedilen, yeşil meyveye özgü tat.",
      "- Yakıcılık: boğazda hissedilen, biberimsi his.",
      "Tadım aralarında elma dilimi ya da su ile ağzınızı temizleyin. Farklı yağları yan yana tatmak, farkları anlamanın en kolay yoludur.",
    ],
    relatedProductIds: ["aromatic-set", "glass-250"],
    reviewNotes: [
      "Altın Dal yağları için tadım notu eklenecekse, yalnızca gerçek tadım ya da panel sonucuna dayandırın.",
    ],
  },
  {
    slug: "hasat-zamani-nasil-belirlenir",
    title: "Hasat Zamanı Nasıl Belirlenir? Rengi Dönen Zeytin",
    category: "Hasat Günlükleri",
    excerpt: "Erken ve geç hasat arasındaki fark, meyvenin rengi ve bir bahçede verilen zor karar.",
    author: "Ataeymir Bahçe Ekibi",
    status: "draft",
    date: "14 Kasım 2026",
    isoDate: "2026-11-14",
    seoTitle: "Zeytin Hasadı Ne Zaman Yapılır? Erken ve Geç Hasat Farkı",
    seoDescription: "Zeytinde hasat zamanını belirleyen etkenler: meyve rengi, olgunluk, erken hasat ile geç hasat arasındaki aroma ve verim dengesi.",
    body: [
      "Zeytin ağacında meyve yeşilden mora, oradan siyaha doğru renk değiştirir. Hasadın ne zaman yapılacağı, üreticinin hangi tür yağı hedeflediğine bağlıdır.",
      "## Erken hasat",
      "Meyve henüz yeşilken ya da renk dönmeye başladığında yapılan hasat, genellikle daha yeşil, otsu ve belirgin acılık ile yakıcılığa sahip yağlar verir. Buna karşılık meyveden elde edilen yağ miktarı daha azdır.",
      "## Geç hasat",
      "Meyve tamamen olgunlaştığında yapılan hasatta yağ miktarı artar; aroma daha yumuşak ve olgun meyvemsi notalara kayar.",
      "## Bahçede verilen karar",
      "Aynı bahçede bile parseller farklı hızda olgunlaşabilir. Rüzgâra açık bir yamaç ile korunaklı bir düzlük arasında günler hatta haftalar fark olabilir. Bu yüzden hasat kararı takvimden çok meyvenin kendisine bakılarak verilir.",
      "> Doğru hasat günü, bahçede yürüyerek bulunur.",
    ],
    relatedProductIds: ["glass-500", "reserve-500"],
    reviewNotes: [
      "Altın Dal'ın 2026 hasat tarihleri ve parsel bazlı kararları eklenecekse bahçe kayıtlarıyla doğrulayın.",
      "Gerçek hasat fotoğrafları ekleyin.",
    ],
  },
  {
    slug: "soguk-sikim-ne-demek",
    title: "Soğuk Sıkım Ne Demek? Etiketteki Terimleri Okumak",
    category: "Üretim",
    excerpt: "'Natürel sızma', 'soğuk sıkım' ve 'erken hasat' ifadelerinin ne anlattığını sade dille açıklıyoruz.",
    author: "Altın Dal Editör",
    status: "draft",
    date: "14 Kasım 2026",
    isoDate: "2026-11-14",
    seoTitle: "Soğuk Sıkım ve Natürel Sızma Ne Demek? Zeytinyağı Etiketi Rehberi",
    seoDescription: "Zeytinyağı etiketindeki natürel sızma, soğuk sıkım ve erken hasat terimlerinin anlamı ve bir şişeyi seçerken nelere bakılabileceği.",
    body: [
      "Zeytinyağı raflarında aynı kelimeler tekrar eder: natürel sızma, soğuk sıkım, erken hasat. Bu terimlerin bir kısmı kalite sınıfını, bir kısmı üretim yöntemini anlatır.",
      "## Natürel sızma",
      "Natürel sızma, zeytinden yalnızca mekanik ve fiziksel yöntemlerle elde edilen, belirli kimyasal ve duyusal kriterleri karşılayan en üst kalite sınıfıdır. Asitlik bu kriterlerden yalnızca biridir.",
      "## Soğuk sıkım",
      "Günümüzde zeytinyağı çoğunlukla pres yerine santrifüj sistemlerle ayrıştırılır. 'Soğuk sıkım' ya da 'soğuk ekstraksiyon' ifadesi, işlem sırasında hamurun belirli bir sıcaklığın altında tutulduğunu anlatır. Avrupa Birliği mevzuatında bu ifade 27 °C altında elde edilen yağlar için tanımlanmıştır.",
      "## Erken hasat",
      "Erken hasat, meyvenin olgunlaşmadan toplandığını anlatır; yasal bir sınıf değil, bir üretim tercihidir. Genellikle daha yeşil ve yakıcı yağlarla ilişkilendirilir.",
      "## Şişeyi seçerken",
      "- Kalite sınıfına bakın.",
      "- Hasat ya da şişeleme tarihini arayın.",
      "- Koyu cam ya da teneke gibi ışığı geçirmeyen ambalaj tercih edin.",
      "- Köken bilgisi ne kadar açıksa, ürünü o kadar iyi tanırsınız.",
    ],
    relatedProductIds: ["glass-500", "tin-5l"],
    reviewNotes: [
      "AB 29/2012 sayılı Tüzük ve Türk Gıda Kodeksi Zeytinyağı ve Pirina Yağı Tebliği'ndeki güncel tanımları hukuk/kalite sorumlusuyla teyit edin.",
      "Altın Dal üretim sıcaklığı yazılacaksa yalnızca belgelenmiş değeri kullanın (şu an '<24°C hedef' bir hedeftir, ölçüm değildir).",
    ],
  },
  {
    slug: "ataeymir-ve-aphrodisias-arasinda",
    title: "Ataeymir ile Aphrodisias Arasında: Bir Bahçenin Coğrafyası",
    category: "Marka Hikâyeleri",
    excerpt: "Karacasu vadisinde bir aile zeytinliği ve markaya adını veren antik kentin komşuluğu.",
    author: "Altın Dal Editör",
    status: "draft",
    date: "14 Kasım 2026",
    isoDate: "2026-11-14",
    seoTitle: "Ataeymir ve Aphrodisias: Altın Dal'ın Coğrafyası",
    seoDescription: "Aydın Karacasu'da, Aphrodisias antik kentine komşu Ataeymir'deki aile zeytinliğinden doğan Altın Dal'ın köken hikâyesi.",
    body: [
      "Altın Dal'ın hikâyesi Aydın'ın Karacasu ilçesine bağlı Ataeymir'de, bir aile zeytinliğinde başlar. Bahçenin bulunduğu vadi, UNESCO Dünya Mirası Listesi'ndeki Aphrodisias antik kentiyle aynı coğrafyayı paylaşır.",
      "## Mermer ve zanaat",
      "Aphrodisias, antik çağda heykel atölyeleriyle tanınan bir kentti. Bu miras bizim için bir dekor değil; ölçü, sabır ve el emeği fikrini hatırlatan bir referans.",
      "## Bir aile bahçesi",
      "Altın Dal, bu bahçeden çıkan yağı kökeni görünür biçimde sofraya taşımak için kuruldu. Her şişeyi hasat edildiği yerle ve zamanla ilişkilendirmek, markanın temel sözüdür.",
      "## Neden 'Altın Dal'?",
      "Zeytin dalı Akdeniz'de barışın ve bereketin simgesidir. Altın, hasat mevsiminde vadinin ışığını ve şişedeki yağın rengini anlatır.",
    ],
    relatedProductIds: ["reserve-500", "glass-750"],
    reviewNotes: [
      "Aile ve bahçe bilgilerini (kuruluş, kuşak, bahçe büyüklüğü) aile ile birlikte doğrulayın; yazı şu an bu bilgileri bilinçli olarak içermiyor.",
      "Marka adının hikâyesini ('Neden Altın Dal?') kurucuların kendi ifadesiyle değiştirin.",
    ],
  },
];

// New evergreen editorial articles: no unverified product claims or field records.
const additionalJournalPosts: BlogPost[] = [
  {
    slug: "ege-kahvaltisinda-zeytinyagi",
    title: "Ege Kahvaltısında Zeytinyağı: Üç Sade Servis Fikri",
    category: "Ege Mutfağından Tarifler",
    excerpt: "Kekik, domates ve ekşi mayalı ekmekle zeytinyağını sofranın merkezine koyan üç fikir.",
    author: "Altın Dal Mutfak", status: "published", date: "14 Kasım 2026", isoDate: "2026-11-14",
    cover: { src: "/altin-dal-bottle-collection.webp", alt: "Koyu cam zeytinyağı şişeleriyle editoryal sofra fotoğrafı; tarifin birebir görüntüsü değildir." },
    body: [
      "İyi bir Ege kahvaltısının bütün malzemeleri gösterişli olmak zorunda değildir. Bir küçük kâse zeytinyağı, taze ekmek ve birkaç mevsim malzemesi yeterlidir.",
      "## 1. Kekik ve limon",
      "Bir kâse zeytinyağına bir tutam kuru kekik ve birkaç damla limon suyu ekleyin. Ekşi mayalı ekmeği hafifçe kızartıp yanında servis edin.",
      "## 2. Domatesli tabak",
      "Olgun domatesleri iri doğrayın. Tuz, taze fesleğen ve zeytinyağıyla karıştırın. Servisten önce birkaç dakika dinlendirin.",
      "## 3. Zeytin ve ceviz",
      "Çekirdeği çıkarılmış zeytinleri ceviz ve maydanozla birleştirin. Üzerine az miktarda zeytinyağı gezdirin. Zeytinlerin tuzunu göz önünde bulundurun.",
      "## Servis notu",
      "Yağın kokusunu tanımak için ilk lokmada sade ekmekle tadın; daha sonra otlarla eşleştirin."
    ], relatedProductIds: ["glass-500", "green-olive"]
  },
  {
    slug: "cam-sise-mi-teneke-mi",
    title: "Cam Şişe mi Teneke mi? Mutfak İçin Doğru Format",
    category: "Zeytinyağı Rehberi",
    excerpt: "Günlük tüketim, ışık ve depolama koşullarına göre ambalaj seçme rehberi.",
    author: "Altın Dal Editör", status: "published", date: "14 Kasım 2026", isoDate: "2026-11-14",
    cover: { src: "/altin-dal-gift-box.webp", alt: "Ambalaj üzerine editoryal fotoğraf; teneke ürününün gerçek fotoğrafı değildir." },
    body: [
      "Zeytinyağı için ambalaj yalnızca estetik bir karar değildir. Işık, ısı ve havayla temas tazeliği etkiler; kullanım sıklığı da boyut seçiminde önem taşır.",
      "## Koyu renkli cam",
      "Koyu renkli cam, ışığa karşı şeffaf cama göre daha iyi koruma sağlar. Sofrada ve günlük küçük porsiyonlarda kullanımı pratiktir.",
      "## Teneke",
      "Işığı geçirmeyen teneke daha büyük kullanım hacimleri için uygun olabilir. Açıldıktan sonra kapağın iyi kapanması ve ürünün serin yerde tutulması önemlidir.",
      "## Büyük boy ürün seçerken",
      "Sık kullanılmayacak bir yağı çok büyük ambalajda almak her zaman avantajlı değildir. Tüketim hızınızı düşünün; günlük servis için küçük, temiz ve ışık geçirmeyen bir kaba aktarabilirsiniz.",
      "## Kısa kontrol listesi",
      "- Ambalajın ışık geçirmediğine bakın.",
      "- Kapak ve sızdırmazlık yapısını kontrol edin.",
      "- Saklama alanını ocak ve pencereden uzak seçin.",
      "- Ürünün gerçek etiketinde verilen tarih ve saklama talimatını izleyin."
    ], relatedProductIds: ["glass-500", "tin-3l", "tin-5l"]
  },
  {
    slug: "ege-otlariyla-ilik-salata",
    title: "Ege Otlarıyla Ilık Salata: Roka, Kabak ve Limon",
    category: "Ege Mutfağından Tarifler",
    excerpt: "Mevsim otlarını ve yumuşak kabak dilimlerini bir araya getiren hafif, pratik bir tabak.",
    author: "Altın Dal Mutfak", status: "published", date: "14 Kasım 2026", isoDate: "2026-11-14",
    cover: { src: "/hero-tetrapylon-grove.webp", alt: "Ege peyzajını anlatan editoryal görsel; tarif fotoğrafı değildir." },
    body: [
      "Bu tarifte amaç malzemeleri uzun süre pişirmek değil, mevsim otlarının tazeliğini korumaktır.",
      "## Malzemeler",
      "- 2 küçük kabak",
      "- 1 avuç roka",
      "- Yarım limonun suyu",
      "- 2 yemek kaşığı zeytinyağı",
      "- Bir tutam tuz, isteğe göre taze nane",
      "## Hazırlık",
      "Kabakları ince dilimleyin. Tavada az zeytinyağıyla kısa süre, diri kalacak kadar çevirin.",
      "Roka ve naneyi servis tabağına alın; ılık kabakları üzerine yerleştirin. Limon suyu ve kalan zeytinyağını en son ekleyin.",
      "## Alternatif",
      "Roka yerine mevsiminde arapsaçı, turp otu ya da semizotu kullanabilirsiniz; her otun pişirme ihtiyacı farklıdır."
    ], relatedProductIds: ["glass-250"]
  },
  {
    slug: "zeytinyagiyla-mutfak-notlari",
    title: "Zeytinyağıyla Mutfak Notları: Tadım, Koku ve Eşleştirme",
    category: "Zeytinyağı Rehberi",
    excerpt: "Bir yağı farklı tabaklarda deneyerek kendi mutfak tercihlerinizi oluşturmanın basit yolu.",
    author: "Altın Dal Editör", status: "published", date: "14 Kasım 2026", isoDate: "2026-11-14",
    cover: { src: "/altin-dal-bottle-collection.webp", alt: "Zeytinyağı şişelerinin editoryal fotoğrafı; belirli bir tadım sonucu göstermez." },
    body: [
      "Zeytinyağını seçerken tek bir genel puan yerine onu nerede kullanacağınızı düşünmek daha yararlı olabilir.",
      "## Sade tadım",
      "Küçük bir kâsede yağı koklayın. Meyvemsi, bitkisel ya da olgun notalar algılayabilirsiniz. Her yağın aroması aynı olmak zorunda değildir.",
      "## Yemekle eşleştirme",
      "Domates ve taze otlar daha belirgin aromalı yağlarla; daha sade sebze tabakları ise farklı yoğunluktaki yağlarla denenebilir. Tercihler kişiseldir.",
      "## Not tutma",
      "Koku, damakta bıraktığı his ve yemekteki etkisini üç kısa cümleyle kaydedin. Aynı tabağı farklı yağlarla karşılaştırmak farkları anlamayı kolaylaştırır.",
      "Buradaki öneriler genel mutfak denemeleridir; Altın Dal'ın belirli bir lotuna ait laboratuvar veya duyusal analiz sonucu değildir."
    ], relatedProductIds: ["glass-500", "aromatic-set"]
  }
];
blogPosts.push(...additionalJournalPosts);

const WORDS_PER_MINUTE = 200;

/** Reading time derived from the actual text, never hand-entered. */
export function readMinutes(post: Pick<BlogPost, "title" | "excerpt" | "body">): number {
  const words = [post.title, post.excerpt, ...post.body].join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

const byDateDesc = (a: BlogPost, b: BlogPost) => b.isoDate.localeCompare(a.isoDate);

/** Public listing: published posts only, newest first. */
export const publishedPosts: BlogPost[] = blogPosts.filter((post) => post.status === "published").sort(byDateDesc);

export const draftPosts: BlogPost[] = blogPosts.filter((post) => post.status === "draft").sort(byDateDesc);

/** Public lookup — drafts are never returned. */
export function getPost(slug: string) {
  return publishedPosts.find((post) => post.slug === slug);
}

/** Admin-only lookup (preview); includes drafts. */
export function getAnyPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}

export function featuredPost(): BlogPost | undefined {
  return publishedPosts.find((post) => post.featured) ?? publishedPosts[0];
}

export function relatedPosts(post: BlogPost, limit = 3): BlogPost[] {
  const pool = publishedPosts.filter((candidate) => candidate.slug !== post.slug);
  const same = pool.filter((candidate) => candidate.category === post.category);
  const sharedProducts = pool.filter((candidate) => candidate.category !== post.category && candidate.relatedProductIds.some((id) => post.relatedProductIds.includes(id)));
  const rest = pool.filter((candidate) => !same.includes(candidate) && !sharedProducts.includes(candidate));
  return [...same, ...sharedProducts, ...rest].slice(0, limit);
}

export function postsInCategory(category: BlogCategory): BlogPost[] {
  return publishedPosts.filter((post) => post.category === category);
}
