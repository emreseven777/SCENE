import type { Title } from "@/lib/catalog";
import { useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import { motion } from "framer-motion";
import { Heart, RotateCcw, Star, X, Quote, Film, Sparkles } from "lucide-react";
import { useStore, type Person } from "@/lib/store";
import { SwipeCard, type SwipeDirection } from "@/components/swipe-card";
import { cinemaFit, GENDERS, GOALS } from "@/lib/dating";
import { PROVINCES, isProvince } from "@/lib/provinces";
import { ProfileIdentity } from "@/components/profile-identity";
import { PersonPhoto } from "@/components/person-photo";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { MatchOverlay } from "@/components/match-overlay";
import { TitleDetail } from "@/components/title-detail";

export default function Discover() {
  const store = useStore();
  const movieMatch = new URLSearchParams(useSearch()).get("mod") === "movie-match";
  const { toast } = useToast();
  const [matchPid, setMatchPid] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<Title | null>(null);
  const [last, setLast] = useState<{ id: string; direction: SwipeDirection } | null>(null);
  const [visibleCount, setVisibleCount] = useState(24);
  const [filter, setFilter] = useState({ city: "", gender: "", goal: "", from: "", to: "", fit: "" });

  const allows = (preference: string | null | undefined, gender: string | null) =>
    !preference || preference === "everyone" || (preference === "women" && gender === "woman") || (preference === "men" && gender === "man");
  const mine = store.me?.favorites ?? [];
  const fits = useMemo(() => {
    const mineGenres = mine.flatMap((id) => store.titleById(id)?.genres ?? []);
    return new Map(store.people.map((person) => [
      person.id,
      cinemaFit(mine, person.favorites, mineGenres, person.favorites.flatMap((id) => store.titleById(id, person.id)?.genres ?? [])),
    ]));
  }, [mine, store.people, store.titleById]);
  const cast = useMemo(() => store.people.filter((p) => p.onboarded && p.age !== null && isProvince(p.city) && !p.discovery_hidden && p.gender && p.looking_for && p.dating_goal
    && allows(store.me?.looking_for, p.gender) && allows(p.looking_for, store.me?.gender ?? null)
    && (!filter.city || p.city === filter.city) && (!filter.gender || p.gender === filter.gender)
    && (!filter.goal || p.dating_goal === filter.goal) && p.age >= Number(filter.from || 18)
    && (!filter.to || p.age <= Number(filter.to))
    && (!movieMatch || (fits.get(p.id) ?? 0) > 0)
    && (!filter.fit || (fits.get(p.id) ?? -1) >= Number(filter.fit))),
    [store.people, store.me?.looking_for, store.me?.gender, filter, fits, movieMatch]);
  const deck = useMemo(
    () => cast.filter((p) => !store.liked.includes(p.id) && !store.passed.includes(p.id) && !store.matches[p.id])
      .map((p) => ({ p, c: p.favorites.filter((f) => mine.includes(f)), score: fits.get(p.id) ?? null }))
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || b.c.length - a.c.length || a.p.id.localeCompare(b.p.id)),
    [cast, store.liked, store.passed, store.matches, mine, fits],
  );
  const current = deck[0];
  const daily = movieMatch ? [] : deck.filter((item) => (item.score ?? 0) > 0).slice(0, 3);
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
    <div className="scene-page">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="scene-title">{movieMatch ? "Movie Match" : "Keşfet"}</h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">Seninle aynı filmleri ve dizileri seven insanlarla tanış.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary"><Link href={movieMatch ? "/" : "/?mod=movie-match"}><Sparkles />{movieMatch ? "Keşfet’e dön" : "Movie Match"}</Link></Button>
          <Button asChild variant="secondary"><Link href="/arama"><Film />Favori yapımlarını ekle</Link></Button>
        </div>
      </header>

      {daily.length > 0 && <section className="scene-panel mb-5 p-4">
        <h2 className="mb-2 font-semibold">Bugünkü önerilerin</h2>
        <ul className="flex flex-wrap gap-2">{daily.map(({ p, score }) => <li key={p.id}>
          <Button asChild variant="secondary" size="sm"><Link href={`/kullanici/${p.id}`}>{p.name} · %{score}</Link></Button>
        </li>)}</ul>
      </section>}
      <details className="scene-panel mb-5 p-4">
        <summary className="cursor-pointer font-semibold">Keşfet filtreleri</summary>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          {([
            ["city", "İl", Object.fromEntries(PROVINCES.map((name) => [name, name]))],
            ["gender", "Cinsiyet", GENDERS], ["goal", "Tanışma amacı", GOALS],
          ] as const).map(([key, label, options]) => <label key={key}>{label}<select className="mt-1 w-full rounded-lg border bg-card p-2" value={filter[key]} onChange={(e) => setFilter({ ...filter, [key]: e.target.value })}><option value="">Tümü</option>{Object.entries(options).map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></label>)}
          {([["from", "En düşük yaş", 18], ["to", "En yüksek yaş", 18], ["fit", "En düşük uyum (%)", 0]] as const).map(([key, label, min]) => <label key={key}>{label}<input className="mt-1 w-full rounded-lg border bg-card p-2" type="number" min={min} max={key === "fit" ? 100 : undefined} value={filter[key]} onChange={(e) => setFilter({ ...filter, [key]: e.target.value })} /></label>)}
        </div>
      </details>
      {last && !store.matches[last.id] && <Button className="mb-4" variant="secondary" disabled={busy} onClick={() => void undo()}><RotateCcw /> Son kaydırmayı geri al</Button>}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,440px)_1fr]">
        <div className="relative">
          {current ? (
              <article className="scene-panel relative" data-testid={`card-person-${current.p.id}`}>
                <SwipeCard key={current.p.id} disabled={busy} labels={{ left: "Geç", right: "Beğen", up: "Süper beğeni" }}
                  onSwipe={(direction) => swipe(current.p, direction)} next={deck[1] && <PersonPhoto id={deck[1].p.id} name={deck[1].p.name} avatarPath={deck[1].p.avatar_path} className="h-full" />}>
                <Link href={`/kullanici/${current.p.id}`} className="block overflow-hidden rounded-t-3xl" data-testid="link-current-profile">
                  <div className="relative h-[clamp(15rem,49dvh,25rem)] sm:aspect-square sm:h-auto lg:aspect-[5/6]">
                    <PersonPhoto id={current.p.id} name={current.p.name} avatarPath={current.p.avatar_path} className="h-full w-full" textClassName="text-[9rem] leading-none" />
                    <div className="vignette absolute inset-0" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#201d29]/95 via-[#201d29]/20 to-transparent" />
                    <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-card px-3 py-2 text-xs font-semibold text-brand-ink shadow-sm">
                      <Sparkles size={15} />{current.score !== null && <span>%{current.score} uyum · </span>}<span data-testid="text-common-count">{current.c.length}</span> ortak favori
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <ProfileIdentity person={current.p} />
                      {(current.p.scene || current.p.bio) && <p className="mt-3 line-clamp-3 flex gap-2 text-sm text-white/90"><Quote size={14} className="mt-0.5 shrink-0 text-peach" />{current.p.scene || current.p.bio}</p>}
                    </div>
                  </div>
                </Link>
                </SwipeCard>
                <div className="p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-center gap-2 sm:gap-4">
                    <button onClick={() => void swipe(current.p, "left")} disabled={busy} aria-label="Geç" data-testid="button-pass" className="grid h-14 w-14 place-items-center rounded-full bg-muted ring-1 ring-border transition hover:bg-border active:scale-90"><X size={24} /></button>
                    <motion.button whileTap={{ scale: 0.85 }} onClick={() => void swipe(current.p, "right")} disabled={busy} aria-label="Beğen" data-testid="button-like" className="grid h-16 w-16 place-items-center rounded-full scene-gradient text-primary-foreground shadow-[0_10px_22px_#ff536d55]"><Heart size={28} fill="currentColor" /></motion.button>
                    <Button variant="secondary" size="icon" aria-label="Süper beğeni" disabled={busy} onClick={() => void swipe(current.p, "up")}><Star /></Button>
                    <Link href={`/kullanici/${current.p.id}`} data-testid="link-view-profile" className="grid h-14 place-items-center rounded-full bg-muted px-5 text-sm ring-1 ring-border hover:bg-border">Profil</Link>
                  </div>
                  <div className="mb-2 text-xs font-semibold text-muted-foreground">{current.c.length ? "Ortak favoriler" : "Henüz ortak favori yok"}</div>
                  <div className="flex gap-2 overflow-x-auto scrollbar-none">
                    {(current.c.length ? current.c : current.p.favorites).map((id) => {
                      const t = store.titleById(id, current.p.id); if (!t) return null;
                      return (
                        <button key={id} onClick={() => setSelectedTitle(t)} data-testid={`button-title-${id}`} className={`relative h-24 w-16 shrink-0 overflow-hidden rounded-lg ${current.c.includes(id) ? "ring-2 ring-primary" : "opacity-50"}`}>
                          {t.poster ? (
                            <img src={t.poster} alt={t.title} className="h-full w-full object-cover" />
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
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="scene-panel grid min-h-72 place-items-center p-8 text-center">
                <div>
                  <Sparkles className="mx-auto mb-3 text-brand-ink" /><h2 className="font-display text-2xl font-bold">Şimdilik bu kadar</h2>
                  <p className="mt-3 text-sm text-muted-foreground">{cast.length === 0 ? "Henüz keşfedebileceğin bir profil yok." : "Şimdilik herkesi gördün. Yeni kullanıcılar kayıt oldukça burada görünecek."}</p>
                  {store.passed.length > 0 && <Button className="mt-5" onClick={() => void store.resetDeck()} data-testid="button-reset-deck"><RotateCcw size={16} className="mr-2" />Geçtiklerini yeniden gör</Button>}
                </div>
              </motion.div>
            )}
          {deck.length > 1 && <div className="mt-3 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Sırada {deck.length - 1} kişi daha</div>}
        </div>

        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="font-display text-2xl font-bold tracking-tight">SCENE üyeleri</h3>
            <span className="font-mono text-[11px] text-muted-foreground">{cast.length} kişi</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {cast.length === 0 && <p className="col-span-full rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">Kadro henüz boş. İlk kullanıcılardan birisin.</p>}
            {cast.slice(0, visibleCount).map((p, i) => {
              const c = p.favorites.filter((id) => mine.includes(id)).length;
              const status = store.matches[p.id] ? "Eşleşme" : store.liked.includes(p.id) ? "Beğendin" : null;
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Link href={`/kullanici/${p.id}`} data-testid={`link-person-${p.id}`} className="group relative block aspect-[3/4] overflow-hidden rounded-3xl ring-1 ring-border">
                    <PersonPhoto id={p.id} name={p.name} avatarPath={p.avatar_path} className="h-full w-full transition duration-500 group-hover:scale-105" textClassName="text-6xl" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                    {status && <span className="absolute left-2 top-2 rounded-sm bg-card px-2 py-1 text-[10px] font-semibold text-brand-ink">{status}</span>}
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3">
                      <div>
                        <ProfileIdentity person={p} as="div" size="text-xl sm:text-2xl" />
                      </div>
                      <div className="text-right"><div className="font-display text-2xl font-bold leading-none text-peach">{c}</div><div className="text-[9px] text-white">ortak</div></div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
          {visibleCount < cast.length && <Button className="mt-4" variant="secondary" onClick={() => setVisibleCount((count) => count + 24)}>Daha fazla profil göster</Button>}
        </section>
      </div>

      <MatchOverlay pid={matchPid} onClose={() => setMatchPid(null)} />
      <TitleDetail title={selectedTitle} onClose={() => setSelectedTitle(null)} />
    </div>
  );
}
