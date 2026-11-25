import { useEffect } from "react";
import { requireSupabase } from "@/lib/supabase";
import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Bell, Clapperboard, Compass, HeartHandshake, MessageCircle, Search, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { SceneBrand, ThemeToggle } from "@/components/scene-brand";

const NAV = [
  { href: "/", label: "Keşfet", icon: Compass },
  { href: "/sinema", label: "Sinema", icon: Clapperboard },
  { href: "/begeniler", label: "Beğeniler", icon: HeartHandshake },
  { href: "/mesajlar", label: "Mesajlar", icon: MessageCircle },
  { href: "/profil", label: "Profil", icon: UserRound },
];
const SEARCH = { href: "/arama", label: "Film ve dizi ara", icon: Search };

function isActive(loc: string, href: string) {
  return href === "/" ? loc === "/" : loc.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const { matches, me, messages, readThrough } = useStore();
  const user = me?.id;
  const unread = Object.entries(messages).reduce((sum, [pid, list]) =>
    sum + list.filter((m) => m.from === "them" && !m.deleted && Number(m.id) > (readThrough[pid] ?? 0)).length, 0);
  useEffect(() => {
    if (!user) return;
    const pulse = () => {
      if (document.visibilityState !== "visible") return;
      void requireSupabase().from("scene_signals").upsert({ user_id: user, scope: "presence" }).then(() => undefined);
    };
    pulse();
    const timer = setInterval(pulse, 30_000);
    document.addEventListener("visibilitychange", pulse);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", pulse); };
  }, [user]);
  const count = Object.keys(matches).length;
  return (
    <div className="w-full min-w-0 min-h-[100dvh] lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-[100dvh] flex-col border-r bg-card px-5 py-8 lg:flex">
        <SceneBrand className="ml-2" />
        <nav aria-label="Ana menü" className="mt-10 space-y-2">
          {[...NAV, SEARCH].map(({ href, label, icon: Icon }) => {
            const on = isActive(loc, href);
            return (
              <Link key={href} href={href} aria-current={on ? "page" : undefined} data-testid={`nav-desktop-${href}`} className={cn(
                "relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors",
                on ? "bg-secondary text-brand-ink" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}>
                <Icon size={18} />
                <span>{label}</span>
                {href === "/begeniler" && count > 0 && <span className="ml-auto rounded-full bg-card px-2 py-0.5 text-xs text-brand-ink">{count}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center gap-2"><ThemeToggle withLabel /><Link href="/bildirimler" aria-label="Bildirimler" className="grid size-11 place-items-center rounded-full border"><Bell size={17} /></Link></div>
      </aside>
      <div className="min-w-0">
        <header className="scene-toolbar sticky top-0 z-40 flex items-center justify-between gap-2 border-b pl-[max(.625rem,env(safe-area-inset-left))] pr-[max(.625rem,env(safe-area-inset-right))] pb-2.5 pt-[calc(.625rem+env(safe-area-inset-top))] lg:hidden">
          <SceneBrand className="min-w-0 shrink gap-1.5 [&>span:last-child]:text-base min-[375px]:[&>span:last-child]:text-xl" />
          <div className="flex shrink-0 items-center gap-1.5">
            <Link href="/arama" aria-label="Ara" data-testid="link-search-mobile" aria-current={loc === "/arama" ? "page" : undefined} className={cn("grid size-11 place-items-center rounded-full border bg-card hover:bg-secondary", loc === "/arama" && "bg-secondary text-brand-ink")}><Search size={18} /></Link>
            <Link href="/bildirimler" aria-label="Bildirimler" className="grid size-11 place-items-center rounded-full border bg-card"><Bell size={17} /></Link>
            <ThemeToggle />
          </div>
        </header>
        <motion.main key={loc.split("/")[1]} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.24 }} className={loc.startsWith("/mesajlar/") ? "pb-[calc(3.75rem+env(safe-area-inset-bottom))] lg:pb-0" : "pb-safe"}>
          {children}
        </motion.main>
      </div>
      <nav aria-label="Ana menü" className="scene-toolbar fixed inset-x-0 bottom-0 z-50 border-t pl-[max(.25rem,env(safe-area-inset-left))] pr-[max(.25rem,env(safe-area-inset-right))] pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="mx-auto grid w-full max-w-lg grid-cols-5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const on = isActive(loc, href);
            return (
              <Link key={href} href={href} aria-current={on ? "page" : undefined} data-testid={`nav-${label}`} className={cn("relative flex min-w-0 flex-col items-center gap-0.5 px-0.5 py-1.5 text-center text-[10px] font-semibold", on ? "text-brand-ink" : "text-muted-foreground")}>
                <span className="relative grid h-8 w-full max-w-12 place-items-center">
                  {on && <motion.span layoutId="tab" className="absolute inset-0 rounded-full bg-secondary" />}
                  <Icon size={19} className="relative" />
                  {href === "/mesajlar" && unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1 text-[9px] text-primary-foreground">{Math.min(unread, 99)}</span>}
                  {href === "/begeniler" && count > 0 && <span className="absolute right-2 top-1 size-2 rounded-full bg-primary ring-2 ring-card" />}
                </span>
                <span className="max-w-full truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
