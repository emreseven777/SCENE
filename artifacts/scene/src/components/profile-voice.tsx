import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AttachmentControls, AttachmentPreview, type PendingMedia } from "./chat-experience";
import { Button } from "./ui/button";
import { requireSupabase, turkishError } from "@/lib/supabase";
import { CHAT_BUCKET } from "@/lib/chat-media";

const prompts = ["Bir film karakteri olsaydın kim olurdun?", "İdeal film gecen nasıl geçer?", "Herkese hangi filmi önerirsin?"];
const formats: Record<string, string> = { "audio/webm": "webm", "audio/mp4": "m4a", "audio/ogg": "ogg" };

export function ProfileVoice({ member, viewer, editable = false }: { member: string; viewer: string; editable?: boolean }) {
  const [draft, setDraft] = useState<PendingMedia>();
  const [prompt, setPrompt] = useState(1);
  const [busy, setBusy] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);
  const [error, setError] = useState("");
  const voice = useQuery({
    queryKey: ["scene-profile-voice", viewer, member],
    queryFn: async () => {
      const db = requireSupabase();
      const { data, error } = await db.from("scene_profile_voice").select("prompt,object_path").eq("user_id",member).maybeSingle();
      if (error?.code === "PGRST205") return null;
      if (error) throw error;
      if (!data) return null;
      const signed = await db.storage.from(CHAT_BUCKET).createSignedUrl(data.object_path, 90);
      if (signed.error) throw signed.error;
      return { ...data, url: signed.data.signedUrl };
    },
    staleTime: 60_000, gcTime: 0,
  });

  const save = async (remove: boolean) => {
    if (!editable || busy || viewer !== member) return;
    const db = requireSupabase();
    const files = db.storage.from(CHAT_BUCKET);
    const table = db.from("scene_profile_voice");
    const old = voice.data?.object_path as string | undefined;
    let uploaded: string | undefined;
    setBusy(true);
    setError("");
    try {
      if (remove) {
        const result = await table.delete().eq("user_id", member).eq("object_path", old!).select("object_path").single();
        if (result.error) throw result.error;
      } else {
        const mime = draft?.file.type.split(";")[0] ?? "";
        if (!draft || !formats[mime] || !draft.file.size || draft.file.size > 8 * 1024 * 1024) {
          throw new Error("Desteklenen biçimde en fazla 8 MB ses kaydı seç.");
        }
        uploaded = `profile-voice/${member}/${crypto.randomUUID()}.${formats[mime]}`;
        const result = await files.upload(uploaded, await draft.file.arrayBuffer(), {contentType: mime, cacheControl: "0"});
        if (result.error) throw result.error;
        const row = {prompt, object_path: uploaded};
        const write = old ? await table.update(row).eq("user_id",member).eq("object_path",old).select("object_path").single()
          : await table.insert(row).select("object_path").single();
        if (write.error) throw write.error;
      }
      if (old) {
        const removed = await files.remove([old]);
        if (removed.error) setError("Yanıt güncellendi. Önceki dosya henüz temizlenemedi.");
      }
      setDraft(undefined);
      setPlaybackError(false);
      await voice.refetch();
    } catch (e) {
      if (uploaded) await files.remove([uploaded]).catch(() => undefined);
      setError(turkishError(e));
      await voice.refetch();
    } finally { setBusy(false); }
  };

  if (!editable && !voice.data) return null;
  return <section className="scene-panel space-y-3 p-4">
    <h2 className="text-xl font-bold">Sesli profil sorusu</h2>
    {voice.data && <>
      <p>{prompts[Number(voice.data.prompt) - 1]}</p>
      <audio controls preload="none" src={voice.data.url} className="w-full" onError={() => setPlaybackError(true)} />
      {playbackError && <div className="space-y-2">
        <p role="alert" className="text-sm text-muted-foreground">Kayıt oynatılamadı.</p>
        <Button size="sm" variant="outline" disabled={voice.isFetching} onClick={() => {
          setPlaybackError(false);
          void voice.refetch();
        }}>Ses bağlantısını yenile</Button>
      </div>}
    </>}
    {editable && <>
      <p className="text-sm text-muted-foreground">Kaydı yayımlarsan yalnızca karşılıklı eşleştiğin kişiler dinleyebilir.</p>
      <label className="block text-sm">Yanıtlayacağın soru
        <select value={prompt} onChange={(event) => setPrompt(Number(event.target.value))} className="mt-1 w-full rounded-lg border bg-card p-2">
          {prompts.map((question, index) => <option key={question} value={index + 1}>{question}</option>)}
        </select>
      </label>
      {typeof MediaRecorder !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function" ?
        <AttachmentControls audioOnly disabled={busy || !voice.isSuccess} onPick={setDraft} /> :
        <p className="text-sm text-muted-foreground">Bu tarayıcı mikrofon kaydını desteklemiyor.</p>}
      {draft && <AttachmentPreview media={draft} onRemove={() => setDraft(undefined)} />}
      {draft && <Button disabled={busy || !voice.isSuccess} onClick={() => void save(false)}>Yanıtı yayımla</Button>}
      {voice.data && <Button variant="outline" disabled={busy} onClick={() => void save(true)}>Sesli yanıtı kaldır</Button>}
      {(error || voice.isError) && <p role="alert" className="text-sm text-destructive">{error || "Sesli yanıt yüklenemedi."}</p>}
    </>}
  </section>;
}
