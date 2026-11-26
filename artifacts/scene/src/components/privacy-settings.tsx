import { SupportEmail } from "@/components/scene-brand";
import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { downloadPrivateObject, requireSupabase, turkishError } from "@/lib/supabase";
import { requestKinds, requestStatuses, setPushConsent } from "@/lib/privacy";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Request = { id: string; kind: keyof typeof requestKinds; status: string; received_at: string; response?: string };
type Settings = {
  registration: { terms_version: string; accepted_at: string } | null;
  device_push: boolean;
  legacy_push: boolean;
  requests: Request[];
};

function saveFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function PrivacySettings({ user, photos }: { user: string; photos: readonly string[] }) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<keyof typeof requestKinds>("access");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [media, setMedia] = useState<{ path: string; bucket: string }[]>([]);
  const settings = useQuery({
    queryKey: ["scene-privacy", user],
    enabled: open,
    gcTime: 0,
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc("scene_privacy_settings");
      if (error) throw error;
      return data as Settings;
    },
  });

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(""); setStatus("");
    try { await action(); }
    catch (error) { setError(turkishError(error)); }
    finally { setBusy(false); }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (body.trim().length < 10) { setError("En az 10 karakter yaz."); return; }
    void run(async () => {
      const { data, error } = await requireSupabase().rpc("scene_privacy_request", { request_kind: kind, request_body: body.trim() });
      if (error) throw error;
      setBody("");
      setStatus(`Başvurun alındı. Takip numarası ${data}`);
      void settings.refetch();
    });
  }

  return <details className="scene-panel space-y-4 p-4 sm:p-6" onToggle={(e) => setOpen(e.currentTarget.open)}>
    <summary className="cursor-pointer text-xl font-bold">Kişisel veriler ve KVKK</summary>
    {open && <>
      <Link href="/kurallar" className="block text-sm text-brand-ink underline">KVKK ve hukuki belgeler</Link>
      <p className="text-sm text-muted-foreground">İletişim ve destek · <SupportEmail /></p>
      {settings.isPending && <p role="status" className="text-sm">Gizlilik bilgileri yükleniyor…</p>}
      {settings.isError && <p role="alert" className="text-sm">{turkishError(settings.error)}</p>}
      {settings.data?.registration && <p className="text-sm">Koşulların kayıtlı sürümü {settings.data.registration.terms_version} · {new Date(settings.data.registration.accepted_at).toLocaleDateString("tr-TR")}</p>}
      <div className="space-y-2">
        <h3 className="font-semibold">Verilerini indir</h3>
        <p className="text-sm text-muted-foreground">Hesap verilerin ve gönderdiğin içerikler JSON olarak indirilir. Erişebildiğin medya dosyalarını ayrı indirebilirsin.</p>
        <Button variant="secondary" disabled={busy} onClick={() => void run(async () => {
          const { data, error } = await requireSupabase().rpc("scene_privacy_export");
          if (error) throw error;
          saveFile(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), "movia-kisisel-veriler.json");
          const chat = (data.sent_messages as { media_path?: string | null }[])
            .flatMap(({ media_path }) => media_path ? [{ path: media_path, bucket: "scene-chat" }] : []);
          const voice = data.profile_voice?.object_path;
          setMedia([...photos.map((path) => ({ path, bucket: "scene-avatars" })), ...chat,
            ...(typeof voice === "string" ? [{path: voice, bucket: "scene-chat"}] : [])]);
          setStatus("Veri dosyan hazır.");
        })}>Kişisel verilerimi indir</Button>
        {media.length > 0 && <ul className="space-y-1">{media.map(({ path, bucket }, index) =>
          <li key={`${bucket}/${path}`}><Button size="sm" variant="ghost" disabled={busy} onClick={() => void run(async () => {
            const file = await downloadPrivateObject(bucket, path, AbortSignal.timeout(30_000));
            saveFile(file, path.split("/").at(-1) ?? "movia-medya");
          })}>{bucket === "scene-avatars" ? "Profil fotoğrafı" : "Sohbet eki"} {index + 1} · İndir</Button></li>
        )}</ul>}
      </div>
      <div className="space-y-2 border-t pt-4">
        <h3 className="font-semibold">Cihaz bildirimi rızası</h3>
        <Link href="/kurallar?belge=bildirim-rizasi" className="block text-sm text-brand-ink underline">Bildirim Açık Rıza Metni</Link>
        {(settings.data?.device_push || settings.data?.legacy_push) ? <Button variant="secondary" disabled={busy} onClick={() => void run(async () => {
          await setPushConsent(false);
          void client.invalidateQueries({ queryKey: ["push-subscription", user] });
          void settings.refetch();
          setStatus("Bildirim tercihin geri çekildi ve tüm cihaz abonelikleri kaldırıldı.");
        })}>Tüm cihazlar için rızamı geri çek</Button> : settings.isSuccess && <p className="text-sm text-muted-foreground">Etkin bildirim rızası bulunmuyor.</p>}
      </div>
      <form onSubmit={submit} className="space-y-2 border-t pt-4">
        <h3 className="font-semibold">KVKK başvurusu</h3>
        <label className="block text-sm">Başvuru türü
          <select className="mt-1 block w-full rounded-lg border bg-card p-2 text-base" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            {Object.entries(requestKinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label className="block text-sm">Talebin
          <Textarea required minLength={10} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} className="mt-1 text-base" />
        </label>
        <p className="text-xs text-muted-foreground">Kimlik belgesi, şifre veya gereksiz hassas bilgi gönderme.</p>
        <Button disabled={busy}>Başvuruyu gönder</Button>
      </form>
      {!!settings.data?.requests.length && <ul className="space-y-2">
        {settings.data.requests.map((request) => <li key={request.id} className="rounded-xl border p-3 text-sm [overflow-wrap:anywhere]">
          <strong>{requestKinds[request.kind]} · {requestStatuses[request.status]}</strong>
          <p className="text-muted-foreground">{request.id} · {new Date(request.received_at).toLocaleDateString("tr-TR")}</p>
          {request.response && <p className="mt-2 whitespace-pre-wrap">{request.response}</p>}
        </li>)}
      </ul>}
      {status && <p role="status" className="text-sm [overflow-wrap:anywhere]">{status}</p>}
      {error && <p role="alert" className="text-sm">{error}</p>}
    </>}
  </details>;
}
