import { useEffect, useRef, useState } from "react";
import { avatarCrop, CENTER_CROP, drawAvatar, type AvatarUpload } from "@/lib/avatars";
import { isLowResolution, makePhotoThumbnail, openPhoto, preparePhoto } from "@/lib/photo-source";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function PhotoCropDialog({ file, cropOnly = false, onClose, onSave }: {
  file: File;
  onClose: () => void;
  cropOnly?: boolean;
  onSave: (photo: AvatarUpload) => Promise<void>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState(CENTER_CROP);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let current = true;
    void openPhoto(file).then((source) => {
      if (current) setImage(source);
    }, (error: Error) => {
      if (current) setError(error.message);
    });
    return () => { current = false; };
  }, [file]);

  useEffect(() => {
    if (canvas.current && image) {
      try {
        drawAvatar(canvas.current, image, crop);
      } catch {
        setError("Fotoğraf işlenemedi.");
      }
    }
  }, [image, crop]);

  async function save(cropped: boolean) {
    if (!image || busy) return;
    setBusy(true);
    setError("");
    try {
      const region = cropped ? avatarCrop(image, crop) : undefined;
      const photo = await preparePhoto(file, image, region);
      const thumbnail = await makePhotoThumbnail(image, region ?? {
        x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight,
      });
      await onSave({ image: photo, thumbnail, keepPrevious: cropOnly });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Fotoğraf kaydedilemedi. Tekrar deneyebilirsin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] overflow-y-auto rounded-xl border-border bg-card p-4 sm:p-6">
        <DialogTitle>{cropOnly ? "Fotoğrafı kırp" : "Fotoğrafı ekle"}</DialogTitle>
        <DialogDescription>{cropOnly ? "Kaydırıcılarla yeni kadrajı ayarla." : "Fotoğrafı tam kadrajıyla kaydedebilir veya kaydırıcılarla kırpma alanını ayarlayabilirsin."}</DialogDescription>
        <canvas ref={canvas} width={512} height={512} aria-label="Kırpma önizlemesi" className="mx-auto aspect-square w-full max-w-[min(100%,40dvh,19rem)] rounded-lg bg-black" />
        {!image && !error && <p role="status" className="text-sm">Fotoğraf açılıyor…</p>}
        {image && (
          <div className="space-y-1">
            {([
              ["zoom", "Yakınlaştır", 1, 3, 0.05],
              ["x", "Yatay konum", -100, 100, 1],
              ["y", "Dikey konum", -100, 100, 1],
            ] as const).map(([key, label, min, max, step]) => (
              <label key={key} className="grid grid-cols-[7rem_1fr] items-center gap-2 text-sm">
                {label}
                <input type="range" min={min} max={max} step={step} value={crop[key]} disabled={busy} onChange={(event) => setCrop({ ...crop, [key]: Number(event.target.value) })} className="h-9 w-full accent-primary" />
              </label>
            ))}
          </div>
        )}
        {image && isLowResolution(avatarCrop(image, crop).width, avatarCrop(image, crop).height)
          && <p role="status" className="text-sm text-brand-ink">{isLowResolution(image.naturalWidth, image.naturalHeight)
            ? "Fotoğrafın çözünürlüğü düşük. Büyük ekranda net görünmeyebilir."
            : "Bu kırpma düşük çözünürlüklü görünebilir."}</p>}
        {error && <p role="alert" className="text-sm text-brand-ink">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Vazgeç</Button>
          <Button variant={cropOnly ? "default" : "secondary"} onClick={() => void save(true)} disabled={!image || busy}>Kırp ve kaydet</Button>
          {!cropOnly && <Button onClick={() => void save(false)} disabled={!image || busy}>Tam kadrajı kaydet</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
