import { sharedFavorites } from "./dating";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { requireSupabase, turkishError } from "./supabase";
import { CHAT_BUCKET, uploadChatMedia } from "./chat-media";
import type { ProfileDetailsData } from "./profile-choices";
import { AVATAR_BUCKET, MAX_PROFILE_PHOTOS } from "./avatars";
import { byId, savedTmdbTitle, type Title } from "./catalog";
import { useAuth } from "./auth";
import { toast } from "@/hooks/use-toast";

export interface Person {
  id: string;
  name: string;
  city: string;
  age: number | null;
  bio: string;
  scene: string;
  onboarded: boolean;
  favorites: string[];
  avatar_path: string | null;
  avatar_paths: string[];
  gender: string | null;
  looking_for: string | null;
  dating_goal: string | null;
  discovery_hidden: boolean;
  account_hidden: boolean;
  discovery_details?: ProfileDetailsData;
}
export interface Msg {
  id: string; from: "me" | "them"; text: string; at: number;
  mediaPath: string | null; mediaKind: "photo" | "audio" | null;
  replyTo: string | null; deleted: boolean; delivered: boolean; seen: boolean;
}
export interface MatchInfo { id: string; at: number }
export interface ProfilePatch { name?: string; city?: string; bio?: string; scene?: string; gender?: string; looking_for?: string; dating_goal?: string; discovery_hidden?: boolean; account_hidden?: boolean }

interface Data {
  me: Person | null;
  people: Person[];
  titles: Record<string, Record<string, Title>>;
  liked: string[];
  incoming: Record<string, "like" | "super">;
  passed: string[];
  matches: Record<string, MatchInfo>;
  messages: Record<string, Msg[]>;
  readThrough: Record<string, number>;
}

const EMPTY: Data = { me: null, people: [], titles: {}, liked: [], incoming: {}, passed: [], matches: {}, messages: {}, readThrough: {} };

type ProfileRow = Omit<Person, "favorites">;
interface MatchRow { id: string; user_a: string; user_b: string; created_at: string }
interface MessageRow { id: number; match_id: string; sender_id: string; body: string; created_at: string; media_path: string | null; media_kind: Msg["mediaKind"]; reply_to: number | null; deleted_at: string | null; delivered_at: string | null; seen_at: string | null }

interface Ctx extends Data {
  ready: boolean;
  loadError: string | null;
  refresh: () => Promise<void>;
  personById: (id: string) => Person | undefined;
  isFav: (id: string) => boolean;
  titleById: (id: string, ownerId?: string) => Title | undefined;
  toggleFavorite: (id: string, title?: Title) => boolean;
  savePhotos: (previous: string[], paths: string[], upload?: { index: number; image: Blob }) => Promise<boolean>;
  /** true = new match, false = liked, null = failed (error already shown). */
  like: (pid: string, kind?: "like" | "super") => Promise<boolean | null>;
  unlike: (pid: string) => Promise<boolean>;
  pass: (pid: string) => Promise<boolean>;
  undoSwipe: (pid: string, wasPass: boolean) => Promise<boolean>;
  unmatch: (pid: string) => Promise<boolean>;
  send: (pid: string, text: string, options?: { replyTo?: string; media?: { file: Blob; kind: "photo" | "audio" } }) => Promise<void>;
  removeMessage: (id: string) => Promise<void>;
  acknowledge: (pid: string, through: string, seen: boolean) => Promise<void>;
  updateMe: (patch: ProfilePatch) => Promise<void>;
  saveIdentity: (birthDate: string | null, province: string) => Promise<void>;
  completeOnboarding: (p: { name: string; bio: string; favorites: string[]; favoriteTitles?: Record<string, Title> }) => Promise<void>;
  resetDeck: () => Promise<void>;
}

const StoreCtx = createContext<Ctx | null>(null);

const fail = (e: unknown, title = "İşlem tamamlanamadı") =>
  toast({ title, description: turkishError(e), variant: "destructive" });

const MESSAGE_COLUMNS = "id,match_id,sender_id,body,created_at,media_path,media_kind,reply_to,deleted_at,delivered_at,seen_at";

