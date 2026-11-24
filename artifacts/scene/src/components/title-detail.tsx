import { Link } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { byId } from "@/lib/catalog";
import { PEOPLE } from "@/lib/people";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { HeartButton } from "./heart-button";

export function TitleDetail({ id, onClose }: { id: string | null; onClose: () => void }) {
  const t = id ? byId(id) : undefined;
  const { isFav, toggleFavorite } = useStore();
  const { toast } = useToast();
  const fans = t ? PEOPLE.filter((p) => p.favorites.includes(t.id)) : [];
  return (
    <Dialog open={!!t} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl overflow-hidden border-white/10 bg-card p-0">
        {t && (
          <div className="grid sm:grid-cols-[220px_1fr]">
            <div className="relative h-56 sm:h-full">
              <img src={t.poster} alt={t.title} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-card" />
            </div>
            <div className="space-y-4 p-6">
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">{t.type === "film" ? "Film" : "Dizi"} / {t.year} / {t.genres.join(", ")}</div>
              <DialogTitle className="font-display text-4xl font-extrabold uppercase leading-none">{t.title}</DialogTitle>
              {t.original && <p className="-mt-2 text-sm italic text-muted-foreground">{t.original}</p>}
              <DialogDescription className="text-sm leading-relaxed text-foreground/80">{t.overview}</DialogDescription>
              <p className="text-xs text-muted-foreground">Yaratıcı / Yönetmen: <span className="text-foreground">{t.by}</span></p>
              <div className="flex items-center gap-3">
                <HeartButton testId="button-detail-favorite" active={isFav(t.id)} onToggle={() => {
                  const added = toggleFavorite(t.id);
                  toast({ title: added ? "Favorilere eklendi" : "Favorilerden çıkarıldı", description: `${t.title} — ortak sayılar güncellendi.` });
                }} />
                <span className="text-sm">{isFav(t.id) ? "Favorilerinde" : "Favorilerine ekle"}</span>
              </div>
              {fans.length > 0 && (
                <div>
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Bunu sevenler</div>
                  <div className="flex flex-wrap gap-2">
                    {fans.map((p) => (
                      <Link key={p.id} href={`/kullanici/${p.id}`} onClick={onClose} data-testid={`link-fan-${p.id}`} className="flex items-center gap-2 rounded-full bg-white/5 py-1 pl-1 pr-3 text-xs hover:bg-white/10">
                        <img src={p.photo} alt="" className="h-6 w-6 rounded-full object-cover" />{p.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
