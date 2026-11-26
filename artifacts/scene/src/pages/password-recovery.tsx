import { useEffect, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRecoveryClient, requireSupabase } from "@/lib/supabase";
import { MIN_NEW_PASSWORD_LENGTH } from "@/lib/auth";
import { Frame } from "./auth";

function recoveryError(error: { code?: string; status?: number }, fallback: string) {
  if (error.code === "otp_expired" || error.code === "session_not_found") {
    return "Bağlantı geçersiz veya süresi dolmuş. Yeni bir bağlantı iste.";
  }
  if (error.status === 429) return "Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.";
  if (error.code === "same_password") return "Önceki şifrenden farklı bir şifre seç.";
  if (error.code === "weak_password") return "Daha güçlü bir şifre seç.";
  return fallback;
}

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const redirectTo = new URL(`${import.meta.env.BASE_URL}sifre-yenile`, window.location.origin).href;
      const result = await requireSupabase().auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (result.error && (!result.error.status || result.error.status >= 500)) {
        setError("İstek şu anda işlenemedi. Biraz sonra tekrar dene.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Bağlantı kurulamadı. Tekrar dene.");
    } finally {
      setBusy(false);
    }
  }

  return <Frame title="Şifremi unuttum">
    {sent ? <p role="status">Bu adresle bir hesap varsa şifre yenileme bağlantısı gönderilir. Gelen kutunu ve spam klasörünü kontrol et.</p> :
      <form onSubmit={submit} className="grid gap-3">
        <Label htmlFor="recovery-email">E-posta</Label>
        <Input id="recovery-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        {error && <p role="alert" className="text-destructive">{error}</p>}
        <Button disabled={busy}>Yenileme bağlantısı iste</Button>
      </form>}
    <RecoveryLink to="/giris">Girişe dön</RecoveryLink>
  </Frame>;
}

function RecoveryLink({ to, children }: { to: string; children: string }) {
  return <Link href={to} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-brand-ink underline">{children}</Link>;
}

function readRecoveryLink() {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const tokenHash = fragment.get("recovery_token");
  if (tokenHash) return { kind: "otp", tokenHash } as const;
  const accessToken = fragment.get("access_token");
  const refreshToken = fragment.get("refresh_token");
  return fragment.get("type") === "recovery" && accessToken && refreshToken
    ? { kind: "session", accessToken, refreshToken } as const
    : null;
}

export function ResetPassword() {
  const [link, setLink] = useState(readRecoveryLink);
  const [client, setClient] = useState<ReturnType<typeof createRecoveryClient> | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
  }, []);

  async function verify() {
    if (!link || busy) return;
    setBusy(true);
    setError("");
    try {
      const recovery = createRecoveryClient();
      const { data, error } = link.kind === "otp"
        ? await recovery.auth.verifyOtp({ token_hash: link.tokenHash, type: "recovery" })
        : await recovery.auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken });
      if (error || !data.session) {
        setError(recoveryError(error ?? {}, "Bağlantı doğrulanamadı. Yeniden dene veya yeni bir bağlantı iste."));
        if (!error || (error.status && error.status >= 400 && error.status < 429)) setLink(null);
      } else {
        setLink(null);
        setClient(recovery);
      }
    } catch {
      setError("Bağlantı kurulamadı. Tekrar dene.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!client || busy) return;
    if (password.length < MIN_NEW_PASSWORD_LENGTH) {
      setError(`Şifre en az ${MIN_NEW_PASSWORD_LENGTH} karakter olmalı.`);
      return;
    }
    if (password !== confirm) {
      setError("Girdiğin şifreler aynı olmalı.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { error } = await client.auth.updateUser({ password });
      if (error) {
        setError(recoveryError(error, "Şifre değiştirilemedi. Tekrar dene veya yeni bir bağlantı iste."));
        return;
      }
      setDone(true);
      setClient(null);
      setPassword("");
      setConfirm("");
      await client.auth.signOut({ scope: "local" });
    } catch {
      setError("Bağlantı kurulamadı. Tekrar dene.");
    } finally {
      setBusy(false);
    }
  }

  return <Frame title="Yeni şifre oluştur">
    {done ? <>
      <p role="status">Şifren güncellendi. Yeni şifrenle giriş yapabilirsin.</p>
      <RecoveryLink to="/giris">Girişe dön</RecoveryLink>
    </> : <>
      {client ? <form onSubmit={submit} className="grid gap-3">
        <Label htmlFor="new-password">Yeni şifre</Label>
        <Input id="new-password" type="password" required minLength={MIN_NEW_PASSWORD_LENGTH} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <Label htmlFor="confirm-password">Yeni şifreyi tekrar gir</Label>
        <Input id="confirm-password" type="password" required minLength={MIN_NEW_PASSWORD_LENGTH} autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
        <Button disabled={busy}>Şifreyi güncelle</Button>
      </form> : link ? <Button onClick={() => void verify()} disabled={busy}>Bağlantıyı doğrula</Button> :
        !error && <p role="alert">Bağlantı geçersiz veya süresi dolmuş. Yeni bir bağlantı iste.</p>}
      {error && <p role="alert" className="mt-3 text-destructive">{error}</p>}
      <RecoveryLink to="/sifremi-unuttum">Yeni bağlantı iste</RecoveryLink>
    </>}
  </Frame>;
}
