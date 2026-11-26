# MOVIA DATING 8.3 yayın ve geri dönüş planı

Bu çalışma yayın onayı bekliyor. Mevcut üretim projesi ve veritabanı korunacak. 26 Kasım 2026 kontrolünde yeni ve eski adres aynı SCENE derlemesini sunuyor. Her iki adreste de `/sifre-yenile` mevcut dağıtımda 404. [Geçiş, geri dönüş ve cihaz kontrolleri](./MOVIA-8.3-GECIS-KONTROLLERI.md)

## Yayın öncesi

1. Vercel üretim dağıtım kimliğini, mevcut domain eşlemelerini, aynı Supabase projesinin Auth Site URL, izin verilen yönlendirmeler, SMTP ve e-posta şablonu ayarlarını korumalı bir yerde kaydet. Üretimdeki Supabase proje kimliğini Vercel yapılandırmasıyla karşılaştır. Yeni veritabanı kurma veya verileri taşıma.
2. Mevcut yedek imkânıyla PostgreSQL yedeğini ve ayrı olarak özel Storage nesnelerini güvenceye al. İzole ortamda geri yükleme, satır/nesne sayıları ve örnek Auth, profil, fotoğraf, mesaj ve eşleşme erişimini doğrula. Üretim yazmaları süreceği için geri yükleme şartlarını ve veri kaybı penceresini operatörle kararlaştır.
3. Hukuk incelemesi, tebligat ve resmî başvuru kanalları, KVKK m.6 ve m.9, sağlayıcı sözleşmeleri, saklama ve silme takvimi tamamlandıktan sonra onaylı dokümanları sürümle. `8.3-draft.1` yalnız geliştirme ve test içindir. Üretimde frontend ve sunucu belge sabitlerini birlikte değiştir. [KVKK inceleme dosyası](./SCENE-8.3-KVKK-INCELEME.md)
4. İzole Supabase Auth ve gerçek deneme posta kutusunda kayıt, 18 yaş sınırı, doğrulama, parola sıfırlama, eski şifrenin reddi ve yeni şifreyle giriş provası yap. Politika, Storage ve hesap silme testini aynı ortamda tekrar çalıştır. Kullanıcı raporunun ve yönetici yaptırımlarının uçtan uca işlediğini doğrula.
5. Üretim onayından sonra bekleyen migration'ları geçmiş sırasıyla kontrol et. `20261125163146_scene_83_privacy.sql` kayıt sözleşmesini değiştirdiği için eski ve yeni istemciyle uyumluluğu veya kısa kayıt bakım aralığını prova et. `20261125203722_movia_83_report_categories.sql` mevcut kategori değerlerini koruyarak listeyi genişletir. `20261125212400_movia_83_scrub_registration_updates.sql` kayıt alanlarının Auth kullanıcı güncellemelerinde yeniden saklanmasını önler ve mevcut Auth meta verisinden yalnızca `scene_registration` alanını temizler. Üç dosya için de üretim geçmişini ve çalıştırılacak SQL'i önceden teyit et.

## Adres, Auth ve e-posta

