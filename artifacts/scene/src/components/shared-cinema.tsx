import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import type { Title } from "@/lib/catalog";
import { requireSupabase, turkishError } from "@/lib/supabase";

const cardPrefix = "[SCENE:YAPIM] ";
export const titleMessage = (title: Title) => cardPrefix + title.title;
export function CinemaMessage({ body }: { body: string }) {
  if (!body.startsWith(cardPrefix) || !body.slice(cardPrefix.length).trim()) return <p>{body}</p>;
  const title = body.slice(cardPrefix.length).trim();
  return <div className="rounded-xl border border-current/30 p-3">
    <p className="text-xs">Film veya dizi kartı</p>
    <Link href={`/arama?q=${encodeURIComponent(title)}`} className="font-semibold underline">{title}</Link>
  </div>;
}

export function SharedCinema({ match, viewer, titles, onShare }: {
  match: string; viewer: string; titles: Title[]; onShare: (body: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState("");
  const list = useQuery({
    queryKey: ["scene-shared-watchlist", viewer, match], enabled: open,
    queryFn: async () => {
      const { data, error } = await requireSupabase().from("scene_shared_watchlist")
        .select("title_id,title").eq("match_id", match).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data as { title_id: string; title: string }[];
    },
  });
  const refetch = list.refetch;
  useEffect(() => {
    if (!open) return;
    const db = requireSupabase();
    const channel = db.channel(`scene-watchlist-${match}`).on("postgres_changes", {
      event: "*", schema: "public", table: "scene_shared_watchlist", filter: `match_id=eq.${match}`,
    }, () => { void refetch(); }).subscribe();
    return () => { void db.removeChannel(channel); };
  }, [open, match, refetch]);
  const change = useMutation({
    mutationFn: async ({ id, title }: { id: string; title?: string }) => {
      const table = requireSupabase().from("scene_shared_watchlist");
      const { error } = title
        ? await table.insert({ match_id: match, title_id: id, title })
        : await table.delete().eq("match_id", match).eq("title_id", id);
      if (error && error.code !== "23505") throw error;
    },
    onSuccess: () => { void refetch(); },
  });

  const selected = titles.find((title) => title.id === selection);
  return <details className="border-b px-4 py-2 text-sm" onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer font-semibold">Birlikte izle</summary>
    {open && <section className="max-h-44 space-y-2 overflow-y-auto pt-2">
      <label className="block">Favorilerinizden öneriler
        <select className="mt-1 block w-full rounded-lg border bg-card p-2" value={selection} onChange={(e) => setSelection(e.target.value)}>
          <option value="">Film veya dizi seç</option>
          {titles.map((title) => <option key={title.id} value={title.id}>{title.title}</option>)}
        </select>
      </label>
      {selected && <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" disabled={change.isPending || list.data?.some((row) => row.title_id === selected.id)}
          onClick={() => change.mutate({ id: selected.id, title: selected.title })}>Ortak listeye ekle</Button>
        <Button size="sm" variant="ghost" onClick={() => onShare(titleMessage(selected))}>Sohbette paylaş</Button>
      </div>}
      {list.isPending && <p role="status">Ortak liste yükleniyor…</p>}
      {list.isError && <p role="alert">{turkishError(list.error)}</p>}
      {change.isError && <p role="alert">{turkishError(change.error)}</p>}
      {list.data?.length === 0 && <p className="text-muted-foreground">Ortak izleme listeniz boş.</p>}
      {list.data?.map((row) => <div className="flex items-center justify-between gap-2" key={row.title_id}>
        <span>{row.title}</span>
        <Button size="sm" variant="ghost" disabled={change.isPending} onClick={() => change.mutate({ id: row.title_id })}>Kaldır</Button>
      </div>)}
    </section>}
  </details>;
}
