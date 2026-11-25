import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { requireSupabase, turkishError } from "./supabase";
import { AVATAR_BUCKET, prepareAvatar } from "./avatars";
import { byId, savedTmdbTitle, type Title } from "./catalog";
import { useAuth } from "./auth";
import { toast } from "@/hooks/use-toast";

export interface Person {
  id: string;
  name: string;
  city: string;
  bio: string;
  scene: string;
  onboarded: boolean;
  favorites: string[];
  avatar_path: string | null;
}
export interface Msg { id: string; from: "me" | "them"; text: string; at: number }
export interface MatchInfo { id: string; at: number }
export interface ProfilePatch { name?: string; city?: string; bio?: string; scene?: string }

interface Data {
  me: Person | null;
  people: Person[];
  titles: Record<string, Record<string, Title>>;
  liked: string[];
  passed: string[];
  matches: Record<string, MatchInfo>;
  messages: Record<string, Msg[]>;
}

const EMPTY: Data = { me: null, people: [], titles: {}, liked: [], passed: [], matches: {}, messages: {} };

interface ProfileRow { id: string; name: string; city: string; bio: string; scene: string; onboarded: boolean; avatar_path: string | null }
interface MatchRow { id: string; user_a: string; user_b: string; created_at: string }
interface MessageRow { id: number; match_id: string; sender_id: string; body: string; created_at: string }

interface Ctx extends Data {
  ready: boolean;
  loadError: string | null;
  refresh: () => Promise<void>;
  personById: (id: string) => Person | undefined;
  isFav: (id: string) => boolean;
  titleById: (id: string, ownerId?: string) => Title | undefined;
  toggleFavorite: (id: string, title?: Title) => boolean;
  changeAvatar: (file: File | null) => Promise<boolean>;
  /** true = new match, false = liked, null = failed (error already shown). */
  like: (pid: string) => Promise<boolean | null>;
  unlike: (pid: string) => Promise<boolean>;
  pass: (pid: string) => Promise<void>;
  unmatch: (pid: string) => Promise<boolean>;
  send: (pid: string, text: string) => Promise<void>;
  updateMe: (patch: ProfilePatch) => Promise<void>;
  completeOnboarding: (p: { name: string; city: string; bio: string; favorites: string[] }) => Promise<void>;
  resetDeck: () => Promise<void>;
}

const StoreCtx = createContext<Ctx | null>(null);

const fail = (e: unknown, title = "İşlem tamamlanamadı") =>
  toast({ title, description: turkishError(e), variant: "destructive" });

