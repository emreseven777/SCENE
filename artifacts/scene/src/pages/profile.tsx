import { useAdminAccess } from "@/lib/admin-access";
import { useState } from "react";
import { Link } from "wouter";
import { LogOut, Mail, MapPin, Pencil, Plus, Quote, Camera, ChevronDown, Film, Tv, Heart, Users, Shield, Settings, Dna, BarChart3, BadgeCheck } from "lucide-react";
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
  const [photosOpen, setPhotosOpen] = useState(false);
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
      <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
        <div className="relative rounded-full bg-gradient-to-br from-pink-500 to-violet-600 p-1" data-testid="img-my-avatar">
          <PersonPhoto id={me.id} name={me.name} avatarPath={me.avatar_path} className="size-32 rounded-full border-2 border-background sm:size-40" textClassName="text-6xl" />
          <button type="button" aria-label="Fotoğrafları düzenle" className="absolute bottom-0 right-0 rounded-full bg-gradient-to-br from-pink-500 to-violet-600 p-3 text-white shadow-lg" onClick={() => { setPhotosOpen(true); requestAnimationFrame(() => document.getElementById("profile-photos-menu")?.scrollIntoView({block:"start",behavior:"smooth"})); }}><Camera size={20}/></button>
        </div>
        <div className="w-full">
          <h1 className="break-words font-display text-3xl font-bold tracking-tight sm:text-4xl" data-testid="text-my-name">{me.name}{me.age !== null && <span className="font-semibold text-muted-foreground">, {me.age}</span>}{me.verified_photo && <BadgeCheck className="ml-2 inline text-brand-ink" size={23} aria-label="Doğrulanmış fotoğraf"/>}</h1>
          <div className="mt-2 flex items-center justify-center gap-1 text-sm text-muted-foreground"><MapPin size={14} /><span data-testid="text-my-city">{me.city || "İl belirtilmemiş"}</span></div>
          <p className="mx-auto mt-3 max-w-xl text-foreground/80" data-testid="text-my-bio">{me.bio || "Henüz bir şey yazmadın."}</p>
          {me.scene && <p className="mx-auto mt-2 flex max-w-xl justify-center gap-2 text-sm italic text-foreground/70" data-testid="text-my-scene"><Quote size={14} className="mt-0.5 shrink-0 text-brand-ink" />{me.scene}</p>}
        </div>
        <Button variant="secondary" onClick={() => { setForm({ name: me.name, city: me.city, bio: me.bio, scene: me.scene }); setEditing(true); }} data-testid="button-edit-profile"><Pencil size={15} className="mr-2" />Profili Düzenle</Button>
      </div>

      <div className="scene-panel my-4 grid grid-cols-4 divide-x divide-border overflow-hidden">
        {[
          {value: me.favorites.filter(id => store.titleById(id)?.type === "film").length, label:"Film", Icon:Film},
          {value: me.favorites.filter(id => store.titleById(id)?.type === "dizi").length, label:"Dizi", Icon:Tv},
          {value: Object.keys(store.incoming).length, label:"Beğeni", Icon:Heart},
          {value: Object.keys(store.matches).length, label:"Eşleşme", Icon:Users}
        ].map(({value,label,Icon}) => <div key={label} className="flex flex-col items-center gap-1 px-1 py-4"><Icon size={21} className="text-brand-ink"/><strong className="text-xl font-bold tabular-nums">{value}</strong><span className="text-xs font-semibold text-muted-foreground">{label}</span></div>)}
      </div>
      <details  className="scene-panel my-2 overflow-hidden"><summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 font-bold [&::-webkit-details-marker]:hidden"><BarChart3 size={22} className="text-brand-ink"/><span className="flex-1">Profil Gücü</span><ChevronDown size={18} className="text-muted-foreground"/></summary><div className="px-3 pb-3">
        <div className="flex items-center justify-between"><h2 className="font-display text-xl font-bold">Profil gücün</h2><span className="font-bold text-brand-ink">%{completion}</span></div>
        <progress aria-label="Profil tamamlanma oranı" value={completion} max={100} className="mt-3 h-2 w-full accent-primary" />
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">{profileSteps.map(s => <span key={s.label} className={s.done ? "text-brand-ink" : "text-muted-foreground"}>{s.done ? "✓" : "○"} {s.label}</span>)}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {!me.avatar_path && <Button asChild variant="secondary"><a href="#profile-photos-heading" onClick={() => setPhotosOpen(true)}>Ana fotoğraf ekle</a></Button>}
          {!me.bio.trim() && <Button variant="secondary" onClick={() => {
            setForm({ name: me.name, city: me.city, bio: me.bio, scene: me.scene });
            setEditing(true);
          }}>Hakkında bölümünü doldur</Button>}
          {me.favorites.length < 5 && <Button asChild variant="secondary"><Link href="/arama">Favori yapım ekle</Link></Button>}
        </div>
      </div></details>
      <details  className="scene-panel my-2 overflow-hidden"><summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 font-bold [&::-webkit-details-marker]:hidden"><Dna size={22} className="text-brand-ink"/><span className="flex-1">Cinema DNA</span><ChevronDown size={18} className="text-muted-foreground"/></summary><div className="px-3 pb-3">
        <h2 className="font-display text-xl font-bold">Cinema DNA</h2>
        <p className="mt-1 text-sm text-muted-foreground">Favori yapımlarından oluşan sinema zevkin.</p>
        {topGenres.length ? topGenres.map(([genre,count]) => <div key={genre} className="mt-3"><div className="flex justify-between text-sm"><span>{genre}</span><span>{count} yapım</span></div><progress aria-label={genre} className="h-2 w-full accent-primary" value={count} max={me.favorites.length}/></div>) : <Link href="/arama" className="mt-3 block text-sm text-brand-ink underline">DNA profilin için favori ekle</Link>}
      </div></details>
      <details id="profile-photos-menu" open={photosOpen} onToggle={e => setPhotosOpen(e.currentTarget.open)} className="scene-panel my-2 overflow-hidden"><summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 font-bold [&::-webkit-details-marker]:hidden"><Camera size={22} className="text-brand-ink"/><span className="flex-1">Fotoğraflarım</span><ChevronDown size={18} className="text-muted-foreground"/></summary><div className="px-3 pb-3"><ProfilePhotoEditor person={me} /></div></details>
      <details  className="scene-panel my-2 overflow-hidden"><summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 font-bold [&::-webkit-details-marker]:hidden"><Users size={22} className="text-brand-ink"/><span className="flex-1">Tanışma Tercihlerim</span><ChevronDown size={18} className="text-muted-foreground"/></summary><div className="px-3 pb-3"><DatingFields person={me} /></div></details>
      <details  className="scene-panel my-2 overflow-hidden"><summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 font-bold [&::-webkit-details-marker]:hidden"><Shield size={22} className="text-brand-ink"/><span className="flex-1">Gizlilik ve Güvenlik</span><ChevronDown size={18} className="text-muted-foreground"/></summary><div className="px-3 pb-3"><AccountVisibility person={me} /><PrivacySettings user={me.id} photos={me.avatar_paths.length ? me.avatar_paths : me.avatar_path ? [me.avatar_path] : []} /></div></details>
      {adminAccess.data && <Button className="mt-4" variant="secondary" asChild><Link href="/yonetim">Yönetim paneli</Link></Button>}

      <details  className="scene-panel my-2 overflow-hidden"><summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 font-bold [&::-webkit-details-marker]:hidden"><Heart size={22} className="text-brand-ink"/><span className="flex-1">Favorilerim</span><ChevronDown size={18} className="text-muted-foreground"/></summary><div className="px-3 pb-3">
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
      </div></details>

      <details  className="scene-panel my-2 overflow-hidden"><summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 font-bold [&::-webkit-details-marker]:hidden"><Settings size={22} className="text-brand-ink"/><span className="flex-1">Hesap Ayarları</span><ChevronDown size={18} className="text-muted-foreground"/></summary><div className="px-3 pb-3">
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
      </div></details>

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
