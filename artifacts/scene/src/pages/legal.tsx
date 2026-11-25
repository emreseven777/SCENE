import { Link } from "wouter";

export default function Legal() {
  return <main className="scene-page mx-auto max-w-3xl space-y-5">
    <Link href="/" className="text-sm text-brand-ink underline">SCENE ana sayfa</Link>
    <h1 className="scene-title">SCENE kuralları ve gizlilik</h1>
    <p className="text-sm text-muted-foreground">Bu metinler taslaktır. İşletmeci, iletişim bilgileri ve veri saklama süreleri yayından önce tamamlanmalıdır.</p>
    <section className="scene-panel space-y-3 p-5">
      <h2 className="text-xl font-bold">Kullanım koşulları taslağı</h2>
      <p>SCENE 18 yaşını doldurmuş kişilere açıktır. Doğru profil bilgileri kullan, hesabını koru ve yalnızca paylaşmaya yetkili olduğun içerikleri yükle. Kural ihlalleri içerik kaldırma, askıya alma veya yasaklama ile sonuçlanabilir.</p>
    </section>
    <section className="scene-panel space-y-3 p-5">
      <h2 className="text-xl font-bold">Topluluk kuralları taslağı</h2>
      <p>Rızaya ve sınırlara saygı göster. Taciz, nefret, tehdit, kimliğe bürünme, spam ve başkasının özel bilgilerini paylaşmak yasaktır. Yapımın olay örgüsünü açığa çıkaran topluluk mesajlarını spoiler olarak işaretle. İhlalleri profil veya sohbet üzerinden bildirebilirsin.</p>
    </section>
    <section className="scene-panel space-y-3 p-5">
      <h2 className="text-xl font-bold">Gizlilik metni taslağı</h2>
      <p>Hesap bilgileri, profil ve fotoğraflar, sinema tercihleri, eşleşmeler ve mesajlar uygulamanın çalışması için işlenir. Doğum tarihi özel tutulur ve erişim için yaş hesaplanır. Katalog aramaları TMDB üzerinden yapılır. Cihaz bildirimi açılırsa tarayıcının bildirim aboneliği de saklanır.</p>
      <p>Görünürlük ve sohbet tercihlerini profilden ayarlayabilir, şikâyet gönderebilir veya hesabın için kalıcı silme işlemi başlatabilirsin. Güvenlik kararları ve gerektiğinde şikâyete konu içerik, yetkili inceleme için işlenir.</p>
    </section>
  </main>;
}
