# Yapay zekâ özellikleri (Faz 6)

## İlke
AI yalnızca **taslak** üretir. Hiçbir AI çağrısı ürün/blog kaydı yazmaz, fiyat veya stok değiştirmez, yayımlamaz, silmez. Editör "Forma uygula" ile taslağı kaydedilmemiş forma alır; kaydetme, incelemeye gönderme, onay ve yayın mevcut insan iş akışıyla yapılır.

## Sağlayıcı (değiştirilebilir)
`lib/ai/provider.ts` → `AiProvider` arayüzü. Şu an tek uygulama: Anthropic (resmi `@anthropic-ai/sdk`).

| Değişken | Anlamı | Varsayılan |
|---|---|---|
| `ANTHROPIC_API_KEY` | Anahtar yoksa AI **kapalı**; özellikler AI'sız moda düşer | — |
| `AI_ENABLED` | `false` → acil kapatma | açık |
| `AI_PROVIDER` | `anthropic` | anthropic |
| `AI_MODEL` | Model kimliği | `claude-opus-5-5` |
| `AI_ADMIN_DAILY_LIMIT` | Yönetici taslağı / 24 saat (audit_logs'tan sayılır, tüm örneklerde ortak) | 100 |
| `AI_PUBLIC_DAILY_LIMIT` | Ziyaretçi AI yanıtı / 24 saat / sunucu örneği; aşılınca arama moduna düşer | 300 |
| `AI_PUBLIC_PER_IP` | Ziyaretçi sorusu / 10 dk / IP karması / sunucu örneği | 8 |

Maliyet kontrolleri: kısa görevlerde `effort: low`, görev başına `max_tokens` sınırı, girdi 6000 karakterle sınırlı, günlük sınırlar. Güvenlik reddinde API'nin sunucu taraflı yedek model mekanizması (`fallbacks: "default"`) açıktır. Anahtar asla loglanmaz veya yanıtta döndürülmez; sağlayıcı hataları genel mesaja çevrilir.

## Yönetici yardımcısı (`POST /api/admin/ai/draft`, yetki: `ai.use`)
- `product_copy`: TR/EN açıklama + SEO başlığı/meta taslağı; yalnızca editörün girdiği "doğrulanmış bilgiler" kullanılır, eksikler `missingFacts` olarak döner.
- `translate`: TR↔EN çeviri.
- `alt_text`: TR/EN alt metin (konsept görsellerde "temsili tasarım" ibaresiyle).
- `quality_check`: kural tabanlı kontrol (boş alan, kısa metin, sertifika/organik/sağlık iddiası) + kopya içerik tespiti (kelime üçlüsü Jaccard benzerliği) — **AI kapalıyken de çalışır**; AI açıksa ek denetim.
- `blog_draft`: blog taslağı (Markdown); blog CMS tamamlanınca editöre bağlanacak.
Her çağrı `audit_logs`'a `ai.draft` olarak (görev, model, token sayısı; metin değil) yazılır. Model çıktısı zod ile doğrulanır; sınır dışı (ör. SEO başlığı > 70) yanıt kullanılmaz.

## Ziyaretçi asistanı (`POST /api/assistant`, Yardım → "Soru sorun")
- Bilgi kaynağı yalnızca: SSS, katalog bilgileri (ad, boy, ambalaj, saklama; **fiyat ve stok hariç**), saklama/seçim rehberi (`lib/ai/knowledge.ts`).
- Önce yerel arama ilgili kaynakları bulur; ilgili kaynak yoksa model çağrılmaz, "güvenilir yanıt veremiyorum" + ekibe yazma yönlendirmesi döner.
- AI yanıtı yalnızca verilen kaynaklara atıfla kabul edilir; atıfsız veya uydurma kaynaklı yanıt reddedilir.
- AI kapalıyken "Sitedeki bilgilerden" etiketiyle arama sonucu gösterilir. Sorular kaydedilmez.
