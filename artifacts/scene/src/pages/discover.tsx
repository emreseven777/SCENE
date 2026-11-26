import { byId, savedTmdbTitle, type Title } from "@/lib/catalog";
import { requireSupabase } from "@/lib/supabase";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import { motion } from "framer-motion";
import { Heart, X, Film, Clapperboard, Sparkles, ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { useStore, type Person } from "@/lib/store";
import { SwipeCard } from "@/components/swipe-card";
import { cinemaFit, GENDERS, GOALS, profileCinemaSignals, profileGenres, selectedTrait, sharedFavorites } from "@/lib/dating";
import { CHOICES, GENRES, INTERESTS, OCCUPATIONS } from "@/lib/profile-choices";
import { PROVINCES, isProvince } from "@/lib/provinces";
import { ProfileIdentity } from "@/components/profile-identity";
import { PersonPhoto } from "@/components/person-photo";
import { useDiscoveryFeed } from "@/lib/discovery-feed";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { MatchOverlay } from "@/components/match-overlay";
import { TitleDetail } from "@/components/title-detail";

type DiscoverySwipe = "left" | "right";

function DiscoverPortrait({ person, score, common }: { person: Person; score: number | null; common: number }) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const photos = [...new Set([person.avatar_path, ...person.avatar_paths].filter((path): path is string => !!path))];
  const active = Math.min(photoIndex, Math.max(0, photos.length - 1));

  return <div className="relative h-[clamp(23rem,62svh,38rem)] overflow-hidden rounded-t-[1.45rem] bg-muted lg:h-[36rem]"
    data-testid="discover-portrait">
    <PersonPhoto id={person.id} name={person.name} avatarPath={photos[active] ?? null}
      className="absolute inset-0 size-full" textClassName="text-8xl" />
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[51%] bg-linear-to-t from-black via-black/70 to-transparent" />
    <div className="pointer-events-none absolute inset-x-3 top-3">
      <span className="inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-full border border-violet/60 bg-[#190722]/90 px-3 py-2 text-xs font-bold text-white shadow-sm sm:text-sm">
        <Sparkles size={16} className="shrink-0 text-fuchsia-300" aria-hidden="true" />
        {score !== null && <span>%{score} Uyum ·</span>}
        <span><span data-testid="text-common-count">{common}</span> Ortak Favori</span>
      </span>
    </div>
    {photos.length > 1 && <>
      <button type="button" aria-label="Önceki fotoğraf" data-swipe-tap disabled={active === 0} onClick={() => setPhotoIndex(active - 1)}
        className="group absolute inset-y-16 bottom-28 left-0 flex w-1/3 items-center justify-start pl-2 text-white focus-visible:outline-white disabled:invisible">
        <ChevronLeft className="rounded-full bg-black/70 p-2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" size={44} />
      </button>
      <button type="button" aria-label="Sonraki fotoğraf" data-swipe-tap disabled={active === photos.length - 1} onClick={() => setPhotoIndex(active + 1)}
        className="group absolute inset-y-16 bottom-28 right-0 flex w-1/3 items-center justify-end pr-2 text-white focus-visible:outline-white disabled:invisible">
        <ChevronRight className="rounded-full bg-black/70 p-2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" size={44} />
      </button>
    </>}
    <div className="pointer-events-none absolute inset-x-0 bottom-16 min-w-0 px-4 drop-shadow-md sm:px-5">
      <ProfileIdentity person={person} size="text-[clamp(2.1rem,9vw,3.25rem)]" cityClassName="text-base font-bold" />
    </div>
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 flex h-14 items-center justify-between gap-1 bg-linear-to-r from-rose-900/50 via-black/20 to-emerald-900/55 px-3 text-white sm:px-4">
      <span className="flex items-center gap-1.5"><X size={26} className="shrink-0" /><span className="text-[11px] leading-tight">Sola kaydır<strong className="block text-sm">Geç</strong></span></span>
      <span className="flex items-center gap-1">{photos.map((path, index) => <span key={path} className={`h-1 rounded-full ${index === active ? "w-3.5 bg-white" : "w-1 bg-white/55"}`} />)}</span>
      <span className="flex items-center gap-1.5 text-right"><span className="text-[11px] leading-tight">Sağa kaydır<strong className="block text-sm">Beğen</strong></span><Heart size={24} className="shrink-0" /></span>
    </div>
  </div>;
}

