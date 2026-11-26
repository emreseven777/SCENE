import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Heart, X } from "lucide-react";
import { motion, useMotionValue, useReducedMotion, useTransform, animate } from "framer-motion";

export type SwipeDirection = "left" | "right" | "up";

export function SwipeCard({ children, next, labels, disabled, horizontalOnly = false, onSwipe }: {
  children: ReactNode;
  next?: ReactNode;
  labels: Record<"left" | "right", string> & { up?: string };
  horizontalOnly?: boolean;
  disabled?: boolean;
  onSwipe: (direction: SwipeDirection) => Promise<void>;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const reduced = useReducedMotion();
  const rotation = useTransform(x, [-240, 240], [-16, 16]);
  const gesture = useRef<{ id: number; x: number; y: number } | null>(null);
  const dragged = useRef(false);
  const working = useRef(false);
  const [direction, setDirection] = useState<SwipeDirection | null>(null);
  const reset = () => {
    setDirection(null);
    if (reduced) { x.set(0); y.set(0); return; }
    animate(x, 0, { type: "spring", stiffness: 430, damping: 32 });
    animate(y, 0, { type: "spring", stiffness: 430, damping: 32 });
  };
  const finish = async (event: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    gesture.current = null;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const result = !cancelled && !disabled && dragged.current && (!horizontalOnly && dy < -80 && -dy > Math.abs(dx) ? "up"
      : Math.abs(dx) > 78 && Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : null);
    if (!result) { reset(); return; }
    working.current = true;
    setDirection(result);
    try {
      if (!reduced) {
        await Promise.all([
          animate(x, result === "up" ? 0 : (result === "right" ? 1 : -1) * (window.innerWidth + 100), { duration: 0.23 }),
          animate(y, result === "up" ? -window.innerHeight : horizontalOnly ? 0 : dy, { duration: 0.23 }),
        ]);
      }
      await onSwipe(result);
    } catch {
      // The caller presents the failure and keeps the card in the deck.
    } finally {
      working.current = false;
      reset();
    }
  };
  return (
    <div className={`relative isolate min-w-0 overflow-x-clip ${horizontalOnly ? "" : "mb-4"}`} data-testid="swipe-deck">
      {next && <div className="pointer-events-none absolute inset-x-3 top-3 bottom-[-.65rem] -z-10 scale-[.97] overflow-hidden rounded-3xl border bg-muted opacity-65" aria-hidden="true">{next}</div>}
      <motion.div
        data-testid="swipe-card"
        className={`relative select-none ${horizontalOnly ? "touch-pan-y" : "touch-none"}`}
        style={{ x, y, rotate: reduced ? 0 : rotation }}
        onPointerDown={(event) => {
          if (disabled || working.current || gesture.current || !event.isPrimary || event.button !== 0 ||
            (event.target as Element).closest("a,button:not([data-swipe-tap]),input,select,[data-no-swipe]")) return;
          dragged.current = false;
          gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        }}
        onPointerMove={(event) => {
          const start = gesture.current;
          if (!start || start.id !== event.pointerId) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (horizontalOnly && !dragged.current && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
            gesture.current = null;
            return;
          }
          if (Math.hypot(dx, dy) < 8 && !event.currentTarget.hasPointerCapture(event.pointerId)) return;
          if (!dragged.current) {
            dragged.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
          }
          x.set(dx);
          y.set(horizontalOnly ? 0 : dy);
          setDirection(!horizontalOnly && dy < -25 && -dy > Math.abs(dx) ? "up" : Math.abs(dx) > 25 ? (dx > 0 ? "right" : "left") : null);
        }}
        onClickCapture={(event) => {
          if (dragged.current && event.detail > 0 && (event.target as Element).closest("[data-swipe-tap]")) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onDragStart={(event) => event.preventDefault()}
        onPointerUp={(event) => void finish(event, false)}
        onPointerCancel={(event) => void finish(event, true)}
        onLostPointerCapture={(event) => { if (event.target === event.currentTarget) void finish(event, true); }}
        onPointerLeave={(event) => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) void finish(event, true); }}
      >
        {children}
        {direction && (horizontalOnly ? <motion.div key={direction} data-testid="swipe-feedback" aria-hidden="true"
          initial={reduced ? false : { opacity: 0, scale: .72 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduced ? 0 : .16 }}
          className={`pointer-events-none absolute left-1/2 top-1/2 z-30 grid size-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 bg-black/65 shadow-lg ${direction === "right" ? "border-emerald-300 text-emerald-200" : "border-rose-300 text-rose-200"}`}>
          {direction === "right" ? <Heart size={48} fill="currentColor" /> : <X size={48} />}
        </motion.div> : <span aria-hidden="true" className="pointer-events-none absolute left-4 top-4 z-20 rounded-full border bg-card px-4 py-2 text-sm font-bold text-brand-ink shadow">{labels[direction]}</span>)}
      </motion.div>
    </div>
  );
}
