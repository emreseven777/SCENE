import type { Title } from "@/lib/catalog";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, RotateCcw, X, Quote, Film, Sparkles } from "lucide-react";
import { useStore, type Person } from "@/lib/store";
import { isProvince } from "@/lib/provinces";
import { ProfileIdentity } from "@/components/profile-identity";
import { PersonPhoto } from "@/components/person-photo";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { MatchOverlay } from "@/components/match-overlay";
import { TitleDetail } from "@/components/title-detail";

export default function Discover() {
  const store = useStore();
  const { toast } = useToast();
  const [matchPid, setMatchPid] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<Title | null>(null);
  const [dir, setDir] = useState(1);

  const mine = store.me?.favorites ?? [];
  const commonOf = (p: Person) => p.favorites.filter((f) => mine.includes(f));
  const cast = useMemo(() => store.people.filter((p) => p.onboarded && p.age !== null && isProvince(p.city)), [store.people]);
  const deck = useMemo(
    () => cast.filter((p) => !store.liked.includes(p.id) && !store.passed.includes(p.id) && !store.matches[p.id])
      .map((p) => ({ p, c: p.favorites.filter((f) => mine.includes(f)) }))
      .sort((a, b) => b.c.length - a.c.length),
    [cast, store.liked, store.passed, store.matches, mine],
  );
  const current = deck[0];
  const [busy, setBusy] = useState(false);

  const doLike = async (p: Person) => {
    if (busy) return;
    setBusy(true); setDir(1);
    const mutual = await store.like(p.id);
    setBusy(false);
    if (mutual) setTimeout(() => setMatchPid(p.id), 250);
    else if (mutual === false) toast({ title: `${p.name} beğenildi`, description: "O da seni beğenirse eşleşirsiniz." });
  };
  const doPass = (p: Person) => { setDir(-1); void store.pass(p.id); };

  return (
    <div className="scene-page">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="scene-title">Keşfet</h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">Seninle aynı filmleri ve dizileri seven insanlarla tanış.</p>
        </div>
        <Button asChild variant="secondary"><Link href="/arama"><Film />Favori yapımlarını ekle</Link></Button>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,440px)_1fr]">
        <div className="relative">
          <AnimatePresence mode="popLayout" custom={dir}>
            {current ? (
              <motion.article
                key={current.p.id}
                custom={dir}
                initial={{ opacity: 0, scale: 0.94, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                variants={{ out: (d: number) => ({ opacity: 0, x: d * 260, rotate: d * 10, transition: { duration: 0.35 } }) }}
                exit="out"
                transition={{ type: "spring", stiffness: 260, damping: 26 }}
                className="scene-panel relative overflow-hidden"
                data-testid={`card-person-${current.p.id}`}
              >
                <Link href={`/kullanici/${current.p.id}`} className="block" data-testid="link-current-profile">
                  <div className="relative h-[clamp(15rem,49dvh,25rem)] sm:aspect-square sm:h-auto lg:aspect-[5/6]">
                    <PersonPhoto id={current.p.id} name={current.p.name} avatarPath={current.p.avatar_path} className="h-full w-full" textClassName="text-[9rem] leading-none" />
                    <div className="vignette absolute inset-0" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#201d29]/95 via-[#201d29]/20 to-transparent" />
                    <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-card px-3 py-2 text-xs font-semibold text-brand-ink shadow-sm">
                      <Sparkles size={15} /><span data-testid="text-common-count">{current.c.length}</span> ortak favori
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <ProfileIdentity person={current.p} />
                      {(current.p.scene || current.p.bio) && <p className="mt-3 line-clamp-3 flex gap-2 text-sm text-white/90"><Quote size={14} className="mt-0.5 shrink-0 text-peach" />{current.p.scene || current.p.bio}</p>}
                    </div>
                  </div>
                </Link>
                <div className="p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-center gap-5">
                    <button onClick={() => doPass(current.p)} aria-label="Geç" data-testid="button-pass" className="grid h-14 w-14 place-items-center rounded-full bg-muted ring-1 ring-border transition hover:bg-border active:scale-90"><X size={24} /></button>
                    <motion.button whileTap={{ scale: 0.85 }} onClick={() => void doLike(current.p)} disabled={busy} aria-label="Beğen" data-testid="button-like" className="grid h-16 w-16 place-items-center rounded-full scene-gradient text-primary-foreground shadow-[0_10px_22px_#ff536d55]"><Heart size={28} fill="currentColor" /></motion.button>
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
              </motion.article>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="scene-panel grid min-h-72 place-items-center p-8 text-center">
                <div>
                  <Sparkles className="mx-auto mb-3 text-brand-ink" /><h2 className="font-display text-2xl font-extrabold">Şimdilik bu kadar</h2>
                  <p className="mt-3 text-sm text-muted-foreground">{cast.length === 0 ? "Henüz keşfedebileceğin bir profil yok." : "Şimdilik herkesi gördün. Yeni kullanıcılar kayıt oldukça burada görünecek."}</p>
                  {store.passed.length > 0 && <Button className="mt-5" onClick={() => void store.resetDeck()} data-testid="button-reset-deck"><RotateCcw size={16} className="mr-2" />Geçtiklerini yeniden gör</Button>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {deck.length > 1 && <div className="mt-3 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Sırada {deck.length - 1} kişi daha</div>}
        </div>

        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="font-display text-2xl font-extrabold tracking-tight">SCENE üyeleri</h3>
            <span className="font-mono text-[11px] text-muted-foreground">{cast.length} kişi</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {cast.length === 0 && <p className="col-span-full rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">Kadro henüz boş. İlk kullanıcılardan birisin.</p>}
            {cast.map((p, i) => {
              const c = commonOf(p).length;
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
                      <div className="text-right"><div className="font-display text-2xl font-extrabold leading-none text-peach">{c}</div><div className="text-[9px] text-white">ortak</div></div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>
      </div>

      <MatchOverlay pid={matchPid} onClose={() => setMatchPid(null)} />
      <TitleDetail title={selectedTitle} onClose={() => setSelectedTitle(null)} />
    </div>
  );
}
