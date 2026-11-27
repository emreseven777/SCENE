import appStoreLogo from "@/assets/appstore.svg";
import googlePlayLogo from "@/assets/googleplay.svg";
import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, MailCheck, Clapperboard, Tv, Users, Heart, UserPlus, LogIn, Play } from "lucide-react";
import { CinemaCollage, SceneBrand, SupportEmail, ThemeToggle } from "@/components/scene-brand";
import { latestAdultBirthDate } from "@/lib/provinces";
import { brand } from "@/lib/brand";
import { MIN_NEW_PASSWORD_LENGTH, useAuth } from "@/lib/auth";
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

const upcomingStores = [
  { name: "App Store", logo: appStoreLogo },
  { name: "Google Play", logo: googlePlayLogo },
];

export function ComingSoonStores() {
  return (
    <section aria-labelledby="coming-soon-heading" aria-describedby="coming-soon-description" className="mt-7 w-full min-w-0 border-t border-[#d5b57c]/55 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <h2 id="coming-soon-heading" className="text-xl font-bold tracking-tight text-[#790e25]">Çok yakında cebinde</h2>
      <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3" aria-label="Uygulama mağazaları">
        {upcomingStores.map(({ name, logo }) => (
          <li key={name} className="flex min-w-0 items-center justify-center gap-2 rounded-2xl border border-[#d5b57c]/80 bg-linear-to-br from-[#fffdf7] to-[#fff3df] px-2 py-3 text-left shadow-sm sm:gap-3 sm:px-4">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#810e28]/8 sm:size-10">
              <img alt="" src={logo} className="size-[1.125rem] sm:size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs leading-tight font-bold text-[#790e25] sm:text-sm">{name}</p>
              <p className="mt-0.5 text-[11px] leading-tight font-medium text-[#653a36]">Yakında</p>
            </div>
          </li>
        ))}
      </ul>
      <p id="coming-soon-description" className="mt-3 text-xs text-[#653a36]">iOS ve Android için hazırlanıyor.</p>
    </section>
  );
}

export function WelcomePage() {
  const features = [{label:"FİLMLER",Icon:Clapperboard},{label:"DİZİLER",Icon:Tv},{label:"ARKADAŞLIK",Icon:Users},{label:"FLÖRT",Icon:Heart}];
  return <main className="fixed inset-0 mx-auto flex h-[100dvh] w-full max-w-lg flex-col overflow-hidden text-center text-white" style={{background:"radial-gradient(ellipse at 0% 72%, #650d29 0%, transparent 45%), radial-gradient(ellipse at 100% 80%, #510b24 0%, transparent 45%), #180e15"}}>
    <div className="relative min-h-0 flex-1">
      <img src="/2E8C2DB8-E721-4812-90CB-154D27282CE5.png" alt="Sinema salonunda birbirine bakan çift" fetchPriority="high" className="absolute inset-x-0 bottom-0 top-[clamp(48px,9dvh,90px)] h-[calc(100%-clamp(48px,9dvh,90px))] w-full object-cover object-[center_25%]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-[#180e15]" />
      <div className="relative flex flex-col items-center pt-[max(4px,env(safe-area-inset-top))]">
        <div className="relative grid size-8 place-items-center"><Heart className="absolute size-8 fill-[#f73c72] text-[#f73c72]" /><Play className="relative size-3.5 fill-[#241019] text-[#241019]" /></div>
        <span className="text-[clamp(24px,6.5vw,34px)] font-black leading-none tracking-tight">MOVIA</span>
        <span className="mt-0.5 text-[9px] font-medium tracking-[.42em]">DATING</span>
      </div>
    </div>
    <div className="relative z-10 -mt-8 shrink-0 px-5">
      <div className="grid grid-cols-4 divide-x divide-[#f35b86]/40">
        {features.map(({label,Icon})=><div key={label} className="flex flex-col items-center gap-1.5"><Icon className="size-7 text-[#ff739c]" strokeWidth={1.7}/><span className="text-[10px] font-bold tracking-wide">{label}</span></div>)}
      </div>
      <h1 className="mt-[clamp(8px,1.8dvh,20px)] text-[clamp(22px,6.5vw,36px)] font-extrabold leading-[1.12] tracking-tight">Aynı hikâyeleri seven insanlarla <span className="text-[#ff4279]">eşleş.</span></h1>
      <p className="mx-auto mt-2 max-w-sm text-[clamp(12px,1.8dvh,14px)] leading-relaxed text-white/80">Favori film ve dizilerin üzerinden arkadaşlık, sohbet ve belki daha fazlası...</p>
      <div aria-hidden="true" className="my-[clamp(6px,1.4dvh,16px)] flex justify-center gap-2"><span className="size-2 rounded-full bg-[#ff4279]"/><span className="size-2 rounded-full bg-white/20"/><span className="size-2 rounded-full bg-white/20"/></div>
      <div className="grid gap-2">
        <Link href="/kayit" className="relative flex min-h-[clamp(42px,6.5dvh,56px)] items-center justify-center gap-3 rounded-full border border-[#ff759c] bg-gradient-to-br from-[#ff3975] to-[#a91e4b] px-8 text-lg font-bold text-white shadow-lg"><UserPlus className="size-6"/>Hemen Kayıt Ol<ArrowRight className="absolute right-5 size-5"/></Link>
        <Link href="/giris" className="flex min-h-[clamp(38px,5.8dvh,48px)] items-center justify-center gap-3 rounded-full border border-white/90 bg-black/10 text-base font-bold text-white"><LogIn className="size-5"/>Giriş Yap</Link>
      </div>
      <section aria-label="Uygulama mağazaları" className="mt-3 grid grid-cols-2 gap-3">
        {upcomingStores.map(({name,logo})=><div key={name} className="flex items-center justify-center gap-2 rounded-xl border border-[#ff4279] bg-black/20 px-2 py-2.5 shadow-[0_0_12px_#ff427933]"><img src={logo} alt="" className="size-7 shrink-0" style={name==="App Store"?{filter:"brightness(0) invert(1)"}:undefined}/><div className="text-left"><p className="text-xs font-bold">{name}</p><p className="text-[11px] text-white/75">Çok Yakında</p></div></div>)}
      </section>
    </div>
    <div aria-hidden="true" className="relative mt-2 h-[clamp(24px,5dvh,64px)] shrink-0 overflow-hidden"><div className="absolute -left-8 top-4 flex w-[120%] -rotate-6 justify-around border-y-[6px] border-dashed border-[#c52659] bg-[#6d1534]/60 py-2 text-[#ff4279]"><Clapperboard/><Play className="fill-current"/><Clapperboard/><Play className="fill-current"/></div></div>
    <div className="shrink-0 pb-[env(safe-area-inset-bottom)]" />
  </main>;
}

export function Frame({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
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
      <footer className="flex flex-wrap justify-center gap-x-4 gap-y-2 pt-5 text-xs text-muted-foreground" aria-label="Destek ve belgeler">
        <Link className="underline underline-offset-4" href="/kurallar">Hukuki belgeler</Link>
        <SupportEmail />
      </footer>
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
        <Link href="/sifremi-unuttum" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-ink underline">Şifremi unuttum</Link>
        {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-3 py-2 text-sm" data-testid="text-login-error">{error}</p>}
        <Button type="submit" disabled={busy} className="h-12 w-full text-base" data-testid="button-login">{busy ? <Loader2 className="animate-spin" size={18} /> : "Giriş yap"}</Button>
      </form>
      <Link href="/kurallar" className="mt-4 block text-center text-sm text-brand-ink underline">KVKK ve hukuki belgeler</Link>
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
  const [birthDate, setBirthDate] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const latest = latestAdultBirthDate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_NEW_PASSWORD_LENGTH) { setError(`Şifre en az ${MIN_NEW_PASSWORD_LENGTH} karakter olmalı.`); return; }
    if (!birthDate || birthDate > latest || !termsAccepted) {
      setError("Üyelik için 18 yaşını doldurmalı ve Kullanım Koşullarını kabul etmelisin.");
      return;
    }
    setBusy(true); setError(null);
    try {
      const { needsConfirmation } = await signUp(email, password, name, birthDate, termsAccepted);
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
    <Frame title={`${brand.name}’e katıl`} description="Favori filmlerini paylaş, ortak hikâyeleri keşfet.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5"><Label htmlFor="name">İsim</Label><Input id="name" autoComplete="given-name" required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} className="h-12 text-base" data-testid="input-register-name" /></div>
        <div className="space-y-1.5"><Label htmlFor="r-email">E-posta</Label><Input id="r-email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 text-base" data-testid="input-register-email" /></div>
        <div className="space-y-1.5"><Label htmlFor="r-password">Şifre</Label><Input id="r-password" type="password" autoComplete="new-password" required minLength={MIN_NEW_PASSWORD_LENGTH} value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 text-base" data-testid="input-register-password" /><p className="text-xs text-muted-foreground">En az {MIN_NEW_PASSWORD_LENGTH} karakter.</p></div>
        <div className="space-y-1.5">
          <Label htmlFor="register-birth-date">Doğum tarihi</Label>
          <Input id="register-birth-date" type="date" autoComplete="bday" required max={latest}
            value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="h-12 text-base" />
          <p className="text-xs text-muted-foreground">{brand.name} 18 yaş ve üzeri içindir. Profilde yalnızca yaşın gösterilir.</p>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-brand-ink">
          <Link className="underline" href="/kurallar?belge=aydinlatma" target="_blank" rel="noopener">KVKK Aydınlatma Metni</Link>
          <Link className="underline" href="/kurallar?belge=gizlilik" target="_blank" rel="noopener">Gizlilik Politikası</Link>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <input id="register-terms" type="checkbox" required checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-1 accent-primary" />
          <div>
            <label htmlFor="register-terms"><strong>Kullanım Koşullarını</strong> kabul ediyorum.</label>{" "}
            <Link className="text-brand-ink underline" href="/kurallar?belge=kosullar" target="_blank" rel="noopener">Koşulları aç</Link>
          </div>
        </div>
        {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-3 py-2 text-sm" data-testid="text-register-error">{error}</p>}
        <Button type="submit" disabled={busy} className="h-12 w-full text-base" data-testid="button-register">{busy ? <Loader2 className="animate-spin" size={18} /> : "Hesap oluştur"}</Button>
      </form>
      <Link href="/kurallar" className="mt-4 block text-center text-sm text-brand-ink underline">Kullanım koşulları, topluluk kuralları ve gizlilik</Link>
      <p className="mt-6 text-center text-sm text-muted-foreground">Zaten hesabın var mı? <Link href="/giris" className="font-semibold text-foreground underline decoration-primary underline-offset-4" data-testid="link-to-login">Giriş yap</Link></p>
      <p className="mt-3 text-center text-[11px] text-muted-foreground">E-posta adresin diğer kullanıcılara gösterilmez.</p>
    </Frame>
  );
}
