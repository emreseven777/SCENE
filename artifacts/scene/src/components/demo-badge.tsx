import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function DemoBadge({ full }: { full?: boolean }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button data-testid="button-demo-info" className={full ? "w-full rounded-md border border-primary/30 bg-primary/10 p-3 text-left text-xs leading-relaxed text-foreground/80 hover:bg-primary/15" : "rounded-full border border-primary/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-primary"}>
          {full ? (<><span className="font-mono text-[10px] uppercase tracking-widest text-primary">Demo modu</span><br />Örnek kişiler, örnek katalog. Veriler yalnızca bu tarayıcıda saklanır.</>) : "Demo"}
        </button>
      </DialogTrigger>
      <DialogContent className="border-white/10 bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl font-extrabold uppercase">Bu bir demo</DialogTitle>
          <DialogDescription className="space-y-2 text-sm leading-relaxed text-foreground/75">
            <span className="block">SCENE'in bu sürümünde gördüğün kişiler gerçek kullanıcı değil; örnek profillerdir. Kimse çevrim içi değildir.</span>
            <span className="block">Eşleşmeler yalnızca örnek kişi de seni beğenmişse oluşur. Sohbetteki yanıtlar otomatik üretilir ve "demo yanıt" olarak işaretlenir.</span>
            <span className="block">Profilin, favorilerin, beğenilerin ve mesajların yalnızca bu tarayıcının yerel depolamasında tutulur.</span>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
