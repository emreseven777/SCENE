# MOVIA 8.3 geçiş kontrolleri

## Üretim migration geçmişi

Canlı proje SCENE 3.0. Depodaki eski migration sürümlerini canlıda yeniden uygulama.
Aşağıdaki eşleme ad ve sıra üzerinden, 8.3 adayının uyumluluğu ise şifreli canlı
yedekten yapılan izole uygulama ve testlerle doğrulandı. Sürüm numarası farkı
otomatik `supabase db push` ve geçmişi topluca onarma yoluyla kapatılmamalı.
Uygulama planı yalnızca aşağıdaki üç yeni dosyayı sırasıyla içerir. Canlı geçmişi
ve yedekten sonra şemaya uygulanan değişiklikleri son kez karşılaştır. Uygulama
aracı dosyaları farklı kimlikle kaydederse çıktıdaki yeni kimlikleri sürüm kaydına yaz.

| Mevcut migration | Depo sürümü | Canlı sürüm |
| --- | --- | --- |
| scene_schema | 0001 | 20261125071439 |
| catalog_and_avatars | 0002 | 20261125071448 |
| profile_photo_gallery | 20261125043326 | 20261125071453 |
| profile_age_and_province | 20261125044629 | 20261125071459 |
| scene_experience | 20261125052248 | 20261125071504 |
| scene_conversations_and_profiles | 20261125052728 | 20261125071509 |
| scene_web_push | 20261125053832 | 20261125071515 |
| scene_safety_and_moderation | 20261125065647 | 20261125071521 |
| scene_cinema_community | 20261125065800 | 20261125071526 |
| scene_rpc_hardening | 20261125071950 | 20261125072018 |
| scene_81_profile_choices | 20261125151918 | 20261125153301 |

8.3 sırası: `20261125163146_scene_83_privacy.sql`,
`20261125203722_movia_83_report_categories.sql`,
`20261125212400_movia_83_scrub_registration_updates.sql`.

## Eski SCENE'e dönüş

1. İşlem içinde hata olursa rollback yap ve Vercel dağıtımına dokunma.
2. Veritabanı migration'ı tamamlandıysa geri dönüş için yedek geri yükleme yoluyla
   üretimi eski bir zamana taşıma. Önce mevcut Vercel dağıtım kimliğini, Auth
   ayarlarını ve yönlendirme listesini kaydet. Kayıt için varsa bakım aralığını
   açık tut ve yeni MOVIA bağlantılarının geçerliliği bitene kadar yeni rotayı
   erişilebilir bırak.
