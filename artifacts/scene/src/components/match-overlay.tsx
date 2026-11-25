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
    <motion.div className="fixed inset-0 z-[90] grid place-items-center bg-[hsl(0_8%_3%/0.94)] p-6 backdrop-blur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} data-testid="overlay-match">
      <div className="absolute inset-x-0 top-0 h-10 bg-[repeating-linear-gradient(90deg,transparent_0_14px,hsl(0_0%_100%/0.06)_14px_24px)]" />
      <div className="absolute inset-x-0 bottom-0 h-10 bg-[repeating-linear-gradient(90deg,transparent_0_14px,hsl(0_0%_100%/0.06)_14px_24px)]" />
      <div className="max-w-md text-center">
        <motion.div className="font-mono text-xs uppercase tracking-[0.4em] text-primary" initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>Karşılıklı beğeni</motion.div>
        <motion.h2 className="mt-3 font-display text-7xl font-black uppercase leading-[0.85]" initial={{ scale: 1.6, opacity: 0, letterSpacing: "0.3em" }} animate={{ scale: 1, opacity: 1, letterSpacing: "0em" }} transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}>
          Aynı<br /><span className="text-primary">sahne.</span>
        </motion.h2>
        <div className="relative mx-auto mt-8 flex h-36 w-64 justify-center">
          <motion.div className="absolute left-4 h-36 w-28 -rotate-6 overflow-hidden rounded-md bg-gradient-to-br from-primary to-[hsl(357_60%_20%)] ring-2 ring-white/10" initial={{ x: -80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3, type: "spring" }}>
            <div className="grid h-full place-items-center font-display text-4xl font-black">SEN</div>
          </motion.div>
          <motion.div className="absolute right-4 h-36 w-28 rotate-6 overflow-hidden rounded-md ring-2 ring-white/10" initial={{ x: 80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3, type: "spring" }}>
            <PersonPhoto id={p.id} name={p.name} avatarPath={p.avatar_path} className="h-full w-full" textClassName="text-4xl" />
          </motion.div>
        </div>
        <p className="mt-8 text-foreground/80">{p.name} ile <span className="font-semibold text-primary">{common.length} ortak</span> film ve dizi. Konuşmayı sen başlat.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" onClick={onClose} data-testid="button-match-close">Keşfe dön</Button>
          <Button onClick={() => { onClose(); go(`/mesajlar/${p.id}`); }} data-testid="button-match-message">Mesaj gönder</Button>
        </div>
      </div>
    </motion.div>
  );
}
