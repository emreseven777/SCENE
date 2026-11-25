# SCENE 8.0 ayrı test ortamı

Docker, Supabase CLI, Node.js 22 veya üstü ve pnpm 10 gerekir. Bu adımları `feat/scene-8-complete` dalının ayrı bir çalışma kopyasında, yalnızca test hesapları ve dosyalarıyla uygula.

```sh
pnpm install --frozen-lockfile
supabase init
supabase start
supabase status
```

`supabase init` ilk yerel kuruluma özeldir. CLI temiz kurulumda migration’ları sıra ile uygular. Daha önce kurulmuş izole bir örnekte migration’ları baştan denemek için `supabase db reset --local` çalıştır.

## Migration sırası

1. `0001_scene_schema.sql`
2. `0002_catalog_and_avatars.sql`
3. `20261125043326_profile_photo_gallery.sql`
4. `20261125044629_profile_age_and_province.sql`
5. `20261125052248_scene_experience.sql`
6. `20261125052728_scene_conversations_and_profiles.sql`
7. `20261125053832_scene_web_push.sql`
8. `20261125065647_scene_safety_and_moderation.sql`
9. `20261125065800_scene_cinema_community.sql`

Sekizinci migration yeni profil ve eşleşme alanları ile yönetim altyapısını ekler. Dokuzuncu migration özel sohbet bucket’ına GIF biçimini ve yeni sinema tablolarını ekler. Var olan kayıtlar ve medya yolları korunur.

## Web uygulaması ve Edge Functions

`supabase status` çıktısındaki yerel URL ve açık anahtarı izlenmeyen `artifacts/scene/.env.local` dosyasına koy.

```dotenv
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<yerel açık anahtar>
```

```sh
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/scene dev
PORT=5173 BASE_PATH=/ pnpm run build
supabase functions serve --no-verify-jwt --env-file <yerel-gizli-env-dosyası>
```

- `tmdb-catalog` katalog için `TMDB_READ_ACCESS_TOKEN` ister. Anahtar Edge ortamında kalır.
- `scene-delete-account` hesap silme için gerekir. Yeni migration’larla eşleşen dal sürümünü kullan. Supabase Edge ortamı `SUPABASE_URL`, `SUPABASE_ANON_KEY` ve `SUPABASE_SERVICE_ROLE_KEY` sağlar.
- `scene-push` isteğe bağlı arka plan bildirim işçisidir. VAPID anahtar çifti, `SCENE_VAPID_SUBJECT`, `SCENE_PUSH_JOB_SECRET`, HTTPS ve zamanlanmış çağrı gerekir. İstemci derlemesine yalnızca `VITE_SCENE_PUSH_PUBLIC_KEY` verilir. [Push kurulumu](KURULUM.md#isteğe-bağlı-arka-plan-bildirimi)

Katalog ve silme işlevleri kullanıcı oturumunu kendi içinde doğrular. Push işlevi işçi sırrını doğrular.

## Yönetici ve veritabanı testleri

Yerel Auth üzerinden test yöneticisi oluştur. Veritabanı operatörü aşağıdaki UUID’yi yerel hesap kimliği ile değiştirip çalıştırabilir. Kullanıcı daha sonra **Profil → Yönetim paneli** üzerinden giriş yapar.

```sql
insert into scene_private.administrators (user_id) values ('<test-yönetici-uuid>');
```

```sh
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -v ON_ERROR_STOP=1 -f supabase/tests/scene_release.sql
```

SQL senaryosu geçici test kayıtlarını işlem sonunda geri alır. İzole Supabase ve tarayıcı üzerinde ayrıca şu akışları doğrula.

- İki yetişkin ve bir yaş sınırı altı hesapla kaydırma, eşleşme, geri alma, engelleme ve karşılıklı görünürlüğü kontrol et.
- İki oturumda Realtime mesaj, iletildi/görüldü, yazıyor, arama, tepki, yanıt, silme, yapım kartı ve film randevusu akışlarını dene.
- Özel JPEG, GIF ve ses yükle. Üçüncü hesapla ve engelleme sonrasında erişimin kapandığını doğrula.
- Eşleşmeyi kaldır ve hazırlık veritabanında geçmişin saklandığını kontrol et. Bir hesabı gizle ve yeniden görünür yap. Ayrı bir hesabı şifreyle kalıcı silip Auth ve Storage temizliğini kontrol et.
- Normal kullanıcıyla yönetici RPC’lerinin reddedildiğini, yöneticiyle şikâyet, doğrulama incelemesi, askıya alma, geri açma ve oda moderasyonunun işlem kaydına geçtiğini doğrula.
- Fiziksel iPhone Safari’de galeri, kamera, mikrofon, Ana Ekran kurulumu ve arka plan bildirimini dene. Arka plan bildirimi iOS 16.4 veya üstünde, ana ekrana yüklenmiş uygulamayı gerektirir.

Doğrulama kuyruğu başvuruyu gösterir ve gerekçeli ret kararı alır. Gerçek kimlik kanıtı veya bağımsız doğrulama süreci tanımlanıncaya kadar olumlu karar ve rozet üretilmez.