- Aynı Vercel projesine `joinmovia.vercel.app` adresini ekle. Önce yeni ve eski hostu birlikte sun. Auth Site URL değerini yeni kök adrese ayarla. Tam izin değerleri `https://joinmovia.vercel.app/`, `https://joinmovia.vercel.app/sifre-yenile`, `https://joinscene.vercel.app/`, `https://joinscene.vercel.app/sifre-yenile`. Daha önce kullanılan doğrulama yollarını, gönderilmiş bağlantıların geçerlilik süresi boyunca bırak. Üretimde joker karakter kullanma. [Supabase yönlendirmeleri](https://supabase.com/docs/guides/auth/redirect-urls)
- Supabase Auth şablonlarına `supabase/templates/confirmation.html` ve `supabase/templates/recovery.html` içeriğini yükle. Konular sırasıyla “Movia Dating e-posta doğrulama” ve “Movia Dating şifre yenileme”. E-posta doğrulamasını etkin tut. Doğrulama `ConfirmationURL` değerini kullanır. Parola yenileme `RedirectTo` ile izinli istemci yolunu kullanır ve `TokenHash` URL parçasından alınır. İstemci kullanıcının düğmeye dokunmasından sonra doğrular. SMTP bağlantı takibini kapat ve iki adreste gerçek e-posta teslimi ve eski bağlantı denemesi yap. [Supabase e-posta şablonları](https://supabase.com/docs/guides/auth/auth-email-templates) · [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- Geçişte eski hostu genel sunucu yönlendirmesine alma. Sunucu URL parçasını göremez ve Auth dönüşünü yanlış hosta taşıyabilir. Onay sonrasında `VITE_MOVIA_LEGACY_REDIRECT=true` ile eski hostun sorgu ve URL parçası içermeyen kök sayfasını sabit yeni adrese taşı. Eski doğrulama bağlantılarını, parola yenileme yolunu ve mevcut PWA açılışını ayrı test et. Oturumlar hosta bağlı olduğundan yeni adreste yeniden giriş gerekebilir.
- Rotayı ve canlı katalog bağlantısını test et. Aynı Supabase projesi kullanılacağı için Edge Function ve VAPID kimlikleri korunur. Bildirim izni ve abonelikler yeni hostta yeniden oluşturulabilir. İşlev veya proje ayarı değişirse dağıtım kimliğini ve geri dönüş sürümünü kaydet.

## Geri dönüş

1. Yönlendirme bayrağını kapat ve önceki Vercel üretim dağıtımını yeniden etkinleştir. Eski domain eşlemesini tut. Auth Site URL ve şablonları kayıttan geri yükle. Gönderilmiş Movia bağlantılarının süresi dolana kadar yeni Auth yönlendirme izinlerini ve gerekli rotaları erişilebilir tut. Her iki posta akışını tekrar dene.
2. Veritabanında yeni kayıt ve şikâyetleri koru. Yeni şikâyet değerlerini eski kısıtlamaya sığdırmak için satır silme veya kategori değiştirme. Eski istemci eski değerleri yazmaya devam edebilir. Kayıt tetikleyicisiyle eski istemci uyumu bozulursa önceden prova edilmiş ileri düzeltmeyi uygula ve mevcut kabul kayıtlarını tut.
3. Yedekten canlıya tam dönüş ancak veri bütünlüğü olayı, doğrulanmış geri yükleme ve operatörün ayrıca onayıyla yapılır. Aradaki üretim değişiklikleri saklanmalı ve tekrar uygulanabilirliği belirlenmeli.

## Geri yükleme provası

25 Kasım 2026'da yerel PostgreSQL 17.12 üzerinde uygulama migration'ları ve üç SQL regresyon paketi çalıştırıldı. Yapay hesap, profil, eşleşme, mesaj ve sohbet dosyasıyla veritabanı ve dosyalar ayrı ayrı arşivlendi. Arşivler SHA-256 ile doğrulandı ve izole bir PostgreSQL dizinine geri yüklendi. Yeniden açılan veritabanında satır sayıları, medya baytları, eşleşmiş üyeye erişim ve üçüncü üyeye erişim reddi doğrulandı. Auth ve Storage şemaları test fikstürüydü.

Üretim kabulü için canlı örnekten alınmış erişimi kısıtlı, şifreli yedekler gereklidir. Veritabanı ve Storage nesneleri ayrı alınmalı. Dosya manifestinde bucket, nesne anahtarı, bayt uzunluğu ve SHA-256 bulunmalı. Geri yüklemede gerçek Auth, Storage ve RLS kontrolleri izole ortamda tekrarlanmalı. Son provayı ve üretimden alınan iki arşivin doğrulamasını tamamlamadan geçiş başlatılmamalı. [Supabase yedekler](https://supabase.com/docs/guides/platform/backups)

## 8.3 geliştirme doğrulaması

26 Kasım 2026'da izole PostgreSQL 17.12 veritabanında gerçek Supabase Auth ve Storage şemalarıyla 14 uygulama migration'ı ve üç SQL test paketi geçti. Yerel SMTP posta kutusuyla e-posta doğrulama ve parola yenileme çalıştı. Eski parola reddedildi ve yeni parola kabul edildi. Kayıt bilgileri Auth kullanıcı ve kimlik kayıtlarına veya doğrulanmış oturumun JWT'sine taşınmadı. İzole API testinde şikâyet ve yönetici yaptırımı, özel sohbet GIF'i ve erişim kuralları ile Auth hesabı, profil ve test dosyasının silinmesi doğrulandı.
