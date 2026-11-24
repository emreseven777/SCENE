import { useState } from "react";
import { Link } from "wouter";
import { MapPin, Pencil, Plus, RotateCcw, Sparkles } from "lucide-react";
import { byId } from "@/lib/catalog";
import { PEOPLE } from "@/lib/people";
import { useStore } from "@/lib/store";
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

export const initials = (n: string) => n.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toLocaleUpperCase("tr") || "S";

export default function Profile() {
  const store = useStore();
  const { me } = store;
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: me.name, city: me.city, bio: me.bio });
  const [titleId, setTitleId] = useState<string | null>(null);
  const best = PEOPLE.map((p) => ({ p, c: p.favorites.filter((f) => me.favorites.includes(f)).length })).sort((a, b) => b.c - a.c)[0];

  const save = () => {
    if (!form.name.trim()) { toast({ title: "İsim boş olamaz", variant: "destructive" }); return; }
    store.updateMe({ name: form.name.trim(), city: form.city.trim(), bio: form.bio.trim() });
    setEditing(false);
    toast({ title: "Profil güncellendi" });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pt-5 lg:px-10 lg:pt-10">
      <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">Sahne 04 / Profil</div>

      {!me.custom && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4 sm:flex-row sm:items-center">
          <Sparkles className="shrink-0 text-primary" size={20} />
          <p className="flex-1 text-sm">Şu an demo izleyici profilini kullanıyorsun. Giriş gerekmeden kendi demo profilini oluşturabilirsin.</p>
          <Link href="/profil/olustur" data-testid="link-create-profile" className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold">Profilini oluştur</Link>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end">
        <div className="grid h-32 w-32 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-[hsl(357_60%_16%)] font-display text-6xl font-black" data-testid="img-my-avatar">{initials(me.name)}</div>
        <div className="flex-1">
          <h1 className="font-display text-6xl font-black uppercase leading-[0.85]" data-testid="text-my-name">{me.name}</h1>
          <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground"><MapPin size={14} /><span data-testid="text-my-city">{me.city || "Şehir yok"}</span></div>
          <p className="mt-3 max-w-xl text-foreground/80" data-testid="text-my-bio">{me.bio || "Henüz bir şey yazmadın."}</p>
        </div>
        <Button variant="secondary" onClick={() => { setForm({ name: me.name, city: me.city, bio: me.bio }); setEditing(true); }} data-testid="button-edit-profile"><Pencil size={15} className="mr-2" />Düzenle</Button>
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
        <div className="flex flex-wrap gap-3">
          {me.custom && <Link href="/profil/olustur" className="inline-flex h-10 items-center rounded-md bg-white/5 px-4 text-sm hover:bg-white/10" data-testid="link-recreate-profile">Profili yeniden oluştur</Link>}
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="ghost" className="text-muted-foreground" data-testid="button-reset-demo"><RotateCcw size={15} className="mr-2" />Demoyu sıfırla</Button></AlertDialogTrigger>
            <AlertDialogContent className="border-white/10 bg-card">
              <AlertDialogHeader>
                <AlertDialogTitle>Demo sıfırlansın mı?</AlertDialogTitle>
                <AlertDialogDescription>Profilin, favorilerin, beğenilerin, eşleşmelerin ve mesajların başlangıç haline döner.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                <AlertDialogAction onClick={() => { store.reset(); toast({ title: "Demo sıfırlandı" }); }} data-testid="button-confirm-reset">Sıfırla</AlertDialogAction>
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
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setEditing(false)}>Vazgeç</Button><Button onClick={save} data-testid="button-save-profile">Kaydet</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <TitleDetail id={titleId} onClose={() => setTitleId(null)} />
    </div>
  );
}
