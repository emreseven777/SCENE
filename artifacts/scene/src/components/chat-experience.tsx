import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, ImagePlus, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { downloadPrivateObject, turkishError } from "@/lib/supabase";
import { CHAT_BUCKET, prepareChatPhoto } from "@/lib/chat-media";
import { PHOTO_ACCEPT } from "@/lib/photo-source";
import { useToast } from "@/hooks/use-toast";
import type { Msg } from "@/lib/store";

export type PendingMedia = { file: Blob; kind: "photo" | "audio" };

function useObjectUrl(blob: Blob | undefined) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!blob) { setUrl(""); return; }
    const href = URL.createObjectURL(blob);
    setUrl(href);
    return () => URL.revokeObjectURL(href);
  }, [blob]);
  return url;
}

export function AttachmentControls({ disabled, onPick, audioOnly = false }: { disabled: boolean; audioOnly?: boolean; onPick: (media: PendingMedia) => void }) {
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const current = recorder.current;
      if (current?.state === "recording") current.stop();
      current?.stream.getTracks().forEach((track) => track.stop());
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const choose = async (file: File) => {
    try {
      const photo = await prepareChatPhoto(file);
      if (!mounted.current) return;
      if (photo.lowResolution) toast({ title: "Fotoğrafın çözünürlüğü düşük", description: "Büyük ekranda net görünmeyebilir." });
      onPick({ file: photo.file, kind: "photo" });
    }
    catch (error) { toast({ title: "Fotoğraf açılamadı", description: turkishError(error), variant: "destructive" }); }
  };

  const record = async () => {
    if (recording) { recorder.current?.stop(); return; }
    setStarting(true);
    let stream: MediaStream | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      const mime = ["audio/mp4", "audio/webm", "audio/ogg"].find((type) => MediaRecorder.isTypeSupported(type));
      if (!mime) throw new Error("Bu tarayıcıda uygun ses biçimi yok.");
      const next = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 64_000 });
      recorder.current = next;
      const chunks: Blob[] = [];
      next.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      next.onstop = () => {
        next.stream.getTracks().forEach((track) => track.stop());
        if (timer.current) clearTimeout(timer.current);
        if (!mounted.current) return;
        setRecording(false);
        if (chunks.length) onPick({ file: new Blob(chunks, { type: mime }), kind: "audio" });
      };
      next.start();
      setRecording(true);
      timer.current = setTimeout(() => { if (next.state === "recording") next.stop(); }, 60_000);
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      toast({ title: "Mikrofon açılamadı", description: turkishError(error), variant: "destructive" });
    } finally { if (mounted.current) setStarting(false); }
  };

  return <div className="flex items-center gap-1">
    {!audioOnly && <>
    {[gallery, camera].map((ref, index) => <input key={index} ref={ref} type="file" accept={PHOTO_ACCEPT} capture={index ? "environment" : undefined}
      hidden onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void choose(file); }} />)}
    <Button type="button" size="icon" variant="ghost" disabled={disabled || recording} aria-label="Galeriden fotoğraf veya GIF seç" onClick={() => gallery.current?.click()}><ImagePlus /></Button>
    <Button type="button" size="icon" variant="ghost" disabled={disabled || recording} aria-label="Kamerayla fotoğraf çek" onClick={() => camera.current?.click()}><Camera /></Button>
    </>}
    {typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia && (
      <Button type="button" size="icon" variant={recording ? "default" : "ghost"} disabled={disabled || starting}
        aria-label={recording ? "Kaydı durdur" : audioOnly ? "Profil yanıtını kaydet" : "Sesli mesaj kaydet"} onClick={() => void record()}>{recording ? <Square /> : <Mic />}</Button>
    )}
    {recording && <span role="status" className="text-xs">Kayıt sürüyor</span>}
  </div>;
}

export function AttachmentPreview({ media, onRemove }: { media: PendingMedia; onRemove: () => void }) {
  const url = useObjectUrl(media.file);
  return <div className="flex items-center gap-2 rounded-xl border bg-muted p-2">
    {media.kind === "photo" ? <img src={url || undefined} alt="Gönderilecek fotoğraf" className="size-20 rounded-lg object-cover" />
      : <audio src={url || undefined} controls className="min-w-0 flex-1" />}
    <Button type="button" variant="ghost" onClick={onRemove}>Kaldır</Button>
  </div>;
}

export function ChatAttachment({ message, blur }: { message: Msg; blur: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const hidden = blur && message.from === "them" && message.mediaKind === "photo" && !revealed;
  const attachment = useRef<HTMLDivElement>(null);
  const [nearby, setNearby] = useState(false);
  useEffect(() => {
    const node = attachment.current;
    if (!node || hidden || nearby || message.mediaKind !== "photo") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setNearby(true);
    }, { rootMargin: "180px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hidden, message.mediaKind, nearby]);
  const file = useQuery({
    queryKey: ["chat-media", message.mediaPath],
    enabled: !!message.mediaPath && !hidden && (message.mediaKind !== "photo" || nearby),
    queryFn: ({ signal }) => downloadPrivateObject(CHAT_BUCKET, message.mediaPath!, signal),
    gcTime: 0, retry: false,
  });
  const url = useObjectUrl(file.data);
  if (hidden) return <button className="min-h-24 w-full rounded-xl bg-muted px-4 text-sm text-foreground" onClick={() => setRevealed(true)}>Fotoğraf gizlendi · Görüntüle</button>;
  if (file.isError) return <p className="text-sm">Dosya yüklenemedi.</p>;
  if (!url) return <div ref={attachment} className="text-sm">Dosya yükleniyor…</div>;
  if (message.mediaKind === "audio") return <audio controls src={url} className="max-w-full" />;
  return <>
    <button aria-label="Fotoğrafı büyüt" onClick={() => setExpanded(true)}><img alt="Sohbet fotoğrafı" src={url} decoding="async" className="max-h-60 rounded-xl object-contain" /></button>
    <Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="max-w-5xl bg-[#201d29] text-white">
      <DialogTitle className="sr-only">Sohbet fotoğrafı</DialogTitle><img src={url} alt="Sohbet fotoğrafı" decoding="async" className="mx-auto max-h-[85dvh] w-full object-contain" />
    </DialogContent></Dialog>
  </>;
}
