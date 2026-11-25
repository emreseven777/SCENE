import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

const RAYS = Array.from({ length: 8 }, (_, i) => (i * Math.PI * 2) / 8);

export function HeartButton({ active, onToggle, size = "md", label, testId }: { active: boolean; onToggle: () => void; size?: "sm" | "md" | "lg"; label?: string; testId?: string }) {
  const [burst, setBurst] = useState(0);
  const dims = size === "lg" ? "h-16 w-16" : size === "md" ? "h-10 w-10" : "h-8 w-8";
  const icon = size === "lg" ? 28 : size === "md" ? 18 : 15;
  return (
    <button
      type="button"
      aria-label={label ?? (active ? "Favorilerden çıkar" : "Favorilere ekle")}
      aria-pressed={active}
      data-testid={testId}
      onClick={(e) => { e.stopPropagation(); if (!active) setBurst((b) => b + 1); onToggle(); }}
      className={cn("relative grid place-items-center rounded-full transition-colors", dims,
        active ? "bg-primary text-primary-foreground" : "bg-[#201d29]/75 text-white ring-1 ring-white/15 backdrop-blur hover:bg-black/80")}
    >
      <motion.span key={`${active}`} initial={{ scale: active ? 0.3 : 1 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 14 }}>
        <Heart size={icon} fill={active ? "currentColor" : "none"} strokeWidth={2.2} />
      </motion.span>
      <AnimatePresence>
        {burst > 0 && active && (
          <motion.span key={burst} className="pointer-events-none absolute inset-0" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.7 }}>
            <motion.span className="absolute inset-0 rounded-full ring-2 ring-primary" initial={{ scale: 0.8 }} animate={{ scale: 2 }} transition={{ duration: 0.6 }} />
            {RAYS.map((a, i) => (
              <motion.span key={i} className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -ml-[3px] -mt-[3px] rounded-full bg-primary"
                initial={{ x: 0, y: 0, scale: 1 }} animate={{ x: Math.cos(a) * 30, y: Math.sin(a) * 30, scale: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} />
            ))}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
