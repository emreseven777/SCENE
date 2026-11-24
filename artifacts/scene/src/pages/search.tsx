import { useMemo, useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { motion } from "framer-motion";
import { CATALOG, byId, type TitleType } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Poster } from "@/components/poster";
import { HeartButton } from "@/components/heart-button";
import { TitleDetail } from "@/components/title-detail";

const norm = (s: string) => s.toLocaleLowerCase("tr").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i");

export default function SearchPage() {
  const store = useStore();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | TitleType>("all");
  const [titleId, setTitleId] = useState<string | null>(null);

  const results = useMemo(() => {
    const n = norm(q.trim());
    return CATALOG.filter((t) => (type === "all" || t.type === type) && (!n || norm(`${t.title} ${t.original ?? ""} ${t.by} ${t.genres.join(" ")} ${t.year}`).includes(n)));
  }, [q, type]);

  const fav = (id: string) => {
    const t = byId(id)!;
    const added = store.toggleFavorite(id);
    toast({ title: added ? "Favorilere eklendi" : "Favorilerden çıkarıldı", description: t.title });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-5 lg:px-10 lg:pt-10">
      <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">Arşiv / Ara</div>
      <h1 className="mt-1 font-display text-5xl font-black uppercase leading-[0.85] lg:text-7xl">Film ve <span className="text-primary">dizi</span> arşivi</h1>
      <p className="mt-2 text-sm text-muted-foreground">Favorilerin, kimlerle ortak noktan olduğunu belirler. Örnek katalogda {CATALOG.length} yapım var.</p>

      <div className="sticky top-[61px] z-30 -mx-4 mt-6 bg-background/85 px-4 py-3 backdrop-blur-xl lg:top-0">
        <div className="relative">
          <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Başlık, yönetmen, tür..." data-testid="input-search" className="h-12 w-full rounded-full bg-white/[0.06] pl-11 pr-10 text-sm outline-none ring-1 ring-white/10 placeholder:text-muted-foreground focus:ring-primary" />
          {q && <button onClick={() => setQ("")} aria-label="Temizle" data-testid="button-clear-search" className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={16} /></button>}
        </div>
        <div className="mt-3 flex gap-2">
          {([["all", "Tümü"], ["film", "Filmler"], ["dizi", "Diziler"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setType(v)} data-testid={`filter-${v}`} className={cn("relative rounded-full px-4 py-1.5 text-xs font-semibold transition-colors", type === v ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              {type === v && <motion.span layoutId="filter" className="absolute inset-0 rounded-full bg-primary" />}
              <span className="relative">{l}</span>
            </button>
          ))}
          <span className="ml-auto self-center font-mono text-[11px] text-muted-foreground" data-testid="text-result-count">{results.length} sonuç</span>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-white/15 p-10 text-center">
          <div className="font-display text-4xl font-black uppercase">Bu sahne kurgudan çıkmış.</div>
          <p className="mt-2 text-sm text-muted-foreground">"{q}" için sonuç yok. Başka bir başlık ya da tür dene.</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {results.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}>
              <Poster t={t} onClick={() => setTitleId(t.id)} className={store.isFav(t.id) ? "ring-2 ring-primary" : ""}
                badge={<HeartButton size="sm" active={store.isFav(t.id)} onToggle={() => fav(t.id)} testId={`button-fav-${t.id}`} />} />
              <div className="mt-1.5 truncate text-xs font-semibold">{t.title}</div>
              <div className="font-mono text-[10px] uppercase text-muted-foreground">{t.type === "film" ? "Film" : "Dizi"} / {t.year}</div>
            </motion.div>
          ))}
        </div>
      )}
      <TitleDetail id={titleId} onClose={() => setTitleId(null)} />
    </div>
  );
}
