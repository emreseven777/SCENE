import { Moon, Sun } from "lucide-react";
import { Link } from "wouter";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function SceneBrand({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label="SCENE ana sayfa" data-testid="link-logo" className={cn("inline-flex w-fit items-center gap-2.5", className)}>
      <span className="scene-gradient grid size-10 shrink-0 place-items-center rounded-xl text-[#f5d48b] shadow-md"><svg viewBox="0 0 40 40" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M5 16h30v18H5zM5 16 3 9l29-7 2 7zM10 7l5 6m5-9 5 6"/><path d="M20 30c-2-2-9-6-6-10 2-2 5-1 6 1 1-2 4-3 6-1 3 4-4 8-6 10z"/></svg></span>
      <span className="font-serif text-[1.35rem] font-bold tracking-[0.14em] text-brand-ink">SCENE</span>
    </Link>
  );
}

export function ThemeToggle({ withLabel = false }: { withLabel?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const label = dark ? "Açık moda geç" : "Koyu moda geç";
  return (
    <button type="button" onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={label} title={label} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary">
      {dark ? <Sun size={17} /> : <Moon size={17} />}
      {withLabel && <span>{label}</span>}
    </button>
  );
}

export function CinemaCollage({ className }: { className?: string }) {
return <div aria-hidden="true" className={cn("relative grid min-h-64 place-items-center overflow-hidden bg-[#650c20]",className)}>
<svg viewBox="0 0 400 320" className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="ivory-stage" x2="0" y2="1"><stop stopColor="#fff1d4"/><stop offset="1" stopColor="#d9ad70"/></linearGradient><linearGradient id="velvet"><stop stopColor="#430613"/><stop offset=".5" stopColor="#a31c36"/><stop offset="1" stopColor="#51091a"/></linearGradient></defs>
<rect width="400" height="320" fill="url(#ivory-stage)"/><path d="M0 0h120Q110 100 25 180L0 210ZM400 0H280q10 100 95 180l25 30Z" fill="url(#velvet)"/><path d="M0 0Q200 80 400 0V22Q200 105 0 22Z" fill="#790e25"/><rect x="105" y="100" width="190" height="126" rx="8" fill="#6c1822" stroke="#b68a43" strokeWidth="5"/><rect x="120" y="115" width="160" height="36" rx="8" fill="#f7d48b"/><text x="200" y="140" textAnchor="middle" fill="#790e25" fontFamily="Georgia" fontSize="23" fontWeight="bold">SCENE</text><rect x="150" y="165" width="100" height="61" fill="#35151a" stroke="#d4a65a" strokeWidth="3"/><path d="M150 226h100l85 94H65Z" fill="#a4112b"/><path d="M150 226 65 320M250 226l85 94" stroke="#f1ce82" strokeWidth="3"/>
</svg></div>;
}

export function SceneHeading({ title, description }: { title: string; description?: string }) {
  return (
    <header className="mb-6 max-w-2xl">
      <h1 className="scene-title">{title}</h1>
      {description && <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>}
    </header>
  );
}
