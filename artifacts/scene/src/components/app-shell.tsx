import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Clapperboard, Flame, MessageCircle, Search, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { DemoBadge } from "./demo-badge";

const NAV = [
  { href: "/", label: "Keşfet", icon: Flame },
  { href: "/eslesmeler", label: "Eşleşmeler", icon: Clapperboard },
  { href: "/mesajlar", label: "Mesajlar", icon: MessageCircle },
  { href: "/profil", label: "Profil", icon: UserRound },
];

function isActive(loc: string, href: string) {
  return href === "/" ? loc === "/" : loc.startsWith(href);
}

export function Logo() {
  return (
    <Link href="/" className="flex items-baseline gap-1 font-display text-3xl font-black tracking-tight" data-testid="link-logo">
      SCEN<span className="text-primary">E</span>
      <span className="ml-0.5 inline-block h-2 w-2 rounded-full bg-primary" />
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const { matches } = useStore();
  const matchCount = Object.keys(matches).length;
  return (
    <div className="min-h-[100dvh] lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-[100dvh] flex-col border-r border-white/5 bg-sidebar px-5 py-7 lg:flex">
        <Logo />
        <p className="mt-2 text-xs text-muted-foreground">Aynı sahneyi sevenler.</p>
        <nav className="mt-10 space-y-1">
          {[...NAV, { href: "/arama", label: "Film ve dizi ara", icon: Search }].map(({ href, label, icon: Icon }) => {
            const on = isActive(loc, href);
            return (
              <Link key={href} href={href} data-testid={`nav-desktop-${href}`} className={cn("relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors", on ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
                {on && <motion.span layoutId="rail" className="absolute inset-0 rounded-md bg-white/[0.06]" />}
                {on && <motion.span layoutId="rail-bar" className="absolute left-0 top-2 bottom-2 w-0.5 bg-primary" />}
                <Icon size={18} className={cn("relative", on && "text-primary")} />
                <span className="relative">{label}</span>
                {href === "/eslesmeler" && matchCount > 0 && <span className="relative ml-auto font-mono text-[11px] text-primary">{matchCount}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto"><DemoBadge full /></div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/5 bg-background/80 px-4 py-3 backdrop-blur-xl lg:hidden">
          <Logo />
          <div className="flex items-center gap-2">
            <DemoBadge />
            <Link href="/arama" aria-label="Ara" data-testid="link-search-mobile" className="grid h-9 w-9 place-items-center rounded-full bg-white/5 hover:bg-white/10"><Search size={17} /></Link>
          </div>
        </header>
        <motion.main key={loc.split("/")[1]} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }} className="pb-safe">
          {children}
        </motion.main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[hsl(0_8%_4%/0.92)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-4">
          {NAV.map(({ href, label, icon: Icon }) => {
            const on = isActive(loc, href);
            return (
              <Link key={href} href={href} data-testid={`nav-${label}`} className={cn("relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium", on ? "text-foreground" : "text-muted-foreground")}>
                {on && <motion.span layoutId="tab" className="absolute top-0 h-0.5 w-10 bg-primary" />}
                <Icon size={21} className={cn(on && "text-primary")} />
                {label}
                {href === "/eslesmeler" && matchCount > 0 && <span className="absolute right-[26%] top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
