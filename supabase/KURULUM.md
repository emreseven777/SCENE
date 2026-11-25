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
