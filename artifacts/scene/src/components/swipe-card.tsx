import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useTransform, animate } from "framer-motion";

export type SwipeDirection = "left" | "right" | "up";

export function SwipeCard({ children, next, labels, disabled, onSwipe }: {
  children: ReactNode;
  next?: ReactNode;
  labels: Record<SwipeDirection, string>;
  disabled?: boolean;
  onSwipe: (direction: SwipeDirection) => Promise<void>;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const reduced = useReducedMotion();
  const rotation = useTransform(x, [-240, 240], [-16, 16]);
  const gesture = useRef<{ id: number; x: number; y: number } | null>(null);
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
    const dx = x.get();
    const dy = y.get();
    const result = !cancelled && (dy < -80 && -dy > Math.abs(dx) ? "up"
      : Math.abs(dx) > 78 && Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : null);
    if (!result) { reset(); return; }
    working.current = true;
    try {
      if (!reduced) {
        await Promise.all([
          animate(x, result === "up" ? 0 : (result === "right" ? 1 : -1) * (window.innerWidth + 100), { duration: 0.23 }),
          animate(y, result === "up" ? -window.innerHeight : dy, { duration: 0.23 }),
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
    <div className="relative mb-4 isolate" data-testid="swipe-deck">
      {next && <div className="pointer-events-none absolute inset-x-3 top-3 bottom-[-.65rem] -z-10 scale-[.97] overflow-hidden rounded-3xl border bg-muted opacity-65" aria-hidden="true">{next}</div>}
      <motion.div
        data-testid="swipe-card"
        className="relative touch-none select-none"
        style={{ x, y, rotate: reduced ? 0 : rotation }}
        onPointerDown={(event) => {
          if (disabled || working.current || gesture.current || !event.isPrimary || event.button !== 0 ||
            (event.target as HTMLElement).closest("button,input,select,[data-no-swipe]")) return;
          gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        }}
        onPointerMove={(event) => {
          const start = gesture.current;
          if (!start || start.id !== event.pointerId) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.hypot(dx, dy) < 8 && !event.currentTarget.hasPointerCapture(event.pointerId)) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          x.set(dx);
          y.set(dy);
          setDirection(dy < -25 && -dy > Math.abs(dx) ? "up" : Math.abs(dx) > 25 ? (dx > 0 ? "right" : "left") : null);
        }}
        onDragStart={(event) => event.preventDefault()}
        onPointerUp={(event) => void finish(event, false)}
        onPointerCancel={(event) => void finish(event, true)}
        onLostPointerCapture={(event) => { if (event.target === event.currentTarget) void finish(event, true); }}
        onPointerLeave={(event) => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) void finish(event, true); }}
      >
        {children}
        {direction && <span aria-hidden="true" className="pointer-events-none absolute left-4 top-4 z-20 rounded-full border bg-card px-4 py-2 text-sm font-bold text-brand-ink shadow">{labels[direction]}</span>}
      </motion.div>
    </div>
  );
}
