import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { CATALOG, type Title, type TitleType } from "@/lib/catalog";
import { fetchCatalog, fetchCinema } from "@/lib/tmdb";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const MIN = 3;

export default function CreateProfile() {
  const store = useStore();
  const { toast } = useToast();
  const [, go] = useLocation();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: store.me?.name ?? "", bio: store.me?.bio ?? "" });
  const [favs, setFavs] = useState<string[]>(store.me?.favorites ?? []);
  const [picked, setPicked] = useState<Record<string, Title>>({});
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | TitleType>("all");
  const [round, setRound] = useState(0);
  const [seed] = useState(() => Math.floor(Math.random() * 5));
  const [remote, setRemote] = useState<Title[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const norm = (v: string) => v.toLocaleLowerCase("tr").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i");
  useEffect(() => {
    if (step !== 1) return;
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    setRemote([]);
    const timer = window.setTimeout(async () => {
      try {
        const page = query.trim() ? round + 1 : (seed + round) % 10 + 1;
        const results = query.trim()
          ? [await fetchCatalog(query.trim(), type, page, controller.signal)]
          : await Promise.all((type === "all" ? ["film", "dizi"] as const : [type]).map(kind => fetchCinema(kind, null, null, round % 2 ? "vote_average.desc" : "popularity.desc", page, controller.signal)));
        if (!controller.signal.aborted) setRemote(results.flatMap(result => result.titles));
      } catch { if (!controller.signal.aborted) setFailed(true); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 350);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [step, query, type, round, seed]);
  const visible = useMemo(() => {
    const local = CATALOG.filter(t => (type === "all" || t.type === type) && (!query.trim() || norm(t.title + " " + (t.original ?? "")).includes(norm(query.trim()))));
    const offset = local.length ? (seed * 7 + round * 11) % local.length : 0;
    const rotated = [...local.slice(offset), ...local.slice(0, offset)];
    const mixed = query.trim() ? [...remote, ...local] : [...remote.slice(0,12), ...rotated.slice(0,9), ...remote.slice(12)];
    return [...new Map(mixed.map(t => [t.id,t])).values()].slice(0,36);
  }, [remote, query, type, round, seed]);
  const [saving, setSaving] = useState(false);
  const firstTime = !store.me?.onboarded;
  const toggle = (t: Title) => { setPicked(p => ({ ...p, [t.id]: t })); setFavs(f => f.includes(t.id) ? f.filter(x => x !== t.id) : [...f, t.id]); };

  const finish = async () => {
    setSaving(true);
    try {
      await store.completeOnboarding({ name: form.name.trim(), bio: form.bio.trim(), favorites: favs, favoriteTitles: picked });
      toast({ title: "Sahne senin", description: "Profilin kaydedildi." });
      go("/");
    } catch { /* error toast already shown */ } finally { setSaving(false); }
  };

  return (
    <div className="scene-page max-w-4xl">
      <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-brand-ink">Profil kurulumu · {step + 1}/2</div>
      <div className="mt-3 flex gap-2">{[0, 1].map((i) => <div key={i} className={cn("h-0.5 flex-1 transition-colors", i <= step ? "bg-primary" : "bg-border")} />)}</div>

      <AnimatePresence mode="wait">
        {step === 0 ? (
          <motion.div key="s0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="mt-6 max-w-lg">
            <h1 className="scene-title">Jenerikte<br /><span className="text-brand-ink">adın</span> ne yazsın?</h1>
            <p className="mt-3 text-sm text-muted-foreground">Diğer kullanıcılar ismini, ilini, yazdıklarını ve favorilerini görür. E-posta adresin gizli kalır.</p>
            <div className="mt-6 space-y-4">
              <div className="space-y-1.5"><Label htmlFor="c-name">İsim</Label><Input id="c-name" autoFocus maxLength={40} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Örn. Zeynep" data-testid="input-create-name" /></div>
              <div className="space-y-1.5"><Label htmlFor="c-bio">Kendini bir sahneyle anlat</Label><Textarea id="c-bio" maxLength={240} rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Yağmurda şarkı söyleyen değil, şemsiyeyi tutan benim." data-testid="input-create-bio" /></div>
            </div>
            <div className="mt-6 flex gap-2">
              {!firstTime && <Button variant="ghost" onClick={() => go("/profil")} data-testid="button-create-cancel">Vazgeç</Button>}
              <Button disabled={!form.name.trim()} onClick={() => setStep(1)} data-testid="button-create-next">Devam</Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="s1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="mt-6">
            <h1 className="scene-title">Hangi sahneler<br /><span className="text-brand-ink">seni</span> anlatır?</h1>
            <p className="mt-3 text-sm text-muted-foreground">En az {MIN} yapım seç. Seçtiklerin <span className="font-mono text-brand-ink">{favs.length}</span></p>
            <div className="mt-4 space-y-3">
              <Input type="search" placeholder="Film veya dizi ara…" aria-label="Film veya dizi ara" value={query} onChange={e => { setQuery(e.target.value); setRound(0); }} />
              <div className="flex flex-wrap gap-2">
                {([["all","Tümü"],["film","Filmler"],["dizi","Diziler"]] as const).map(([v,l]) => <Button key={v} variant={type === v ? "default" : "secondary"} onClick={() => { setType(v); setRound(0); }}>{l}</Button>)}
                <Button variant="outline" disabled={loading} onClick={() => setRound(r => r+1)}>{query.trim() ? "Sonraki sonuçlar" : "Listeyi yenile"}</Button>
              </div>
              {loading && <p className="text-sm text-muted-foreground">Yapımlar yükleniyor…</p>}
              {failed && <p className="text-sm text-muted-foreground">Güncel katalog şu anda erişilemiyor. Yerel yapımlar gösteriliyor.</p>}
              {favs.length > 0 && <div className="flex flex-wrap gap-2">{favs.map(id => <button key={id} type="button" className="rounded-full bg-secondary px-3 py-1 text-xs" onClick={() => setFavs(f => f.filter(x => x !== id))}>{picked[id]?.title ?? store.titleById(id)?.title ?? id} ×</button>)}</div>}
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5">
              {visible.map((t) => {
                const on = favs.includes(t.id);
                return (
                  <motion.button key={t.id} whileTap={{ scale: 0.94 }} onClick={() => toggle(t)} data-testid={`button-pick-${t.id}`} className={cn("relative aspect-[2/3] overflow-hidden rounded-2xl ring-1 ring-border transition", on && "ring-2 ring-primary")}>
                    {t.poster ? <img src={t.poster} alt={t.title} loading="lazy" className={cn("h-full w-full object-cover transition", !on && "opacity-90")} /> : <span className="p-2 text-sm">{t.title}</span>}
                    {on && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground"><Check size={15} /></motion.span>}
                  </motion.button>
                );
              })}
            </div>
            <div className="sticky bottom-24 mt-6 flex gap-2 rounded-xl bg-background/90 p-3 backdrop-blur lg:bottom-4">
              <Button variant="ghost" onClick={() => setStep(0)}>Geri</Button>
              <Button className="flex-1" disabled={favs.length < MIN || saving} onClick={() => void finish()} data-testid="button-create-finish">{favs.length < MIN ? `${MIN - favs.length} tane daha seç` : saving ? "Kaydediliyor..." : "Profili kaydet"}</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
