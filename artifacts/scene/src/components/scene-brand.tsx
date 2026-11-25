import { Film, Moon, Sun } from "lucide-react";
import { Link } from "wouter";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function SceneBrand({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label="SCENE ana sayfa" data-testid="link-logo" className={cn("inline-flex w-fit items-center gap-2.5", className)}>
      <span className="scene-gradient grid size-10 shrink-0 place-items-center rounded-2xl text-[#201d29]"><Film size={20} strokeWidth={2.3} /></span>
      <span className="font-display text-[1.15rem] font-extrabold tracking-[0.24em]">SCENE</span>
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

const films = ["la-la-land", "interstellar", "spirited-away"];

export function CinemaCollage({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none relative min-h-48 select-none overflow-hidden", className)}>
      <div className="absolute inset-x-[4%] inset-y-1 flex items-center justify-center">
        {films.map((id, index) => {
          return <div key={id} className={cn(
            "absolute aspect-[2/3] h-[83%] max-w-[35%] overflow-hidden rounded-[.85rem] bg-[#281d3a] shadow-[0_18px_35px_#3e174864] ring-4 ring-white/80",
            index === 0 && "left-[6%] -rotate-[16deg] translate-y-3",
            index === 1 && "z-10 -rotate-3",
            index === 2 && "right-[6%] rotate-[15deg] translate-y-3",
          )}><img src={`${import.meta.env.BASE_URL}cinema/${id}.jpg`} alt="" className="size-full object-cover" /></div>;
        })}
      </div>
    </div>
  );
}

export function SceneHeading({ title, description }: { title: string; description?: string }) {
  return (
    <header className="mb-6 max-w-2xl">
      <h1 className="scene-title">{title}</h1>
      {description && <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>}
    </header>
  );
}