function toMsg(row: MessageRow, me: string): Msg {
  return { id: String(row.id), from: row.sender_id === me ? "me" : "them", text: row.body, at: new Date(row.created_at).getTime() };
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
      const [profiles, favorites, likes, passes, matches, messages] = await Promise.all([
        sb.from("profiles").select("id,name,city,bio,scene,onboarded,avatar_path"),
        sb.from("favorites").select("user_id,title_id,created_at,title_metadata").order("created_at"),
        sb.from("likes").select("liked_id"),
        sb.from("passes").select("passed_id"),
        sb.from("matches").select("id,user_a,user_b,created_at"),
        sb.from("messages").select("id,match_id,sender_id,body,created_at").order("created_at"),
      ]);
      for (const r of [profiles, favorites, likes, passes, matches, messages]) if (r.error) throw r.error;

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
      for (const row of messages.data as MessageRow[]) {
        const other = byMatch[row.match_id];
        if (other) (msgs[other] ??= []).push(toMsg(row, userId));
      }

      setData({
        titles,
        me: meRow ? toPerson(meRow) : null,
        people: rows.filter((p) => p.id !== userId && (p.onboarded || matchMap[p.id])).map(toPerson),
        liked: (likes.data as { liked_id: string }[]).map((l) => l.liked_id),
        passed: (passes.data as { passed_id: string }[]).map((p) => p.passed_id),
        matches: matchMap,
        messages: msgs,
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
        setData((d) => {
          const list = d.messages[pid] ?? [];
          if (list.some((m) => m.id === String(row.id))) return d;
          return { ...d, messages: { ...d.messages, [pid]: [...list, toMsg(row, userId)] } };
        });
      })
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

  const like = useCallback(async (pid: string) => {
    const sb = requireSupabase();
    try {
      const { error } = await sb.from("likes").insert({ liker_id: userId, liked_id: pid });
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
  }, [userId]);

  const unmatch = useCallback(async (pid: string) => {
    const sb = requireSupabase();
    const m = dataRef.current.matches[pid];
    // Removing your like removes the match; deleting the match removes the private chat for both people.
    const del = await sb.from("likes").delete().eq("liker_id", userId!).eq("liked_id", pid);
    if (del.error) { fail(del.error); return false; }
    if (m) {
      const r = await sb.from("matches").delete().eq("id", m.id);
      if (r.error) { fail(r.error); return false; }
    }
    await sb.from("passes").upsert({ user_id: userId, passed_id: pid });
    setData((d) => {
      const matches = { ...d.matches }; delete matches[pid];
      const messages = { ...d.messages }; delete messages[pid];
      return { ...d, matches, messages, liked: d.liked.filter((x) => x !== pid), passed: [...d.passed, pid] };
    });
    return true;
  }, [userId]);

  const send = useCallback(async (pid: string, text: string) => {
    const m = dataRef.current.matches[pid];
    if (!m) { toast({ title: "Yalnızca eşleştiğin kişilere mesaj gönderebilirsin", variant: "destructive" }); return; }
    const { data: row, error } = await requireSupabase()
      .from("messages").insert({ match_id: m.id, sender_id: userId, body: text })
      .select("id,match_id,sender_id,body,created_at").single();
    if (error) { fail(error, "Mesaj gönderilemedi"); throw error; }
    setData((d) => {
      const list = d.messages[pid] ?? [];
      if (list.some((x) => x.id === String(row.id))) return d;
      return { ...d, messages: { ...d.messages, [pid]: [...list, toMsg(row as MessageRow, userId!)] } };
    });
  }, [userId]);

  const updateMe = useCallback(async (patch: ProfilePatch) => {
    const { error } = await requireSupabase().from("profiles").update(patch).eq("id", userId!);
    if (error) { fail(error, "Profil kaydedilemedi"); throw error; }
    setData((d) => d.me ? { ...d, me: { ...d.me, ...patch } } : d);
  }, [userId]);

  const changeAvatar = useCallback(async (file: File | null) => {
    const me = dataRef.current.me;
    if (!userId || me?.id !== userId) throw new Error("Tekrar giriş yap.");
    const sb = requireSupabase();
    const bucket = sb.storage.from(AVATAR_BUCKET);
    const previous = me.avatar_path;
    const next = file ? `${userId}/${crypto.randomUUID()}.jpg` : null;
    if (previous === next) return true;

    if (file && next) {
      const jpeg = await prepareAvatar(file);
      const { error } = await bucket.upload(next, jpeg, { contentType: "image/jpeg", cacheControl: "60" });
      if (error) {
        await bucket.remove([next]).catch(() => undefined);
        throw error;
      }
    }

    try {
      const update = sb.from("profiles").update({ avatar_path: next }).eq("id", userId);
      const { data: row, error } = await (previous === null
        ? update.is("avatar_path", null)
        : update.eq("avatar_path", previous)).select("id").maybeSingle();
      if (error) throw error;
      if (!row) throw new Error("Fotoğraf başka bir oturumda değişti. Tekrar dene.");
    } catch (error) {
      // Storage policy prevents deleting a photo still referenced by the profile.
      if (next) await bucket.remove([next]).catch(() => undefined);
      await refresh();
      throw error;
    }

    setData((d) => d.me?.id === userId && d.me.avatar_path === previous
      ? { ...d, me: { ...d.me, avatar_path: next } }
      : d);
    if (!previous) return true;
    const cleanup = await bucket.remove([previous]).catch(() => null);
    return !!cleanup && !cleanup.error;
  }, [userId, refresh]);

  const completeOnboarding = useCallback(async (p: { name: string; city: string; bio: string; favorites: string[] }) => {
    const sb = requireSupabase();
    try {
      const up = await sb.from("profiles").update({ name: p.name, city: p.city, bio: p.bio, onboarded: true }).eq("id", userId!);
      if (up.error) throw up.error;
      const del = await sb.from("favorites").delete().eq("user_id", userId!);
      if (del.error) throw del.error;
      if (p.favorites.length) {
        const ins = await sb.from("favorites").insert(p.favorites.map((title_id) => ({ user_id: userId, title_id })));
        if (ins.error) throw ins.error;
      }
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
    toggleFavorite, changeAvatar, like, unlike, pass, unmatch, send, updateMe, completeOnboarding, resetDeck,
  }), [data, ready, loadError, refresh, toggleFavorite, changeAvatar, like, unlike, pass, unmatch, send, updateMe, completeOnboarding, resetDeck]);

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
  return useMemo(() => (mine ? favorites.filter((f) => mine.includes(f)) : []), [favorites, mine]);
}
