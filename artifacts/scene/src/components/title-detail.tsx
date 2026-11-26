import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { Title } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { HeartButton } from "./heart-button";

export function TitleDetail({ id, title, onClose }: { id?: string | null; title?: Title | null; onClose: () => void }) {
  const { isFav, toggleFavorite, titleById } = useStore();
  const t = title ?? (id ? titleById(id) : undefined);
  const { toast } = useToast();
  return (
    <Dialog open={!!t} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto rounded-3xl border-border bg-card p-0">
        {t && (
          <div className="grid sm:grid-cols-[220px_1fr]">
            <div className="relative h-56 sm:h-full">
              {t.poster && <img src={t.poster} alt={t.title} className="h-full w-full object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-card" />
            </div>
            <div className="space-y-4 p-6">
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-ink">{t.type === "film" ? "Film" : "Dizi"}{t.year ? ` / ${t.year}` : ""}{t.genres.length ? ` / ${t.genres.join(", ")}` : ""}</div>
              <DialogTitle className="font-display text-3xl font-bold leading-tight tracking-tight">{t.title}</DialogTitle>
              {t.original && <p className="-mt-2 text-sm italic text-muted-foreground">{t.original}</p>}
              <DialogDescription className="text-sm leading-relaxed text-foreground/80">{t.overview || "Bu yapım için özet bulunamadı."}</DialogDescription>
              {t.by && <p className="text-xs text-muted-foreground">Yaratıcı / Yönetmen: <span className="text-foreground">{t.by}</span></p>}
              <div className="flex items-center gap-3">
                <HeartButton testId="button-detail-favorite" active={isFav(t.id)} onToggle={() => {
                  const added = toggleFavorite(t.id, t);
                  toast({ title: added ? "Favorilere eklendi" : "Favorilerden çıkarıldı", description: `${t.title} — ortak sayılar güncellendi.` });
                }} />
                <span className="text-sm">{isFav(t.id) ? "Favorilerinde" : "Favorilerine ekle"}</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
