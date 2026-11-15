/**
 * Help answers reflect the site's actual state. Do not add claims (shipping
 * times, certifications, health benefits) that are not verified.
 */
export type Faq = { q: string; a: string; link?: { href: string; label: string } };

export const faqs: Faq[] = [
  { q: "Online sipariş verebilir miyim?", a: "Online satış ve ödeme henüz açık değil. Ürünleri inceleyebilir, sorularınızı bize iletebilirsiniz; satış açıldığında fiyat, stok ve teslimat koşulları ürün sayfalarında yayımlanacak.", link: { href: "/magaza", label: "Mağazayı inceleyin" } },
  { q: "Ürün görselleri gerçek fotoğraf mı?", a: "Hayır, bir kısmı değil. Görsellerin altında türü yazar: bazıları yapay zekâyla hazırlanmış temsili ambalaj tasarımı, bazıları ürün serisini gösteren fotoğraflardır. Gerçek ürün fotoğrafları eklendikçe güncellenecek." },
  { q: "Zeytinyağını nasıl saklamalıyım?", a: "Serin ve karanlık bir yerde, kapağı kapalı saklayın; doğrudan güneş ışığından ve ısı kaynaklarından uzak tutun.", link: { href: "/gunluk", label: "Günlük'te daha fazlası" } },
  { q: "Kurumsal hediye için toplu sipariş mümkün mü?", a: "Kurumsal talepleri değerlendiriyoruz. Aşağıdaki formdan konu olarak “Kurumsal” seçerek bize yazabilirsiniz; ön talebiniz kaydedilir ve size dönüş yapılır.", link: { href: "/corporate-gifts", label: "Kurumsal hediyeler" } },
  { q: "Olive Club üyeliği başladı mı?", a: "Henüz başlamadı; üyelik programı hazırlık aşamasında. Başvuru ve ödeme alınmıyor.", link: { href: "/olive-club", label: "Programı inceleyin" } },
  { q: "Ürünleriniz nerede üretiliyor?", a: "Altın Dal, Aydın’ın Karacasu ilçesine bağlı Ataeymir’deki aile zeytinliğinden doğdu; bahçe Aphrodisias antik kentiyle aynı vadiyi paylaşır.", link: { href: "/hikayemiz", label: "Hikâyemiz" } },
];
