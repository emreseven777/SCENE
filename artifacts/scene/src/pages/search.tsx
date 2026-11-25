import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { fetchCatalog } from "@/lib/tmdb";
import { Search as SearchIcon, X } from "lucide-react";
import { motion } from "framer-motion";
import { CATALOG, type Title, type TitleType } from "@/lib/catalog";
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
  const [selected, setSelected] = useState<Title | null>(null);
  const query = q.trim();
  const [debounced, setDebounced] = useState(query);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query), 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  const remote = useInfiniteQuery({
    queryKey: ["tmdb-catalog", store.me?.id, debounced, type],
    enabled: query === debounced,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => fetchCatalog(debounced, type, pageParam, signal),
    getNextPageParam: (last) => last.nextPage ?? undefined,
    staleTime: 5 * 60_000,
    retry: false,
  });
  const waiting = query !== debounced || remote.isPending;

  const results = useMemo(() => {
    const n = norm(q.trim());
    const local = CATALOG.filter((t) => (type === "all" || t.type === type) && (!n || norm(`${t.title} ${t.original ?? ""} ${t.by} ${t.genres.join(" ")} ${t.year}`).includes(n)));
    const titles = new Map(local.map((title) => [title.id, title]));
    if (query === debounced) {
      for (const page of remote.data?.pages ?? []) {
        for (const title of page.titles) titles.set(title.id, title);
      }
    }
    return [...titles.values()];
  }, [q, type, query, debounced, remote.data]);

  const fav = (t: Title) => {
    const added = store.toggleFavorite(t.id, t);
    toast({ title: added ? "Favorilere eklendi" : "Favorilerden çıkarıldı", description: t.title });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-5 lg:px-10 lg:pt-10">
      <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">Arşiv / Ara</div>
      <h1 className="mt-1 font-display text-5xl font-black uppercase leading-[0.85] lg:text-7xl">Film ve <span className="text-primary">dizi</span> arşivi</h1>
      <p className="mt-2 text-sm text-muted-foreground">Favorilerin, kimlerle ortak noktan olduğunu belirler.</p>

      <div className="sticky top-[61px] z-30 -mx-4 mt-6 bg-background/85 px-4 py-3 backdrop-blur-xl lg:top-0">
        <div className="relative">
          <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Film veya dizi adı ara…" aria-label="Film veya dizi adı ara" maxLength={120} data-testid="input-search" className="h-12 w-full rounded-full bg-white/[0.06] pl-11 pr-10 text-sm outline-none ring-1 ring-white/10 placeholder:text-muted-foreground focus:ring-primary" />
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

      {waiting && <p role="status" className="mt-3 text-sm text-muted-foreground">TMDB kataloğu aranıyor…</p>}
      {!waiting && remote.isError && !remote.isFetchNextPageError && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          TMDB kataloğuna ulaşılamadı. Yerel katalog açık.{" "}
          <button className="text-primary underline" onClick={() => void remote.refetch()}>Tekrar dene</button>
        </p>
      )}
      {results.length === 0 && !waiting && !remote.isError ? (
        <div className="mt-10 rounded-xl border border-dashed border-white/15 p-10 text-center">
          <div className="font-display text-4xl font-black uppercase">Bu sahne kurgudan çıkmış.</div>
          <p className="mt-2 text-sm text-muted-foreground">"{q}" için sonuç yok. Başka bir başlık ya da tür dene.</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {results.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}>
              <Poster t={t} onClick={() => setSelected(t)} className={store.isFav(t.id) ? "ring-2 ring-primary" : ""}
                badge={<HeartButton size="sm" active={store.isFav(t.id)} onToggle={() => fav(t)} testId={`button-fav-${t.id}`} />} />
              <div className="mt-1.5 truncate text-xs font-semibold">{t.title}</div>
              <div className="font-mono text-[10px] uppercase text-muted-foreground">{t.type === "film" ? "Film" : "Dizi"} / {t.year || "—"}</div>
            </motion.div>
          ))}
        </div>
      )}
      {query === debounced && remote.hasNextPage && (
        <div className="mt-6 text-center">
          <Button variant="secondary" disabled={remote.isFetchingNextPage} onClick={() => void remote.fetchNextPage()}>
            {remote.isFetchingNextPage ? "Yükleniyor…" : remote.isFetchNextPageError ? "Tekrar dene" : "Daha fazla göster"}
          </Button>
        </div>
      )}
      <footer className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 py-4 text-xs text-muted-foreground">
        <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">
          <img className="w-24" src={`${import.meta.env.BASE_URL}tmdb-logo.svg`} alt="The Movie Database (TMDB)" />
        </a>
        <span>This product uses the TMDB API but is not endorsed or certified by TMDB.</span>
      </footer>
      <TitleDetail title={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
