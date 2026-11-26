import { ProfileDetails, ProfileSafety } from "@/components/dating-profile";
import { CINEMA_FIT_DESCRIPTION, cinemaFit, profileCinemaSignals } from "@/lib/dating";
import type { Title } from "@/lib/catalog";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Heart, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useCommon, useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Poster } from "@/components/poster";
import { TitleDetail } from "@/components/title-detail";
import { MatchOverlay } from "@/components/match-overlay";
import { ProfilePortrait, ProfileAbout } from "@/components/profile-gallery";
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
  const own = profileCinemaSignals(store.me?.favorites ?? [], store.me?.discovery_details, (id) => store.titleById(id));
  const other = profileCinemaSignals(p.favorites, p.discovery_details, (id) => store.titleById(id, p.id));
  const { score: fit, commonGenres, sharedCount } = cinemaFit(own, other);
  const others = p.favorites.filter((f) => !common.includes(f));
  const [selectedTitle, setSelectedTitle] = useState<Title | null>(null);
  const [matchPid, setMatchPid] = useState<string | null>(null);
  const matched = !!store.matches[p.id];
  const liked = store.liked.includes(p.id);
  const [busy, setBusy] = useState(false);

  return (
    <div className="scene-page max-w-5xl">
      <div className="scene-panel relative overflow-hidden">
        <ProfilePortrait key={p.id} person={p} />
        <Link href="/" aria-label="Keşfet’e dön" data-testid="link-back" className="absolute left-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/70"><ArrowLeft size={18} /></Link>
      </div>

      <div className="mt-6 space-y-8">
        <div className="flex flex-wrap items-center gap-3">
          {matched ? (
            <Link href={`/mesajlar/${p.id}`} data-testid="link-chat" className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"><MessageCircle size={17} />Mesaj gönder</Link>
          ) : liked ? (
            <Button variant="secondary" disabled={busy} onClick={async () => { setBusy(true); const ok = await store.unlike(p.id); setBusy(false); if (ok) toast({ title: "Beğeni geri alındı" }); }} data-testid="button-unlike"><Heart size={16} className="mr-2 fill-primary text-brand-ink" />Beğendin — geri al</Button>
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
          <div className="rounded-md border border-primary/30 px-4 py-2.5"><span className="font-display text-2xl font-bold text-brand-ink" data-testid="text-user-common">{common.length}</span> <span className="text-sm text-muted-foreground">ortak film ve dizi</span></div>
        </div>

        <ProfileAbout person={p} />
        <ProfileDetails person={p} />
        <section className="scene-panel p-4 sm:p-6">
          <h2 className="text-xl font-bold">Sinema uyumu</h2>
          {fit === null ? <p className="mt-2 text-sm text-muted-foreground">Uyumu hesaplamak için ikinizin de en az üç favorisi gerekli.</p>
            : <p className="mt-2 text-sm"><strong>%{fit}</strong> · {CINEMA_FIT_DESCRIPTION}</p>}
          {sharedCount > common.length && <p className="mt-2 text-sm">Profilde seçtiğiniz yapımlar da ortak.</p>}
          {commonGenres.length > 0 && <p className="mt-2 text-sm">Ortak türler: {commonGenres.join(", ")}</p>}
        </section>
        <ProfileSafety person={p} />

        <section>
          <h2 className="mb-4 font-display text-2xl font-bold tracking-tight">Ortak <span className="text-brand-ink">favoriler</span></h2>
          {common.length ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {common.map((id) => { const t = store.titleById(id, p.id); return t && <Poster key={id} t={t} onClick={() => setSelectedTitle(t)} className="ring-2 ring-primary/70" />; })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">Henüz ortak favoriniz yok. Aşağıdaki listeden birini favorilerine eklersen sayı anında güncellenir.</div>
          )}
        </section>

        {others.length > 0 && (
          <section>
            <h2 className="mb-4 font-display text-2xl font-bold tracking-tight text-foreground/80">{p.name} ayrıca seviyor</h2>
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
