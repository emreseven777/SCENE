import { useState } from "react";
import { Link } from "wouter";
import { LogOut, Mail, MapPin, Pencil, Plus, Quote } from "lucide-react";
import { byId } from "@/lib/catalog";
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
import { initials } from "@/components/person-photo";

export default function Profile() {
  const store = useStore();
  const me = store.me!;
  const { email, signOut } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: me.name, city: me.city, bio: me.bio, scene: me.scene });
  const [titleId, setTitleId] = useState<string | null>(null);
  const best = store.people.filter((p) => p.onboarded).map((p) => ({ p, c: p.favorites.filter((f) => me.favorites.includes(f)).length })).sort((a, b) => b.c - a.c)[0];

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
    <div className="mx-auto max-w-5xl px-4 pt-5 lg:px-10 lg:pt-10">
      <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">Sahne 04 / Profil</div>


      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end">
        <div className="grid h-32 w-32 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-[hsl(357_60%_16%)] font-display text-6xl font-black" data-testid="img-my-avatar">{initials(me.name)}</div>
        <div className="flex-1">
          <h1 className="font-display text-6xl font-black uppercase leading-[0.85]" data-testid="text-my-name">{me.name}</h1>
          <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground"><MapPin size={14} /><span data-testid="text-my-city">{me.city || "Şehir yok"}</span></div>
          <p className="mt-3 max-w-xl text-foreground/80" data-testid="text-my-bio">{me.bio || "Henüz bir şey yazmadın."}</p>
          {me.scene && <p className="mt-2 flex max-w-xl gap-2 text-sm italic text-foreground/70" data-testid="text-my-scene"><Quote size={14} className="mt-0.5 shrink-0 text-primary" />{me.scene}</p>}
        </div>
        <Button variant="secondary" onClick={() => { setForm({ name: me.name, city: me.city, bio: me.bio, scene: me.scene }); setEditing(true); }} data-testid="button-edit-profile"><Pencil size={15} className="mr-2" />Düzenle</Button>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-white/10">
        {[[me.favorites.length, "Favori"], [Object.keys(store.matches).length, "Eşleşme"], [store.liked.length, "Beğeni"]].map(([v, l]) => (
          <div key={l} className="bg-card p-4 text-center"><div className="font-display text-4xl font-black text-primary">{v}</div><div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{l}</div></div>
        ))}
      </div>
      {best && best.c > 0 && <p className="mt-3 text-sm text-muted-foreground">En çok ortak noktan: <Link href={`/kullanici/${best.p.id}`} className="text-foreground underline decoration-primary underline-offset-4">{best.p.name}</Link> ({best.c} yapım)</p>}

      <section className="mt-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-3xl font-extrabold uppercase">Favorilerin</h2>
          <Link href="/arama" data-testid="link-add-favorites" className="inline-flex items-center gap-1 text-sm text-primary hover:underline"><Plus size={15} />Ekle</Link>
        </div>
        {me.favorites.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-muted-foreground">Favori listen boş. Ortak noktalar favorilerinden hesaplanır. <Link href="/arama" className="text-primary underline">Arşive göz at</Link>.</div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {me.favorites.map((id) => {
              const t = byId(id); if (!t) return null;
              return <Poster key={id} t={t} onClick={() => setTitleId(id)} badge={<HeartButton size="sm" active onToggle={() => { store.toggleFavorite(id); toast({ title: "Favorilerden çıkarıldı", description: t.title }); }} testId={`button-remove-fav-${id}`} />} />;
            })}
          </div>
        )}
      </section>

      <section className="mt-12 border-t border-white/5 pt-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Hesap</div>
        <div className="mt-2 flex items-center gap-2 text-sm text-foreground/80" data-testid="text-my-email"><Mail size={14} className="text-primary" />{email}</div>
        <p className="mt-1 text-xs text-muted-foreground">E-posta adresin yalnızca sana görünür.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="secondary" data-testid="button-logout"><LogOut size={15} className="mr-2" />Çıkış yap</Button></AlertDialogTrigger>
            <AlertDialogContent className="border-white/10 bg-card">
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
        <DialogContent className="border-white/10 bg-card">
          <DialogHeader><DialogTitle className="font-display text-3xl font-extrabold uppercase">Profili düzenle</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="name">İsim</Label><Input id="name" maxLength={40} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-name" /></div>
            <div className="space-y-1.5"><Label htmlFor="city">Şehir</Label><Input id="city" maxLength={40} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} data-testid="input-city" /></div>
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
