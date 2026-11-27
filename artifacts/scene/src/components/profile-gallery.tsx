import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Quote, X } from "lucide-react";
import { ProfileIdentity } from "@/components/profile-identity";
import { PersonPhoto } from "@/components/person-photo";
import type { Person } from "@/lib/store";

export function ProfileGallery({ person, preview = false }: { person: Person; preview?: boolean }) {
  const paths = person.avatar_paths;
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const count = paths.length;
  const [expanded, setExpanded] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [zoom, setZoom] = useState(1);
  const pinch = useRef<{ distance: number; scale: number } | null>(null);
  useEffect(() => { setZoom(1); }, [expanded]);
  const fullTrack = useRef<HTMLDivElement>(null);
  const open = preview && expanded !== null && count > 0;
  useEffect(() => {
    const el = dialog.current;
    if (!open || !el) return;
    el.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { el.close(); document.body.style.overflow = previous; };
  }, [open]);
  useEffect(() => {
    if (open && fullTrack.current && expanded !== null) fullTrack.current.scrollLeft = expanded * fullTrack.current.clientWidth;
  }, [open]);
  const fullMove = (index: number) => { const el = fullTrack.current; if (el) el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" }); };
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
            {preview && path ? <button type="button" aria-label="Fotoğrafı büyüt" className="block h-full w-full" onClick={() => setExpanded(paths.indexOf(path))}><PersonPhoto id={person.id} name={person.name} avatarPath={path} className="h-full w-full" textClassName="text-8xl lg:text-[12rem]" /></button> : <PersonPhoto id={person.id} name={person.name} avatarPath={path} className="h-full w-full" textClassName="text-8xl lg:text-[12rem]" />}
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
      {open && <dialog ref={dialog} aria-label="Tam ekran profil fotoğrafları" onCancel={(event) => { event.preventDefault(); setExpanded(null); }} className="fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none overflow-hidden bg-black p-0 text-white backdrop:bg-black">
        <div ref={fullTrack} style={{ touchAction: zoom > 1 ? "none" : "pan-x", overflowX: zoom > 1 ? "hidden" : "auto" }} onTouchStart={(e) => { if (e.touches.length === 2) pinch.current = { distance: Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY), scale: zoom }; }} onTouchMove={(e) => { if (e.touches.length === 2 && pinch.current) { const distance = Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY); setZoom(Math.max(1, Math.min(4, pinch.current.scale * distance / Math.max(1,pinch.current.distance)))); } }} onTouchEnd={() => { pinch.current = null; }} onTouchCancel={() => { pinch.current = null; }} className="flex h-full snap-x snap-mandatory overflow-x-auto scrollbar-none" onScroll={(event) => { const el = event.currentTarget; if (el.clientWidth) setExpanded(Math.max(0, Math.min(count - 1, Math.round(el.scrollLeft / el.clientWidth)))); }}>
          {paths.map((path) => <div key={path} className="flex h-full w-full shrink-0 snap-start items-center overflow-hidden"><div className="h-full w-full" style={{ transform: `scale(${paths.indexOf(path) === expanded ? zoom : 1})` }}><PersonPhoto id={person.id} name={person.name} avatarPath={path} contain priority={paths.indexOf(path) === expanded} className="h-full w-full !bg-black [&_img]:!object-center" /></div></div>)}
        </div>
        <span className="absolute left-4 top-4 rounded-full bg-black/70 px-4 py-2" aria-live="polite">{(expanded ?? 0) + 1} / {count}</span>
        <button autoFocus type="button" aria-label="Önizlemeyi kapat" onClick={() => setExpanded(null)} className="absolute right-4 top-4 grid size-12 place-items-center rounded-full bg-black/70"><X /></button>
        {count > 1 && <><button type="button" aria-label="Önceki büyük fotoğraf" disabled={expanded === 0} onClick={() => fullMove((expanded ?? 0) - 1)} className="absolute left-2 top-1/2 grid size-11 place-items-center rounded-full bg-black/60 disabled:opacity-30"><ChevronLeft /></button><button type="button" aria-label="Sonraki büyük fotoğraf" disabled={expanded === count - 1} onClick={() => fullMove((expanded ?? 0) + 1)} className="absolute right-2 top-1/2 grid size-11 place-items-center rounded-full bg-black/60 disabled:opacity-30"><ChevronRight /></button></>}
      </dialog>}
    </section>
  );
}

export function ProfilePortrait({ person, preview = false }: { person: Person; preview?: boolean }) {
  return (
    <div className="relative aspect-square overflow-hidden bg-card sm:max-h-[65svh] sm:aspect-[4/3]">
      <ProfileGallery person={person} preview={preview} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#201d29] via-[#201d29]/65 to-transparent px-5 pb-5 pt-14 text-white sm:px-8">
        <ProfileIdentity person={person} as="h1" size="text-4xl lg:text-6xl" testId="text-user-name" />
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
          <div className="font-mono text-[10px] uppercase tracking-widest text-brand-ink">Unutamadığı sahne</div>
          <p className="mt-2 flex gap-2 break-words font-display text-2xl font-bold leading-tight"><Quote size={16} className="mt-1 shrink-0 text-brand-ink" />{person.scene}</p>
        </blockquote>
      )}
    </div>
  );
}