const emptyFilters = { city: "", gender: "", goal: "", from: "", to: "", fit: "", heightFrom: "", heightTo: "", education: "", smoking: "", alcohol: "", relationship: "", children: "", sport: "", genre: "", shared: "", photosOnly: "", interest: "", occupation: "" };

export default function Discover() {
  const store = useStore();
  const movieMatch = new URLSearchParams(useSearch()).get("mod") === "movie-match";
  const { toast } = useToast();
  const [matchPid, setMatchPid] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<Title | null>(null);
  const [filter, setFilter] = useState(emptyFilters);
  const [photoComment, setPhotoComment] = useState<{ person: string; value: string }>();
  const [highlighted, setHighlighted] = useState<string>();
  const feed = useDiscoveryFeed(store.me?.id);
  const serverFeed = feed.data?.pages[0] != null;
  const candidates = useMemo(() => serverFeed
    ? [...new Map(feed.data!.pages.flatMap((page) => page?.profiles ?? []).map((person) => [person.id, person])).values()]
    : feed.data?.pages[0] === null ? store.people : [],
    [serverFeed, feed.data, store.people]);
  const fetchedTitles = useMemo<Record<string, Record<string, Title>>>(() =>
    Object.assign({}, ...(feed.data?.pages.map((page) => page?.titles ?? {}) ?? [])), [feed.data]);
  const titleFor = (id: string, owner: string) => fetchedTitles[owner]?.[id] ?? store.titleById(id, owner);


  const allows = (preference: string | null | undefined, gender: string | null) =>
    !preference || preference === "everyone" || (preference === "women" && gender === "woman") || (preference === "men" && gender === "man");
  const mine = store.me?.favorites ?? [];
  const ownDetails = store.me?.discovery_details;
  const fits = useMemo(() => {
    const own = profileCinemaSignals(mine, ownDetails, (id) => store.titleById(id));
    return new Map(candidates.map((person) => {
      const other = profileCinemaSignals(person.favorites, person.discovery_details, (id) => titleFor(id,person.id));
      return [person.id, cinemaFit(own, other)];
    }));
  }, [mine, ownDetails, candidates, store.titleById, fetchedTitles]);
  const cast = useMemo(() => candidates.filter((p) => p.onboarded && p.age !== null && isProvince(p.city) && !p.discovery_hidden && p.gender && p.looking_for && p.dating_goal
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
    && (!filter.shared || sharedFavorites(mine, p.favorites).length >= Number(filter.shared))
    && (!filter.photosOnly || !!(p.avatar_path || p.avatar_paths.length))
    && (!movieMatch || (fits.get(p.id)?.score ?? 0) > 0)
    && (!filter.fit || (fits.get(p.id)?.score ?? -1) >= Number(filter.fit))),
    [candidates, store.me?.looking_for, store.me?.gender, filter, fits, movieMatch, mine]);
  const deck = useMemo(
    () => cast.filter((p) => !store.liked.includes(p.id) && !store.passed.includes(p.id) && !store.matches[p.id])
      .map((p) => ({ p, c: sharedFavorites(mine, p.favorites), score: fits.get(p.id)?.score ?? null,
        sharedExpectation: !!selectedTrait(ownDetails,"relationship") &&
          selectedTrait(ownDetails,"relationship") === selectedTrait(p.discovery_details,"relationship") }))
      .sort((a, b) => serverFeed ? 0 : (b.score ?? -1) - (a.score ?? -1) || Number(b.sharedExpectation) - Number(a.sharedExpectation) || b.c.length - a.c.length || a.p.id.localeCompare(b.p.id)),
    [cast, store.liked, store.passed, store.matches, mine, fits, ownDetails, serverFeed],
  );
  const current = deck.find(({ p }) => p.id === highlighted) ?? deck[0];
  const { hasNextPage, isFetchingNextPage, isError, fetchNextPage } = feed;
  useEffect(() => {
    if (!current && hasNextPage && !isFetchingNextPage && !isError) void fetchNextPage();
  }, [current, hasNextPage, isFetchingNextPage, isError, fetchNextPage]);

  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format();
  const dailyRank = (id: string) => {
    let value = 2166136261;
    for (const char of `${store.me?.id ?? ""}:${day}:${id}`) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
    return value >>> 0;
  };
  const dailySuggestions = serverFeed ? deck.filter(({ c }) => c.length > 0)
    .sort((a,b) => b.c.length-a.c.length || dailyRank(a.p.id)-dailyRank(b.p.id)).slice(0, 3) : [];
  const cinemaSoulmate = serverFeed ? deck.filter(({ score, c }) => score !== null && score > 0 && c.length > 0)
    .reduce<(typeof deck)[number] | undefined>((best, candidate) =>
      !best || candidate.score! > best.score! ? candidate : best, undefined) : undefined;
  const showCandidate = (id: string) => {
    setHighlighted(id);
    document.getElementById("discover-deck")?.scrollIntoView({block:"start"});
  };

  const commonGenres = current ? fits.get(current.p.id)?.commonGenres ?? [] : [];
  const [dailyFilms, setDailyFilms] = useState<{ title: Title; count: number }[]>([]);
  const [dailyError, setDailyError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
        const part = (type: string) => day.find((p) => p.type === type)?.value;
        const start = new Date(`${part("year")}-${part("month")}-${part("day")}T00:00:00+03:00`);
        const end = new Date(start.getTime() + 86400000);
        const counts = new Map<string, { title: Title; users: Set<string> }>();
        for (let offset = 0; ; offset += 500) {
          const { data, error } = await requireSupabase().from("favorites").select("user_id,title_id,title_metadata").gte("created_at", start.toISOString()).lt("created_at", end.toISOString()).order("user_id").order("title_id").range(offset, offset + 499);
          if (error) throw error;
          for (const row of data ?? []) {
            const title = byId(row.title_id) ?? savedTmdbTitle(row.title_id, row.title_metadata);
            if (!title || title.type !== "film") continue;
            const key = title.tmdbId ? `tmdb-movie-${title.tmdbId}` : title.id;
            const entry = counts.get(key) ?? { title, users: new Set<string>() };
            entry.users.add(row.user_id);
            counts.set(key, entry);
          }
          if (!data || data.length < 500) break;
        }
        if (!cancelled) {
          setDailyFilms([...counts.values()].map(({title, users}) => ({title, count: users.size})).sort((a,b) => b.count-a.count || a.title.id.localeCompare(b.title.id)).slice(0,3));
          setDailyError(false);
        }
      } catch { if (!cancelled) { setDailyFilms([]); setDailyError(true); } }
    };
    void load();
    const timer = window.setInterval(() => void load(), 60000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [store.me?.id]);
  const activeFilters = Object.values(filter).filter(Boolean).length;
  const [busy, setBusy] = useState(false);

  const swipe = async (p: Person, direction: DiscoverySwipe, photo?: { path: string; comment: string }) => {
    if (busy) return;
    setBusy(true);
    try {
      if (direction === "left") {
        await store.pass(p.id);
        return;
      }
      const mutual = await store.like(p.id, "like", p, fetchedTitles[p.id], photo);
      if (mutual !== null) setPhotoComment(undefined);
      if (mutual) setMatchPid(p.id);
      else if (mutual === false) {
        toast({ title: `${p.name} beğenildi` });
      }
    } finally { setBusy(false); }
  };

  return (
    <div className="scene-page min-w-0 space-y-3 pt-3 sm:space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="scene-title text-[clamp(2rem,7vw,3rem)]">{movieMatch ? "Sinema eşleşmesi" : "Keşfet"}</h1>
        <div className="flex min-w-0 flex-wrap gap-1.5">
          <Button asChild variant="secondary" size="sm"><Link href={movieMatch ? "/" : "/?mod=movie-match"}><Sparkles />{movieMatch ? "Keşfet’e dön" : "Sinema eşleşmesi"}</Link></Button>
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
          ] as const).map(([key, label, options]) => <label className="min-w-0 font-bold" key={key}>{label}<select className="mt-1 w-full min-w-0 rounded-lg border bg-card p-2 text-base font-normal sm:text-sm" value={filter[key]} onChange={(e) => setFilter({ ...filter, [key]: e.target.value })}><option value="">Tümü</option>{Object.entries(options).map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></label>)}
          {([["from", "En düşük yaş", 18], ["to", "En yüksek yaş", 18], ["fit", "En düşük uyum (%)", 0]] as const).map(([key, label, min]) => <label className="min-w-0 font-bold" key={key}>{label}<input className="mt-1 w-full min-w-0 rounded-lg border bg-card p-2 text-base font-normal sm:text-sm" type="number" min={min} max={key === "fit" ? 100 : undefined} value={filter[key]} onChange={(e) => setFilter({ ...filter, [key]: e.target.value })} /></label>)}
          {([
            ["education","Eğitim",CHOICES.education], ["smoking","Sigara",CHOICES.smoking], ["alcohol","Alkol",CHOICES.alcohol],
            ["relationship","İlişki beklentisi",CHOICES.relationship], ["children","Çocuk",CHOICES.children], ["sport","Spor",CHOICES.sport],
            ["genre","Favori tür",Object.fromEntries(GENRES.map((genre) => [genre,genre]))],
            ["interest","İlgi alanı",Object.fromEntries(INTERESTS.map((name) => [name,name]))],
            ["occupation","Meslek",Object.fromEntries(OCCUPATIONS.map((name) => [name,name]))],
          ] as const).map(([key,label,options]) => <label className="min-w-0 font-bold" key={key}>{label}<select className="mt-1 w-full min-w-0 rounded-lg border bg-card p-2 text-base font-normal sm:text-sm"
            aria-label={label} value={filter[key]} onChange={(event) => setFilter({ ...filter,[key]:event.target.value })}>
            <option value="">Tümü</option>{Object.entries(options).map(([value,name]) => <option key={value} value={value}>{name}</option>)}
          </select></label>)}
          {([["heightFrom","En kısa boy"],["heightTo","En uzun boy"]] as const).map(([key,label]) => <label className="min-w-0 font-bold" key={key}>{label}<select className="mt-1 w-full min-w-0 rounded-lg border bg-card p-2 text-base font-normal sm:text-sm"
            aria-label={label} value={filter[key]} onChange={(event) => setFilter({ ...filter,[key]:event.target.value })}>
            <option value="">Tümü</option>{Array.from({ length:111 },(_,i) => i+130).map((height) => <option key={height} value={height}>{height} cm</option>)}
          </select></label>)}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <label className="flex min-h-11 items-center gap-2 font-bold"><input type="checkbox" checked={!!filter.shared}
            onChange={(event) => setFilter({ ...filter, shared: event.target.checked ? "1" : "" })} />Ortak favorisi olanlar</label>
          <label className="flex min-h-11 items-center gap-2 font-bold"><input type="checkbox" checked={!!filter.photosOnly}
            onChange={(event) => setFilter({ ...filter, photosOnly: event.target.checked ? "1" : "" })} />Fotoğrafı olanlar</label>
        </div>
        {filter.from && filter.to && Number(filter.from) > Number(filter.to) &&
          <p role="status" className="pb-2 text-sm text-destructive">En düşük yaş, en yüksek yaşı geçemez.</p>}
        {activeFilters > 0 && <Button size="sm" variant="ghost" onClick={() => setFilter(emptyFilters)}>Filtreleri temizle</Button>}
      </details>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        <div className="relative mx-auto w-full min-w-0 max-w-[28rem] lg:max-w-none"
          id="discover-deck" role="region" aria-label="Profil kartı" aria-describedby={current ? "discover-keyboard-help" : undefined}
          tabIndex={current ? 0 : undefined} onKeyDown={(event) => {
            if (!current || busy || event.currentTarget !== event.target || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
            event.preventDefault();
            void swipe(current.p, event.key === "ArrowLeft" ? "left" : "right");
          }}>
          {current ? (
              <motion.article key={current.p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ duration: .18 }} className="scene-panel relative min-w-0 overflow-hidden rounded-[1.6rem] border-2 border-violet/75" data-testid={`card-person-${current.p.id}`}>
                <p className="sr-only" id="discover-keyboard-help">Geçmek için sol ok, beğenmek için sağ ok tuşuna bas.</p>
                <div className="absolute inset-x-3 top-14 z-40 flex gap-2">
                  <button type="button" disabled={busy} onClick={() => void swipe(current.p, "left")} data-testid="button-pass"
                    className="sr-only focus:not-sr-only focus:rounded-full focus:bg-card focus:px-3 focus:py-2 focus:font-bold">Geç</button>
                  <button type="button" disabled={busy} onClick={() => void swipe(current.p, "right")} data-testid="button-like"
                    className="sr-only focus:not-sr-only focus:rounded-full focus:bg-card focus:px-3 focus:py-2 focus:font-bold">Beğen</button>
                </div>
                <SwipeCard horizontalOnly disabled={busy} labels={{ left: "Geç", right: "Beğen" }}
                  onSwipe={(direction) => direction === "up" ? Promise.resolve() : swipe(current.p, direction)}>
                  <DiscoverPortrait person={current.p} score={current.score} common={current.c.length} />
                </SwipeCard>
                <div className="space-y-2 p-2.5 sm:p-3">
                  {serverFeed && current.p.avatar_path && <details className="rounded-2xl border border-violet/30 bg-secondary/45 p-2.5">
                    <summary className="cursor-pointer text-sm font-semibold">Ana fotoğrafı yorumla ve beğen</summary>
                    <form className="mt-2 space-y-2" onSubmit={(event) => {
                      event.preventDefault();
                      const comment = photoComment?.person === current.p.id ? photoComment.value.trim() : "";
                      if (comment.length >= 2 && current.p.avatar_path) {
                        void swipe(current.p, "right", { path: current.p.avatar_path, comment });
                      }
                    }}>
                      <label className="block text-sm">
                        Fotoğrafa yorum
                        <textarea className="mt-1 w-full rounded-xl border bg-card px-3 py-2 text-base"
                          value={photoComment?.person === current.p.id ? photoComment.value : ""} required maxLength={240}
                          onChange={(event) => setPhotoComment({person: current.p.id, value: event.target.value})} />
                      </label>
                      <Button size="sm" disabled={busy || photoComment?.person !== current.p.id || photoComment.value.trim().length < 2}>
                        Yorumlu beğeni gönder
                      </Button>
                    </form>
                  </details>}
                  {(commonGenres.length > 0 || current.sharedExpectation) && (
                    <section className="flex items-center gap-2.5 rounded-2xl border border-violet/30 bg-secondary/45 p-2.5">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-violet/20 text-brand-ink"><Sparkles size={18} aria-hidden="true" /></span>
                      <div className="min-w-0 text-sm">
                        <h2 className="font-bold leading-tight">Neden önerildi?</h2>
                        {commonGenres.length > 0 && <p>Ortak türler: {commonGenres.slice(0, 3).join(", ")}</p>}
                        {current.sharedExpectation && <p>İlişki beklentiniz aynı.</p>}
                      </div>
                    </section>
                  )}
                  <details open className="group rounded-2xl border border-violet/30 bg-secondary/45 p-2.5">
                    <summary className="flex cursor-pointer list-none items-center gap-2.5 font-bold [&::-webkit-details-marker]:hidden">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-violet/20 text-brand-ink"><Clapperboard size={18} aria-hidden="true" /></span>
                      Ortak favoriler ({current.c.length})
                      <ChevronRight size={18} aria-hidden="true" className="ml-auto shrink-0 motion-safe:transition-transform group-open:rotate-90" />
                    </summary>
                    {current.c.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Henüz ortak favori yok.</p> :
                      <div data-testid="common-posters" aria-label="Ortak film ve dizi afişleri" role="region" tabIndex={0}
                        className="mt-2 flex w-full min-w-0 snap-x gap-2 overflow-x-auto overscroll-x-contain p-0.5 scrollbar-none">
                        {[...new Set(current.c)].map((id) => {
                          const title = titleFor(id, current.p.id);
                          return title && <button key={id} type="button" onClick={() => setSelectedTitle(title)} data-testid={`button-title-${id}`}
                            className="relative aspect-[4/5] w-[clamp(3rem,15vw,5rem)] shrink-0 snap-start overflow-hidden rounded-xl border border-violet/40 bg-card focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                            {title.poster ? <img src={title.poster} alt={title.title} loading="lazy" className="size-full object-cover" />
                              : <span className="line-clamp-4 px-1 text-xs font-semibold">{title.title}</span>}
                          </button>;
                        })}
                      </div>}
                  </details>
                  <section className="rounded-2xl border border-violet/30 bg-secondary/45 p-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-violet/20 text-brand-ink"><Heart size={18} aria-hidden="true" /></span>
                      <h2 className="font-bold">Uyum oranı</h2>
                      {current.score !== null && <span className="ml-auto font-bold">%{current.score}</span>}
                    </div>
                    {current.score !== null ? <div role="meter" aria-label="Uyum oranı" aria-valuemin={0} aria-valuemax={100} aria-valuenow={current.score}
                      className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-linear-to-r from-fuchsia-500 to-violet" style={{ width: `${current.score}%` }} />
                    </div> : <p className="mt-2 text-sm text-muted-foreground">Uyumu hesaplamak için daha fazla favori gerekli.</p>}
                  </section>
                </div>
              </motion.article>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="scene-panel grid min-h-52 place-items-center p-5 text-center">
                <div>
                  <Sparkles className="mx-auto mb-3 text-brand-ink" /><h2 className="font-display text-2xl font-bold">Şimdilik bu kadar</h2>
                  <p className="mt-3 text-sm text-muted-foreground" role="status">
                    {feed.isError ? "Profiller yüklenemedi." : feed.isPending || isFetchingNextPage || hasNextPage
                      ? "Profiller yükleniyor…" : "Şimdilik herkesi gördün, yakında yenilenecek."}
                  </p>
                  {feed.isError && <Button className="mt-3" size="sm" onClick={() => void (hasNextPage ? fetchNextPage() : feed.refetch())}>Tekrar dene</Button>}
                </div>
              </motion.div>
            )}
        </div>

        <div className="min-w-0 space-y-4">
          {cinemaSoulmate && <section className="scene-panel min-w-0 p-3">
            <h2 className="mb-2 flex items-center gap-2 font-semibold"><Sparkles size={17} aria-hidden="true" />Sinema ruh eşin</h2>
            <p className="mb-2 text-xs text-muted-foreground">Yüklenen adaylardaki en yüksek sinema uyumu</p>
            <Button variant="secondary" onClick={() => showCandidate(cinemaSoulmate.p.id)} className="h-auto min-h-11 w-full whitespace-normal">
              {cinemaSoulmate.p.name} · %{cinemaSoulmate.score}
            </Button>
          </section>}
          {dailySuggestions.length > 0 && <section className="scene-panel min-w-0 p-3">
            <h2 className="mb-2 font-semibold">Bugünün sana özel önerileri</h2>
            <ul className="space-y-2">
              {dailySuggestions.map(({p, c}) => <li key={p.id}>
                <button type="button" onClick={() => showCandidate(p.id)}
                  className="flex min-h-11 w-full items-center gap-2 rounded-xl bg-secondary/50 px-2 text-left">
                  <span className="min-w-0 grow break-words font-semibold">{p.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{c.length} ortak favori</span>
                </button>
              </li>)}
            </ul>
          </section>}
          <section className="scene-panel min-w-0 p-3">
            <h2 className="mb-2 font-semibold">Günün en çok beğenilen filmleri</h2>
            <p className="mb-3 text-xs text-muted-foreground">Bugün favorilere en çok eklenen filmler</p>
            {dailyFilms.length ? <div className="grid grid-cols-3 gap-2">
              {dailyFilms.map(({title}) => <button key={title.id} type="button" onClick={() => setSelectedTitle(title)} className="min-w-0 text-left">
                <div className="aspect-[2/3] overflow-hidden rounded-xl bg-secondary">{title.poster ? <img src={title.poster} alt={title.title} loading="lazy" className="size-full object-cover" /> : <Film className="mx-auto mt-4" />}</div>
                <div className="mt-1 text-sm font-semibold break-words">{title.title}</div>

              </button>)}
            </div> : <p className="text-sm text-muted-foreground">{dailyError ? "Günlük liste şu anda yüklenemiyor." : "Bugün henüz listelenecek film yok."}</p>}
          </section>
        </div>
      </div>

      <MatchOverlay pid={matchPid} onClose={() => setMatchPid(null)} />
      <TitleDetail title={selectedTitle} onClose={() => setSelectedTitle(null)} />
    </div>
  );
}
