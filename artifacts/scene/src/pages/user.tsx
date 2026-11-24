import { useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Heart, MapPin, MessageCircle, Quote } from "lucide-react";
import { motion } from "framer-motion";
import { personById } from "@/lib/people";
import { byId } from "@/lib/catalog";
import { useCommon, useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Poster } from "@/components/poster";
import { TitleDetail } from "@/components/title-detail";
import { MatchOverlay } from "@/components/match-overlay";
import NotFound from "./not-found";

export default function UserPage() {
  const { id } = useParams<{ id: string }>();
  const p = personById(id ?? "");
  if (!p) return <NotFound />;
  return <UserView pid={p.id} />;
}

function UserView({ pid }: { pid: string }) {
  const p = personById(pid)!;
  const store = useStore();
  const { toast } = useToast();
  const common = useCommon(p.favorites);
  const others = p.favorites.filter((f) => !common.includes(f));
  const [titleId, setTitleId] = useState<string | null>(null);
  const [matchPid, setMatchPid] = useState<string | null>(null);
  const matched = !!store.matches[p.id];
  const liked = store.liked.includes(p.id);
  const sceneTitle = byId(p.sceneFrom);

  return (
    <div>
      <div className="relative h-[62vh] min-h-[420px] overflow-hidden lg:h-[70vh]">
        <motion.img src={p.photo} alt={p.name} className="h-full w-full object-cover" initial={{ scale: 1.12 }} animate={{ scale: 1 }} transition={{ duration: 1.4, ease: "easeOut" }} />
        <div className="vignette absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <Link href="/" data-testid="link-back" className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-black/50 backdrop-blur hover:bg-black/70"><ArrowLeft size={18} /></Link>
        <div className="absolute right-4 top-4 rounded-sm bg-black/60 px-2 py-1 font-mono text-[10px] uppercase tracking-widest backdrop-blur">Örnek profil</div>
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-5xl px-4 pb-6 lg:px-10">
          <h1 className="font-display text-7xl font-black uppercase leading-[0.85] lg:text-8xl" data-testid="text-user-name">{p.name}<span className="ml-3 text-4xl font-medium text-foreground/50">{p.age}</span></h1>
          <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground"><MapPin size={14} />{p.city}</div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-10 px-4 lg:px-10">
        <div className="flex flex-wrap items-center gap-3">
          {matched ? (
            <Link href={`/mesajlar/${p.id}`} data-testid="link-chat" className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold"><MessageCircle size={17} />Mesaj gönder</Link>
          ) : liked ? (
            <Button variant="secondary" onClick={() => { store.unlike(p.id); toast({ title: "Beğeni geri alındı" }); }} data-testid="button-unlike"><Heart size={16} className="mr-2 fill-primary text-primary" />Beğendin — geri al</Button>
          ) : (
            <motion.div whileTap={{ scale: 0.92 }}>
              <Button className="h-11 px-6" onClick={() => {
                const m = store.like(p.id);
                if (m) setMatchPid(p.id); else toast({ title: `${p.name} beğenildi`, description: "Karşılıklı olursa eşleşirsiniz." });
              }} data-testid="button-like-user"><Heart size={17} className="mr-2" fill="currentColor" />Beğen</Button>
            </motion.div>
          )}
          <div className="rounded-md border border-primary/30 px-4 py-2.5"><span className="font-display text-2xl font-black text-primary" data-testid="text-user-common">{common.length}</span> <span className="text-sm text-muted-foreground">ortak film ve dizi</span></div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          <p className="text-lg leading-relaxed text-foreground/85">{p.bio}</p>
          <blockquote className="border-l-2 border-primary pl-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Unutamadığı sahne</div>
            <p className="mt-2 flex gap-2 font-display text-2xl font-bold leading-tight"><Quote size={16} className="mt-1 shrink-0 text-primary" />{p.scene}</p>
            {sceneTitle && <div className="mt-1 text-sm text-muted-foreground">{sceneTitle.title}, {sceneTitle.year}</div>}
          </blockquote>
        </div>

        <section>
          <h2 className="mb-4 font-display text-3xl font-extrabold uppercase">Ortak <span className="text-primary">favoriler</span></h2>
          {common.length ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {common.map((id) => { const t = byId(id); return t && <Poster key={id} t={t} onClick={() => setTitleId(id)} className="ring-2 ring-primary/70" />; })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-white/15 p-6 text-sm text-muted-foreground">Henüz ortak favoriniz yok. Aşağıdaki listeden birini favorilerine eklersen sayı anında güncellenir.</div>
          )}
        </section>

        {others.length > 0 && (
          <section>
            <h2 className="mb-4 font-display text-2xl font-extrabold uppercase text-foreground/80">{p.name} ayrıca seviyor</h2>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {others.map((id) => { const t = byId(id); return t && <Poster key={id} t={t} onClick={() => setTitleId(id)} />; })}
            </div>
          </section>
        )}
      </div>
      <TitleDetail id={titleId} onClose={() => setTitleId(null)} />
      <MatchOverlay pid={matchPid} onClose={() => setMatchPid(null)} />
    </div>
  );
}
