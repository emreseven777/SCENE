import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Quote } from "lucide-react";
import { PersonPhoto } from "@/components/person-photo";
import type { Person } from "@/lib/store";

export function ProfileGallery({ person }: { person: Person }) {
  const paths = person.avatar_paths;
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const count = paths.length;
  const move = (index: number) => {
    const element = track.current;
    if (element) element.scrollTo({ left: index * element.clientWidth, behavior: "auto" });
  };
  return (
    <section aria-label="Profil fotoğrafları" className="relative h-full">
      <div
        ref={track}
        className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain scrollbar-none"
        onScroll={(event) => {
          const element = event.currentTarget;
          setActive(Math.round(element.scrollLeft / element.clientWidth));
        }}
      >
        {(count ? paths : [null]).map((path) => (
          <div key={path ?? "empty"} className="h-full w-full shrink-0 snap-start">
            <PersonPhoto id={person.id} name={person.name} avatarPath={path} className="h-full w-full" textClassName="text-8xl lg:text-[12rem]" />
          </div>
        ))}
      </div>
      {count > 1 && (
        <>
          <button type="button" aria-label="Önceki fotoğraf" disabled={active <= 0} onClick={() => move(active - 1)} className="absolute left-2 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white disabled:opacity-30"><ChevronLeft /></button>
          <button type="button" aria-label="Sonraki fotoğraf" disabled={active >= count - 1} onClick={() => move(active + 1)} className="absolute right-2 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white disabled:opacity-30"><ChevronRight /></button>
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/65 px-3 py-1 text-xs text-white" aria-live="polite">{Math.min(active + 1, count)} / {count}</span>
        </>
      )}
    </section>
  );
}

export function ProfilePortrait({ person }: { person: Person }) {
  return (
    <div className="relative aspect-square overflow-hidden bg-card sm:max-h-[65svh] sm:aspect-[4/3]">
      <ProfileGallery person={person} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-5 pb-5 pt-14 text-white sm:px-8">
        <h1 data-testid="text-user-name" className="break-words font-display text-5xl font-black uppercase leading-[0.9] lg:text-7xl">{person.name}</h1>
        <div className="mt-2 flex items-center gap-1 text-sm"><MapPin size={14} />{person.city || "Şehir belirtilmemiş"}</div>
      </div>
    </div>
  );
}

export function ProfileAbout({ person }: { person: Person }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <p className="whitespace-pre-wrap break-words text-lg leading-relaxed text-foreground/85">{person.bio || "Henüz kendinden bahsetmemiş."}</p>
      {person.scene && (
        <blockquote className="border-l-2 border-primary pl-4">
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Unutamadığı sahne</div>
          <p className="mt-2 flex gap-2 break-words font-display text-2xl font-bold leading-tight"><Quote size={16} className="mt-1 shrink-0 text-primary" />{person.scene}</p>
        </blockquote>
      )}
    </div>
  );
}
