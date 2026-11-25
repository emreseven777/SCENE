export const UNDISCLOSED = "undisclosed";
export const UNDISCLOSED_LABEL = "Belirtmek istemiyorum";

export const OCCUPATIONS = [
  "Acil tıp teknisyeni", "Adli tıp uzmanı", "Aşçı", "Avukat", "Bankacı", "Barista", "Beslenme uzmanı",
  "Bilgi güvenliği uzmanı", "Bilgisayar mühendisi", "Biyolog", "Biyomedikal mühendisi", "Çevirmen",
  "Çevre mühendisi", "Çiftçi", "Çocuk gelişimi uzmanı", "Danışman", "Dansçı", "Denizci", "Diş hekimi",
  "Diyetisyen", "Doktor", "Eczacı", "Editör", "Eğitim danışmanı", "Ekonomist", "Elektrik mühendisi",
  "Elektrik teknisyeni", "Elektronik mühendisi", "Endüstri mühendisi", "Estetisyen", "Etkinlik yöneticisi",
  "Finans analisti", "Fizikçi", "Fizyoterapist", "Fotoğrafçı", "Gazeteci", "Gayrimenkul danışmanı",
  "Gemi kaptanı", "Grafik tasarımcı", "Gümrük müşaviri", "Güvenlik görevlisi", "Gıda mühendisi",
  "Hakim", "Halkla ilişkiler uzmanı", "Harita mühendisi", "Hemşire", "Hukuk danışmanı", "İç mimar",
  "İdari işler uzmanı", "İhracat uzmanı", "İllüstratör", "İnsan kaynakları uzmanı", "İnşaat mühendisi",
  "İş analisti", "İş geliştirme uzmanı", "İş güvenliği uzmanı", "İşletmeci", "İtfaiyeci", "Jeolog",
  "Kabin memuru", "Kameraman", "Karikatürist", "Kasiyer", "Kaynak ustası", "Kimya mühendisi", "Kimyager",
  "Konuşma terapisti", "Kuaför", "Kuyumcu", "Kütüphaneci", "Laboratuvar teknisyeni", "Lojistik uzmanı",
  "Makine mühendisi", "Mali müşavir", "Marangoz", "Matematikçi", "Medya planlama uzmanı", "Memur",
  "Mimar", "Moda tasarımcısı", "Muhasebe uzmanı", "Müşteri temsilcisi", "Müzisyen", "Odyolog",
  "Otomotiv teknisyeni", "Oyuncu", "Öğrenci", "Öğretim görevlisi", "Öğretmen", "Pastacı", "Pazarlamacı",
  "Pilot", "Polis", "Proje yöneticisi", "Psikolog", "Psikolojik danışman", "Radyo programcısı",
  "Reklamcı", "Restoran yöneticisi", "Sağlık teknisyeni", "Sanat yönetmeni", "Satın alma uzmanı",
  "Satış danışmanı", "Savcı", "Senarist", "Servis görevlisi", "Ses mühendisi", "Sigortacı",
  "Sistem yöneticisi", "Sosyal hizmet uzmanı", "Sosyal medya uzmanı", "Sosyolog", "Spor antrenörü",
  "Sporcu", "Şehir plancısı", "Şoför", "Tarım mühendisi", "Tekstil mühendisi", "Terzi", "Tesisatçı",
  "Tur rehberi", "Turizm uzmanı", "Uçak teknisyeni", "Ulaştırma uzmanı", "Ürün yöneticisi",
  "Veri analisti", "Veri bilimci", "Veteriner hekim", "Video editörü", "Yapımcı", "Yazar",
  "Yazılım geliştirici", "Yazılım mühendisi", "Yönetmen", "Ziraat mühendisi", "Akademisyen",
  "Asker", "Elektrikçi", "Garson", "Girişimci", "Kurye", "Emekli", "Serbest çalışan", "Şu anda çalışmıyor", "Diğer",
].sort((a, b) => a.localeCompare(b, "tr"));

