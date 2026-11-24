import { useMemo, useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, RotateCcw, X, Quote, MapPin } from "lucide-react";
import { PEOPLE, type Person } from "@/lib/people";
import { byId } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { MatchOverlay } from "@/components/match-overlay";
import { TitleDetail } from "@/components/title-detail";

export default function Discover() {
  const store = useStore();
  const { toast } = useToast();
  const [matchPid, setMatchPid] = useState<string | null>(null);
  const [titleId, setTitleId] = useState<string | null>(null);
  const [dir, setDir] = useState(1);

  const commonOf = (p: Person) => p.favorites.filter((f) => store.me.favorites.includes(f));
  const deck = useMemo(
    () => PEOPLE.filter((p) => !store.liked.includes(p.id) && !store.passed.includes(p.id) && !store.matches[p.id])
      .map((p) => ({ p, c: p.favorites.filter((f) => store.me.favorites.includes(f)) }))
      .sort((a, b) => b.c.length - a.c.length),
    [store.liked, store.passed, store.matches, store.me.favorites],
  );
  const current = deck[0];

  const doLike = (p: Person) => {
    setDir(1);
    const mutual = store.like(p.id);
    if (mutual) setTimeout(() => setMatchPid(p.id), 250);
    else toast({ title: `${p.name} beğenildi`, description: "Karşılık gelirse burada eşleşme olarak göreceksin." });
  };
  const doPass = (p: Person) => { setDir(-1); store.pass(p.id); };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-5 lg:px-10 lg:pt-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">Sahne 01 / Keşfet</div>
          <h1 className="mt-1 font-display text-5xl font-black uppercase leading-[0.85] lg:text-7xl">Bu akşam<br />kiminle aynı <span className="text-primary">sahnedesin?</span></h1>
        </div>
      </div>
      <p className="mb-6 max-w-xl text-sm text-muted-foreground">Kişiler, favori film ve dizilerinizin kesişimine göre sıralanır. Bu sürümdeki profiller örnek verilerdir.</p>

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
                className="relative overflow-hidden rounded-xl bg-card ring-1 ring-white/10"
                data-testid={`card-person-${current.p.id}`}
              >
                <Link href={`/kullanici/${current.p.id}`} className="block" data-testid="link-current-profile">
                  <div className="relative aspect-[4/5]">
                    <img src={current.p.photo} alt={current.p.name} className="h-full w-full object-cover" />
                    <div className="vignette absolute inset-0" />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                    <div className="absolute left-4 top-4 rounded-sm bg-black/60 px-2 py-1 font-mono text-[10px] uppercase tracking-widest backdrop-blur">Örnek profil</div>
                    <div className="absolute right-4 top-4 text-right">
                      <div className="font-display text-6xl font-black leading-none text-primary" data-testid="text-common-count">{current.c.length}</div>
                      <div className="font-mono text-[10px] uppercase tracking-widest">ortak</div>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <h2 className="font-display text-5xl font-black uppercase leading-none">{current.p.name} <span className="text-3xl font-medium text-foreground/60">{current.p.age}</span></h2>
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={12} />{current.p.city}</div>
                      <p className="mt-3 flex gap-2 text-sm italic text-foreground/85"><Quote size={14} className="mt-0.5 shrink-0 text-primary" />{current.p.scene}</p>
                    </div>
                  </div>
                </Link>
                <div className="px-5 pb-5">
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{current.c.length ? "Ortak favoriler" : "Henüz ortak favori yok"}</div>
                  <div className="flex gap-2 overflow-x-auto scrollbar-none">
                    {(current.c.length ? current.c : current.p.favorites).map((id) => {
                      const t = byId(id); if (!t) return null;
                      return (
                        <button key={id} onClick={() => setTitleId(id)} data-testid={`button-title-${id}`} className={`relative h-24 w-16 shrink-0 overflow-hidden rounded ${current.c.includes(id) ? "ring-2 ring-primary" : "opacity-50"}`}>
                          <img src={t.poster} alt={t.title} className="h-full w-full object-cover" />
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-5 flex items-center justify-center gap-5">
                    <button onClick={() => doPass(current.p)} aria-label="Geç" data-testid="button-pass" className="grid h-14 w-14 place-items-center rounded-full bg-white/5 ring-1 ring-white/15 transition hover:bg-white/10 active:scale-90"><X size={24} /></button>
                    <motion.button whileTap={{ scale: 0.85 }} onClick={() => doLike(current.p)} aria-label="Beğen" data-testid="button-like" className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_40px_-10px_hsl(357_86%_52%/0.8)]"><Heart size={28} fill="currentColor" /></motion.button>
                    <Link href={`/kullanici/${current.p.id}`} data-testid="link-view-profile" className="grid h-14 place-items-center rounded-full bg-white/5 px-5 text-sm ring-1 ring-white/15 hover:bg-white/10">Profil</Link>
                  </div>
                </div>
              </motion.article>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid aspect-[4/5] place-items-center rounded-xl border border-dashed border-white/15 p-8 text-center">
                <div>
                  <div className="font-display text-5xl font-black uppercase">Jenerik.</div>
                  <p className="mt-3 text-sm text-muted-foreground">Bu demodaki tüm kişileri gördün. Geçtiklerini yeniden görmek ister misin?</p>
                  <Button className="mt-5" onClick={store.resetDeck} data-testid="button-reset-deck"><RotateCcw size={16} className="mr-2" />Destede yeniden başla</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {deck.length > 1 && <div className="mt-3 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Sırada {deck.length - 1} kişi daha</div>}
        </div>

        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="font-display text-2xl font-extrabold uppercase">Oyuncu kadrosu</h3>
            <span className="font-mono text-[11px] text-muted-foreground">{PEOPLE.length} örnek kişi</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PEOPLE.map((p, i) => {
              const c = commonOf(p).length;
              const status = store.matches[p.id] ? "Eşleşme" : store.liked.includes(p.id) ? "Beğendin" : null;
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Link href={`/kullanici/${p.id}`} data-testid={`link-person-${p.id}`} className="group relative block aspect-[3/4] overflow-hidden rounded-lg ring-1 ring-white/10">
                    <img src={p.photo} alt={p.name} className="h-full w-full object-cover grayscale-[40%] transition duration-500 group-hover:scale-105 group-hover:grayscale-0" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                    {status && <span className="absolute left-2 top-2 rounded-sm bg-primary px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest">{status}</span>}
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3">
                      <div>
                        <div className="font-display text-2xl font-extrabold uppercase leading-none">{p.name}</div>
                        <div className="text-[11px] text-foreground/60">{p.city}</div>
                      </div>
                      <div className="text-right"><div className="font-display text-3xl font-black leading-none text-primary">{c}</div><div className="font-mono text-[9px] uppercase">ortak</div></div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>
      </div>

      <MatchOverlay pid={matchPid} onClose={() => setMatchPid(null)} />
      <TitleDetail id={titleId} onClose={() => setTitleId(null)} />
    </div>
  );
}
