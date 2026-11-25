import type { Title } from "@/lib/catalog";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Heart, MapPin, MessageCircle, Quote } from "lucide-react";
import { motion } from "framer-motion";
import { useCommon, useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Poster } from "@/components/poster";
import { TitleDetail } from "@/components/title-detail";
import { MatchOverlay } from "@/components/match-overlay";
import { PersonPhoto } from "@/components/person-photo";
import NotFound from "./not-found";

export default function UserPage() {
  const { id } = useParams<{ id: string }>();
  const { personById } = useStore();
  const p = personById(id ?? "");
  if (!p) return <NotFound />;
  return <UserView pid={p.id} />;
}

function UserView({ pid }: { pid: string }) {
  const store = useStore();
  const p = store.personById(pid)!;
  const { toast } = useToast();
  const common = useCommon(p.favorites);
  const others = p.favorites.filter((f) => !common.includes(f));
  const [selectedTitle, setSelectedTitle] = useState<Title | null>(null);
  const [matchPid, setMatchPid] = useState<string | null>(null);
  const matched = !!store.matches[p.id];
  const liked = store.liked.includes(p.id);
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <div className="relative h-[62vh] min-h-[420px] overflow-hidden lg:h-[70vh]">
        <motion.div className="h-full w-full" initial={{ scale: 1.12 }} animate={{ scale: 1 }} transition={{ duration: 1.4, ease: "easeOut" }}>
          <PersonPhoto id={p.id} name={p.name} avatarPath={p.avatar_path} className="h-full w-full" textClassName="text-[12rem] leading-none opacity-60" />
        </motion.div>
        <div className="vignette absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <Link href="/" data-testid="link-back" className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-black/50 backdrop-blur hover:bg-black/70"><ArrowLeft size={18} /></Link>
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-5xl px-4 pb-6 lg:px-10">
          <h1 className="font-display text-7xl font-black uppercase leading-[0.85] lg:text-8xl" data-testid="text-user-name">{p.name}</h1>
          <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground"><MapPin size={14} />{p.city || "Şehir belirtilmemiş"}</div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-10 px-4 lg:px-10">
        <div className="flex flex-wrap items-center gap-3">
          {matched ? (
            <Link href={`/mesajlar/${p.id}`} data-testid="link-chat" className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold"><MessageCircle size={17} />Mesaj gönder</Link>
          ) : liked ? (
            <Button variant="secondary" disabled={busy} onClick={async () => { setBusy(true); const ok = await store.unlike(p.id); setBusy(false); if (ok) toast({ title: "Beğeni geri alındı" }); }} data-testid="button-unlike"><Heart size={16} className="mr-2 fill-primary text-primary" />Beğendin — geri al</Button>
          ) : (
            <motion.div whileTap={{ scale: 0.92 }}>
              <Button className="h-11 px-6" disabled={busy} onClick={async () => {
                setBusy(true);
                const m = await store.like(p.id);
                setBusy(false);
                if (m) setMatchPid(p.id); else if (m === false) toast({ title: `${p.name} beğenildi`, description: "Karşılıklı olursa eşleşirsiniz." });
              }} data-testid="button-like-user"><Heart size={17} className="mr-2" fill="currentColor" />Beğen</Button>
            </motion.div>
          )}
          <div className="rounded-md border border-primary/30 px-4 py-2.5"><span className="font-display text-2xl font-black text-primary" data-testid="text-user-common">{common.length}</span> <span className="text-sm text-muted-foreground">ortak film ve dizi</span></div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          <p className="text-lg leading-relaxed text-foreground/85">{p.bio || "Henüz kendinden bahsetmemiş."}</p>
          {p.scene && (
            <blockquote className="border-l-2 border-primary pl-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Unutamadığı sahne</div>
              <p className="mt-2 flex gap-2 font-display text-2xl font-bold leading-tight"><Quote size={16} className="mt-1 shrink-0 text-primary" />{p.scene}</p>
            </blockquote>
          )}
        </div>

        <section>
          <h2 className="mb-4 font-display text-3xl font-extrabold uppercase">Ortak <span className="text-primary">favoriler</span></h2>
          {common.length ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {common.map((id) => { const t = store.titleById(id, p.id); return t && <Poster key={id} t={t} onClick={() => setSelectedTitle(t)} className="ring-2 ring-primary/70" />; })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-white/15 p-6 text-sm text-muted-foreground">Henüz ortak favoriniz yok. Aşağıdaki listeden birini favorilerine eklersen sayı anında güncellenir.</div>
          )}
        </section>

        {others.length > 0 && (
          <section>
            <h2 className="mb-4 font-display text-2xl font-extrabold uppercase text-foreground/80">{p.name} ayrıca seviyor</h2>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {others.map((id) => { const t = store.titleById(id, p.id); return t && <Poster key={id} t={t} onClick={() => setSelectedTitle(t)} />; })}
            </div>
          </section>
        )}
      </div>
      <TitleDetail title={selectedTitle} onClose={() => setSelectedTitle(null)} />
      <MatchOverlay pid={matchPid} onClose={() => setMatchPid(null)} />
    </div>
  );
}
