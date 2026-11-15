import { faqs } from "../faq";
import { categoryLabels, packagingLabels, products, storageGuidance } from "../products";

/**
 * The visitor assistant's ONLY knowledge: FAQ + catalogue facts + general
 * storage/selection guidance written by us. Prices and stock are deliberately
 * excluded (sales are not open; nothing must be quoted as an offer).
 */
export type Source = { id: string; title: string; text: string; href?: string };

const general: Source[] = [
  { id: "guide-storage", title: "Zeytinyağı nasıl saklanır?", href: "/magaza",
    text: "Zeytinyağını serin, karanlık bir yerde ve kapağı kapalı saklayın; güneş ışığı, ısı ve hava yağın kalitesini düşürür. Ocak kenarında tutmayın. Teneke gibi büyük ambalajlarda günlük kullanım için küçük, koyu renkli bir şişeye aktarın." },
  { id: "guide-choose", title: "Hangi boyu seçmeliyim?", href: "/magaza",
    text: "Tadım veya hediye için 250 ml, günlük sofra için 500 ml ya da 750 ml cam şişe; kalabalık aile ve yoğun mutfak kullanımı için 3 L veya 5 L teneke uygundur. Hediye için Special Reserve kutusu ve aromatik tadım seti seçilebilir." },
];

export const knowledge: Source[] = [
  ...faqs.map((faq, index) => ({ id: `faq-${index + 1}`, title: faq.q, text: faq.a, href: faq.link?.href })),
  ...products.map((product) => ({
    id: `product-${product.id}`, title: product.name, href: `/urun/${product.id}`,
    text: [`${product.name} — ${categoryLabels[product.category]}, ${product.size}.`, product.note,
      packagingLabels[product.id] ? `Ambalaj: ${packagingLabels[product.id]}.` : "Ambalaj henüz doğrulanmadı.",
      storageGuidance(product) ?? "", product.image?.kind === "concept" ? "Görsel, yapay zekâyla hazırlanmış temsili ambalaj tasarımıdır." : ""].filter(Boolean).join(" "),
  })),
  ...general,
];

const STOP = new Set("ve ile bir bu şu ne mi mı mu mü için da de ki çok daha en gibi the a an of to is are and or for in on what how which i my".split(" "));
export const tokens = (text: string) => text.toLocaleLowerCase("tr").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i")
  .replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 1 && !STOP.has(word));

/** Simple lexical retrieval with prefix matching (Turkish suffixes: "saklanır" ~ "sakla"). */
export function retrieve(question: string, limit = 4): Source[] {
  const query = tokens(question);
  if (!query.length) return [];
  return knowledge
    .map((source) => {
      const words = tokens(`${source.title} ${source.title} ${source.text}`);
      let score = 0;
      for (const q of query) {
        const stem = q.slice(0, Math.max(4, Math.ceil(q.length * 0.7)));
        if (words.some((word) => word === q)) score += 2;
        else if (words.some((word) => word.startsWith(stem) || q.startsWith(word.slice(0, Math.max(4, word.length))))) score += 1;
      }
      return { source, score: score / Math.sqrt(query.length) };
    })
    .filter((item) => item.score >= 0.7)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.source);
}
