-- REVIEW REQUIRED: Preview-only inactive product drafts. NOT a production migration.
-- Prices are provisional display-catalogue figures, NOT commercially approved.
-- All products remain active=false and stock=0; existing rows are never overwritten.
-- Before executing, independently verify Neon project + branch identity and backup status.
BEGIN;
INSERT INTO public.products (id,name,type,size,note,price_kurus,stock,active,updated_at)
VALUES
  ('glass-250', '250 ml Cam Şişe', 'glass', '250 ml', 'Tadım ve hediye boyu', 55000, 0, false, 0),
  ('glass-500', '500 ml Cam Şişe', 'glass', '500 ml', 'Lokomotif ürün', 89000, 0, false, 0),
  ('glass-750', '750 ml Cam Şişe', 'glass', '750 ml', 'Sofra ve premium hediye için', 125000, 0, false, 0),
  ('reserve-500', 'Aphrodisias Special Reserve', 'luxury', '500 ml', 'Özel ahşap/mermer kutu + 500 ml', 145000, 0, false, 0),
  ('aromatic-set', 'Tadım & Aromatik Set', 'luxury', '3 x 100 ml', 'Limon, biberiye ve acı biber çeşnili set', 78000, 0, false, 0),
  ('tin-3l', '3 Litre Mat Teneke', 'tin', '3 L', 'Aile kullanımı için ekonomik premium boy', 210000, 0, false, 0),
  ('tin-5l', '5 Litre Mat Teneke', 'tin', '5 L', 'Yoğun tüketim ve mutfak stoğu için', 320000, 0, false, 0),
  ('green-olive', 'Ataeymir Kırma Yeşil Zeytin', 'pantry', '500 g', 'Köy usulü salamura', 24000, 0, false, 0),
  ('black-olive', 'Siyah Sele Zeytin', 'pantry', '500 g', 'Az tuzlu, doğal sele karakteri', 26000, 0, false, 0),
  ('olive-paste', 'Zeytin Ezmesi', 'pantry', '200 g cam kavanoz', 'Kahvaltı ve meze tabağı için', 18000, 0, false, 0),
  ('soap-box', 'El Yapımı Zeytinyağlı Sabun', 'pantry', '2''li kutu', 'Soğuk proses zeytinyağlı sabun', 29000, 0, false, 0),
  ('olive-club', 'Olive Club', 'subscription', '2 x 500 ml / 2 ay', '%20 avantajlı iki ayda bir gönderim', 145000, 0, false, 0),
  ('adopt-tree', 'Adopt an Olive Tree', 'subscription', 'Yıllık', 'İsme özel sertifika, ağaçtan 3L yağ, özel etiket', 450000, 0, false, 0)
ON CONFLICT (id) DO NOTHING;
COMMIT;