function toMsg(row: MessageRow, me: string): Msg {
  return {
    id: String(row.id), from: row.sender_id === me ? "me" : "them", text: row.body,
    at: new Date(row.created_at).getTime(), mediaPath: row.media_path, mediaKind: row.media_kind,
    replyTo: row.reply_to ? String(row.reply_to) : null, deleted: !!row.deleted_at,
    delivered: !!row.delivered_at, seen: !!row.seen_at,
  };
}

export async function fetchChatMessages(chat: string, viewer: string, before: string | null, search: string, signal: AbortSignal) {
  let request = requireSupabase().from("messages").select(MESSAGE_COLUMNS)
    .eq("match_id", chat).order("id", { ascending: false }).limit(50);
  if (before) request = request.lt("id", before);
  if (search) {
    const literal = search.replace(/[\\%_]/g, "\\$&");
    request = request.is("deleted_at", null).ilike("body", `%${literal}%`);
  }
  const { data, error } = await request.abortSignal(signal);
  if (error) throw error;
  return (data as MessageRow[]).map((row) => toMsg(row, viewer));
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const [data, setData] = useState<Data>(EMPTY);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const refresh = useCallback(async () => {
    if (!userId) return;
    const sb = requireSupabase();
    try {
      const [profiles, favorites, likes, incoming, passes, matches, messages, readMarks] = await Promise.all([
        sb.from("scene_profiles").select("id,name,city,age,bio,scene,onboarded,avatar_path,avatar_paths,gender,looking_for,dating_goal,discovery_hidden,account_hidden,discovery_details"),
        sb.from("favorites").select("user_id,title_id,created_at,title_metadata").order("created_at"),
        sb.from("likes").select("liked_id").eq("liker_id",userId),
        sb.from("likes").select("liker_id,kind").eq("liked_id",userId),
        sb.from("passes").select("passed_id"),
        sb.from("matches").select("id,user_a,user_b,created_at"),
        sb.from("messages").select(MESSAGE_COLUMNS).order("id", { ascending: false }).limit(1000),
        sb.from("scene_read_marks").select("match_id,through_id").eq("user_id", userId),
      ]);
      for (const r of [profiles, favorites, likes, incoming, passes, matches, messages, readMarks]) if (r.error) throw r.error;

      const favs: Record<string, string[]> = {};
      const titles: Record<string, Record<string, Title>> = {};
      const favoriteRows = favorites.data as { user_id: string; title_id: string; title_metadata: unknown }[];
      for (const f of favoriteRows) {
        (favs[f.user_id] ??= []).push(f.title_id);
        const title = savedTmdbTitle(f.title_id, f.title_metadata);
        if (title) (titles[f.user_id] ??= {})[title.id] = title;
      }
      const toPerson = (p: ProfileRow): Person => ({ ...p, favorites: favs[p.id] ?? [] });
      const rows = profiles.data as ProfileRow[];
      const meRow = rows.find((p) => p.id === userId);

      const matchMap: Record<string, MatchInfo> = {};
      const byMatch: Record<string, string> = {};
      for (const m of matches.data as MatchRow[]) {
        const other = m.user_a === userId ? m.user_b : m.user_a;
        matchMap[other] = { id: m.id, at: new Date(m.created_at).getTime() };
        byMatch[m.id] = other;
      }
      const msgs: Record<string, Msg[]> = {};
      for (const row of (messages.data as MessageRow[]).slice().reverse()) {
        const other = byMatch[row.match_id];
        if (other) (msgs[other] ??= []).push(toMsg(row, userId));
      }

      setData({
        titles,
        me: meRow ? toPerson(meRow) : null,
        people: rows.filter((p) => p.id !== userId && (p.onboarded || matchMap[p.id])).map(toPerson),
        liked: (likes.data as { liked_id: string }[]).map((l) => l.liked_id),
        incoming: Object.fromEntries((incoming.data ?? []).map((row) => [row.liker_id, row.kind])),
        passed: (passes.data as { passed_id: string }[]).map((p) => p.passed_id),
        matches: matchMap,
        messages: msgs,
        readThrough: Object.fromEntries((readMarks.data ?? []).map((row) => [byMatch[row.match_id], row.through_id])),
      });
      setLoadError(null);
    } catch (e) {
      setLoadError(turkishError(e));
    } finally {
      setReady(true);
    }
  }, [userId]);

  // Load when the signed-in user changes; clear everything on logout.
  useEffect(() => {
    setData(EMPTY);
    setReady(false);
    setLoadError(null);
    if (userId) void refresh();
  }, [userId, refresh]);

  // Live updates for new messages and matches, plus a periodic refresh for new people.
  useEffect(() => {
    if (!userId) return;
    const sb = requireSupabase();
    const channel = sb
      .channel(`scene-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const row = payload.new as MessageRow;
        const entry = Object.entries(dataRef.current.matches).find(([, m]) => m.id === row.match_id);
        if (!entry) { void refresh(); return; }
        const [pid] = entry;
        if (row.sender_id !== userId && !window.location.pathname.endsWith(`/mesajlar/${pid}`)) {
          toast({ title: "Yeni mesaj", description: dataRef.current.people.find((person) => person.id === pid)?.name });
        }
        setData((d) => {
          const list = d.messages[pid] ?? [];
          if (list.some((m) => m.id === String(row.id))) return d;
          return { ...d, messages: { ...d.messages, [pid]: [...list, toMsg(row, userId)] } };
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
        const row = payload.new as MessageRow;
        const entry = Object.entries(dataRef.current.matches).find(([, m]) => m.id === row.match_id);
        if (!entry) return;
        const [pid] = entry;
        setData((d) => ({ ...d, messages: {
          ...d.messages, [pid]: (d.messages[pid] ?? []).map((message) => message.id === String(row.id) ? toMsg(row, userId) : message),
        } }));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "likes", filter: `liked_id=eq.${userId}` }, () => { void refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => { void refresh(); })
      .subscribe((status) => { if (status === "SUBSCRIBED") void refresh(); });
    const onFocus = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onFocus);
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      window.clearInterval(timer);
      void sb.removeChannel(channel);
    };
  }, [userId, refresh]);

  const toggleFavorite = useCallback((id: string, title?: Title) => {
    const me = dataRef.current.me;
    if (!me || !userId) return false;
    const has = me.favorites.includes(id);
    const apply = (add: boolean) => setData((d) => d.me ? { ...d, me: { ...d.me, favorites: add ? [...d.me.favorites.filter((f) => f !== id), id] : d.me.favorites.filter((f) => f !== id) } } : d);
    const metadata = savedTmdbTitle(id, title ?? dataRef.current.titles[userId]?.[id]);
    if (!has && metadata) {
      setData((d) => ({ ...d, titles: { ...d.titles, [userId]: { ...d.titles[userId], [id]: metadata } } }));
    }
    apply(!has);
    const sb = requireSupabase();
    const req = has
      ? sb.from("favorites").delete().eq("user_id", userId).eq("title_id", id)
      : sb.from("favorites").insert({ user_id: userId, title_id: id, title_metadata: metadata ?? null });
    void req.then(({ error }) => { if (error) { apply(has); fail(error, "Favori kaydedilemedi"); } });
    return !has;
  }, [userId]);

  const like = useCallback(async (pid: string, kind: "like" | "super" = "like") => {
    const sb = requireSupabase();
    try {
      const { error } = await sb.from("likes").insert({ liker_id: userId, liked_id: pid, kind });
      if (error && error.code !== "23505") throw error;
      const [a, b] = [userId!, pid].sort();
      const { data: m, error: mErr } = await sb.from("matches").select("id,created_at").eq("user_a", a).eq("user_b", b).maybeSingle();
      if (mErr) throw mErr;
      setData((d) => ({
        ...d,
        liked: d.liked.includes(pid) ? d.liked : [...d.liked, pid],
        passed: d.passed.filter((x) => x !== pid),
        matches: m ? { ...d.matches, [pid]: { id: m.id, at: new Date(m.created_at).getTime() } } : d.matches,
      }));
      return !!m;
    } catch (e) { fail(e, "Beğeni kaydedilemedi"); return null; }
  }, [userId]);

  const unlike = useCallback(async (pid: string) => {
    const { error } = await requireSupabase().from("likes").delete().eq("liker_id", userId!).eq("liked_id", pid);
    if (error) { fail(error); return false; }
    setData((d) => {
      const matches = { ...d.matches }; delete matches[pid];
      const messages = { ...d.messages }; delete messages[pid];
      return { ...d, liked: d.liked.filter((x) => x !== pid), matches, messages };
    });
    return true;
  }, [userId]);

  const pass = useCallback(async (pid: string) => {
    setData((d) => ({ ...d, passed: d.passed.includes(pid) ? d.passed : [...d.passed, pid] }));
    const { error } = await requireSupabase().from("passes").upsert({ user_id: userId, passed_id: pid });
    if (error) { setData((d) => ({ ...d, passed: d.passed.filter((x) => x !== pid) })); fail(error); }
    return !error;
  }, [userId]);

  const undoSwipe = useCallback(async (pid: string, wasPass: boolean) => {
    const { error } = await requireSupabase().rpc("undo_scene_swipe", { other: pid, was_pass: wasPass });
    if (error) { fail(error); return false; }
    setData((d) => wasPass
      ? { ...d, passed: d.passed.filter((id) => id !== pid) }
      : { ...d, liked: d.liked.filter((id) => id !== pid) });
    return true;
  }, []);

  const unmatch = useCallback(async (pid: string) => {
    const { error } = await requireSupabase().rpc("end_scene_match", { other: pid });
    if (error) { fail(error); return false; }
    setData((d) => {
      const matches = { ...d.matches }; delete matches[pid];
      const messages = { ...d.messages }; delete messages[pid];
      return { ...d, matches, messages, liked: d.liked.filter((x) => x !== pid), passed: d.passed.includes(pid) ? d.passed : [...d.passed, pid] };
    });
    return true;
  }, []);

  const send = useCallback<Ctx["send"]>(async (pid, text, options) => {
    const m = dataRef.current.matches[pid];
    if (!m || !userId) throw new Error("Yalnızca eşleştiğin kişilere mesaj gönderebilirsin.");
    const sb = requireSupabase();
    let path: string | null = null;
    try {
      if (options?.media) path = await uploadChatMedia(m.id, userId, options.media.file, options.media.kind);
      const { data: row, error } = await sb.from("messages").insert({
        match_id: m.id, sender_id: userId, body: text || (options?.media?.kind === "audio" ? "Sesli mesaj" : "Fotoğraf"),
        reply_to: options?.replyTo ?? null, media_path: path, media_kind: options?.media?.kind ?? null,
      }).select(MESSAGE_COLUMNS).single();
      if (error) throw error;
      setData((d) => {
        const list = d.messages[pid] ?? [];
        if (list.some((message) => message.id === String(row.id))) return d;
        return { ...d, messages: { ...d.messages, [pid]: [...list, toMsg(row, userId)] } };
      });
    } catch (error) {
      if (path) await sb.storage.from(CHAT_BUCKET).remove([path]).catch(() => undefined);
      fail(error, "Mesaj gönderilemedi");
      throw error;
    }
  }, [userId]);

  const removeMessage = useCallback(async (id: string) => {
    const sb = requireSupabase();
    const { data: path, error } = await sb.rpc("remove_scene_message", { message: id });
    if (error) { fail(error, "Mesaj silinemedi"); return; }
    if (path) {
      const result = await sb.storage.from(CHAT_BUCKET).remove([path]);
      if (result.error) fail(result.error, "Ek depodan temizlenemedi");
    }
    await refresh();
  }, [refresh]);

  const acknowledge = useCallback(async (pid: string, through: string, seen: boolean) => {
    const chat = dataRef.current.matches[pid]?.id;
    if (!chat) return;
    const { error } = await requireSupabase().rpc("ack_scene_messages", { chat, through_message: through, mark_seen: seen });
    if (!error && seen) setData((d) => ({
      ...d, readThrough: { ...d.readThrough, [pid]: Math.max(d.readThrough[pid] ?? 0, Number(through)) },
    }));
  }, []);

  useEffect(() => {
    if (!userId) return;
    for (const [pid, messages] of Object.entries(data.messages)) {
      const unread = messages.filter((m) => m.from === "them" && !m.delivered && !m.deleted).at(-1);
      if (unread) void acknowledge(pid, unread.id, false);
    }
  }, [acknowledge, data.messages, userId]);

  const updateMe = useCallback(async (patch: ProfilePatch) => {
    const { error } = await requireSupabase().from("profiles").update(patch).eq("id", userId!);
    if (error) { fail(error, "Profil kaydedilemedi"); throw error; }
    setData((d) => d.me ? { ...d, me: { ...d.me, ...patch } } : d);
  }, [userId]);

  const savePhotos = useCallback(async (previous: string[], paths: string[], upload?: { index: number; image: Blob }) => {
    if (!userId || dataRef.current.me?.id !== userId) throw new Error("Tekrar giriş yap.");
    const bucket = requireSupabase().storage.from(AVATAR_BUCKET);
    const next = [...paths];
    const uploadedPath = upload ? `${userId}/${crypto.randomUUID()}.jpg` : null;
    if (upload && uploadedPath) next[upload.index] = uploadedPath;
    if (next.length > MAX_PROFILE_PHOTOS) throw new Error("En fazla 6 fotoğraf ekleyebilirsin.");

    try {
      if (upload && uploadedPath) {
        const { error } = await bucket.upload(uploadedPath, upload.image, {
          contentType: "image/jpeg", cacheControl: "60",
        });
        if (error) throw error;
      }
      const { data: row, error } = await requireSupabase().from("profiles")
        .update({ avatar_paths: next })
        .eq("id", userId)
        .eq("avatar_paths", `{${previous.join(",")}}`)
        .select("avatar_path,avatar_paths").maybeSingle();
      if (error) throw error;
      if (!row) throw new Error("Fotoğraf listesi başka bir oturumda değişti. Tekrar dene.");

      setData((data) => data.me?.id === userId ? { ...data, me: { ...data.me, ...row } } : data);
    } catch (error) {
      // Storage RLS prevents cleanup from deleting a photo that was actually saved.
      if (uploadedPath) await bucket.remove([uploadedPath]).catch(() => undefined);
      await refresh();
      throw error;
    }

    const removed = previous.filter((path) => !next.includes(path));
    if (!removed.length) return true;
    const cleanup = await bucket.remove(removed).catch(() => null);
    return !!cleanup && !cleanup.error;
  }, [userId, refresh]);

  const saveIdentity = useCallback(async (birthDate: string | null, province: string) => {
    const { error } = await requireSupabase().rpc("complete_profile_identity", {
      new_birth_date: birthDate, new_province: province,
    });
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const completeOnboarding = useCallback(async (p: { name: string; bio: string; favorites: string[]; favoriteTitles?: Record<string, Title> }) => {
    const sb = requireSupabase();
    try {
      if (p.favorites.length) {
        const ins = await sb.from("favorites").upsert(p.favorites.map((title_id) => ({ user_id: userId, title_id, title_metadata: savedTmdbTitle(title_id, p.favoriteTitles?.[title_id]) ?? null })), {
          onConflict: "user_id,title_id", ignoreDuplicates: true,
        });
        if (ins.error) throw ins.error;
      }
      const up = await sb.from("profiles").update({ name: p.name, bio: p.bio, onboarded: true }).eq("id", userId!);
      if (up.error) throw up.error;
      await refresh();
    } catch (e) { fail(e, "Profil oluşturulamadı"); throw e; }
  }, [userId, refresh]);

  const resetDeck = useCallback(async () => {
    const { error } = await requireSupabase().from("passes").delete().eq("user_id", userId!);
    if (error) { fail(error); return; }
    setData((d) => ({ ...d, passed: [] }));
  }, [userId]);

  const value = useMemo<Ctx>(() => ({
    ...data, ready, loadError, refresh,
    personById: (id) => data.people.find((p) => p.id === id),
    isFav: (id) => !!data.me?.favorites.includes(id),
    titleById: (id, ownerId = data.me?.id) => byId(id) ?? (ownerId ? data.titles[ownerId]?.[id] : undefined),
    toggleFavorite, savePhotos, like, unlike, pass, undoSwipe, unmatch, send, removeMessage, acknowledge, updateMe, saveIdentity, completeOnboarding, resetDeck,
  }), [data, ready, loadError, refresh, toggleFavorite, savePhotos, like, unlike, pass, undoSwipe, unmatch, send, removeMessage, acknowledge, updateMe, saveIdentity, completeOnboarding, resetDeck]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("StoreProvider missing");
  return c;
}

export function useCommon(favorites: string[]) {
  const { me } = useStore();
  const mine = me?.favorites;
  return useMemo(() => (mine ? sharedFavorites(mine, favorites) : []), [favorites, mine]);
}
