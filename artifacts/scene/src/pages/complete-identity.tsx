import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useStore, type Person } from "@/lib/store";
import { turkishError } from "@/lib/supabase";
import { isProvince, latestAdultBirthDate } from "@/lib/provinces";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ProvinceSelect } from "@/components/province-select";

export function CompleteIdentity({ person }: { person: Person }) {
  const { saveIdentity } = useStore();
  const { signOut } = useAuth();
  const [province, setProvince] = useState(isProvince(person.city) ? person.city : "");
  const [birthDate, setBirthDate] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const needsBirthDate = person.age === null;
  const latest = latestAdultBirthDate();

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md items-center px-5 py-8">
      <form className="scene-panel w-full space-y-5 p-5 sm:p-8" onSubmit={async (event) => {
        event.preventDefault();
        if (!isProvince(province) || (needsBirthDate && (!birthDate || birthDate > latest))) {
          setError("Geçerli bir il seç. MOVIA DATING’i kullanmak için en az 18 yaşında olmalısın.");
          return;
        }
        setError("");
        setBusy(true);
        try {
          await saveIdentity(needsBirthDate ? birthDate : null, province);
        } catch (error) {
          setError(turkishError(error));
        } finally {
          setBusy(false);
        }
      }}>
        <h1 className="scene-title">Profilini tamamla</h1>
        <p className="text-sm text-muted-foreground">MOVIA DATING 18 yaş ve üzeri üyeler içindir. Profilinde yaşın ve seçtiğin il görünür. Doğum tarihin gizli kalır.</p>
        {needsBirthDate && (
          <div className="space-y-1.5">
            <Label htmlFor="birth-date">Doğum tarihi</Label>
            <Input id="birth-date" type="date" autoComplete="bday" required max={latest} value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)} className="h-12 min-w-0 bg-card text-base" />
          </div>
        )}
        <ProvinceSelect id="identity-city" value={province} onChange={setProvince} />
        {error && <p role="alert" className="text-sm text-brand-ink">{error}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={busy}>{busy ? "Kaydediliyor…" : "Kaydet ve devam et"}</Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={() => void signOut().catch((error) => setError(turkishError(error)))}>Çıkış yap</Button>
        </div>
      </form>
    </main>
  );
}
