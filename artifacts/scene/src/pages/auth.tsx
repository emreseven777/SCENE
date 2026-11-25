import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, MailCheck } from "lucide-react";
import { CinemaCollage, SceneBrand, ThemeToggle } from "@/components/scene-brand";
import { useAuth } from "@/lib/auth";
import { turkishError } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function AuthHeader() {
  return (
    <header className="flex items-center justify-between gap-3 pb-5">
      <SceneBrand />
      <ThemeToggle />
    </header>
  );
}

export function WelcomePage() {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-7">
      <AuthHeader />
      <main className="scene-panel my-auto grid overflow-hidden md:grid-cols-[1fr_1.05fr]">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col justify-center p-6 sm:p-12 lg:p-16">
          <h1 className="scene-title">Seninle aynı <span className="text-brand-ink">sahnede.</span></h1>
          <p className="mt-4 max-w-xs text-base leading-relaxed text-muted-foreground">Aynı filmler. Ortak tutkular. Yeni hikâyeler.</p>
          <div className="mt-7 flex flex-wrap items-center gap-2">
            <Button asChild size="lg"><Link href="/kayit">Keşfetmeye başla <ArrowRight /></Link></Button>
            <Button asChild variant="ghost" size="lg"><Link href="/giris">Giriş yap</Link></Button>
          </div>
        </motion.div>
        <CinemaCollage className="scene-gradient min-h-52 sm:min-h-72 md:min-h-[29rem]" />
      </main>
    </div>
  );
}

function Frame({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-7">
      <AuthHeader />
      <main className="scene-panel mx-auto my-auto grid w-full max-w-md overflow-hidden md:max-w-5xl md:grid-cols-[1fr_0.9fr]">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-5 sm:p-9 lg:p-12">
          <h1 className="scene-title">{title}</h1>
          {description && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>}
          <div className="mt-6">{children}</div>
        </motion.div>
        <div className="scene-gradient relative hidden overflow-hidden md:grid md:content-center">
          <CinemaCollage className="min-h-[24rem]" />
        </div>
      </main>
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
    <Frame title="Tekrar hoş geldin." description="Favori hikâyelerinden başlayan sohbetlere geri dön.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5"><Label htmlFor="email">E-posta</Label><Input id="email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 text-base" data-testid="input-login-email" /></div>
        <div className="space-y-1.5"><Label htmlFor="password">Şifre</Label><Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 text-base" data-testid="input-login-password" /></div>
        {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-3 py-2 text-sm" data-testid="text-login-error">{error}</p>}
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
      <Frame title="E-postanı doğrula">
        <div className="rounded-xl border border-border bg-card p-5" data-testid="status-confirm-email">
          <MailCheck className="text-brand-ink" />
          <p className="mt-3 text-sm leading-relaxed text-foreground/85"><span className="font-semibold">{sentTo}</span> adresine bir onay bağlantısı gönderdik. Bağlantıya dokunduktan sonra giriş yapabilirsin.</p>
          <p className="mt-2 text-xs text-muted-foreground">E-posta gelmediyse istenmeyen klasörünü kontrol et.</p>
        </div>
        <Link href="/giris" className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground" data-testid="link-to-login-after-signup">Girişe dön</Link>
      </Frame>
    );
  }

  return (
    <Frame title="SCENE’e katıl" description="Favori filmlerini paylaş, ortak hikâyeleri keşfet.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5"><Label htmlFor="name">İsim</Label><Input id="name" autoComplete="given-name" required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} className="h-12 text-base" data-testid="input-register-name" /></div>
        <div className="space-y-1.5"><Label htmlFor="r-email">E-posta</Label><Input id="r-email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 text-base" data-testid="input-register-email" /></div>
        <div className="space-y-1.5"><Label htmlFor="r-password">Şifre</Label><Input id="r-password" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 text-base" data-testid="input-register-password" /><p className="text-xs text-muted-foreground">En az 6 karakter.</p></div>
        {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-3 py-2 text-sm" data-testid="text-register-error">{error}</p>}
        <Button type="submit" disabled={busy} className="h-12 w-full text-base" data-testid="button-register">{busy ? <Loader2 className="animate-spin" size={18} /> : "Hesap oluştur"}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">Zaten hesabın var mı? <Link href="/giris" className="font-semibold text-foreground underline decoration-primary underline-offset-4" data-testid="link-to-login">Giriş yap</Link></p>
      <p className="mt-3 text-center text-[11px] text-muted-foreground">E-posta adresin diğer kullanıcılara gösterilmez.</p>
    </Frame>
  );
}
