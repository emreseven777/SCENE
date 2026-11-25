import { SceneHeading } from "@/components/scene-brand";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { PersonPhoto } from "@/components/person-photo";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function Matches() {
  const store = useStore();
  const { toast } = useToast();
  const mine = store.me?.favorites ?? [];
  const matched = store.people.filter((p) => store.matches[p.id]).sort((a, b) => store.matches[b.id].at - store.matches[a.id].at);
  const pending = store.people.filter((p) => store.liked.includes(p.id) && !store.matches[p.id]);
  const common = (favs: string[]) => favs.filter((f) => mine.includes(f)).length;

  return (
    <div className="scene-page">
      <SceneHeading title="Beğeniler" description="Eşleşmelerin ve karşılıklı ilgi." />

      <h2 className="mb-3 text-xl font-bold">Eşleşmeler</h2>
      {matched.length === 0 ? (
        <div className="scene-panel p-8 text-center sm:p-12">
          <div className="font-display text-2xl font-bold">Henüz eşleşme yok</div>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Beğendiğin kişi de seni beğendiğinde burada görünecek.</p>
          <Link href="/" className="mt-5 inline-flex h-10 items-center rounded-full bg-primary text-primary-foreground px-5 text-sm font-semibold" data-testid="link-go-discover">Keşfetmeye başla</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {matched.map((p, i) => {
            const last = store.messages[p.id]?.at(-1);
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="scene-panel group relative flex overflow-hidden" data-testid={`card-match-${p.id}`}>
                <Link href={`/kullanici/${p.id}`} className="relative w-24 shrink-0 sm:w-32"><PersonPhoto id={p.id} name={p.name} avatarPath={p.avatar_path} className="h-full min-h-[10rem] w-full" textClassName="text-5xl" /></Link>
                <div className="flex min-w-0 flex-1 flex-col p-4">
                  <div className="flex items-start justify-between">
                    <Link href={`/kullanici/${p.id}`} className="break-words font-display text-xl font-bold leading-tight sm:text-2xl hover:text-brand-ink">{p.name}</Link>
                    <div className="text-right"><span className="font-display text-3xl font-bold leading-none text-brand-ink">{common(p.favorites)}</span><div className="font-mono text-[9px] uppercase">ortak</div></div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{formatDistanceToNow(store.matches[p.id].at, { locale: tr, addSuffix: true })} eşleştiniz</div>
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
                          <AlertDialogDescription>Sohbet geçmişi ikiniz için de silinir. Bu işlem geri alınamaz.</AlertDialogDescription>
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

      <section className="mt-8">
        <h2 className="text-xl font-bold">Beni beğenenler</h2>
        {store.people.some((p) => store.incoming[p.id] && !store.matches[p.id]) ? <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {store.people.filter((p) => store.incoming[p.id] && !store.matches[p.id]).map((p) => <li key={p.id} className="scene-panel p-3">
            <Link className="flex items-center gap-3" href={`/kullanici/${p.id}`}>
              <PersonPhoto id={p.id} name={p.name} avatarPath={p.avatar_path} className="size-12 rounded-full" />
              <span>{p.name}{store.incoming[p.id] === "super" && <span className="block text-xs text-brand-ink">Süper beğeni</span>}</span>
            </Link>
          </li>)}
        </ul> : <p className="mt-2 text-sm text-muted-foreground">Yeni beğeni yok.</p>}
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold tracking-tight">Beğendiklerin <span className="text-muted-foreground">/ yanıt bekleniyor</span></h2>
        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Bekleyen beğenin yok.</p>
        ) : (
          <div className="mt-4 flex gap-4 overflow-x-auto pb-2 scrollbar-none">
            {pending.map((p) => (
              <div key={p.id} className="w-28 shrink-0 text-center">
                <Link href={`/kullanici/${p.id}`} data-testid={`link-pending-${p.id}`}><PersonPhoto id={p.id} name={p.name} avatarPath={p.avatar_path} className="h-28 w-28 rounded-full opacity-70 ring-2 ring-border transition hover:opacity-100" textClassName="text-4xl" /></Link>
                <div className="mt-2 text-sm font-semibold">{p.name}</div>
                <button onClick={() => { void store.unlike(p.id).then((ok) => ok && toast({ title: "Beğeni geri alındı" })); }} data-testid={`button-unlike-${p.id}`} className="text-[11px] text-muted-foreground underline-offset-2 hover:text-brand-ink hover:underline">Geri al</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
