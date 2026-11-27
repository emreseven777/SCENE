import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { requireSupabase } from "@/lib/supabase";
import { cinemaFit, profileCinemaSignals, sharedFavorites } from "@/lib/dating";
import { SceneHeading } from "@/components/scene-brand";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { MessageCircle, X, Heart } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { PersonPhoto } from "@/components/person-photo";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function Matches() {
  const [tab,setTab] = useState<"matched" | "incoming" | "pending">("matched");
  const store = useStore();
  const { toast } = useToast();
  const mine = store.me?.favorites ?? [];
  const incomingIds = Object.keys(store.incoming).sort();
  const incomingComments = useQuery({
    queryKey: ["scene-like-comments", store.me?.id, incomingIds],
    enabled: !!store.me && incomingIds.length > 0,
    queryFn: async () => {
      const { data, error } = await requireSupabase().from("likes")
        .select("liker_id,photo_comment").eq("liked_id", store.me!.id).not("photo_comment", "is", null);
      if (error?.code === "42703") return {};
      if (error) throw error;
      return Object.fromEntries(data.map((like) => [like.liker_id, like.photo_comment])) as Record<string, string>;
    },
  });
  const matched = store.people.filter((p) => store.matches[p.id]).sort((a, b) => store.matches[b.id].at - store.matches[a.id].at);
  const pending = store.people.filter((p) => store.liked.includes(p.id) && !store.matches[p.id]);
  const own = profileCinemaSignals(mine, store.me?.discovery_details, (id) => store.titleById(id));

  return (
    <div className="scene-page movia-night min-h-[85dvh]">
      <SceneHeading title="Beğeniler" description="Eşleşmelerin ve karşılıklı ilgi." />

      <div className="mb-3 grid grid-cols-3 gap-1">{(["matched","incoming","pending"] as const).map((key,i)=><button key={key} type="button" aria-pressed={tab===key} onClick={()=>setTab(key)} className={`rounded-full px-1 py-2 text-[11px] font-bold ${tab===key?"bg-gradient-to-r from-pink-600 to-violet-600 text-white":"bg-card"}`}>{["Eşleşmeler","Beni Beğenenler","Beğendiklerin"][i]} · {[matched.length,store.people.filter(p=>store.incoming[p.id]&&!store.matches[p.id]).length,pending.length][i]}</button>)}</div>
      <section hidden={tab!=="matched"}>
      {matched.length === 0 ? (
        <div className="scene-panel p-8 text-center sm:p-12">
          <div className="font-display text-2xl font-bold">Henüz eşleşme yok</div>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Beğendiğin kişi de seni beğendiğinde burada görünecek.</p>
          <Link href="/" className="mt-5 inline-flex h-10 items-center rounded-full bg-primary text-primary-foreground px-5 text-sm font-semibold" data-testid="link-go-discover">Keşfetmeye başla</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {matched.map((p, i) => {
            const last = store.messages[p.id]?.at(-1);
            const common = sharedFavorites(mine, p.favorites);
            const titles = common.flatMap((id) => store.titleById(id, p.id)?.title ?? []).slice(0, 2);
            const signals = profileCinemaSignals(p.favorites, p.discovery_details, (id) => store.titleById(id, p.id));
            const { score, commonGenres } = cinemaFit(own, signals);
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 4) * 0.04 }} className="scene-panel group relative flex flex-col overflow-hidden" data-testid={`card-match-${p.id}`}>
                <Link href={`/kullanici/${p.id}`} className="relative block w-full"><PersonPhoto id={p.id} name={p.name} avatarPath={p.avatar_path} className="aspect-[3/4] w-full" textClassName="text-5xl" /></Link>
                <div className="flex min-w-0 flex-1 flex-col p-2">
                  <div className="flex items-start justify-between">
                    <Link href={`/kullanici/${p.id}`} className="break-words font-display text-base font-bold leading-tight hover:text-brand-ink">{p.name}{p.age !== null ? `, ${p.age}` : ""}</Link>
                    <div className="text-right"><span className="font-display text-3xl font-bold leading-none text-brand-ink">{common.length}</span><div className="font-mono text-[9px] uppercase">ortak</div></div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{formatDistanceToNow(store.matches[p.id].at, { locale: tr, addSuffix: true })} eşleştiniz</div>
                  {score !== null && <p className="mt-1 text-sm font-semibold text-brand-ink">%{score} sinema uyumu</p>}
                  {(titles.length > 0 || commonGenres.length > 0) && <p className="mt-1 text-xs text-muted-foreground break-words">
                    {titles.length ? `Ortak favoriler: ${titles.join(", ")}` : `Ortak türler: ${commonGenres.slice(0, 2).join(", ")}`}
                  </p>}
                  <p className="mt-2 line-clamp-2 text-sm text-foreground/70">{last ? last.text : "Henüz mesaj yok. İlk repliği sen söyle."}</p>
                  <div className="mt-auto flex flex-wrap items-center gap-1 pt-3">
                    <Link href={`/mesajlar/${p.id}`} data-testid={`link-chat-${p.id}`} className="inline-flex h-9 items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 text-xs font-semibold"><MessageCircle size={14} />Sohbet</Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button data-testid={`button-unmatch-${p.id}`} className="inline-flex h-9 items-center gap-1 rounded-md px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"><X size={14} />Eşleşmeyi kaldır</button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="border-border bg-card">
                        <AlertDialogHeader>
                          <AlertDialogTitle>{p.name} ile eşleşmeyi kaldır?</AlertDialogTitle>
                          <AlertDialogDescription>İkinizin de profillere ve bu sohbete erişimi kapanır. Eşleşme yeniden kurulamaz.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                          <AlertDialogAction onClick={() => { void store.unmatch(p.id).then((ok) => ok && toast({ title: "Eşleşme kaldırıldı" })); }} data-testid="button-confirm-unmatch">Kaldır</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      </section>
      <section hidden={tab!=="incoming"}>
        <h2 className="text-xl font-bold">Beni beğenenler</h2>
        {store.people.some((p) => store.incoming[p.id] && !store.matches[p.id]) ? <ul className="mt-3 grid grid-cols-2 gap-2">
          {store.people.filter((p) => store.incoming[p.id] && !store.matches[p.id]).map((p) => <li key={p.id} className="scene-panel overflow-hidden p-1">
            <Link className="relative block overflow-hidden rounded-xl" href={`/kullanici/${p.id}`}>
              <PersonPhoto id={p.id} name={p.name} avatarPath={p.avatar_path} className="aspect-[3/4] w-full" />
              <Heart className="absolute right-2 top-2 fill-pink-500 text-pink-500" size={20}/>{(() => { const {score}=cinemaFit(own,profileCinemaSignals(p.favorites,p.discovery_details,id=>store.titleById(id,p.id))); return score===null?null:<span className="absolute bottom-2 right-2 z-10 grid size-10 place-items-center rounded-full border-2 border-pink-400 bg-[#25132f] text-xs font-bold text-white">%{score}</span>; })()}<span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent p-2 pr-12 pt-8 font-bold text-white">{p.name}{p.age !== null ? `, ${p.age}` : ""}<span className="block text-xs">{p.city}</span>{store.incoming[p.id] === "super" && <span className="block text-xs text-brand-ink">Süper beğeni</span>}</span>
            </Link>
            {incomingComments.data?.[p.id] && <blockquote className="mt-2 break-words border-l-2 border-primary pl-3 text-sm">
              {incomingComments.data[p.id]}
            </blockquote>}
          </li>)}
        </ul> : <p className="mt-2 text-sm text-muted-foreground">Yeni beğeni yok.</p>}
      </section>

      <section hidden={tab!=="pending"}>
        <h2 className="font-display text-2xl font-bold tracking-tight">Beğendiklerin <span className="text-muted-foreground">/ yanıt bekleniyor</span></h2>
        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Bekleyen beğenin yok.</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {pending.map((p) => (
              <div key={p.id} className="scene-panel overflow-hidden p-1 text-center">
                <Link href={`/kullanici/${p.id}`} data-testid={`link-pending-${p.id}`}><PersonPhoto id={p.id} name={p.name} avatarPath={p.avatar_path} className="aspect-[3/4] w-full rounded-xl" textClassName="text-4xl" /></Link>
                <div className="mt-1 text-sm font-bold">{p.name}{p.age !== null ? `, ${p.age}` : ""}<span className="block text-xs text-muted-foreground">{p.city}</span></div>
                <button onClick={() => { void store.unlike(p.id).then((ok) => ok && toast({ title: "Beğeni geri alındı" })); }} data-testid={`button-unlike-${p.id}`} className="text-[11px] text-muted-foreground underline-offset-2 hover:text-brand-ink hover:underline">Geri al</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
