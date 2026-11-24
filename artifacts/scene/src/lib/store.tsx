import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { personById } from "./people";

export interface Msg { id: string; from: "me" | "them"; text: string; at: number; demo?: boolean }
export interface Me { name: string; city: string; bio: string; favorites: string[]; custom: boolean }
interface State {
  me: Me;
  liked: string[];
  passed: string[];
  matches: Record<string, number>;
  messages: Record<string, Msg[]>;
}

const KEY = "scene-demo-v1";
const now = Date.now();
const H = 3600_000;

const seed = (): State => ({
  me: { name: "Misafir", city: "İstanbul", bio: "Demo izleyici. Profilini düzenleyerek kendi sahneni kur.", favorites: ["inception", "interstellar", "parasite", "breakingbad", "dark", "lalaland", "godfather"], custom: false },
  liked: ["kaan", "deniz"],
  passed: [],
  matches: { kaan: now - 26 * H, deniz: now - 3 * H },
  messages: {
    kaan: [
      { id: "s1", from: "them", text: "Breaking Bad ortak noktamız. Ozymandias bölümünden sonra iki gün kimseyle konuşmadım.", at: now - 25 * H, demo: true },
      { id: "s2", from: "me", text: "O bölüm televizyonun zirvesi. Ben de Godfather'daki vaftiz sahnesini hiç unutamam.", at: now - 24 * H },
      { id: "s3", from: "them", text: "Paralel kurgu ustalığı. Coppola işini biliyor.", at: now - 24 * H + 600_000, demo: true },
    ],
    deniz: [
      { id: "s4", from: "them", text: "Parazit'teki yağmur sahnesi seni de mi çarptı?", at: now - 2 * H, demo: true },
    ],
  },
});

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...seed(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return seed();
}

interface Ctx extends State {
  typing: Record<string, boolean>;
  isFav: (id: string) => boolean;
  toggleFavorite: (id: string) => boolean;
  like: (pid: string) => boolean;
  unlike: (pid: string) => void;
  pass: (pid: string) => void;
  unmatch: (pid: string) => void;
  send: (pid: string, text: string) => void;
  updateMe: (patch: Partial<Me>) => void;
  createProfile: (me: Omit<Me, "custom">) => void;
  reset: () => void;
  resetDeck: () => void;
}

const StoreCtx = createContext<Ctx | null>(null);
const uid = () => Math.random().toString(36).slice(2, 10);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(load);
  const [typing, setTyping] = useState<Record<string, boolean>>({});
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(state)); }, [state]);

  const toggleFavorite = useCallback((id: string) => {
    const has = stateRef.current.me.favorites.includes(id);
    setState((s) => ({ ...s, me: { ...s.me, favorites: has ? s.me.favorites.filter((f) => f !== id) : [...s.me.favorites, id] } }));
    return !has;
  }, []);

  const like = useCallback((pid: string) => {
    const p = personById(pid);
    const mutual = !!p?.likesMe;
    setState((s) => ({
      ...s,
      liked: s.liked.includes(pid) ? s.liked : [...s.liked, pid],
      passed: s.passed.filter((x) => x !== pid),
      matches: mutual ? { ...s.matches, [pid]: Date.now() } : s.matches,
    }));
    return mutual;
  }, []);

  const unlike = useCallback((pid: string) => {
    setState((s) => ({ ...s, liked: s.liked.filter((x) => x !== pid) }));
  }, []);

  const pass = useCallback((pid: string) => {
    setState((s) => ({ ...s, passed: s.passed.includes(pid) ? s.passed : [...s.passed, pid] }));
  }, []);

  const unmatch = useCallback((pid: string) => {
    setState((s) => {
      const matches = { ...s.matches }; delete matches[pid];
      const messages = { ...s.messages }; delete messages[pid];
      return { ...s, matches, messages, liked: s.liked.filter((x) => x !== pid), passed: [...s.passed, pid] };
    });
  }, []);

  const send = useCallback((pid: string, text: string) => {
    const msg: Msg = { id: uid(), from: "me", text, at: Date.now() };
    setState((s) => ({ ...s, messages: { ...s.messages, [pid]: [...(s.messages[pid] ?? []), msg] } }));
    const p = personById(pid);
    if (!p) return;
    setTimeout(() => setTyping((t) => ({ ...t, [pid]: true })), 600);
    setTimeout(() => {
      setTyping((t) => ({ ...t, [pid]: false }));
      setState((s) => {
        if (!s.matches[pid]) return s;
        const count = (s.messages[pid] ?? []).filter((m) => m.from === "them").length;
        const reply: Msg = { id: uid(), from: "them", text: p.replies[count % p.replies.length], at: Date.now(), demo: true };
        return { ...s, messages: { ...s.messages, [pid]: [...(s.messages[pid] ?? []), reply] } };
      });
    }, 2200);
  }, []);

  const updateMe = useCallback((patch: Partial<Me>) => setState((s) => ({ ...s, me: { ...s.me, ...patch } })), []);
  const createProfile = useCallback((me: Omit<Me, "custom">) => setState((s) => ({ ...s, me: { ...me, custom: true } })), []);
  const reset = useCallback(() => setState(seed()), []);
  const resetDeck = useCallback(() => setState((s) => ({ ...s, passed: [] })), []);

  const value = useMemo<Ctx>(() => ({
    ...state, typing,
    isFav: (id) => state.me.favorites.includes(id),
    toggleFavorite, like, unlike, pass, unmatch, send, updateMe, createProfile, reset, resetDeck,
  }), [state, typing, toggleFavorite, like, unlike, pass, unmatch, send, updateMe, createProfile, reset, resetDeck]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("StoreProvider missing");
  return c;
}

export function useCommon(favorites: string[]) {
  const { me } = useStore();
  return useMemo(() => favorites.filter((f) => me.favorites.includes(f)), [favorites, me.favorites]);
}
