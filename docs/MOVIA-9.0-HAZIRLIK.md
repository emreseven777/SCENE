# MOVIA 9.0 hazırlık planı

9.0 için bu çalışma kapsam belirleme aşamasındadır. 8.3’ün güvenli yayını,
onaylanmış hukuki metinler ve fiziksel iPhone kabul testi 8.3 kapsamındadır.

## Ücretsiz izole test altyapısı

Supabase Free kotası hesap genelinde iki aktif proje ile sınırlı. Bağlı iki
Free proje aktif. Mevcut projeleri koru. Ayrı boş test projesi için ancak ücretsiz
kapasite doğrulandığında yönetilen proje seçeneğini yeniden değerlendir.
[Supabase faturalandırma kılavuzu](https://supabase.com/docs/guides/platform/billing-on-supabase)

Yerel Supabase CLI ve Docker veya mevcut PostgreSQL, GoTrue, PostgREST, Storage
ve Mailpit düzeneğiyle üretim verisi kullanmadan test yapılabilir. Net adres
ayrımı korunmalı. İstemci yapılandırması yalnız izole servise işaret etmeli.
Migration'lar yeni bir yerel veritabanında uygulanır. Kayıt ve parola e-postaları
Mailpit'e gider. Veritabanı erişim testleri, tarayıcı regresyonları ve iki
sentetik kullanıcıyla API testleri burada koşar. Bu düzenek daha önce 8.3
regresyonları için kullanıldı. [Yerel test kılavuzu](../supabase/TEST-ORTAMI.md)

Fiziksel iPhone için aynı düzeneğin HTTPS üzerinden erişilebilir, kimlik
doğrulamalı bir test adresi gerekir. Web kabuğu ile Auth, Data API, Storage ve
Realtime yolları aynı erişim mekanizmasıyla çalışmalı. Mevcut Cloud ortamında
erişilebilir HTTP portalı doğrulanmadı. Vercel Preview tek başına bu yerel
servislere erişim sağlamaz. Üretim projesini Preview arka ucu olarak kullanma.

## Öncelikli hazırlık listesi

| Öncelik | İş | Kabul ölçütü |
| --- | --- | --- |
| P0 | Sentetik test altyapısını tekrarlanabilir hale getir | Yeni yerel ortamda migration, Auth, Storage ve Mailpit kurulumu tek tarifle çalışır. Canlı kimlik bilgilerine gerek kalmaz. |
| P1 | WebKit ve cihaz regresyonunu düzenle | Kayıt, parola yenileme, fotoğraf ve mesaj testi otomatik çalışır. iPhone kamera, mikrofon ve bildirim için ayrı cihaz kabul kaydı tutulur. |
| P1 | Yedekleme durumunu izlenebilir yap | Son doğrulanan yedek, son kullanma süresi ve geri yükleme provası kaydedilir. Arşiv ve test çıktıları üretim kullanıcı verisini açık biçimde taşımaz. |
| P2 | Erişim ve gizlilik kontrollerini genişlet | Eşleşme kaldırma, engelleme, dosya erişimi, hesap silme ve rıza geri çekme için kabul senaryoları tamamlanır. |

Tasarım ve efor kararı 8.3 kabulü sonrası alınır.
