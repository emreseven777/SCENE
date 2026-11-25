import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Lock, Send } from "lucide-react";
import { format } from "date-fns";
import { useCommon, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PersonPhoto } from "@/components/person-photo";

function ConversationList({ activeId }: { activeId?: string }) {
  const store = useStore();
  const convos = store.people.filter((p) => store.matches[p.id])
    .map((p) => ({ p, last: store.messages[p.id]?.at(-1) }))
    .sort((a, b) => (b.last?.at ?? store.matches[b.p.id].at) - (a.last?.at ?? store.matches[a.p.id].at));
  if (!convos.length)
    return (
      <div className="rounded-xl border border-dashed border-white/15 p-8 text-center">
        <div className="font-display text-3xl font-black uppercase">Sessiz sinema.</div>
        <p className="mt-2 text-sm text-muted-foreground">Sadece eşleştiğin kişilerle mesajlaşabilirsin.</p>
        <Link href="/" className="mt-4 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-semibold" data-testid="link-discover-empty">Keşfet</Link>
      </div>
    );
  return (
    <ul className="divide-y divide-white/5">
      {convos.map(({ p, last }) => (
        <li key={p.id}>
          <Link href={`/mesajlar/${p.id}`} data-testid={`link-convo-${p.id}`} className={cn("flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-white/[0.04]", activeId === p.id && "bg-white/[0.06]")}>
            <PersonPhoto id={p.id} name={p.name} avatarPath={p.avatar_path} className="h-12 w-12 shrink-0 rounded-full" textClassName="text-lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{p.name}</span>
                {last && <span className="font-mono text-[10px] text-muted-foreground">{format(last.at, "HH:mm")}</span>}
              </div>
              <p className={cn("truncate text-sm", last?.from === "them" ? "text-foreground/80" : "text-muted-foreground")}>{last ? `${last.from === "me" ? "Sen: " : ""}${last.text}` : "Yeni eşleşme. Selam ver."}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function MessagesIndex() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-5 lg:px-10 lg:pt-10">
      <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">Sahne 03 / Mesajlar</div>
      <h1 className="mb-2 mt-1 font-display text-5xl font-black uppercase leading-[0.85] lg:text-7xl">Replikler</h1>
      <p className="mb-6 text-xs text-muted-foreground">Mesajlar yalnızca sen ve eşleştiğin kişi tarafından görülebilir.</p>
      <ConversationList />
    </div>
  );
}

export function Chat() {
  const { id } = useParams<{ id: string }>();
  const store = useStore();
  const p = store.personById(id ?? "");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const msgs = p ? store.messages[p.id] ?? [] : [];
  const common = useCommon(p?.favorites ?? []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  if (!p || !store.matches[p.id]) {
    return (
      <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-6 text-center">
        <div>
          <Lock className="mx-auto text-primary" />
          <h1 className="mt-3 font-display text-4xl font-black uppercase">Kapalı set</h1>
          <p className="mt-2 text-sm text-muted-foreground">Yalnızca eşleştiğin kişilerle sohbet edebilirsin.{p ? ` ${p.name} ile henüz eşleşmedin.` : ""}</p>
          <div className="mt-5 flex justify-center gap-2">
            {p && <Link href={`/kullanici/${p.id}`} className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold">Profili gör</Link>}
            <Link href="/mesajlar" className="inline-flex h-10 items-center rounded-md bg-white/5 px-4 text-sm">Mesajlar</Link>
          </div>
        </div>
      </div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = text.trim();
    if (!v || sending) return;
    setSending(true);
    try { await store.send(p.id, v); setText(""); } catch { /* error toast already shown; keep the text */ }
    finally { setSending(false); }
  };

  return (
    <div className="mx-auto grid max-w-6xl lg:grid-cols-[300px_1fr] lg:gap-6 lg:px-10 lg:pt-10">
      <aside className="hidden lg:block"><ConversationList activeId={p.id} /></aside>
      <div className="flex h-[calc(100dvh-8.5rem)] flex-col lg:h-[calc(100dvh-5rem)] lg:rounded-xl lg:bg-card lg:ring-1 lg:ring-white/10">
        <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
          <Link href="/mesajlar" className="lg:hidden" aria-label="Geri" data-testid="link-back-messages"><ArrowLeft size={20} /></Link>
          <Link href={`/kullanici/${p.id}`} className="flex items-center gap-3" data-testid="link-chat-profile">
            <PersonPhoto id={p.id} name={p.name} avatarPath={p.avatar_path} className="h-10 w-10 rounded-full" textClassName="text-sm" />
            <div>
              <div className="font-semibold leading-tight">{p.name}</div>
              <div className="text-[11px] text-muted-foreground">{common.length} ortak favori</div>
            </div>
          </Link>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
          <div className="mx-auto max-w-xs text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Eşleştiniz. Bu sohbeti yalnızca ikiniz görebilirsiniz.</div>
          <AnimatePresence initial={false}>
            {msgs.map((m) => (
              <motion.div key={m.id} layout initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={cn("flex flex-col", m.from === "me" ? "items-end" : "items-start")} data-testid={`msg-${m.id}`}>
                <div className={cn("max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed", m.from === "me" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-white/[0.07]")}>{m.text}</div>
                <div className="mt-1 font-mono text-[10px] text-muted-foreground">{format(m.at, "HH:mm")}</div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={endRef} />
        </div>
        <form onSubmit={(e) => void submit(e)} className="flex gap-2 border-t border-white/5 p-3">
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Bir replik yaz..." data-testid="input-message" className="h-11 flex-1 rounded-full bg-white/[0.06] px-4 text-sm outline-none ring-1 ring-white/10 placeholder:text-muted-foreground focus:ring-primary" />
          <motion.button whileTap={{ scale: 0.88 }} type="submit" disabled={!text.trim() || sending} aria-label="Gönder" data-testid="button-send" className="grid h-11 w-11 place-items-center rounded-full bg-primary disabled:opacity-40"><Send size={17} /></motion.button>
        </form>
      </div>
    </div>
  );
}
