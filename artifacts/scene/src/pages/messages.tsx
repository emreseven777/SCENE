import { ProfileSafety } from "@/components/dating-profile";
import { CinemaMessage, SharedCinema } from "@/components/shared-cinema";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { AttachmentControls, AttachmentPreview, ChatAttachment, type PendingMedia } from "@/components/chat-experience";
import { FilmDate } from "@/components/film-date";
import { ReportProfile } from "@/components/report-profile";
import { Button } from "@/components/ui/button";
import { requireSupabase, turkishError } from "@/lib/supabase";
import { useScenePreferences } from "@/lib/scene-preferences";
import { useToast } from "@/hooks/use-toast";
import { SceneHeading } from "@/components/scene-brand";
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Lock, Send, MoreHorizontal, Plus, Smile } from "lucide-react";
import { format } from "date-fns";
import { fetchChatMessages, type Msg, useCommon, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PersonPhoto } from "@/components/person-photo";
import { quizResultLabel, readQuizResult } from "@/lib/quiz-result";

function ConversationList({ activeId }: { activeId?: string }) {
  const store = useStore();
  const convos = store.people.filter((p) => store.matches[p.id])
    .map((p) => ({ p, last: store.messages[p.id]?.at(-1) }))
    .sort((a, b) => (b.last?.at ?? store.matches[b.p.id].at) - (a.last?.at ?? store.matches[a.p.id].at));
  if (!convos.length)
    return (
      <div className="scene-panel p-8 text-center">
        <div className="font-display text-2xl font-bold">Henüz sohbet yok</div>
        <p className="mt-2 text-sm text-muted-foreground">Sadece eşleştiğin kişilerle mesajlaşabilirsin.</p>
        <Link href="/" className="mt-4 inline-flex h-10 items-center rounded-full bg-primary text-primary-foreground px-5 text-sm font-semibold" data-testid="link-discover-empty">Keşfet</Link>
      </div>
    );
  return (
    <ul className="scene-panel divide-y divide-border p-2">
      {convos.map(({ p, last }) => {
        const unread = (store.messages[p.id] ?? []).filter((m) => m.from === "them" && !m.deleted && Number(m.id) > (store.readThrough[p.id] ?? 0)).length;
        return (
        <li key={p.id}>
          <Link href={`/mesajlar/${p.id}`} data-testid={`link-convo-${p.id}`} className={cn("flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-muted", activeId === p.id && "bg-muted")}>
            <PersonPhoto id={p.id} name={p.name} avatarPath={p.avatar_path} className="h-12 w-12 shrink-0 rounded-full" textClassName="text-lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{p.name}</span>
                {unread > 0 && <span aria-label={`${unread} okunmamış mesaj`} className="rounded-full bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground">{unread}</span>}
                {last && <span className="font-mono text-[10px] text-muted-foreground">{format(last.at, "HH:mm")}</span>}
              </div>
              <p className={cn("truncate text-sm", last?.from === "them" ? "text-foreground/80" : "text-muted-foreground")}>{last ? `${last.from === "me" ? "Sen: " : ""}${last.text}` : "Yeni eşleşme. Selam ver."}</p>
            </div>
          </Link>
        </li>
      ); })}
    </ul>
  );
}

