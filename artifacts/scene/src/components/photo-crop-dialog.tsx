import { useEffect, useRef, useState } from "react";
import { CENTER_CROP, drawAvatar, encodeAvatar } from "@/lib/avatars";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function PhotoCropDialog({ file, onClose, onSave }: {
  file: File;
  onClose: () => void;
  onSave: (blob: Blob) => Promise<void>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState(CENTER_CROP);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const source = new Image();
    let current = true;
    source.src = url;
    void source.decode().then(() => {
      if (current) setImage(source);
    }, () => {
      if (current) setError("Fotoğraf açılamadı. JPEG veya PNG biçiminde bir fotoğraf seç.");
    });
    return () => {
      current = false;
      URL.revokeObjectURL(url);
    };
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

  async function save() {
    if (!canvas.current || !image) return;
    setBusy(true);
    setError("");
    try {
      await onSave(await encodeAvatar(canvas.current));
    } catch {
      setError("Fotoğraf kaydedilemedi. Tekrar deneyebilirsin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] overflow-y-auto rounded-xl border-white/10 bg-card p-4 sm:p-6">
        <DialogTitle>Fotoğrafı kırp</DialogTitle>
        <DialogDescription>Kaydırıcılarla kadrajı ayarla. Fotoğraf burada gördüğün gibi kaydolur.</DialogDescription>
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
        {error && <p role="alert" className="text-sm text-primary">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Vazgeç</Button>
          <Button onClick={() => void save()} disabled={!image || busy}>{busy ? "Kaydediliyor…" : "Kırp ve kaydet"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
