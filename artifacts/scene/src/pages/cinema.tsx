import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Film, Heart, RotateCcw, X, ChevronDown, SlidersHorizontal, Library, Popcorn, EyeOff } from "lucide-react";
import { SceneHeading } from "@/components/scene-brand";
import { SwipeCard, type SwipeDirection } from "@/components/swipe-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { fetchCinema, fetchCinemaDetails } from "@/lib/tmdb";
import { CATALOG, byId, savedTmdbTitle, tmdbIdFor, type Title, type TitleType } from "@/lib/catalog";
import { requireSupabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

type Choice = "favorite" | "disliked" | "watchlist" | "unseen";
type Pick = { title: Title; previous: Choice | null; favorite: boolean };

const choices: Record<Choice, string> = {
  favorite: "Favoriler", disliked: "Beğenmediklerim", watchlist: "İzleme listem", unseen: "İzlemediklerim",
};
const swipeLabels = { left: "Beğenmedim", right: "Favori", up: "İzleme listesi" };
const genres = [[16,"Animasyon"],[99,"Belgesel"],[18,"Dram"],[35,"Komedi"],[80,"Suç"],[9648,"Gizem"],[10751,"Aile"],[27,"Korku"]] as const;

export default function Cinema() {
  const store = useStore();
  const user = store.me!;
  const client = useQueryClient();
  const { toast } = useToast();
  const [type, setType] = useState<TitleType>("film");
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [sort, setSort] = useState("popularity.desc");
  const [tab, setTab] = useState<"deck" | Choice>("deck");
  const [menu, setMenu] = useState<"collection" | "club" | null>(null);
  const [selected, setSelected] = useState<Title | null>(null);
  const [last, setLast] = useState<Pick | null>(null);
  const [busy, setBusy] = useState(false);
  const [prefetched, setPrefetched] = useState("");
  const archiveKey = ["cinema-choices", user.id];
  const archive = useQuery({
    queryKey: archiveKey,
    staleTime: 30_000,
    queryFn: async ({ signal }) => {
      const rows: { title_id: string; choice: Choice; title_metadata: unknown }[] = [];
      for (let offset = 0; ; offset += 250) {
        const { data, error } = await requireSupabase().from("cinema_choices")
          .select("title_id,choice,title_metadata").eq("user_id", user.id).order("title_id").range(offset, offset + 249).abortSignal(signal);
        if (error) throw error;
        rows.push(...data);
        if (data.length < 250) return rows;
      }
    },
  });
  const catalog = useInfiniteQuery({
    queryKey: ["cinema-deck", user.id, type, genre, year, sort],
    initialPageParam: 1,
    enabled: tab === "deck",
    queryFn: ({ pageParam, signal }) => fetchCinema(type, genre ? Number(genre) : null, year ? Number(year) : null, sort, pageParam, signal),
    getNextPageParam: (p) => p.nextPage ?? undefined,
    staleTime: 300_000,
    retry: false,
  });
  const usingArchive = catalog.isError && !catalog.data;
  const selectedGenre = genres.find(([id]) => String(id) === genre)?.[1];
  const deck = useMemo(() => {
    const excluded = new Set([...(archive.data ?? []).map((item) => item.title_id), ...user.favorites]);
    const unique = new Map((catalog.data?.pages ?? []).flatMap((page) => page.titles.map((title) => [title.id, title] as const)));
    const available = usingArchive
      ? CATALOG.filter((title) => title.type === type
        && (!selectedGenre || title.genres.includes(selectedGenre))
        && (!year || String(title.year) === year))
      : [...unique.values()];
    return available.filter((title) => !excluded.has(title.id));
  }, [archive.data, catalog.data, user.favorites, usingArchive, type, selectedGenre, year]);
  const top = deck[0];
  const nextPosters = deck.slice(1, 5).map((title) => title.poster).filter(Boolean).join("\n");
  useEffect(() => {
    if (tab !== "deck") return;
    for (const url of nextPosters.split("\n").filter(Boolean)) {
      const image = new Image();
      image.fetchPriority = "low";
      image.src = url;
    }
  }, [nextPosters, tab]);
  const prefetchKey = [type, genre, year, sort, catalog.data?.pages.length].join("/");
  useEffect(() => {
    if (tab !== "deck" || !archive.isSuccess || deck.length > 6 || !catalog.hasNextPage
      || catalog.isFetching || catalog.isFetchNextPageError || prefetched === prefetchKey) return;
    // Skip already-rated batches automatically, with a bounded automatic scan.
    if (deck.length || (catalog.data?.pages.length ?? 0) < 30) {
      setPrefetched(prefetchKey);
      void catalog.fetchNextPage();
    }
  }, [archive.isSuccess, catalog, deck.length, prefetchKey, prefetched, tab]);

  const change = async (title: Title, choice: Choice | null, favorite = choice === "favorite", record = true) => {
    if (busy) return;
    setBusy(true);
    try {
      const previous = archive.data?.find((row) => row.title_id === title.id)?.choice ?? null;
      const wasFavorite = store.isFav(title.id);
      const { error } = await requireSupabase().rpc("set_cinema_choice", {
        item_id: title.id, item_metadata: title, item_choice: choice, is_favorite: favorite,
      });
      if (error) throw error;
      client.setQueryData<typeof archive.data>(archiveKey, (rows) => [
        ...(rows ?? []).filter((row) => row.title_id !== title.id),
        ...(choice ? [{ title_id: title.id, title_metadata: title, choice }] : []),
      ]);
      void store.refresh().catch(() => { /* Choice already persisted; refresh can retry later. */ });
      setLast(record ? { title, previous, favorite: wasFavorite } : null);
    } catch {
      toast({ title: "Sinema tercihi kaydedilemedi", variant: "destructive" });
    } finally { setBusy(false); }
  };
  const swipe = (direction: SwipeDirection) => top
    ? change(top, { left: "disliked", right: "favorite", up: "watchlist" }[direction] as Choice)
    : Promise.resolve();

  const archived = tab === "favorite"
    ? user.favorites.flatMap((id) => store.titleById(id) ?? [])
    : (archive.data ?? []).filter((row) => row.choice === tab).flatMap((row) => {
      const title = byId(row.title_id) ?? savedTmdbTitle(row.title_id, row.title_metadata);
      return title ?? [];
    });

  return <div className="scene-page max-w-3xl pt-1">
    <SceneHeading title="Sinema Salonu" description="Favorilerini seç, izleyeceklerini sıraya koy." />
    <div className="mb-2 flex items-center gap-2">
      <Button size="sm" variant={type === "film" && tab === "deck" ? "default" : "secondary"} onClick={() => { setType("film"); setTab("deck"); setMenu(null); }}>Film</Button>
      <Button size="sm" variant={type === "dizi" && tab === "deck" ? "default" : "secondary"} onClick={() => { setType("dizi"); setTab("deck"); setMenu(null); }}>Dizi</Button>
      <Button asChild size="sm" variant="ghost" className="ml-auto"><Link href="/arama">Arşivde ara</Link></Button>
    </div>
    <div className="mb-2 grid grid-cols-2 gap-2">
      <Button size="sm" variant="secondary" aria-expanded={menu === "collection"} onClick={() => setMenu(menu === "collection" ? null : "collection")}><Library />Koleksiyonum<ChevronDown /></Button>
      <Button size="sm" variant="secondary" aria-expanded={menu === "club"} onClick={() => setMenu(menu === "club" ? null : "club")}><Popcorn />Sinema Kulübü<ChevronDown /></Button>
    </div>
    {menu === "collection" && <div className="scene-panel mb-2 grid gap-1 p-2">
      <Button variant="ghost" onClick={() => { setTab("deck"); setMenu(null); }}>Salona dön</Button>
      {Object.entries(choices).map(([key, label]) => <Button key={key} variant={tab === key ? "secondary" : "ghost"} onClick={() => { setTab(key as Choice); setMenu(null); }}>{label}</Button>)}
    </div>}
    {menu === "club" && <div className="scene-panel mb-2 grid gap-1 p-2">
      <Button asChild variant="ghost"><Link href="/sinema/topluluk">Topluluk odaları</Link></Button>
      <Button asChild variant="ghost"><Link href="/sinema/etkinlikler">Etkinlikler · Quiz ve bilgi yarışması</Link></Button>
    </div>}
    {tab !== "deck" && <h2 className="mb-2 text-xl font-bold">{choices[tab]}</h2>}
    {menu === "collection" && archive.isSuccess && <details className="scene-panel mb-4 p-4">
      <summary className="cursor-pointer font-semibold">Sinema istatistiklerim ve başarılarım</summary>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div><dt>Favoriler</dt><dd>{user.favorites.length}</dd></div>
        <div><dt>İzleme listem</dt><dd>{archive.data.filter((item) => item.choice === "watchlist").length}</dd></div>
        <div><dt>Beğenmediklerim</dt><dd>{archive.data.filter((item) => item.choice === "disliked").length}</dd></div>
        <div><dt>Kayıtlı salon tercihleri</dt><dd>{archive.data.length}</dd></div>
      </dl>
      {(user.favorites.length >= 5 || archive.data.length >= 10) && <ul className="mt-3 flex flex-wrap gap-2 text-sm text-brand-ink">
        {user.favorites.length >= 5 && <li className="rounded-full border px-3 py-1">Koleksiyoncu · 5 favori</li>}
        {archive.data.length >= 10 && <li className="rounded-full border px-3 py-1">Salon müdavimi · 10 tercih</li>}
      </ul>}
    </details>}
    {archive.isError && <p role="alert">Tercihlerin yüklenemedi. <button className="underline" onClick={() => void archive.refetch()}>Tekrar dene</button></p>}
    {tab === "deck" ? <>
      <details className="scene-panel mb-2 p-2"><summary className="flex cursor-pointer list-none items-center gap-2 font-bold"><SlidersHorizontal size={16} /> Filtreler <ChevronDown className="ml-auto" size={16} /></summary><div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <label><span className="font-bold">Yapım</span><select className="mt-1 w-full rounded-lg border bg-card p-2" value={type} onChange={(e) => setType(e.target.value as TitleType)}><option value="film">Film</option><option value="dizi">Dizi</option></select></label>
        <label><span className="font-bold">Tür</span><select className="mt-1 w-full rounded-lg border bg-card p-2" value={genre} onChange={(e) => setGenre(e.target.value)}><option value="">Tümü</option>{genres.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label><span className="font-bold">Yıl</span><select className="mt-1 w-full rounded-lg border bg-card p-2" value={year} onChange={(e) => setYear(e.target.value)}><option value="">Tümü</option>{Array.from({ length: new Date().getFullYear() - 1887 }, (_, i) => new Date().getFullYear() - i).map((y) => <option key={y}>{y}</option>)}</select></label>
        <label><span className="font-bold">Sıralama</span><select disabled={usingArchive} className="mt-1 w-full rounded-lg border bg-card p-2" value={usingArchive ? "archive" : sort} onChange={(e) => setSort(e.target.value)}>{usingArchive && <option value="archive">Arşiv sırası</option>}<option value="popularity.desc">Popüler</option><option value="vote_average.desc">En yüksek puan</option></select></label>
      </div></details>
      {usingArchive && <p role="status" className="mb-2 text-sm text-muted-foreground">
        TMDB şu anda kullanılamıyor. MOVIA arşivi gösteriliyor.{" "}
        <button type="button" className="underline" disabled={catalog.isFetching} onClick={() => void catalog.refetch()}>TMDB’yi tekrar dene</button>
      </p>}
      {archive.isPending || catalog.isPending || (!top && catalog.isFetchingNextPage) ? <p role="status">Katalog yükleniyor…</p> : archive.isSuccess && top ? <>
        <SwipeCard key={top.id} labels={swipeLabels} disabled={busy} onSwipe={swipe}
          cinematicFeedback>
          <div className="relative mx-auto h-[clamp(23rem,62svh,38rem)] overflow-hidden rounded-[1.6rem] border-2 border-violet/75 bg-[#201d29] text-white">
            {top.poster && <img alt="" src={top.poster} className="size-full object-cover" draggable={false} decoding="async" fetchPriority="high" />}
            <div className="absolute inset-x-0 bottom-14 bg-gradient-to-t from-black to-transparent p-5 pt-20">
              <h2 className="text-3xl font-bold">{top.title}</h2>
              <p className="mt-1 text-sm">{top.year || "Yıl yok"}{top.rating ? ` · ${top.rating.toFixed(1)}/10` : ""}</p>
              <button className="mt-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold" onClick={() => setSelected(top)}>Yapım detayları</button>
            </div>
            <div className="absolute inset-x-0 bottom-0 flex h-14 items-center justify-between gap-1 bg-linear-to-r from-rose-900/65 via-black/70 to-emerald-900/65 px-3 text-white">
              <button disabled={busy} onClick={() => void swipe("left")} className="flex items-center gap-1 text-left"><X size={22}/><span className="text-[10px]">Sola kaydır<strong className="block text-xs">Beğenmedim</strong></span></button>
              <button disabled={busy} onClick={() => void swipe("up")} className="grid justify-items-center text-[10px]"><Bookmark size={18}/>İzleme listesi</button>
              <button disabled={busy} onClick={() => void swipe("right")} className="flex items-center gap-1 text-right"><span className="text-[10px]">Sağa kaydır<strong className="block text-xs">Favori</strong></span><Heart size={22}/></button>
            </div>
          </div>
        </SwipeCard>
        <div className="flex justify-between gap-2">
          <Button size="sm" variant="ghost" disabled={busy || !last} onClick={() => { if (last) void change(last.title, last.previous, last.favorite, false); }}><RotateCcw /> Geri al</Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => void change(top, "unseen")}><EyeOff /> İzlemedim</Button>
        </div>
      </> : catalog.isError && !usingArchive ? <p role="alert">TMDB kataloğu yüklenemedi. <button className="underline" onClick={() => void catalog.refetch()}>Tekrar dene</button></p>
        : <p className="p-4 text-sm text-muted-foreground">Bu sayfada yeni bir yapım yok.</p>}
      {catalog.hasNextPage && (!deck.length || catalog.isFetchNextPageError) && <Button disabled={catalog.isFetchingNextPage} variant="secondary" onClick={() => void catalog.fetchNextPage()}>Daha fazla yapım</Button>}
    </> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {!archived.length && <p className="col-span-full text-sm text-muted-foreground">Bu liste henüz boş.</p>}
      {archived.map((title) => <article className="scene-panel overflow-hidden" key={title.id}>
        <button className="w-full text-left" onClick={() => setSelected(title)}>
          {title.poster ? <img src={title.poster} alt="" className="aspect-[2/3] w-full object-cover" loading="lazy" decoding="async" /> : <Film className="m-4" />}
          <h2 className="px-3 pt-2 text-sm font-bold">{title.title}</h2>
        </button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => void change(title, null)}>Listeden çıkar</Button>
      </article>)}
    </div>}
    <footer className="mt-8 text-xs text-muted-foreground"><a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer"><img src={`${import.meta.env.BASE_URL}tmdb-logo.svg`} alt="TMDB" className="mb-2 w-24" /></a>This product uses the TMDB API but is not endorsed or certified by TMDB.</footer>
    {selected && <CinemaDetail title={selected} onClose={() => setSelected(null)} />}
  </div>;
}

function CinemaDetail({ title, onClose }: { title: Title; onClose: () => void }) {
  const id = title.tmdbId ?? tmdbIdFor(title.id);
  const details = useQuery({ queryKey: ["cinema-details", id], enabled: !!id, queryFn: ({ signal }) => fetchCinemaDetails(id!, signal), staleTime: 600_000, retry: false });
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent>
    <DialogTitle>{title.title} {title.year ? `(${title.year})` : ""}</DialogTitle>
    <DialogDescription>{details.data?.overview || title.overview || "Türkçe konu özeti yok."}</DialogDescription>
    {details.data?.rating && <p>Puan: {details.data.rating.toFixed(1)}/10</p>}
    {!!details.data?.cast.length && <p><strong>Oyuncular</strong><br />{details.data.cast.join(", ")}</p>}
    {details.data?.trailer && <a className="text-brand-ink underline" target="_blank" rel="noreferrer" href={`https://www.youtube.com/watch?v=${details.data.trailer}`}>Fragmanı izle</a>}
    {details.isFetching && <p role="status">Detaylar yükleniyor…</p>}
    {details.isError && <p role="alert">Ek yapım detaylarına ulaşılamadı.</p>}
  </DialogContent></Dialog>;
}
