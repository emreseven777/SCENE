import { useAdminAccess } from "@/lib/admin-access";
import { useState } from "react";
import { Link } from "wouter";
import { LogOut, Mail, MapPin, Pencil, Plus, Quote } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { turkishError } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Poster } from "@/components/poster";
import { HeartButton } from "@/components/heart-button";
import { TitleDetail } from "@/components/title-detail";
import { ProvinceSelect } from "@/components/province-select";
import { PersonPhoto } from "@/components/person-photo";
import { PrivacySettings } from "@/components/privacy-settings";
import { DeleteAccount } from "@/components/delete-account";
import { DatingFields, AccountVisibility } from "@/components/dating-profile";
import { ProfilePhotoEditor } from "@/components/profile-photo-editor";

export default function Profile() {
  const store = useStore();
  const adminAccess = useAdminAccess();
  const me = store.me!;
  const { email, signOut } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: me.name, city: me.city, bio: me.bio, scene: me.scene });
  const [titleId, setTitleId] = useState<string | null>(null);
  const profileSteps = [{label:"İsim",done:!!me.name.trim()},{label:"Profil fotoğrafı",done:!!me.avatar_path},{label:"Hakkında",done:!!me.bio.trim()},{label:"Unutamadığın sahne",done:!!me.scene.trim()},{label:"En az 5 favori yapım",done:me.favorites.length >= 5},{label:"Tanışma amacı",done:!!me.dating_goal}];
  const completion = Math.round(profileSteps.filter(s => s.done).length / profileSteps.length * 100);
  const genreCounts = new Map<string, number>();
  for (const id of me.favorites) for (const genre of new Set(store.titleById(id)?.genres ?? [])) genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
  const topGenres = [...genreCounts.entries()].sort((a,b) => b[1]-a[1]).slice(0,5);

  const save = async () => {
    if (!form.name.trim()) { toast({ title: "İsim boş olamaz", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await store.updateMe({ name: form.name.trim(), city: form.city.trim(), bio: form.bio.trim(), scene: form.scene.trim() });
      setEditing(false);
      toast({ title: "Profil güncellendi" });
    } catch { /* error toast already shown */ } finally { setSaving(false); }
  };

  const logout = async () => {
    try { await signOut(); } catch (e) { toast({ title: "Çıkış yapılamadı", description: turkishError(e), variant: "destructive" }); }
  };

  return (
    <div className="scene-page max-w-5xl">
      <div className="scene-panel flex flex-wrap items-start gap-4 p-4 sm:items-center sm:gap-6 sm:p-7">
        <div className="shrink-0" data-testid="img-my-avatar">
          <PersonPhoto id={me.id} name={me.name} avatarPath={me.avatar_path} className="size-20 rounded-3xl sm:size-28" textClassName="text-6xl" />
        </div>
        <div className="min-w-[10rem] flex-1">
          <h1 className="break-words font-display text-3xl font-bold tracking-tight sm:text-5xl" data-testid="text-my-name">{me.name}{me.age !== null && <span className="font-semibold text-muted-foreground">, {me.age}</span>}</h1>
          <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground"><MapPin size={14} /><span data-testid="text-my-city">{me.city || "İl belirtilmemiş"}</span></div>
          <p className="mt-3 max-w-xl text-foreground/80" data-testid="text-my-bio">{me.bio || "Henüz bir şey yazmadın."}</p>
          {me.scene && <p className="mt-2 flex max-w-xl gap-2 text-sm italic text-foreground/70" data-testid="text-my-scene"><Quote size={14} className="mt-0.5 shrink-0 text-brand-ink" />{me.scene}</p>}
        </div>
        <Button variant="secondary" onClick={() => { setForm({ name: me.name, city: me.city, bio: me.bio, scene: me.scene }); setEditing(true); }} data-testid="button-edit-profile"><Pencil size={15} className="mr-2" />Düzenle</Button>
      </div>

      <section className="scene-panel mt-6 p-5">
        <div className="flex items-center justify-between"><h2 className="font-display text-xl font-bold">Profil gücün</h2><span className="font-bold text-brand-ink">%{completion}</span></div>
        <progress aria-label="Profil tamamlanma oranı" value={completion} max={100} className="mt-3 h-2 w-full accent-primary" />
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">{profileSteps.map(s => <span key={s.label} className={s.done ? "text-brand-ink" : "text-muted-foreground"}>{s.done ? "✓" : "○"} {s.label}</span>)}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {!me.avatar_path && <Button asChild variant="secondary"><a href="#profile-photos-heading">Ana fotoğraf ekle</a></Button>}
          {!me.bio.trim() && <Button variant="secondary" onClick={() => {
            setForm({ name: me.name, city: me.city, bio: me.bio, scene: me.scene });
            setEditing(true);
          }}>Hakkında bölümünü doldur</Button>}
          {me.favorites.length < 5 && <Button asChild variant="secondary"><Link href="/arama">Favori yapım ekle</Link></Button>}
        </div>
      </section>
      <section className="scene-panel mt-6 p-5">
        <h2 className="font-display text-xl font-bold">Cinema DNA</h2>
        <p className="mt-1 text-sm text-muted-foreground">Favori yapımlarından oluşan sinema zevkin.</p>
        {topGenres.length ? topGenres.map(([genre,count]) => <div key={genre} className="mt-3"><div className="flex justify-between text-sm"><span>{genre}</span><span>{count} yapım</span></div><progress aria-label={genre} className="h-2 w-full accent-primary" value={count} max={me.favorites.length}/></div>) : <Link href="/arama" className="mt-3 block text-sm text-brand-ink underline">DNA profilin için favori ekle</Link>}
      </section>
      <ProfilePhotoEditor person={me} />
      <div className="mt-6"><DatingFields person={me} /></div>
      <div className="mt-6"><AccountVisibility person={me} /></div>
      <div className="mt-6"><PrivacySettings user={me.id} photos={me.avatar_paths.length ? me.avatar_paths : me.avatar_path ? [me.avatar_path] : []} /></div>
      {adminAccess.data && <Button className="mt-4" variant="secondary" asChild><Link href="/yonetim">Yönetim paneli</Link></Button>}

      <div className="scene-panel mt-6 grid grid-cols-3 divide-x divide-border overflow-hidden">
        {[[me.favorites.length, "Favori"], [Object.keys(store.matches).length, "Eşleşme"], [store.liked.length, "Beğeni"]].map(([v, l]) => (
          <div key={l} className="bg-card p-4 text-center"><div className="font-display text-3xl font-bold text-brand-ink">{v}</div><div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{l}</div></div>
        ))}
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-bold tracking-tight">Favorilerin</h2>
          <Link href="/arama" data-testid="link-add-favorites" className="inline-flex items-center gap-1 text-sm text-brand-ink hover:underline"><Plus size={15} />Ekle</Link>
        </div>
        {me.favorites.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Favori listen boş. Ortak noktalar favorilerinden hesaplanır. <Link href="/arama" className="text-brand-ink underline">Arşive göz at</Link>.</div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {me.favorites.map((id) => {
              const t = store.titleById(id); if (!t) return null;
              return <Poster key={id} t={t} onClick={() => setTitleId(id)} badge={<HeartButton size="sm" active onToggle={() => { store.toggleFavorite(id); toast({ title: "Favorilerden çıkarıldı", description: t.title }); }} testId={`button-remove-fav-${id}`} />} />;
            })}
          </div>
        )}
      </section>

      <section className="scene-panel mt-8 p-5 sm:p-7">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Hesap</div>
        <div className="mt-2 flex items-center gap-2 text-sm text-foreground/80" data-testid="text-my-email"><Mail size={14} className="shrink-0 text-brand-ink" /><span className="min-w-0 [overflow-wrap:anywhere]">{email}</span></div>
        <p className="mt-1 text-xs text-muted-foreground">E-posta adresin yalnızca sana görünür.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <DeleteAccount />
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="secondary" data-testid="button-logout"><LogOut size={15} className="mr-2" />Çıkış yap</Button></AlertDialogTrigger>
            <AlertDialogContent className="border-border bg-card">
              <AlertDialogHeader>
                <AlertDialogTitle>Çıkış yapılsın mı?</AlertDialogTitle>
                <AlertDialogDescription>Verilerin hesabında güvende kalır. Tekrar giriş yaptığında kaldığın yerden devam edersin.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                <AlertDialogAction onClick={() => void logout()} data-testid="button-confirm-logout">Çıkış yap</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="border-border bg-card">
          <DialogHeader><DialogTitle className="font-display text-2xl font-bold tracking-tight">Profili düzenle</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="name">İsim</Label><Input id="name" maxLength={40} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-name" /></div>
            <ProvinceSelect id="city" value={form.city} onChange={(city) => setForm({ ...form, city })} />
            <div className="space-y-1.5"><Label htmlFor="bio">Hakkında</Label><Textarea id="bio" maxLength={240} rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} data-testid="input-bio" /><div className="text-right font-mono text-[10px] text-muted-foreground">{form.bio.length}/240</div></div>
            <div className="space-y-1.5"><Label htmlFor="scene">Unutamadığın sahne</Label><Input id="scene" maxLength={200} value={form.scene} onChange={(e) => setForm({ ...form, scene: e.target.value })} placeholder="Örn. Spinning top dönmeye devam ederken ekran kararır." data-testid="input-scene" /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setEditing(false)}>Vazgeç</Button><Button onClick={() => void save()} disabled={saving} data-testid="button-save-profile">{saving ? "Kaydediliyor..." : "Kaydet"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <TitleDetail id={titleId} onClose={() => setTitleId(null)} />
    </div>
  );
}
