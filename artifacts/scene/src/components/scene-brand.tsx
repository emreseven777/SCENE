import { Moon, Sun } from "lucide-react";
import { Link } from "wouter";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

import { brand } from "@/lib/brand";

export function MoviaMark({ className }: { className?: string }) {
  return <img aria-hidden="true" alt="" src={import.meta.env.BASE_URL + "favicon.svg"} className={className} />;
}

export function SceneBrand({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label={`${brand.name} ana sayfa`} data-testid="link-logo" className={cn("inline-flex w-fit items-center gap-2.5", className)}>
      <MoviaMark className="size-10 shrink-0 rounded-xl shadow-md" />
      <span className="font-serif text-[1.35rem] font-bold tracking-[0.08em] text-brand-ink">{brand.name}</span>
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
<rect width="400" height="320" fill="url(#ivory-stage)"/><path d="M0 0h120Q110 100 25 180L0 210ZM400 0H280q10 100 95 180l25 30Z" fill="url(#velvet)"/><path d="M0 0Q200 80 400 0V22Q200 105 0 22Z" fill="#790e25"/><rect x="105" y="100" width="190" height="126" rx="8" fill="#6c1822" stroke="#b68a43" strokeWidth="5"/><rect x="120" y="115" width="160" height="36" rx="8" fill="#f7d48b"/><text x="200" y="140" textAnchor="middle" fill="#790e25" fontFamily="Georgia" fontSize="23" fontWeight="bold">Movia</text><rect x="150" y="165" width="100" height="61" fill="#35151a" stroke="#d4a65a" strokeWidth="3"/><path d="M150 226h100l85 94H65Z" fill="#a4112b"/><path d="M150 226 65 320M250 226l85 94" stroke="#f1ce82" strokeWidth="3"/>
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
