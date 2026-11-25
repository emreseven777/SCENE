import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { useCommon, useStore } from "@/lib/store";
import { PersonPhoto } from "./person-photo";
import { Button } from "@/components/ui/button";

export function MatchOverlay({ pid, onClose }: { pid: string | null; onClose: () => void }) {
  const { personById } = useStore();
  const p = pid ? personById(pid) : undefined;
  return <AnimatePresence>{p && <Inner key={p.id} pid={p.id} onClose={onClose} />}</AnimatePresence>;
}

function Inner({ pid, onClose }: { pid: string; onClose: () => void }) {
  const p = useStore().personById(pid)!;
  const common = useCommon(p.favorites);
  const [, go] = useLocation();
  return (
    <motion.div className="fixed inset-0 z-[90] grid place-items-center bg-[#201d29]/80 p-6 backdrop-blur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} data-testid="overlay-match">
      <div className="scene-panel w-full max-w-md p-5 text-center sm:p-10">
        <motion.div className="text-sm font-semibold text-brand-ink" initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>Karşılıklı beğeni</motion.div>
        <motion.h2 className="scene-title mt-3" initial={{ scale: 1.6, opacity: 0, letterSpacing: "0.3em" }} animate={{ scale: 1, opacity: 1, letterSpacing: "0em" }} transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}>
          Aynı <span className="text-brand-ink">sahnedesiniz.</span>
        </motion.h2>
        <div className="relative mx-auto mt-8 flex h-36 w-full max-w-64 justify-center">
          <motion.div className="absolute left-4 h-36 w-28 -rotate-6 overflow-hidden scene-gradient rounded-2xl ring-2 ring-card" initial={{ x: -80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3, type: "spring" }}>
            <div className="grid h-full place-items-center font-display text-3xl font-extrabold text-primary-foreground">Sen</div>
          </motion.div>
          <motion.div className="absolute right-4 h-36 w-28 rotate-6 overflow-hidden rounded-2xl ring-2 ring-card" initial={{ x: 80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3, type: "spring" }}>
            <PersonPhoto id={p.id} name={p.name} avatarPath={p.avatar_path} className="h-full w-full" textClassName="text-4xl" />
          </motion.div>
        </div>
        <p className="mt-8 text-foreground/80">{p.name} ile <span className="font-semibold text-brand-ink">{common.length} ortak</span> film ve dizi. Konuşmayı sen başlat.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="secondary" onClick={onClose} data-testid="button-match-close">Keşfe dön</Button>
          <Button onClick={() => { onClose(); go(`/mesajlar/${p.id}`); }} data-testid="button-match-message">Mesaj gönder</Button>
        </div>
      </div>
    </motion.div>
  );
}
