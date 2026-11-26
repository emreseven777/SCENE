# SCENE kurulumu

Bu güncelleme mevcut Supabase projesine eklenir. Supabase Free ve TMDB'nin ticari olmayan kullanım için ücretsiz API erişimiyle çalışır.

## 1. TMDB erişimini al

1. iPhone'da Safari ile [TMDB API ayarlarını](https://www.themoviedb.org/settings/api) aç ve hesabına giriş yap.
2. API erişimi iste. Onaylandığında **API Read Access Token** değerini kopyala.
3. Mevcut SCENE projesinin [Supabase panelini](https://supabase.com/dashboard/projects) aç. **Edge Functions → Secrets** bölümünde `TMDB_READ_ACCESS_TOKEN` adlı bir secret oluştur ve değeri buraya yapıştır. Değeri GitHub'a, sohbete veya Replit'in ön yüz ayarlarına yapıştırma.

## 2. Mevcut veritabanını güncelle

Supabase'de aynı projenin **SQL Editor → New query** ekranını aç. Bu dalda `supabase/migrations/0002_catalog_and_avatars.sql` dosyasını GitHub'da **Raw** görünümünde açıp tamamını kopyala. SQL Editor'a yapıştır ve **Run**'a dokun. Bu migration mevcut profillere ve favorilere iki isteğe bağlı alan ekler, ayrıca özel fotoğraf depolama alanını ve erişim kurallarını oluşturur. Bu dosya daha önce başarıyla çalıştırıldıysa tekrar çalıştırman gerekmez.

Galerili sürümü hazırlarken, aynı SQL Editor'da `supabase/migrations/20261125043326_profile_photo_gallery.sql` dosyasını da çalıştır ve başarı mesajını bekle. Bu dosya mevcut fotoğrafı galerinin ilk sırasına taşır, yeni yükleme gerektirmez ve aynı özel depolama alanını kullanır. Galerili web sürümünü ancak bu iki migration ve katalog işlevi doğrulandıktan sonra yayımla.

Yaş ve il bilgisi olan sürümü hazırlarken galeri migration’ından sonra `supabase/migrations/20261125044629_profile_age_and_province.sql` dosyasını çalıştır. Bu sürümde mevcut üyeler ilk girişlerinde eksik bilgilerini tamamlar. Doğum tarihi özel tabloda tutulur. **Bu migration sosyal işlemler için yaş şartını devreye sokar.** Canlıda uygulamadan önce yeni web sürümünü yayına hazırla ve ikisini aynı yayın aralığında devreye al.

## 3. Katalog işlevini yayımla

1. Supabase'de **Edge Functions → Deploy a new function → Via Editor** seçeneğini aç.
2. Fonksiyon adını `tmdb-catalog` yap. GitHub'da `supabase/functions/tmdb-catalog/index.ts` dosyasını **Raw** görünümünde aç ve içeriğini Supabase düzenleyicisindeki `index.ts` dosyasına yapıştır. **Deploy function**'a dokun.
3. Fonksiyon ayrıntılarında **Verify JWT with legacy secret** anahtarı görünüyorsa kapat. Fonksiyon her istekte Supabase Auth üzerinden kullanıcının oturumunu doğrular. Bu ayar yeni Supabase imzalama anahtarlarıyla çalışan oturumların eski ağ geçidi denetiminde reddedilmesini önler.

## 4. SCENE'i yeniden yayımla

Mevcut web uygulamasını güncellenen GitHub dalıyla yeniden yayımla. Mevcut `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` değerlerin aynı kalır. Yeni bir yayın ortamı kuruyorsan Supabase'in **Connect** panelinden Project URL ve **publishable** ya da eski **anon** anahtarını kullan. Tarayıcıya yalnızca bu anahtar gider. Supabase secret veya service role anahtarı sunucu tarafında kalır.

Safari'de uygulamayı açıp **Ara** ekranında örneğin **Kış Uykusu** ve **The Last of Us** ara. **Profil**'de iki fotoğraf ekle, kırp, sırala ve ana fotoğrafı seç. **Profil önizleme** ekranında fotoğraflar arasında kaydır. Ardından bir fotoğrafı değiştir ve sil. İkinci bir hesapla yayımlanan fotoğrafın profil sayfasında göründüğünü ve silindikten sonra güncelleme ile kaybolduğunu kontrol et.

### Terminalden yayına alanlar için

Supabase CLI yapılandırılmışsa aynı veritabanı migration'ını SQL Editor'da çalıştırabilir ve fonksiyonu depo kökünden `supabase functions deploy tmdb-catalog --project-ref PROJE_KODU --no-verify-jwt` ile yayımlayabilirsin.

## SCENE 3.0

Aşağıdaki migration dosyalarını önce test projesinde, sıra ile uygula. Var olan SCENE verilerine silme işlemi uygulanmaz.

1. `20261125052248_scene_experience.sql` — beğeni türleri, engelleme, şikâyet, sinema tercihleri ve profil alanları.
2. `20261125052728_scene_conversations_and_profiles.sql` — sohbet durumları, gizlilik, özel medya, randevular ve doğrulama başvuruları.
3. `20261125053832_scene_web_push.sql` — isteğe bağlı cihaz bildirimi abonelikleri ve işlem kuyruğu. İşçi ayarlanmasa da uygulama içi bildirimler çalışır.

Mevcut `tmdb-catalog` Edge Function’ını bu daldaki kodla yeniden yayımla. Önceki `TMDB_READ_ACCESS_TOKEN` secret’ını kullanmaya devam eder. Ayrıca `scene-delete-account` Edge Function’ını yayımla. Silme işlevi oturumu ve güncel hesap şifresini kontrol eder. Supabase’in sunucuda sağladığı service role anahtarını kullanır. Test için yalnızca silinebilir test hesaplarını kullan. Ağ geçidinin eski JWT denetimi kapalıysa her iki işlev de kendi oturum denetimini yapar.

### İsteğe bağlı arka plan bildirimi

- Standart Web Push için VAPID anahtar çifti oluştur. Supabase Edge Function secret’larına `SCENE_VAPID_PUBLIC_KEY`, `SCENE_VAPID_PRIVATE_KEY`, `SCENE_VAPID_SUBJECT` (ör. `mailto:destek@alanadin.example`) ve rastgele en az 32 baytlık `SCENE_PUSH_JOB_SECRET` ekle.
- Web uygulamasının derleme ortamında yalnızca **açık** anahtarı `VITE_SCENE_PUSH_PUBLIC_KEY` olarak ayarla. Özel anahtar, işçi sırrı ve Supabase service role anahtarı tarayıcıya gönderilmez.
- `scene-push` Edge Function’ını yayımla. Bu işçi kullanıcı JWT’si yerine `x-scene-job-secret` başlığını kontrol eder. Ağ geçidinin JWT doğrulamasını yalnızca bu işlev için kapat. URL ve işçi sırrı Supabase Vault’a eklendikten sonra [dakikalık zamanlayıcıyı](operations/movia_schedule_push.sql) çalıştır. Geri almak için `select cron.unschedule('movia-scene-push');` çalıştır. Sırrı sorgu metnine, depoya veya URL’ye yazma. Push metni gönderen adı, mesaj içeriği ve medya bilgisi içermez.
- HTTPS gerekir. iOS 16.4 ve sonrası Safari’de uygulamayı **Ana Ekrana Ekle**, ana ekrandan aç, **Bildirimler → Bu cihazda aç** seçeneğini kullan. Bu kurulum tamamlanana kadar arka plan bildirimleri kapalı kalır.

### Yayın öncesi canlı test

İki test hesabıyla karşılıklı beğeni, iletildi/görüldü, gizlilik tercihleri, engelleme sonrası yeni mesajın reddi, fotoğraf ve ses, film randevusu ve tercihin geri alınmasını doğrula. Bir test hesabını kalıcı silip Storage dosyalarının da temizlendiğini kontrol et. Push açıksa iPhone Ana Ekran sürümünü kapattıktan sonra dene. Profil doğrulama başvuruları kayda alınır. Sonuçların işlenmesi için yönetici incelemesi veya doğrulama sağlayıcısı gerekir. Uygulama doğrulama rozeti üretmez.

## SCENE 8.1 profil alanları

Test ortamında `20261125151918_scene_81_profile_choices.sql` migration’ını uygulanmış önceki migration’ların üzerine ekle. Tanınan eski cevaplar standart değerlere çevrilir. Kesin eşleştirilemeyen cevaplar kullanıcı yeni bir değer seçene kadar korunur. Eski burç yanıtı kayıtlı kalır. Otomatik burcun diğer üyelere görünmesi için üyenin **Burç → Otomatik** seçmesi ve isteğe bağlı bilgileri paylaşmayı açması gerekir. Doğum tarihi özel tabloda kalır.

Aynı sürümde `tmdb-catalog` Edge Function’ını güncelle. Profildeki film, dizi, oyuncu ve yönetmen araması mevcut `TMDB_READ_ACCESS_TOKEN` secret’ını kullanır.

Yayın ortamı için Supabase **Authentication → URL Configuration** bölümünde **Site URL** değerini `https://joinscene.vercel.app/` yap ve bu tam adresi **Redirect URLs** listesine ekle. Gerekli eski ve test yönlendirmelerini koru. Kayıt e-postası, kayıt sırasında kullanılan ortamın adresine döner. Yayından önce test hesabıyla e-posta bağlantısını, profil kaydını, gizlilik seçeneklerini ve Keşfet filtrelerini doğrula.

Yerel veritabanında `supabase/tests/scene_profile_81.sql` dosyası seçim doğrulamasını, burç hesabını ve gizliliği sınar. Yalnızca test veritabanında çalıştır.

### MOVIA 10.0 yayın kapıları

- Üretim migration’larından önce güncel şifreli PostgreSQL ve Storage yedeğini doğrula. Yedeği izole ortamda geri yükle, 10.0 migration’larını tarihlerine göre uygula ve canlıdaki mevcut geçmiş kayıtlarını yeniden uygulama. Eski web sürümünün dağıtım kimliğini kaydet.
- Supabase Auth’ta yeni parolalar için asgari uzunluğu 12 olarak uygula. Önceki parolalarla giriş ve mevcut yönlendirmeler korunmalı. İzole GoTrue’da API üzerinden kaydı ve parola yenilemeyi kontrol et.
- Push dağıtımı için Vercel Production’da VAPID açık anahtarı ve Supabase Edge Function/Vault yapılandırması gerekir. Anahtar çiftini paylaşma. Zamanlayıcıyı etkinleştirdikten sonra kontrollü iki hesapta tarayıcı kapalıyken teslimi doğrula.
- Fiziksel iPhone’da Ana Ekran’dan açılan PWA’yı, Android’de Chrome’u kullan. İzin ver, uygulamayı arka plana al, test hesabından mesaj gönder, bildirime dokunarak sohbet listesine dön. İzni geri çekince yeni mesajın bildirim üretmediğini kontrol et. Her iki cihazda da mikrofonla profil yanıtı kaydet, eşleşilen hesapla oynat ve kaldır.
- Geri dönüş gerekirse önce eski Vercel dağıtımını etkinleştir. Push yeni duruma bağlıysa `movia-scene-push` işini durdur. Yeni etkileşim tablolarını ve kullanıcı dosyalarını silme.
