import type { Title } from "@/lib/catalog";
import { useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import { motion } from "framer-motion";
import { Heart, RotateCcw, Star, X, Film, Sparkles, ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { useStore, type Person } from "@/lib/store";
import { SwipeCard, type SwipeDirection } from "@/components/swipe-card";
import { cinemaFit, GENDERS, GOALS, profileCinemaSignals, profileGenres, selectedTrait } from "@/lib/dating";
import { CHOICES, GENRES, INTERESTS, OCCUPATIONS } from "@/lib/profile-choices";
import { PROVINCES, isProvince } from "@/lib/provinces";
import { ProfileIdentity } from "@/components/profile-identity";
import { PersonPhoto } from "@/components/person-photo";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { MatchOverlay } from "@/components/match-overlay";
import { TitleDetail } from "@/components/title-detail";

function DiscoverPortrait({ person, score, common }: { person: Person; score: number | null; common: number }) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const photos = [...new Set([person.avatar_path, ...person.avatar_paths].filter((path): path is string => !!path))];
  const active = Math.min(photoIndex, Math.max(0, photos.length - 1));

  return <div className="relative h-[clamp(17rem,calc(100svh-22rem),30rem)] overflow-hidden rounded-t-3xl lg:aspect-[3/4] lg:h-auto lg:max-h-[34rem]"
    data-testid="discover-portrait">
    <PersonPhoto id={person.id} name={person.name} avatarPath={photos[active] ?? null}
      className="absolute inset-0 size-full" textClassName="text-8xl" />
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-linear-to-t from-black/70 to-transparent" />
    <div className="absolute inset-x-3 top-3 flex min-w-0 flex-wrap items-center gap-2">
      {photos.length > 1 && <div className="flex w-full gap-1" role="group" aria-label="Profil fotoğrafını seç">
        {photos.map((path, index) => <button key={path} type="button" aria-label={`Fotoğraf ${index + 1}`} aria-pressed={active === index}
          onClick={() => setPhotoIndex(index)} className="flex h-8 min-w-0 flex-1 items-center rounded-sm focus-visible:outline-white">
          <span className={`h-1 w-full rounded-full shadow-sm shadow-black/45 ${active === index ? "bg-white" : "bg-white/45"}`} />
        </button>)}
      </div>}
      <span className="flex max-w-full items-center gap-1.5 break-words rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-brand-ink">
        <Sparkles size={14} className="shrink-0" />{score !== null && <span>%{score} uyum</span>}
        <span><span data-testid="text-common-count">{common}</span> ortak favori</span>
      </span>
    </div>
    {photos.length > 1 && <>
      <button type="button" aria-label="Önceki fotoğraf" disabled={active === 0} onClick={() => setPhotoIndex(active - 1)}
        className="absolute left-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/65 text-white disabled:invisible"><ChevronLeft /></button>
      <button type="button" aria-label="Sonraki fotoğraf" disabled={active === photos.length - 1} onClick={() => setPhotoIndex(active + 1)}
        className="absolute right-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/65 text-white disabled:invisible"><ChevronRight /></button>
    </>}
    <Link href={`/kullanici/${person.id}`} data-testid="link-current-profile"
      className="absolute inset-x-0 bottom-0 block min-w-0 px-4 pb-5 pt-6 drop-shadow-sm sm:px-5">
      <ProfileIdentity person={person} size="text-[clamp(2rem,8vw,2.75rem)]" />
    </Link>
  </div>;
}

const emptyFilters = { city: "", gender: "", goal: "", from: "", to: "", fit: "", heightFrom: "", heightTo: "", education: "", smoking: "", alcohol: "", relationship: "", children: "", sport: "", genre: "", interest: "", occupation: "" };

export default function Discover() {
  const store = useStore();
  const movieMatch = new URLSearchParams(useSearch()).get("mod") === "movie-match";
  const { toast } = useToast();
  const [matchPid, setMatchPid] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<Title | null>(null);
  const [last, setLast] = useState<{ id: string; direction: SwipeDirection } | null>(null);
  const [visibleCount, setVisibleCount] = useState(24);
  const [filter, setFilter] = useState(emptyFilters);

  const allows = (preference: string | null | undefined, gender: string | null) =>
    !preference || preference === "everyone" || (preference === "women" && gender === "woman") || (preference === "men" && gender === "man");
  const mine = store.me?.favorites ?? [];
  const ownDetails = store.me?.discovery_details;
  const fits = useMemo(() => {
    const own = profileCinemaSignals(mine, ownDetails, (id) => store.titleById(id));
    return new Map(store.people.map((person) => {
      const other = profileCinemaSignals(person.favorites, person.discovery_details, (id) => store.titleById(id,person.id));
      return [person.id, cinemaFit(own.titles, other.titles, own.genres, other.genres)];
    }));
  }, [mine, ownDetails, store.people, store.titleById]);
  const cast = useMemo(() => store.people.filter((p) => p.onboarded && p.age !== null && isProvince(p.city) && !p.discovery_hidden && p.gender && p.looking_for && p.dating_goal
    && allows(store.me?.looking_for, p.gender) && allows(p.looking_for, store.me?.gender ?? null)
    && (!filter.city || p.city === filter.city) && (!filter.gender || p.gender === filter.gender)
    && (!filter.goal || p.dating_goal === filter.goal) && p.age >= Number(filter.from || 18)
    && (!filter.to || p.age <= Number(filter.to))
    && (!filter.occupation || selectedTrait(p.discovery_details,"occupation") === filter.occupation)
    && (!filter.interest || (Array.isArray(p.discovery_details?.interests) && p.discovery_details.interests.includes(filter.interest)))
    && (!filter.genre || profileGenres(p.discovery_details).includes(filter.genre))
    && (!filter.heightFrom || Number(selectedTrait(p.discovery_details,"height")) >= Number(filter.heightFrom))
    && (!filter.heightTo || (Number(selectedTrait(p.discovery_details,"height")) >= 130 && Number(selectedTrait(p.discovery_details,"height")) <= Number(filter.heightTo)))
    && Object.keys(CHOICES).every((field) => {
      const wanted = filter[field as keyof typeof CHOICES];
      return !wanted || selectedTrait(p.discovery_details,field) === wanted;
    })
    && (!movieMatch || (fits.get(p.id) ?? 0) > 0)
    && (!filter.fit || (fits.get(p.id) ?? -1) >= Number(filter.fit))),
    [store.people, store.me?.looking_for, store.me?.gender, filter, fits, movieMatch]);
  const deck = useMemo(
    () => cast.filter((p) => !store.liked.includes(p.id) && !store.passed.includes(p.id) && !store.matches[p.id])
      .map((p) => ({ p, c: p.favorites.filter((f) => mine.includes(f)), score: fits.get(p.id) ?? null,
        sharedExpectation: !!selectedTrait(ownDetails,"relationship") &&
          selectedTrait(ownDetails,"relationship") === selectedTrait(p.discovery_details,"relationship") }))
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || Number(b.sharedExpectation) - Number(a.sharedExpectation) || b.c.length - a.c.length || a.p.id.localeCompare(b.p.id)),
    [cast, store.liked, store.passed, store.matches, mine, fits, ownDetails],
  );
  const current = deck[0];
  const calendarDay = new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric" }).format();
  const eligible = movieMatch ? [] : deck.slice(1).filter((item) => (item.score ?? 0) > 0).slice(0, 9);
  const daily = Array.from({ length: Math.min(3, eligible.length) },
    (_, index) => eligible[(Number(calendarDay) * 3 + index) % eligible.length]);
  const dailyIds = new Set(daily.map(({ p }) => p.id));
  const members = cast.filter(({ id }) => id !== current?.p.id && !dailyIds.has(id)
    && (!store.passed.includes(id) || !!store.matches[id]));
  const activeFilters = Object.values(filter).filter(Boolean).length;
  const [busy, setBusy] = useState(false);

  const swipe = async (p: Person, direction: SwipeDirection) => {
    if (busy) return;
    setBusy(true);
    try {
      if (direction === "left") {
        if (await store.pass(p.id)) setLast({ id: p.id, direction });
        return;
      }
      const mutual = await store.like(p.id, direction === "up" ? "super" : "like");
      if (mutual) { setLast(null); setMatchPid(p.id); }
      else if (mutual === false) {
        setLast({ id: p.id, direction });
        toast({ title: direction === "up" ? "Süper beğeni gönderildi" : `${p.name} beğenildi` });
      }
    } finally { setBusy(false); }
  };

  const undo = async () => {
    if (!last || busy || store.matches[last.id]) return;
    setBusy(true);
    try {
      const restored = await store.undoSwipe(last.id, last.direction === "left");
      if (restored) setLast(null);
    } finally { setBusy(false); }
  };

  return (
    <div className="scene-page min-w-0 space-y-3 pt-3 sm:space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="scene-title text-[clamp(2rem,7vw,3rem)]">{movieMatch ? "Movie Match" : "Keşfet"}</h1>
        <div className="flex min-w-0 flex-wrap gap-1.5">
          <Button asChild variant="secondary" size="sm"><Link href={movieMatch ? "/" : "/?mod=movie-match"}><Sparkles />{movieMatch ? "Keşfet’e dön" : "Movie Match"}</Link></Button>
          <Button asChild variant="ghost" size="icon"><Link href="/arama" aria-label="Favori yapımlarını ekle"><Film /></Link></Button>
        </div>
      </header>

      <details className="scene-panel group min-w-0 px-3 py-2 sm:px-4">
        <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 font-semibold [&::-webkit-details-marker]:hidden">
          <SlidersHorizontal size={16} /> Keşfet filtreleri
          {activeFilters > 0 && <span className="rounded-full bg-secondary px-2 text-xs text-brand-ink">{activeFilters}</span>}
          <ChevronDown size={17} className="ml-auto transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-2 pb-2 text-sm sm:grid-cols-3">
          {([
            ["city", "İl", Object.fromEntries(PROVINCES.map((name) => [name, name]))],
            ["gender", "Cinsiyet", GENDERS], ["goal", "Tanışma amacı", GOALS],
          ] as const).map(([key, label, options]) => <label className="min-w-0" key={key}>{label}<select className="mt-1 w-full min-w-0 rounded-lg border bg-card p-2 text-base sm:text-sm" value={filter[key]} onChange={(e) => setFilter({ ...filter, [key]: e.target.value })}><option value="">Tümü</option>{Object.entries(options).map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></label>)}
          {([["from", "En düşük yaş", 18], ["to", "En yüksek yaş", 18], ["fit", "En düşük uyum (%)", 0]] as const).map(([key, label, min]) => <label className="min-w-0" key={key}>{label}<input className="mt-1 w-full min-w-0 rounded-lg border bg-card p-2 text-base sm:text-sm" type="number" min={min} max={key === "fit" ? 100 : undefined} value={filter[key]} onChange={(e) => setFilter({ ...filter, [key]: e.target.value })} /></label>)}
          {([
            ["education","Eğitim",CHOICES.education], ["smoking","Sigara",CHOICES.smoking], ["alcohol","Alkol",CHOICES.alcohol],
            ["relationship","İlişki beklentisi",CHOICES.relationship], ["children","Çocuk",CHOICES.children], ["sport","Spor",CHOICES.sport],
            ["genre","Favori tür",Object.fromEntries(GENRES.map((genre) => [genre,genre]))],
            ["interest","İlgi alanı",Object.fromEntries(INTERESTS.map((name) => [name,name]))],
            ["occupation","Meslek",Object.fromEntries(OCCUPATIONS.map((name) => [name,name]))],
          ] as const).map(([key,label,options]) => <label className="min-w-0" key={key}>{label}<select className="mt-1 w-full min-w-0 rounded-lg border bg-card p-2 text-base sm:text-sm"
            aria-label={label} value={filter[key]} onChange={(event) => setFilter({ ...filter,[key]:event.target.value })}>
            <option value="">Tümü</option>{Object.entries(options).map(([value,name]) => <option key={value} value={value}>{name}</option>)}
          </select></label>)}
          {([["heightFrom","En kısa boy"],["heightTo","En uzun boy"]] as const).map(([key,label]) => <label className="min-w-0" key={key}>{label}<select className="mt-1 w-full min-w-0 rounded-lg border bg-card p-2 text-base sm:text-sm"
            aria-label={label} value={filter[key]} onChange={(event) => setFilter({ ...filter,[key]:event.target.value })}>
            <option value="">Tümü</option>{Array.from({ length:111 },(_,i) => i+130).map((height) => <option key={height} value={height}>{height} cm</option>)}
          </select></label>)}
        </div>
        {activeFilters > 0 && <Button size="sm" variant="ghost" onClick={() => setFilter(emptyFilters)}>Filtreleri temizle</Button>}
      </details>
      {last && !store.matches[last.id] && <Button size="sm" variant="secondary" disabled={busy} onClick={() => void undo()}><RotateCcw /> Son kaydırmayı geri al</Button>}
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        <div className="relative mx-auto w-full min-w-0 max-w-[28rem] lg:max-w-none">
          {current ? (
              <article className="scene-panel relative min-w-0" data-testid={`card-person-${current.p.id}`}>
                <SwipeCard key={current.p.id} disabled={busy} labels={{ left: "Geç", right: "Beğen", up: "Süper beğeni" }}
                  onSwipe={(direction) => swipe(current.p, direction)} next={deck[1] && <PersonPhoto id={deck[1].p.id} name={deck[1].p.name} avatarPath={deck[1].p.avatar_path} className="h-full" />}>
                  <DiscoverPortrait key={current.p.id} person={current.p} score={current.score} common={current.c.length} />
                </SwipeCard>
                <div className="min-w-0 px-3 pb-3 sm:px-4">
                  <div className="mb-3 flex items-center justify-center gap-3 sm:gap-5">
                    <button type="button" onClick={() => void swipe(current.p, "left")} disabled={busy} aria-label="Geç" data-testid="button-pass" className="grid size-16 shrink-0 place-items-center rounded-full border bg-card text-brand-ink transition hover:bg-secondary active:scale-95 disabled:opacity-50"><X size={30} /></button>
                    <motion.button type="button" whileTap={{ scale: 0.85 }} onClick={() => void swipe(current.p, "right")} disabled={busy} aria-label="Beğen" data-testid="button-like" className="scene-gradient grid size-[4.5rem] shrink-0 place-items-center rounded-full text-primary-foreground shadow-md disabled:opacity-50"><Heart size={32} fill="currentColor" /></motion.button>
                    <button type="button" onClick={() => void swipe(current.p, "up")} disabled={busy} aria-label="Süper beğeni" className="grid size-16 shrink-0 place-items-center rounded-full border bg-secondary text-brand-ink transition hover:bg-muted active:scale-95 disabled:opacity-50"><Star size={28} /></button>
                  </div>
                  <div className="mb-2 text-xs font-semibold text-muted-foreground">{current.c.length ? "Ortak favoriler" : "Henüz ortak favori yok"}</div>
                  <div data-testid="common-posters" aria-label="Ortak film ve dizi afişleri" role="region" tabIndex={0} className="flex w-full min-w-0 max-w-full snap-x gap-2 overflow-x-auto overscroll-x-contain px-1 py-1 scrollbar-none">
                    {[...new Set(current.c)].map((id) => {
                      const t = store.titleById(id, current.p.id); if (!t) return null;
                      return (
                        <button key={id} onClick={() => setSelectedTitle(t)} data-testid={`button-title-${id}`} className={`relative h-24 w-16 shrink-0 snap-start overflow-hidden rounded-lg ${current.c.includes(id) ? "ring-2 ring-primary" : "opacity-50"}`}>
                          {t.poster ? (
                            <img src={t.poster} alt={t.title} loading="lazy" className="h-full w-full object-cover" />
                          ) : (
                            <span className="line-clamp-4 px-1 text-xs font-semibold">{t.title}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                </div>
              </article>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="scene-panel grid min-h-52 place-items-center p-5 text-center">
                <div>
                  <Sparkles className="mx-auto mb-3 text-brand-ink" /><h2 className="font-display text-2xl font-bold">Şimdilik bu kadar</h2>
                  <p className="mt-3 text-sm text-muted-foreground">{cast.length === 0 ? "Henüz keşfedebileceğin bir profil yok." : "Şimdilik herkesi gördün. Yeni kullanıcılar kayıt oldukça burada görünecek."}</p>
                  {store.passed.length > 0 && <Button className="mt-5" onClick={() => void store.resetDeck()} data-testid="button-reset-deck"><RotateCcw size={16} className="mr-2" />Geçtiklerini yeniden gör</Button>}
                </div>
              </motion.div>
            )}
          {deck.length > 1 && <div className="mt-3 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Sırada {deck.length - 1} kişi daha</div>}
        </div>

        <div className="min-w-0 space-y-4">
          {daily.length > 0 && <section className="scene-panel min-w-0 p-3">
            <h2 className="mb-2 font-semibold">Bugünkü önerilerin</h2>
            <ul className="flex min-w-0 flex-wrap gap-2">{daily.map(({ p, score }) => <li className="min-w-0 max-w-full" key={p.id}>
              <Link className="block rounded-full bg-secondary px-3 py-2 text-sm font-semibold text-brand-ink [overflow-wrap:anywhere]" href={`/kullanici/${p.id}`}>{p.name} · %{score}</Link>
            </li>)}</ul>
          </section>}
        <section className="min-w-0">
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="font-display text-2xl font-bold tracking-tight">SCENE üyeleri</h3>
            <span className="font-mono text-[11px] text-muted-foreground">{members.length} kişi</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {members.length === 0 && <p className="col-span-full rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">Bu bölümde başka profil yok.</p>}
            {members.slice(0, visibleCount).map((p, i) => {
              const c = p.favorites.filter((id) => mine.includes(id)).length;
              const status = store.matches[p.id] ? "Eşleşme" : store.liked.includes(p.id) ? "Beğendin" : null;
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Link href={`/kullanici/${p.id}`} data-testid={`link-person-${p.id}`} className="group relative block aspect-[3/4] overflow-hidden rounded-3xl ring-1 ring-border">
                    <PersonPhoto id={p.id} name={p.name} avatarPath={p.avatar_path} className="h-full w-full transition duration-500 group-hover:scale-105" textClassName="text-6xl" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                    {status && <span className="absolute left-2 top-2 rounded-sm bg-card px-2 py-1 text-[10px] font-semibold text-brand-ink">{status}</span>}
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3">
                      <div className="min-w-0">
                        <ProfileIdentity person={p} as="div" size="text-xl sm:text-2xl" />
                      </div>
                      <div className="text-right"><div className="font-display text-2xl font-bold leading-none text-peach">{c}</div><div className="text-[9px] text-white">ortak</div></div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
          {visibleCount < members.length && <Button className="mt-4" variant="secondary" onClick={() => setVisibleCount((count) => count + 24)}>Daha fazla profil göster</Button>}
        </section>
        </div>
      </div>

      <MatchOverlay pid={matchPid} onClose={() => setMatchPid(null)} />
      <TitleDetail title={selectedTitle} onClose={() => setSelectedTitle(null)} />
    </div>
  );
}