export const CHOICES = {
  education: { primary: "İlkokul", middle: "Ortaokul", high_school: "Lise", associate: "Ön lisans", bachelors: "Lisans", masters: "Yüksek lisans", doctorate: "Doktora", other: "Diğer" },
  smoking: { never: "Kullanmıyorum", sometimes: "Ara sıra", regularly: "Düzenli", quit: "Bıraktım" },
  alcohol: { never: "Kullanmıyorum", sometimes: "Ara sıra", regularly: "Düzenli", quit: "Bıraktım" },
  relationship: { long_term: "Uzun süreli ilişki", short_term: "Kısa süreli ilişki", marriage: "Evlilik", open: "Tanışmaya açık", undecided: "Henüz karar vermedim" },
  children: { has_children: "Çocuğum var", wants_children: "Çocuk istiyorum", no_children: "Çocuk istemiyorum", undecided: "Henüz karar vermedim" },
  sport: { never: "Spor yapmıyorum", sometimes: "Ara sıra", regularly: "Düzenli" },
} satisfies Record<string, Record<string, string>>;

export const INTERESTS = ["Film ve dizi", "Müzik", "Konser", "Kitap", "Yazmak", "Tiyatro", "Müze", "Fotoğrafçılık", "Resim", "Tasarım", "Dans", "Seyahat", "Kamp", "Doğa yürüyüşü", "Mutfak", "Kahve", "Oyun", "Teknoloji", "Bilim", "Gönüllülük", "Hayvanlar", "Fitness", "Koşu", "Bisiklet", "Yüzme", "Yoga", "Futbol", "Basketbol", "Tenis", "Moda", "Bahçecilik", "Podcast", "Masa oyunları", "Anime", "Stand-up", "El işi"];

export const GENRES = ["Aksiyon", "Macera", "Animasyon", "Belgesel", "Bilim Kurgu", "Dram", "Fantastik", "Gerilim", "Gizem", "Komedi", "Korku", "Müzik", "Romantik", "Savaş", "Suç", "Tarih", "Aile", "Western", "Biyografi"];

export const TMDB_FIELDS = { movie: "Favori film", series: "Favori dizi", actor: "Favori oyuncu", director: "Favori yönetmen" } as const;
export type TmdbField = keyof typeof TMDB_FIELDS;
export interface TmdbPick { id: string; name: string; year?: number }

export type ProfileValue = string | string[] | TmdbPick;
export type ProfileDetailsData = Record<string, ProfileValue>;

export function searchKey(value: string) {
  return value.normalize("NFC").toLocaleLowerCase("tr").normalize("NFD").replace(/\p{M}/gu, "").replace(/ı/g, "i").trim();
}

export function profileLabel(field: string, value: ProfileValue | undefined): string | undefined {
  if (!value || value === UNDISCLOSED) return undefined;
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value !== "string") return value.year ? `${value.name} (${value.year})` : value.name;
  if (field === "sign" && value === "automatic") return undefined;
  const options = CHOICES[field as keyof typeof CHOICES] as Record<string, string> | undefined;
  return options?.[value] ?? (field === "height" && /^\d+$/.test(value) ? `${value} cm` : value);
}

export function isTmdbPick(value: unknown, field: TmdbField): value is TmdbPick {
  if (!value || typeof value !== "object") return false;
  const pick = value as Partial<TmdbPick>;
  const prefix = field === "movie" ? "movie" : field === "series" ? "tv" : "person";
  return typeof pick.id === "string" && new RegExp(`^tmdb-${prefix}-[1-9][0-9]{0,9}$`).test(pick.id)
    && typeof pick.name === "string" && !!pick.name.trim() && pick.name.length <= 180
    && (pick.year === undefined || (Number.isInteger(pick.year) && pick.year >= 1870 && pick.year <= 2100));
}
