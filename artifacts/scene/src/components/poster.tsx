import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Title } from "@/lib/catalog";

export function Poster({ t, className, onClick, badge }: { t: Title; className?: string; onClick?: () => void; badge?: ReactNode }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className={cn("group relative aspect-[2/3] overflow-hidden rounded-2xl bg-card ring-1 ring-white/5 transition-transform duration-300 hover:-translate-y-1", className)}>
      <button
        type="button"
        onClick={onClick}
        aria-label={t.title}
        data-testid={`poster-${t.id}`}
        className="block h-full w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        {!t.poster || broken ? (
          <div className="flex h-full flex-col justify-between overflow-hidden bg-gradient-to-br from-[#472b63] to-[#201d29] text-white p-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-peach">{t.type === "film" ? "Film" : "Dizi"}{t.year ? ` / ${t.year}` : ""}</span>
            <span className="line-clamp-3 font-display text-xl font-extrabold leading-tight">{t.title}</span>
          </div>
        ) : (
          <img src={t.poster} alt="" loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
      {badge && <div className="absolute right-1.5 top-1.5">{badge}</div>}
    </div>
  );
}
