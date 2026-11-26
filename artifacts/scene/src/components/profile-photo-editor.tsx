import { useRef, useState, type ChangeEvent } from "react";
import { ArrowDown, ArrowUp, Camera, Eye, ImagePlus, Star } from "lucide-react";
import { AVATAR_BUCKET, MAX_PROFILE_PHOTOS } from "@/lib/avatars";
import { useStore, type Person } from "@/lib/store";
import { requireSupabase, turkishError } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ProfileDetails } from "./dating-profile";
import { PersonPhoto } from "./person-photo";
import { ProfileAbout, ProfilePortrait } from "./profile-gallery";
import { PhotoCropDialog } from "./photo-crop-dialog";

export function ProfilePhotoEditor({ person }: { person: Person }) {
  const { savePhotos } = useStore();
  const { toast } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const selection = useRef({ index: 0, previous: person.avatar_paths });
  const [pending, setPending] = useState<{ file: File; index: number; previous: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const paths = person.avatar_paths;

  async function persist(previous: string[], next: string[], upload?: { index: number; image: Blob }) {
    setBusy(true);
    try {
      const cleaned = await savePhotos(previous, next, upload);
      toast({
        title: "Profil fotoğrafları güncellendi",
        description: cleaned ? undefined : "Önceki dosya depodan silinemedi.",
      });
    } catch (error) {
      toast({ title: "Fotoğraf işlemi tamamlanamadı", description: turkishError(error), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  const pick = (index: number, useCamera = false) => {
    selection.current = { index, previous: paths };
    (useCamera ? camera : input).current?.click();
  };

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast({ title: "25 MB veya daha küçük bir fotoğraf seç.", variant: "destructive" });
      return;
    }
    setPending({ file, ...selection.current });
  }

  async function cropExisting(index: number) {
    setBusy(true);
    try {
      const { data, error } = await requireSupabase().storage.from(AVATAR_BUCKET).download(paths[index]);
      if (error) throw error;
      setPending({ file: new File([data], paths[index].split("/").at(-1)!, { type: data.type }), index, previous: paths });
    } catch (error) {
      toast({ title: "Fotoğraf açılamadı", description: turkishError(error), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  const reorder = (from: number, to: number) => {
    const next = [...paths];
    const [path] = next.splice(from, 1);
    next.splice(to, 0, path);
    void persist(paths, next);
  };

  return (
    <section aria-labelledby="profile-photos-heading" className="scene-panel mt-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="profile-photos-heading" className="font-display text-2xl font-bold tracking-tight">Fotoğraflar <span className="text-base text-muted-foreground">{paths.length}/{MAX_PROFILE_PHOTOS}</span></h2>
        <Button variant="secondary" onClick={() => setPreview(true)}><Eye size={16} />Profil önizleme</Button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">İlk fotoğraf profil kartında görünür. Oklarla sıralamayı değiştirebilirsin.</p>
      <input ref={input} type="file" accept="image/*,.heic,.heif" className="hidden"
        aria-label="Galeriden profil fotoğrafı seç" onChange={choosePhoto} />
      <input ref={camera} type="file" accept="image/*" capture="user" className="hidden"
        aria-label="Kameradan profil fotoğrafı çek" onChange={choosePhoto} />
      {paths.length > 0 && (
        <ol className="mt-4 grid gap-2 md:grid-cols-2">
          {paths.map((path, index) => (
            <li key={path} className="flex items-center gap-2 rounded-2xl border border-border bg-background p-2">
              <PersonPhoto id={person.id} name={person.name} avatarPath={path} className="size-16 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <div className="px-1 text-sm font-semibold">{index === 0 ? "Ana fotoğraf" : `Fotoğraf ${index + 1}`}</div>
                <div className="flex flex-wrap items-center">
                  {index > 0 && <Button size="icon" variant="ghost" aria-label={`${index + 1}. fotoğrafı ana fotoğraf yap`} title="Ana fotoğraf yap" disabled={busy} onClick={() => reorder(index, 0)}><Star size={16} /></Button>}
                  <Button size="icon" variant="ghost" aria-label={`${index + 1}. fotoğrafı yukarı taşı`} disabled={busy || index === 0} onClick={() => reorder(index, index - 1)}><ArrowUp size={16} /></Button>
                  <Button size="icon" variant="ghost" aria-label={`${index + 1}. fotoğrafı aşağı taşı`} disabled={busy || index === paths.length - 1} onClick={() => reorder(index, index + 1)}><ArrowDown size={16} /></Button>
                  <Button variant="ghost" className="px-2 text-xs" disabled={busy} aria-label={`${index + 1}. fotoğrafı kırp`} onClick={() => void cropExisting(index)}>Kırp</Button>
                  <Button variant="ghost" className="px-2 text-xs" disabled={busy} aria-label={`${index + 1}. fotoğrafı değiştir`} onClick={() => pick(index)}>Değiştir</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" className="px-2 text-xs" aria-label={`${index + 1}. fotoğrafı sil`} disabled={busy}>Sil</Button></AlertDialogTrigger>
                    <AlertDialogContent className="w-[calc(100%_-_2rem)] rounded-xl border-border bg-card">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Fotoğraf silinsin mi?</AlertDialogTitle>
                        <AlertDialogDescription>Fotoğraf profil galerinden kaldırılır.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void persist(paths, paths.filter((entry) => entry !== path))}>Fotoğrafı sil</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      {paths.length < MAX_PROFILE_PHOTOS && <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" disabled={busy} onClick={() => pick(paths.length)}><ImagePlus size={17} />Fotoğraf ekle</Button>
        <Button variant="secondary" disabled={busy} onClick={() => pick(paths.length, true)}><Camera size={17} />Fotoğraf çek</Button>
      </div>}
      {busy && <p role="status" className="mt-2 text-sm text-muted-foreground">Kaydediliyor…</p>}
      {pending && (
        <PhotoCropDialog file={pending.file} onClose={() => setPending(null)} onSave={async (image) => {
          await persist(pending.previous, pending.previous, { index: pending.index, image });
          setPending(null);
        }} />
      )}
      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] overflow-y-auto rounded-xl border-border bg-card p-0">
          <div className="px-4 pb-2 pt-4">
            <DialogTitle>Profil önizleme</DialogTitle>
            <DialogDescription>Profilinin diğer üyelere nasıl göründüğüne bak.</DialogDescription>
          </div>
          <ProfilePortrait person={person} />
          <div className="space-y-3 px-4 pb-5"><ProfileAbout person={person} /><ProfileDetails person={person} publicPreview /></div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
