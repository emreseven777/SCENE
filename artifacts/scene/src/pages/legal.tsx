import { useEffect } from "react";
import { Link, useSearch } from "wouter";
import { SupportEmail } from "@/components/scene-brand";
import { brand } from "@/lib/brand";
import { LEGAL_VERSION, legalDocuments } from "@/lib/legal-documents";

export default function Legal() {
  const selected = new URLSearchParams(useSearch()).get("belge");
  const document = legalDocuments.find((item) => item.id === selected);

  useEffect(() => {
    if (selected) window.scrollTo(0, 0);
  }, [selected]);

  return <main className="scene-page mx-auto max-w-3xl space-y-5 pb-8">
    <nav className="flex flex-wrap gap-4 text-sm text-brand-ink underline" aria-label="Hukuki sayfalar">
      <Link href="/">{brand.name} ana sayfa</Link>
      {selected && <Link href="/kurallar">Tüm belgeler</Link>}
    </nav>
    <h1 className="scene-title">{document?.title ?? `${brand.name} hukuki belgeleri`}</h1>
    <p role="note" className="scene-panel border-primary/30 p-4 text-sm">İşletmeci tarafından onaylanan metin · {LEGAL_VERSION}.</p>
    {!document && <ul className="scene-panel divide-y">{legalDocuments.map((item) =>
      <li key={item.id}><Link href={`/kurallar?belge=${item.id}`} className="block p-4 font-semibold text-brand-ink underline">{item.title}</Link></li>)}</ul>}
    {document && <article className="scene-panel space-y-5 p-5">
      {document.sections.map(([title, content]) => <section key={title} className="space-y-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm leading-relaxed text-foreground/85">{content}</p>
      </section>)}
    </article>}
    <footer className="text-sm text-muted-foreground">İletişim ve destek · <SupportEmail /></footer>
  </main>;
}