3. Eski kayıt akışına geçici dönüş, üretim operatörünün açık onayıyla
   [uyumluluk SQL'i](../supabase/operations/movia_83_legacy_registration.sql)
   uygulanarak yapılabilir. Bu değişiklik yalnızca `scene_registration` alanı
   olmayan kayıtların eski onboarding akışına girmesini sağlar. Bu kayıtlara
   8.3 belge kabulü eklenmez. Eski onboarding'deki yaş kontrolü çalışmaya devam
   eder. KVKK veya yaş kontrolü bakımından eski kayıt açılamıyorsa bakım
   aralığını sürdür. Mevcut 8.3 kayıtları, şikâyet kategorileri ve açık rızalar
   korunur. Eski istemcide yeni push rızası verilemediği için yeni abonelik
   etkinleştirmesi bu geri dönüşün kapsamında değildir.
4. Eski Vercel sürümüne dön, Auth Site URL ve posta şablonlarını kaydedilen
   değerlerle karşılaştır. Yeni yönlendirme izinlerini geçiş süresi boyunca tut.
   Mevcut giriş, profil, eşleşme ve mesaj akışlarını dene. Uygunsa sentetik kayıt
   ile eski onboarding'i doğrula.
5. MOVIA'ya tekrar geçerken
   [sıkı kayıt SQL'i](../supabase/operations/movia_83_strict_registration.sql)
   ile eski sözleşmeye açılan yolu kapat ve eşleşen web sürümünü etkinleştir.
   Eski dönüş aralığında oluşturulan hesaplara geriye dönük kabul ekleme.

İzole gerçek Auth ve posta kutusuyla geçici uyumluluk ve yeniden sıkı moda
dönüş doğrulandı. Eski kayıt yalnız geçici modda kabul edildi. E-posta onayı,
yetişkin profil kurulumu ve reşit olmayan profilin reddi test edildi. Mevcut
belge kabul kayıtları, mesaj ve Storage sayıları korundu.

## Vercel ve Auth incelemesi

- Vercel Project Settings → Environment Variables bölümünde `VITE_SUPABASE_URL`
  ve `VITE_SUPABASE_ANON_KEY` değerlerinin hedef proje ile eşleştiğini doğrula.
  Anahtarın türü publishable veya legacy anon olmalı. Preview ortamını sentetik
  verili izole proje ile kullan. Geçişte önce eski adres yönlendirmesini kapalı
  tut. Açılacaksa `VITE_MOVIA_LEGACY_REDIRECT=true` yalnızca ayrı onayla.
  [Vercel ortam değişkenleri](https://vercel.com/scene16/scene-artifacts/settings/environment-variables)
- Auth Site URL hedefi `https://joinmovia.vercel.app/`. Eski ve yeni adreslerde
  kök ve `/sifre-yenile` rotalarını tek tek izin listesine al. Önceki geçerli
  doğrulama yollarını bağlantı süreleri dolana kadar koru.
  [Supabase URL ayarları](https://supabase.com/dashboard/project/gddvtjcskluayjolymxc/auth/url-configuration)
- [Onay](../supabase/templates/confirmation.html) ve
  [parola yenileme](../supabase/templates/recovery.html) şablonları hazırdır.
  Onay iletisindeki `ConfirmationURL` Supabase doğrulamasını yapar ve istekteki
  izinli adrese döner. Parola yenileme `RedirectTo` ile doğrudan doğru rotaya
  gider. Token URL parçasında taşınır ve işlem kullanıcı düğmeye dokununca başlar.
  SMTP bağlantı takibini kapat ve sentetik bir posta kutusuna her iki iletiyi gönder.
  [E-posta şablonları](https://supabase.com/dashboard/project/gddvtjcskluayjolymxc/auth/templates)
- Sızdırılmış parola taraması Supabase Pro ile başlar. Ücretsiz planda sunucu
  tarafında parola uzunluğunu artırma, oran sınırlarını gözden geçirme ve
  parola yöneticisi kullanımı değerlendirilebilir. Bunlar sızdırılmış parola
  taramasının kapsamını sağlamaz. Minimumu değiştirirsen istemci mesajları ve
  kayıt/parola yenileme testlerini eşleştir. [Supabase parola güvenliği](https://supabase.com/docs/guides/auth/password-security)

## iPhone Safari kabul testi

Onaylı, sentetik verili bir hazırlık adresi ve iki test hesabı kullan. Fotoğraf
ve mikrofon için yalnızca sentetik içerik kullan. Arka plan bildirimi için
iOS 16.4 veya üstü ve ana ekrana kurulu web uygulaması gerekir.

1. Safari'de yeni adresi aç. Karşılama, giriş, kayıt ve doğrudan `/sifre-yenile`
   açılışını kontrol et. Kayıt ekranında 18 yaş sınırı ve koşul kutusunu dene.
2. Test hesabıyla kayıt ol. Mail'de doğrulama bağlantısına dokun. Safari doğru
   ana bilgisayara dönmeli. Eski adresten gönderilmiş deneme iletisini de dene.
3. Çıkış yapıp parola yenileme iste. İletideki bağlantıyı aç, doğrulama
   düğmesine dokun ve yeni parola belirle. Eski parola reddedilmeli, yeni
   parola çalışmalı. Aynı e-posta bağlantısını ikinci kez açıp reddi kontrol et.
4. Profilde Fotoğraflar ve Kamera izinlerini sırayla dene. İkinci hesapla
   eşleş, mesajı iki cihazda aç, fotoğraf ve kısa ses kaydı gönder. Üçüncü
   oturum veya engelleme sonrası özel dosyanın erişilemediğini kontrol et.
5. Safari Paylaş → Ana Ekrana Ekle. Ana ekrandan aç, bildirim iznine izin ver.
   Diğer hesaptan mesaj gönder ve kilit ekranında bildirimi kontrol et. Ayarlardan
   cihaz bildirim rızasını geri çekip tekrar mesaj gönder. Yeni bildirim gelmemeli.
6. Hazırlık ortamının sürümünü, iOS sürümünü, adımın sonucunu ve hata ekranını
   kaydet. Ekran görüntüsünden kullanıcı bilgilerini ve bağlantı tokenlarını çıkar.
