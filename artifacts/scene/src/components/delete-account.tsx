import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { requireSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const phrase = "HESABIMI SİL";

export function DeleteAccount() {
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  return <>
    <Button variant="ghost" className="text-destructive" onClick={() => setOpen(true)}>Hesabımı kalıcı sil</Button>
    <Dialog open={open} onOpenChange={(value) => {
      if (busy) return;
      setOpen(value);
      if (!value) { setPassword(""); setConfirmation(""); setError(""); }
    }}><DialogContent>
      <DialogTitle>Hesabını kalıcı olarak sil</DialogTitle>
      <DialogDescription>Profilin, fotoğrafların ve hesabına bağlı veriler silinir. Bu işlem geri alınamaz.</DialogDescription>
      {done ? <p>Hesabın silindi. Bu sekmeyi kapatabilirsin.</p> : <form className="grid gap-3" onSubmit={async (event) => {
        event.preventDefault();
        if (busy || confirmation !== phrase || !password) return;
        setBusy(true); setError("");
        try {
          const { data, error } = await requireSupabase().functions.invoke<{ ok: boolean }>("scene-delete-account", { body: { confirmation, password } });
          if (error || !data?.ok) throw error ?? new Error("Deletion did not complete");
          await signOut().catch(() => undefined);
          setDone(true);
        } catch {
          setError("Silme işlemi tamamlanamadı. Şifreni kontrol edip tekrar deneyebilirsin.");
        } finally { setBusy(false); setPassword(""); }
      }}>
        <label className="text-sm">Onay için {phrase} yaz<Input className="mt-1" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required /></label>
        <label className="text-sm">Geçerli şifre<Input className="mt-1" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button variant="destructive" disabled={busy || confirmation !== phrase || !password}>{busy ? "Siliniyor…" : "Kalıcı olarak sil"}</Button>
      </form>}
    </DialogContent></Dialog>
  </>;
}
