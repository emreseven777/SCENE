import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAdminAccess } from "@/lib/admin-access";
import { useStore } from "@/lib/store";
import { requireSupabase, turkishError } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const rooms = { drama: "Dram", comedy: "Komedi", "science-fiction": "Bilim kurgu", horror: "Korku", animation: "Animasyon" } as const;
type Room = keyof typeof rooms;
type Post = { id: string; author_id: string; body: string; spoiler: boolean; created_at: string };

export default function Community() {
  const { me, people } = useStore();
  const admin = useAdminAccess();
  const [room, setRoom] = useState<Room>("drama");
  const [body, setBody] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [review, setReview] = useState<string>();
  const [reason, setReason] = useState("");
  const posts = useQuery({
    queryKey: ["scene-room", me?.id, room],
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await requireSupabase().from("scene_room_posts")
        .select("id,author_id,body,spoiler,created_at").eq("room", room).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data as Post[];
    },
  });
  const refetch = posts.refetch;
  useEffect(() => {
    const db = requireSupabase();
    const channel = db.channel(`scene-room-${room}`).on("postgres_changes", {
      event: "INSERT", schema: "public", table: "scene_room_posts", filter: `room=eq.${room}`,
    }, () => { void refetch(); }).subscribe();
    return () => { void db.removeChannel(channel); };
  }, [room, refetch]);

  const publish = useMutation({
    mutationFn: async () => {
      const { error } = await requireSupabase().from("scene_room_posts").insert({ room, body: body.trim(), spoiler });
      if (error) throw error;
    },
    onSuccess: () => { setBody(""); setSpoiler(false); void refetch(); },
  });
  const moderate = useMutation({
    mutationFn: async (post: string) => {
      const { error } = await requireSupabase().rpc("scene_hide_room_post", { post, explanation: reason.trim() });
      if (error) throw error;
    },
    onSuccess: () => { setReview(undefined); setReason(""); void refetch(); },
  });

  return <section className="scene-page max-w-3xl">
    <Link href="/sinema" className="text-sm text-brand-ink underline">Sinema Salonu</Link>
    <h1 className="scene-title mb-4">Topluluk odaları</h1>
    <nav className="mb-4 flex flex-wrap gap-2" aria-label="Sinema türleri">
      {Object.entries(rooms).map(([key, label]) => <Button key={key} variant={key === room ? "default" : "secondary"}
        disabled={publish.isPending || moderate.isPending} onClick={() => { setRoom(key as Room); setReview(undefined); }}>{label}</Button>)}
    </nav>
    <form className="scene-panel mb-4 space-y-3 p-4" onSubmit={(e) => {
      e.preventDefault();
      if (body.trim() && !publish.isPending) publish.mutate();
    }}>
      <label className="block">{rooms[room]} odasına mesaj yaz
        <Textarea required maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} />
      </label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} />Spoiler içeriyor</label>
      {publish.isError && <p role="alert">{turkishError(publish.error)}</p>}
      <Button disabled={publish.isPending || !body.trim()}>Gönder</Button>
    </form>
    {posts.isPending && <p role="status">Oda yükleniyor…</p>}
    {posts.isError && <p role="alert">{turkishError(posts.error)}</p>}
    {posts.data?.length === 0 && <p>Bu odada henüz mesaj yok.</p>}
    {posts.data?.map((post) => {
      const author = post.author_id === me?.id ? me : people.find((person) => person.id === post.author_id);
      return <article key={post.id} className="scene-panel mb-2 space-y-2 p-4">
        <header className="flex flex-wrap justify-between gap-2 text-sm">
          {author ? <Link href={author.id === me?.id ? "/profil" : `/kullanici/${author.id}`} className="font-semibold text-brand-ink">{author.name}</Link> : <span>Movia üyesi</span>}
          <time dateTime={post.created_at}>{new Date(post.created_at).toLocaleString("tr-TR")}</time>
        </header>
        {post.spoiler ? <details><summary className="cursor-pointer">Spoiler · Görüntüle</summary><p className="whitespace-pre-wrap break-words">{post.body}</p></details>
          : <p className="whitespace-pre-wrap break-words">{post.body}</p>}
        {admin.data && review !== post.id && <Button size="sm" variant="ghost" disabled={moderate.isPending}
          onClick={() => { setReview(post.id); setReason(""); moderate.reset(); }}>Gönderiyi kaldır</Button>}
        {review === post.id && <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); if (reason.trim().length >= 5 && !moderate.isPending) moderate.mutate(post.id); }}>
          <label className="block">Kaldırma gerekçesi<Textarea required minLength={5} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
          {moderate.isError && <p role="alert">{turkishError(moderate.error)}</p>}
          <Button variant="destructive" size="sm" disabled={moderate.isPending || reason.trim().length < 5}>Kaldır</Button>
          <Button type="button" variant="ghost" size="sm" disabled={moderate.isPending} onClick={() => setReview(undefined)}>Vazgeç</Button>
        </form>}
      </article>;
    })}
  </section>;
}
