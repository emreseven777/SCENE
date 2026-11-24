import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Loader2, MailCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { turkishError } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Frame({ kicker, title, children }: { kicker: string; title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/25 blur-[120px]" />
      <div className="absolute inset-x-0 top-0 h-8 bg-[repeating-linear-gradient(90deg,transparent_0_14px,hsl(0_0%_100%/0.05)_14px_24px)]" />
      <div className="relative mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-6 py-14">
        <div className="mb-10 flex items-baseline gap-1 font-display text-4xl font-black tracking-tight">
          SCEN<span className="text-primary">E</span><span className="ml-0.5 inline-block h-2.5 w-2.5 rounded-full bg-primary" />
        </div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}>
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">{kicker}</div>
          <h1 className="mt-2 font-display text-6xl font-black uppercase leading-[0.85]">{title}</h1>
          <div className="mt-8">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { signIn } = useAuth();
  const [, go] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try { await signIn(email, password); go("/"); }
    catch (err) { setError(turkishError(err)); }
    finally { setBusy(false); }
  };

  return (
    <Frame kicker="Giriş" title={<>Perde<br /><span className="text-primary">açılıyor.</span></>}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5"><Label htmlFor="email">E-posta</Label><Input id="email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 text-base" data-testid="input-login-email" /></div>
        <div className="space-y-1.5"><Label htmlFor="password">Şifre</Label><Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 text-base" data-testid="input-login-password" /></div>
        {error && <p role="alert" className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm" data-testid="text-login-error">{error}</p>}
        <Button type="submit" disabled={busy} className="h-12 w-full text-base" data-testid="button-login">{busy ? <Loader2 className="animate-spin" size={18} /> : "Giriş yap"}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">Hesabın yok mu? <Link href="/kayit" className="font-semibold text-foreground underline decoration-primary underline-offset-4" data-testid="link-to-register">Kayıt ol</Link></p>
    </Frame>
  );
}

export function RegisterPage() {
  const { signUp } = useAuth();
  const [, go] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError("Şifre en az 6 karakter olmalı."); return; }
    setBusy(true); setError(null);
    try {
      const { needsConfirmation } = await signUp(email, password, name);
      if (needsConfirmation) setSentTo(email.trim()); else go("/profil/olustur");
    } catch (err) { setError(turkishError(err)); }
    finally { setBusy(false); }
  };

  if (sentTo) {
    return (
      <Frame kicker="Son bir adım" title={<>Gelen<br /><span className="text-primary">kutuna bak.</span></>}>
        <div className="rounded-xl border border-white/10 bg-card p-5" data-testid="status-confirm-email">
          <MailCheck className="text-primary" />
          <p className="mt-3 text-sm leading-relaxed text-foreground/85"><span className="font-semibold">{sentTo}</span> adresine bir onay bağlantısı gönderdik. Bağlantıya dokunduktan sonra giriş yapabilirsin.</p>
          <p className="mt-2 text-xs text-muted-foreground">E-posta gelmediyse istenmeyen klasörünü kontrol et.</p>
        </div>
        <Link href="/giris" className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-md bg-primary text-base font-semibold" data-testid="link-to-login-after-signup">Girişe dön</Link>
      </Frame>
    );
  }

  return (
    <Frame kicker="Kayıt" title={<>Jenerikte<br /><span className="text-primary">adın</span> olsun.</>}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5"><Label htmlFor="name">İsim</Label><Input id="name" autoComplete="given-name" required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} className="h-12 text-base" data-testid="input-register-name" /></div>
        <div className="space-y-1.5"><Label htmlFor="r-email">E-posta</Label><Input id="r-email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 text-base" data-testid="input-register-email" /></div>
        <div className="space-y-1.5"><Label htmlFor="r-password">Şifre</Label><Input id="r-password" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 text-base" data-testid="input-register-password" /><p className="text-xs text-muted-foreground">En az 6 karakter.</p></div>
        {error && <p role="alert" className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm" data-testid="text-register-error">{error}</p>}
        <Button type="submit" disabled={busy} className="h-12 w-full text-base" data-testid="button-register">{busy ? <Loader2 className="animate-spin" size={18} /> : "Hesap oluştur"}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">Zaten hesabın var mı? <Link href="/giris" className="font-semibold text-foreground underline decoration-primary underline-offset-4" data-testid="link-to-login">Giriş yap</Link></p>
      <p className="mt-3 text-center text-[11px] text-muted-foreground">E-posta adresin diğer kullanıcılara gösterilmez.</p>
    </Frame>
  );
}