export function MessagesIndex() {
  return (
    <div className="scene-page">
      <SceneHeading title="Mesajlar" description="Sohbetlerini yalnızca sen ve eşleştiğin kişi görebilir." />

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
  const [media, setMedia] = useState<PendingMedia | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [clock, setClock] = useState(Date.now());
  const lastTyping = useRef(0);
  const client = useQueryClient();
  const { toast } = useToast();
  const user = store.me?.id;
  const chat = id ? store.matches[id]?.id : undefined;
  const preferences = useScenePreferences(user);
  const scrollRef = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const scrollToLatest = () => {
    const list = scrollRef.current;
    if (list) list.scrollTop = list.scrollHeight;
    followLatest.current = true;
    setHasNewMessages(false);
  };
  const liveMessages = p ? store.messages[p.id] ?? [] : [];
  const term = search.trim();
  useEffect(() => {
    if (!term) { setSearchTerm(""); return; }
    const timer = window.setTimeout(() => setSearchTerm(term), 300);
    return () => window.clearTimeout(timer);
  }, [term]);
  const history = useInfiniteQuery({
    queryKey: ["scene-chat-history", user, chat, searchTerm],
    enabled: !!user && !!chat && term === searchTerm,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => fetchChatMessages(chat!, user!, pageParam, searchTerm, signal),
    getNextPageParam: (page) => page.length === 50 ? page.at(-1)?.id : undefined,
    gcTime: 0,
    refetchInterval: 30_000,
  });
  const allMessages = new Map<string, Msg>();
  if (term === searchTerm) {
    for (const page of history.data?.pages ?? []) for (const message of page) allMessages.set(message.id, message);
  }
  if (!term) {
    const oldest = term === searchTerm ? history.data?.pages.at(-1)?.at(-1)?.id : undefined;
    const current = oldest ? liveMessages.filter((message) => Number(message.id) >= Number(oldest)) : liveMessages.slice(-50);
    for (const message of current) allMessages.set(message.id, message);
  }
  const msgs = [...allMessages.values()].sort((a, b) => Number(a.id) - Number(b.id));
  const quizResults = new Map<string, string>();
  for (const item of msgs) {
    const result = !item.deleted && readQuizResult(item.text);
    if (result) quizResults.set(`${item.from}:${result.kind}`, quizResultLabel(result));
  }
  const comparisons = (["trivia", "personality"] as const).flatMap((kind) => {
    const own = quizResults.get(`me:${kind}`);
    const partner = quizResults.get(`them:${kind}`);
    return own && partner ? [{ kind, own, partner }] : [];
  });
  const common = useCommon(p?.favorites ?? []);
  const sharedTitles = common.flatMap((id) => store.titleById(id, p?.id) ?? []);
  const starters = sharedTitles.slice(0, 3).flatMap((title, index) => {
    if (index > 0) return [`“${title.title}” seven birine hangi yapımı önerirdin?`];
    return title.type === "dizi"
      ? [`“${title.title}” dizisinde favori karakterin kim?`, `“${title.title}” için spoiler vermeden hangi bölümü öne çıkarırsın?`]
      : [`“${title.title}” filminde seni en çok hangi sahne etkiledi?`, `“${title.title}” ile bir film maratonu yapsak yanına ne eklerdin?`];
  });
  const newest = !term ? msgs.at(-1)?.id : undefined;

  useLayoutEffect(() => {
    followLatest.current = true;
    setHasNewMessages(false);
  }, [id, term]);

  useLayoutEffect(() => {
    if (!newest) return;
    if (followLatest.current) scrollToLatest();
    else setHasNewMessages(true);
  }, [id, newest]);

  const latest = liveMessages.filter((m) => m.from === "them" && !m.deleted).at(-1);
  const { acknowledge } = store;
  const read = id ? store.readThrough[id] ?? 0 : 0;
  useEffect(() => {
    if (!id || !latest || Number(latest.id) <= read) return;
    const seen = () => { if (document.visibilityState === "visible") void acknowledge(id, latest.id, true); };
    seen();
    document.addEventListener("visibilitychange", seen);
    return () => document.removeEventListener("visibilitychange", seen);
  }, [acknowledge, id, latest?.id, read]);

  useEffect(() => {
    setMedia(null); setReply(null); setText(""); setReport(null); setSearch("");
    lastTyping.current = 0;
  }, [id]);

  const signalsKey = ["chat-signals", user, id, chat];
  const reactionsKey = ["chat-reactions", user, chat, msgs.length];
  const signals = useQuery({
    queryKey: signalsKey, enabled: !!chat && !!id,
    queryFn: async () => {
      const { data, error } = await requireSupabase().from("scene_signals").select("scope,updated_at").eq("user_id", id!).in("scope", ["presence", chat!]);
      if (error) throw error;
      return data;
    },
    refetchInterval: 8000,
  });
  const reactions = useQuery({
    queryKey: reactionsKey, enabled: !!chat && !!msgs.length,
    queryFn: async () => {
      const ids = msgs.filter((m) => !m.deleted).slice(-150).map((m) => m.id);
      if (!ids.length) return [];
      const { data, error } = await requireSupabase().from("scene_reactions").select("message_id,user_id,emoji").in("message_id", ids);
      if (error) throw error;
      return data;
    },
    refetchInterval: 12_000,
  });
  useEffect(() => {
    const handle = setInterval(() => setClock(Date.now()), 3000);
    return () => clearInterval(handle);
  }, []);
  useEffect(() => {
    if (!chat || !id) return;
    const sb = requireSupabase();
    const channel = sb.channel(`conversation-experience-${chat}`)
      .on("postgres_changes", { event:"*", schema:"public", table:"scene_signals", filter:`user_id=eq.${id}` },
        () => { void client.invalidateQueries({ queryKey: ["chat-signals",user,id,chat] }); })
      .on("postgres_changes", { event:"*", schema:"public", table:"scene_reactions" },
        () => { void client.invalidateQueries({ queryKey: ["chat-reactions",user,chat] }); })
      .subscribe();
    return () => { void sb.removeChannel(channel); };
  }, [chat, client, id, user]);

  const presence = signals.data?.find((row) => row.scope === "presence");
  const typing = signals.data?.find((row) => row.scope === chat);
  const online = presence && clock - Date.parse(presence.updated_at) < 65_000;
  const isTyping = typing && clock - Date.parse(typing.updated_at) < 7000;
  const publishTyping = (value: string) => {
    setText(value);
    if (!chat || !user || !value.trim() || Date.now() - lastTyping.current < 3000) return;
    lastTyping.current = Date.now();
    void requireSupabase().from("scene_signals").upsert({ user_id: user, scope: chat }).then(() => undefined);
  };
  const reactTo = async (message: string, emoji: string) => {
    const existing = reactions.data?.find((row) => String(row.message_id) === message && row.user_id === user);
    const table = requireSupabase().from("scene_reactions");
    const { error } = await (existing?.emoji === emoji
      ? table.delete().eq("message_id", message).eq("user_id", user!)
      : table.upsert({ message_id: message, user_id: user, emoji }));
    if (error) toast({ title: "Tepki kaydedilemedi", description: turkishError(error), variant: "destructive" });
    else await reactions.refetch();
  };

  if (!p || !store.matches[p.id]) {
    return (
      <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-6 text-center">
        <div>
          <Lock className="mx-auto text-brand-ink" />
          <h1 className="mt-3 font-display text-4xl font-bold uppercase">Kapalı set</h1>
          <p className="mt-2 text-sm text-muted-foreground">Yalnızca eşleştiğin kişilerle sohbet edebilirsin.{p ? ` ${p.name} ile henüz eşleşmedin.` : ""}</p>
          <div className="mt-5 flex justify-center gap-2">
            {p && <Link href={`/kullanici/${p.id}`} className="inline-flex h-10 items-center rounded-full bg-primary text-primary-foreground px-4 text-sm font-semibold">Profili gör</Link>}
            <Link href="/mesajlar" className="inline-flex h-10 items-center rounded-md bg-muted px-4 text-sm">Mesajlar</Link>
          </div>
        </div>
      </div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = text.trim();
    if ((!v && !media) || sending) return;
    setSending(true);
    try { await store.send(p.id, v, { media: media ?? undefined, replyTo: reply ?? undefined }); scrollToLatest(); setText(""); setMedia(null); setReply(null); } catch { /* error toast already shown; keep the text */ }
    finally { setSending(false); }
  };

  return (
    <div className="mx-auto grid max-w-6xl min-w-0 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-6 lg:px-8 lg:pt-8">
      <aside className="hidden lg:block"><ConversationList activeId={p.id} /></aside>
      <div className="scene-panel relative isolate !border-white/15 !bg-[#241936] !text-white bg-[radial-gradient(ellipse_at_0%_40%,#773453_0%,transparent_55%),radial-gradient(ellipse_at_100%_90%,#49305f_0%,transparent_60%)] flex h-[calc(100dvh-8.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] min-h-[18rem] min-w-0 flex-col overflow-hidden lg:h-[calc(100dvh-5rem)]">
        <div className="flex items-center gap-2 border-b border-white/15 bg-white/10 backdrop-blur-xl px-3 py-2">
          <Link href="/mesajlar" className="lg:hidden" aria-label="Geri" data-testid="link-back-messages"><ArrowLeft size={20} /></Link>
          <Link href={`/kullanici/${p.id}`} className="flex items-center gap-3" data-testid="link-chat-profile">
            <PersonPhoto id={p.id} name={p.name} avatarPath={p.avatar_path} className="h-10 w-10 rounded-full" textClassName="text-sm" />
            <div>
              <div className="font-semibold leading-tight">{p.name}</div>
              <div className="text-[11px] text-white/75">{isTyping ? "Yazıyor…" : online ? "Çevrimiçi" : presence ? `Son görülme: ${new Date(presence.updated_at).toLocaleString("tr-TR")}` : `${common.length} ortak favori`}</div>
            </div>
          </Link>
          <div className="ml-auto flex items-center gap-1">{chat && user && <FilmDate chat={chat} user={user} titles={sharedTitles.map((title) => title.title)} />}
          <details className="relative z-30"><summary aria-label="Sohbet seçenekleri" className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-full border border-white/20 bg-white/10"><MoreHorizontal size={20} /></summary><div className="absolute right-0 top-full mt-2 w-[min(82vw,22rem)] max-h-[45dvh] overflow-auto rounded-2xl border border-border bg-card p-2 text-card-foreground shadow-xl">
        {chat && user && <SharedCinema key={chat} match={chat} viewer={user}
          titles={[...new Set([...common, ...(store.me?.favorites ?? []), ...p.favorites])].flatMap((id) => store.titleById(id) ?? store.titleById(id, p.id) ?? [])}
          onShare={publishTyping} />}
          <details className="px-4 py-2 text-sm"><summary className="cursor-pointer font-semibold">Güvenlik seçenekleri</summary>
          <ProfileSafety person={p} />
        </details>
        <details className="py-2 text-sm">
          <summary className="cursor-pointer font-semibold">Sohbette ara</summary>
          <input className="mt-2 w-full rounded-lg border bg-card p-2 text-base" type="search" aria-label="Mesaj ara"
            placeholder="Mesajlarda ara" value={search} onChange={(event) => setSearch(event.target.value)} />
        </details></div></details></div></div>
        <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain px-3 py-2"
          onScroll={(event) => {
            const list = event.currentTarget;
            followLatest.current = list.scrollHeight - list.scrollTop - list.clientHeight < 96;
            if (followLatest.current) setHasNewMessages(false);
          }}>
          <div className="mx-auto max-w-xs text-center text-[10px] text-white/70">Yalnızca ikiniz görebilirsiniz.</div>
          {!term && !msgs.length && !text.trim() && !media && starters.length > 0 &&
            <div className="mx-auto max-w-md space-y-2 pt-2" aria-label="Ortak favorilerden sohbet başlatıcıları">
              {starters.map((prompt) => <button key={prompt} type="button"
                className="block min-h-11 w-full rounded-xl border bg-muted px-3 py-2 text-left text-sm"
                onClick={() => setText(prompt)}>{prompt}</button>)}
            </div>}
          {!term && comparisons.map(({ kind, own, partner }) =>
            <section key={kind} className="mx-auto max-w-md rounded-xl border bg-muted p-3 text-sm" aria-label="MOVIA Quiz sonuç karşılaştırması">
              <h2 className="font-semibold">{kind === "trivia" ? "Bilgi yarışması sonuçları" : "Sinema kişiliğiniz"}</h2>
              <p>Sen · {own}</p>
              <p>{p.name} · {partner}</p>
              {kind === "trivia" && <p className="text-xs text-muted-foreground">Her turda sorular değişebilir.</p>}
            </section>)}
          {term && (term !== searchTerm || history.isPending) && <p role="status" className="text-sm">Mesajlar aranıyor…</p>}
          {history.isError && <p role="alert" className="text-sm">{turkishError(history.error)}</p>}
          {term && term === searchTerm && history.isSuccess && !msgs.length &&
            <p role="status" className="text-sm text-muted-foreground">Aramana uyan mesaj bulunamadı.</p>}
          {term === searchTerm && history.hasNextPage && <Button size="sm" variant="secondary"
            disabled={history.isFetchingNextPage} onClick={() => void history.fetchNextPage()}>
            {history.isFetchingNextPage ? "Yükleniyor…" : "Daha eski mesajları göster"}
          </Button>}
          <AnimatePresence initial={false}>
            {msgs.map((m) => (
              <motion.div key={m.id} layout initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={cn("flex flex-col", m.from === "me" ? "items-end" : "items-start")} data-testid={`msg-${m.id}`}>
                <div className={cn("max-w-[82%] min-w-0 break-words rounded-[24px] border px-4 py-2.5 text-sm leading-relaxed backdrop-blur-xl shadow-lg", m.from === "me" ? "rounded-br-md border-pink-400/40 bg-gradient-to-br from-pink-600/70 to-fuchsia-900/80 text-white shadow-pink-950/20" : "rounded-bl-md border-white/20 bg-gradient-to-br from-white/25 to-white/10 text-white shadow-black/10")}>
                  {m.replyTo && !m.deleted && <blockquote className="mb-2 line-clamp-2 border-l-2 border-current pl-2 text-xs">{msgs.find((item) => item.id === m.replyTo)?.text ?? "Yanıtlanan mesaj"}</blockquote>}
                  {m.mediaPath && !m.deleted && <ChatAttachment message={m} blur={preferences.data?.blur_photos ?? true} />}
                  <CinemaMessage body={m.text} />
                </div>
                <div className="mt-0.5 px-2 text-[10px] text-white/70">{format(m.at, "HH:mm")}{m.from === "me" && !m.deleted && <> · {m.seen ? "Görüldü" : m.delivered ? "İletildi" : "Gönderildi"}</>}</div>
                {!m.deleted && <details className="mt-1 max-w-full text-xs">
                  <summary className="cursor-pointer py-0.5 text-white/70 list-none" aria-label="Mesaj işlemleri">··· {reactions.data?.filter((row) => String(row.message_id) === m.id).map((row) => row.emoji).join(" ")}</summary>
                  <div className="flex flex-wrap gap-1 rounded-xl bg-card text-card-foreground p-1">
                    {["❤️","😂","👍","😮"].map((emoji) => <button key={emoji} type="button" className="min-h-9 min-w-8 rounded-lg bg-muted" aria-label={`${emoji} tepki ver`} onClick={() => void reactTo(m.id, emoji)}>{emoji}</button>)}
                    <button type="button" className="p-2 underline" onClick={() => setReply(m.id)}>Yanıtla</button>
                    {m.from === "me" ? <button type="button" className="p-2 underline" onClick={() => setDeleteId(m.id)}>Sil</button>
                      : <button type="button" className="p-2 underline" onClick={() => setReport(m.id)}>Şikâyet et</button>}
                  </div>
                </details>}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {report && <ReportProfile person={p.id} message={report} onClose={() => setReport(null)} />}
        {deleteId && <div className="flex flex-wrap items-center gap-2 border-t p-2 text-sm">
          <span>Mesaj silinsin mi?</span><Button size="sm" variant="secondary" onClick={() => setDeleteId(null)}>Vazgeç</Button>
          <Button size="sm" variant="destructive" onClick={() => { void store.removeMessage(deleteId).then(() => client.invalidateQueries({ queryKey: ["scene-chat-history", user, chat] })); setDeleteId(null); }}>Mesajı sil</Button>
        </div>}
        {hasNewMessages && !term && <div className="flex justify-center border-t p-2">
          <Button type="button" variant="secondary" size="sm" onClick={scrollToLatest}>Yeni mesajlara git</Button>
        </div>}
        <div className="bg-white/10 px-3">
          {reply && <div className="flex items-center justify-between gap-2 text-xs"><span className="truncate">Yanıt: {msgs.find((item) => item.id === reply)?.text}</span><Button size="sm" variant="ghost" onClick={() => setReply(null)}>Vazgeç</Button></div>}
          {media && <AttachmentPreview media={media} onRemove={() => setMedia(null)} />}
        </div>
        <form onSubmit={(e) => void submit(e)} className="flex items-center gap-2 border-t border-white/15 bg-white/10 px-2 py-2">
          <details className="relative z-20 shrink-0"><summary aria-label="Ekler ve sohbet kartları" className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-full border border-white/20 bg-white/10"><Plus size={20} /></summary><div className="absolute bottom-full left-0 mb-2 w-[min(82vw,22rem)] max-h-[40dvh] overflow-auto rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-xl">
          {!text.trim() && !media && <details className="mb-2 text-xs"><summary className="cursor-pointer py-2 text-brand-ink">MOVIA Quiz · Sohbet kartları</summary><div className="flex flex-wrap gap-2">{["Hayatın bir film olsaydı adı ne olurdu?","Birlikte hangi filmi izlemek isterdin?","En sevdiğin film karakteri kim?","Bir filmin finalini değiştirebilseydin hangisi olurdu?"].map(question => <button key={question} type="button" className="rounded-xl border bg-card p-2 text-left" onClick={() => publishTyping(question)}>{question}</button>)}</div></details>}
          <div className="flex flex-wrap items-start gap-2">
            <AttachmentControls disabled={sending || !!media} onPick={setMedia} />
            <details className="text-sm">
              <summary className="cursor-pointer rounded-md px-2 py-2" aria-label="Emoji"><Smile size={20} /></summary>
              <div className="flex flex-wrap gap-1">
                {["🎬", "🍿", "❤️", "😂", "👍", "✨"].map((emoji) => <Button size="icon" key={emoji}
                  variant="ghost" type="button" onClick={() => publishTyping((text + emoji).slice(0, 2000))}>{emoji}</Button>)}
              </div>
            </details>
          </div>
        </div></details>
          <input value={text} onChange={(e) => publishTyping(e.target.value)} maxLength={2000} placeholder="Bir replik yaz..." data-testid="input-message" className="h-11 min-w-0 flex-1 rounded-full bg-white/15 px-4 text-base text-white outline-none ring-1 ring-white/25 placeholder:text-white/65 focus:ring-pink-400" />
          <motion.button whileTap={{ scale: 0.88 }} type="submit" disabled={(!text.trim() && !media) || sending} aria-label="Gönder" data-testid="button-send" className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-800 text-white shadow-lg shadow-pink-900/40 disabled:opacity-40"><Send size={17} /></motion.button>
        </form>
      </div>
    </div>
  );
}
