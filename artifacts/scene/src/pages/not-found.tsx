import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-6 text-center">
      <div className="scene-panel p-8 sm:p-12">
        <div className="font-mono text-xs uppercase tracking-[0.4em] text-brand-ink">404</div>
        <h1 className="scene-title mt-2">Bu sahne<br />montajda kesildi.</h1>
        <p className="mt-3 text-sm text-muted-foreground">Aradığın sayfa bulunamadı.</p>
        <Link href="/" className="mt-6 inline-flex h-10 items-center rounded-full bg-primary text-primary-foreground px-5 text-sm font-semibold" data-testid="link-home">Keşfet'e dön</Link>
      </div>
    </div>
  );
}
