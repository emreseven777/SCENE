import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-6 text-center">
      <div>
        <div className="font-mono text-xs uppercase tracking-[0.4em] text-primary">404</div>
        <h1 className="mt-2 font-display text-6xl font-black uppercase leading-[0.85]">Bu sahne<br />montajda kesildi.</h1>
        <p className="mt-3 text-sm text-muted-foreground">Aradığın sayfa bulunamadı.</p>
        <Link href="/" className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-semibold" data-testid="link-home">Keşfet'e dön</Link>
      </div>
    </div>
  );
}
