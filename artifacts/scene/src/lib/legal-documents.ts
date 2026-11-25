import { brand, dataController } from "./brand";

export const LEGAL_VERSION = "8.3-draft.1";

export const legalDocuments = [
  {
    id: "aydinlatma",
    title: "KVKK Aydınlatma Metni",
    sections: [
      ["Veri sorumlusu", `Veri sorumlusu ${dataController.name}, ${brand.name} hizmetini işleten ${dataController.operatorType}dir. İletişim e-postası ${dataController.contactEmail}. Web sitesi ${brand.website}. Tebligat adresi ve hesap dışı resmî başvuru kanalları yayın öncesi teyit edilecektir.`],
      ["Toplama yöntemi ve amaçlar", "Hesap ve profil bilgileri kayıt ve profil formlarından, içerik ve tercihler uygulama işlemlerinden, cihaz ve bağlantı bilgileri teknik kayıtlar üzerinden elektronik olarak toplanır. Hesap oluşturma, yaş sınırı, profil, eşleştirme, mesajlaşma, topluluk, güvenlik ve ilgili kişi başvuruları için işlenir."],
      ["İşleme sebepleri", "Üyelik ve hizmet için zorunlu veriler, sözleşmenin kurulması veya ifasıyla doğrudan bağlantılı olduğu ölçüde KVKK m.5/2(c) uyarınca değerlendirilir. Yasal yükümlülük ve ilgili kişi talepleri için m.5/2(ç), uyuşmazlık için m.5/2(e), güvenlik ve kötüye kullanım önleme için dengeleme testiyle m.5/2(f) değerlendirilir. İsteğe bağlı cihaz bildirimi için ayrı açık rıza öngörülür. Özel nitelikli olabilecek veriler için m.6 değerlendirmesi yayından önce tamamlanacaktır."],
      ["Alıcılar ve aktarım", "Görünür profil alanları seçtiğin ayarlara göre üyelere, özel mesajlar eşleştiğin üyeye, oda gönderileri oda üyelerine açılır. Barındırma, kimlik doğrulama, katalog, e-posta ve cihaz bildirimi için ilgili sağlayıcılar görevleriyle sınırlı veri alabilir. Yetkili makamlara kanuni yükümlülük kapsamında aktarım yapılabilir. Sağlayıcı, ülke ve KVKK m.9 dayanağı eşleştirmesi yayından önce tamamlanacaktır."],
      ["Hakların ve başvuru", "KVKK m.11 kapsamında bilgi alma, amaca uygun kullanım ve alıcıları öğrenme, düzeltme, şartları varsa silme veya yok etme, ilgili işlemlerin alıcılara bildirilmesi, münhasıran otomatik analiz aleyhine sonuca itiraz ve zararın giderilmesini talep etme hakların bulunur. Hesabın varsa Profil → Kişisel veriler ve KVKK bölümünden başvurabilirsin. Hesap dışı başvuru kanalları [belirlenecek]. Başvurular en kısa sürede ve en geç 30 gün içinde yanıtlanır."],
    ],
  },
  {
    id: "gizlilik",
    title: "Gizlilik Politikası",
    sections: [
      ["Hesap ve görünürlük", "E-posta adresi diğer üyelere gösterilmez. Doğum tarihi özel tutulur ve yaş hesaplamasında kullanılır. Görünürlük, isteğe bağlı profil ayrıntıları, görüldü ve çevrimiçi durumu Profil ayarlarından yönetilir."],
      ["Mesaj ve içerik güvenliği", "Özel mesajlar ve sohbet ekleri eşleşen üyelere erişim politikalarıyla sunulur. Şikâyete konu içerik gerekli olduğunda yetkili operatör tarafından incelenebilir. Paylaşılan verileri başka bir üyenin kendi cihazında kaydetme ihtimali vardır."],
      ["Teknik sağlayıcılar", "Supabase hesap, veritabanı ve dosyaları; Vercel web uygulaması ve sunum kayıtlarını işler. TMDB arama metnini veya katalog isteğini, görsel sunucuları ise tarayıcı isteğini alabilir. E-posta hizmeti doğrulama için adresi ve iletiyi işler. Arama alanına kişisel bilgi yazılmamalıdır."],
      ["Kontroller", "Hesap sahibinin uygulama verilerini Profil → Kişisel veriler ve KVKK üzerinden indirebilir veya başvuru yapabilirsin. Aydınlatma metninde diğer hakların ve başvuru yolları açıklanır."],
    ],
  },
  {
    id: "kosullar",
    title: "Kullanım Koşulları",
    sections: [
      ["Hizmet ve üyelik", `İşletmeci ${dataController.name}. İletişim e-postası ${dataController.contactEmail}. ${brand.name}, 18 yaşını dolduran kişilere açık sinema temalı tanışma hizmetidir. Doğru bilgi ver, hesabını ve oturum bilgilerini koru.`],
      ["İçerik ve önlemler", "Yalnızca paylaşmaya yetkili olduğun içeriği yükle. Hizmetin sunulması için içeriğin ilgili üyelere ve gerekli teknik hizmet sağlayıcılarına iletilmesi gerekir. Topluluk kuralları ihlalinde gerekçeye uygun içerik kaldırma, askıya alma ve hesap kısıtlaması uygulanabilir."],
      ["Sona erme ve haklar", "Profil üzerinden hesabı kapatabilirsin. Uygulanabilir zorunlu haklar saklıdır. Değişikliklerin duyuru şekli ve uyuşmazlık iletişim kanalı [yayın öncesi tamamlanacak]."],
    ],
  },
  {
    id: "bildirim-rizasi",
    title: "Açık Rıza Metni · Cihaz bildirimleri",
    sections: [
      ["İsteğe bağlı bildirim", "Movia, yeni mesajlar için cihazına bildirim iletmek amacıyla tarayıcının bildirim aboneliğini, cihaz uç noktasını ve teslim için gereken teknik anahtarları işler. Bildirim sağlayıcısı abonelik isteğini ve asgari bildirim bilgisini alır. İşletim sistemi ve tarayıcı sağlayıcısı cihazına göre değişebilir."],
      ["Tercihini değiştirme", "Bu seçenek üyelik ve mesajlaşma için zorunlu değildir. Profil ayarlarından tüm cihazlar için rızanı geri çekebilirsin. Geri çekme, önceki işlemenin hukuka uygunluğunu etkilemez. Yurt dışı aktarımı için gerekli güvence ayrıca kurulmalıdır."],
    ],
  },
  {
    id: "cerezler",
    title: "Çerez Politikası",
    sections: [
      ["Movia tarayıcı depolaması", "Oturum bilgileri girişin devam etmesi, tema tercihi ise görünümün korunması için tarayıcının yerel depolamasında tutulur. Service worker çevrimdışı karşılama ve isteğe bağlı cihaz bildirimleri için kullanılabilir. Bunlar tarayıcı ayarlarından silinebilir."],
      ["Sağlayıcılar ve isteğe bağlı teknolojiler", "Uygulama kaynak kodunda reklam veya analiz çerezi entegrasyonu tespit edilmedi. Barındırma, güvenlik katmanı ve harici görsel sunucuları için canlı HTTP ve depolama envanteri [tamamlanacak]. İsteğe bağlı analiz veya reklam eklenirse önceden işaretlenmemiş tercihler, geri çekme ve amaca göre ayrım sağlanacaktır."],
    ],
  },
  {
    id: "topluluk",
    title: "Topluluk Kuralları",
    sections: [
      ["Güvenli iletişim", "Rızaya ve sınırlara saygı göster. Taciz, tehdit, nefret söylemi, sahte profil, dolandırıcılık, spam ve başkasının özel bilgisini izinsiz yayımlama yasaktır. Açık cinsel içerik, reşit olmayanlara yönelik uygunsuz davranış ve izinsiz mahrem içerik paylaşımı yasaktır."],
      ["Bildirim ve inceleme", "Kural ihlalini profil veya mesaj üzerinden bildirebilir, istenmeyen hesabı engelleyebilirsin. Oda mesajlarında spoiler seçeneğini kullan. Bildirimler yetkili kişilerce incelenir. İtiraz kanalı [yayın öncesi tamamlanacak]."],
    ],
  },
  {
    id: "saklama",
    title: "Veri Saklama ve Silme Politikası",
    sections: [
      ["Saklama planı", "Hesap, profil ve hizmet kayıtları hizmet için gerekli olduğu sürece işlenir. Kategori bazında kesin süreler, güvenlik kayıtları, uyuşmazlık ve yedek döngüsü [onaylanacak]. Yasal dayanak ortadan kalktığında silme, yok etme veya anonimleştirme yöntemi verinin bulunduğu sisteme göre uygulanır."],
      ["Hesap silme", "Hesap silme güncel şifre gerektirir ve uygulamadaki hesabı, ona bağlı verileri ve sahip olunan Storage nesnelerini kaldırır. Yedeklerin son kullanma ve yeniden yükleme kuralları, mevcut saklama rejimi ve üçüncü taraf kayıtları [teyit edilecek]. Hesap silmeden önce çevrim içi başvuru yanıtını kaydet veya hesap dışı kanalı kullan."],
      ["İmha takibi", "İmha kayıtları ilgili yönetmelikteki en az üç yıllık saklama şartına tabidir. Kayıt kapsamı, imha periyodu ve yetkili kişi [belirlenecek]. Hesap silme işlemi bu işletim kayıtlarının tamamının hazır olduğu anlamına gelmez."],
    ],
  },
] as const;
