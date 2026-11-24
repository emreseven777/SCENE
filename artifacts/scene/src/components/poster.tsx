import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Title } from "@/lib/catalog";

export function Poster({ t, className, onClick, badge }: { t: Title; className?: string; onClick?: () => void; badge?: ReactNode }) {
  const [broken, setBroken] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`poster-${t.id}`}
      className={cn("group relative aspect-[2/3] overflow-hidden rounded-md bg-card text-left ring-1 ring-white/5 transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", className)}
    >
      {broken ? (
        <div className="flex h-full flex-col justify-between bg-gradient-to-br from-[hsl(357_60%_18%)] to-[hsl(0_8%_6%)] p-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">{t.type === "film" ? "Film" : "Dizi"} / {t.year}</span>
          <span className="font-display text-xl font-extrabold uppercase leading-none">{t.title}</span>
        </div>
      ) : (
        <img src={t.poster} alt={t.title} loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      {badge && <div className="absolute right-1.5 top-1.5">{badge}</div>}
    </button>
  );
}
