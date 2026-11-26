import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useStore, type Person } from "@/lib/store";
import { GENDERS, GOALS, LOOKING_FOR } from "@/lib/dating";
import { defaultPreferences, detailLabels, useScenePreferences, useVisibleProfileDetails } from "@/lib/scene-preferences";
import { requireSupabase, turkishError } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ProfileChoiceFields } from "./profile-choice-fields";
import { CHOICES, TMDB_FIELDS, UNDISCLOSED, UNDISCLOSED_LABEL, profileLabel, type ProfileValue } from "@/lib/profile-choices";
import { ReportProfile } from "./report-profile";

const structuredFields = new Set(["height","occupation","sign","interests","genres",...Object.keys(CHOICES),...Object.keys(TMDB_FIELDS)]);

const required = [
  ["gender", "Cinsiyet", GENDERS], ["looking_for", "Kimlerle tanışmak istiyorsun?", LOOKING_FOR], ["dating_goal", "Tanışma amacı", GOALS],
] as const;

export function DatingFields({ person, requiredOnly = false }: { person: Person; requiredOnly?: boolean }) {
  const { updateMe, refresh } = useStore();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const client = useQueryClient();
  const preferences = useScenePreferences(requiredOnly ? undefined : person.id);
  const own = useVisibleProfileDetails(requiredOnly ? undefined : person.id, person.id);
  const [name, setName] = useState(person.name);
  const [fields, setFields] = useState({ gender: person.gender ?? "", looking_for: person.looking_for ?? "", dating_goal: person.dating_goal ?? "" });
  const [draft, setDraft] = useState<typeof defaultPreferences | null>(null);
  const [busy, setBusy] = useState(false);
  const options = draft ?? preferences.data ?? defaultPreferences;
  const setOptions = (patch: Partial<typeof defaultPreferences>) => setDraft({ ...options, ...patch });

  const setDetail = (key: string, value: ProfileValue) => {
    const details = { ...options.details };
    if (value === "") delete details[key];
    else details[key] = value;
    setOptions({ details });
  };

  const submit = async () => {
    if (busy || !name.trim() || !fields.gender || !fields.looking_for || !fields.dating_goal) return;
    const instagram = options.instagram?.trim().replace(/^@/, "") || null;
    if (!requiredOnly && instagram && !/^[\w.]{1,30}$/.test(instagram)) {
      toast({ title: "Geçerli bir Instagram kullanıcı adı yaz.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      if (!requiredOnly && draft) {
        const { error } = await requireSupabase().from("scene_preferences").upsert({ ...options, instagram, user_id: person.id });
        if (error) throw error;
        setDraft(null);
        await client.invalidateQueries({ queryKey: ["scene-preferences", person.id] });
        await client.invalidateQueries({ queryKey: ["visible-profile-details"] });
      }
      await updateMe({ ...fields, ...(requiredOnly ? { name: name.trim() } : {}) });
      if (draft) await refresh();
      toast({ title: "Profil tercihleri kaydedildi" });
    } catch (error) {
      toast({ title: "Profil tercihleri kaydedilemedi", description: turkishError(error), variant: "destructive" });
    } finally { setBusy(false); }
  };
  return <form className="scene-panel space-y-4 p-4 sm:p-6" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
    <h2 className="text-2xl font-bold">Tanışma tercihlerin</h2>
    <p className="text-sm text-muted-foreground">Bu bilgiler profilinde görünür ve Keşfet filtrelerinde kullanılır.</p>
    {requiredOnly && <label className="block text-sm font-medium">Ad
      <Input autoComplete="given-name" className="mt-1" required maxLength={40} value={name} onChange={(event) => setName(event.target.value)} />
    </label>}
    {required.map(([key, label, choices]) => <label key={key} className="block text-sm font-medium">{label}
      <select required value={fields[key]} onChange={(event) => setFields({ ...fields, [key]: event.target.value })} className="mt-1 block w-full rounded-lg border bg-card p-2 text-base">
        <option value="">Seç</option>{Object.entries(choices).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
      </select>
    </label>)}
    {!requiredOnly && <details className="rounded-xl border p-3">
      <summary className="cursor-pointer font-semibold">İsteğe bağlı bilgiler ve gizlilik</summary>
      {preferences.isError && <p role="alert">Gizlilik ayarları yüklenemedi.</p>}
      {preferences.isSuccess && <div className="mt-3 grid gap-3">
        <ProfileChoiceFields details={options.details} onChange={setDetail}
          zodiac={typeof own.data?.details.sign === "string" ? own.data.details.sign : undefined} />
        {Object.entries(detailLabels).filter(([key]) => !structuredFields.has(key)).map(([key, label]) => {
          const value = options.details[key];
          return <div key={key} className="min-w-0">
            <label className="block text-sm">{label}
              <Input className="mt-1" value={typeof value === "string" && value !== UNDISCLOSED ? value : ""} maxLength={100}
                onChange={(event) => setDetail(key, event.target.value)} />
            </label>
            <Button type="button" size="sm" variant={value === UNDISCLOSED ? "default" : "ghost"}
              aria-pressed={value === UNDISCLOSED} onClick={() => setDetail(key, value === UNDISCLOSED ? "" : UNDISCLOSED)}>{UNDISCLOSED_LABEL}</Button>
          </div>;
        })}
        <div>
          <label className="block text-sm">Instagram kullanıcı adı
            <Input className="mt-1" value={options.instagram ?? ""} maxLength={31} onChange={(event) => setOptions({ instagram: event.target.value })} />
          </label>
          <Button type="button" size="sm" variant="ghost"
            onClick={() => setOptions({ instagram: null, show_instagram: false })}>{UNDISCLOSED_LABEL}</Button>
        </div>
        {([
          ["public_details", "İsteğe bağlı bilgileri profilimde göster"], ["show_instagram", "Instagram bağlantımı göster"],
          ["show_seen", "Görüldü bilgisini paylaş"], ["show_presence", "Çevrimiçi ve son görülme bilgisini paylaş"],
          ["blur_photos", "Gelen fotoğrafları ben açana kadar gizle"],
        ] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-primary" checked={options[key]} onChange={(e) => setOptions({ [key]: e.target.checked })} />{label}
        </label>)}
      </div>}
    </details>}
    <div className="flex flex-wrap gap-2">
      <Button disabled={busy}>{busy ? "Kaydediliyor…" : "Tercihleri kaydet"}</Button>
      {requiredOnly && <Button type="button" variant="ghost" onClick={() => void signOut().catch(() => toast({ title: "Çıkış yapılamadı", variant: "destructive" }))}>Çıkış yap</Button>}
    </div>
  </form>;
}

export function ProfileDetails({ person, publicPreview = false }: { person: Person; publicPreview?: boolean }) {
  const viewer = useStore().me?.id;
  const preferences = useScenePreferences(publicPreview ? viewer : undefined);
  const details = useVisibleProfileDetails(viewer, person.id);
  const fields = [
    ["Cinsiyet", GENDERS[person.gender as keyof typeof GENDERS]],
    ["Tanışmak istediği", LOOKING_FOR[person.looking_for as keyof typeof LOOKING_FOR]],
    ["Tanışma amacı", GOALS[person.dating_goal as keyof typeof GOALS]],
    ...Object.entries(detailLabels).map(([key, label]) => [
      label,
      (!publicPreview || (preferences.data?.public_details && (key !== "sign" || preferences.data?.details.sign === "automatic")))
        ? profileLabel(key, details.data?.details[key]) : undefined,
    ]),
  ].filter(([, value]) => typeof value === "string" && value.trim());
  const instagram = (!publicPreview || preferences.data?.show_instagram) ? details.data?.instagram : null;
  return (fields.length || instagram) ? <section className="scene-panel p-4 sm:p-6">
    <h2 className="mb-3 text-xl font-bold">Profil bilgileri</h2>
    <dl className="grid grid-cols-2 gap-3">
      {fields.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words text-sm">{value}</dd></div>)}
    </dl>
    {instagram && /^[\w.]{1,30}$/.test(instagram) && <a className="mt-3 inline-block text-sm text-brand-ink underline" href={`https://www.instagram.com/${encodeURIComponent(instagram)}/`} rel="noopener noreferrer" target="_blank">@{instagram}</a>}
  </section> : null;
}

export function ProfileSafety({ person }: { person: Person }) {
  const { refresh } = useStore();
  const { toast } = useToast();
  const [action, setAction] = useState<"block" | "report" | null>(null);
  const [busy, setBusy] = useState(false);
  return <div className="flex flex-wrap gap-2">
    <Button variant="ghost" onClick={() => setAction("report")}>Şikâyet et</Button>
    <Button variant="ghost" onClick={() => setAction("block")}>Engelle</Button>
    {action === "report" && <ReportProfile person={person.id} onClose={() => setAction(null)} />}
    {action === "block" && <Dialog open onOpenChange={(open) => { if (!open && !busy) setAction(null); }}><DialogContent>
      <DialogTitle>{person.name} engellensin mi?</DialogTitle>
      <DialogDescription>Birbirinizin profilini ve sohbetini göremezsiniz. Yeni mesaj gönderilemez.</DialogDescription>
      <Button variant="destructive" disabled={busy} onClick={async () => {
        setBusy(true);
        try {
          const { error } = await requireSupabase().from("scene_blocks").insert({ blocked_id: person.id });
          if (error) throw error;
          setAction(null);
          await refresh();
          toast({ title: "Kullanıcı engellendi" });
        } catch (error) {
          toast({ title: "Engelleme işlemi tamamlanamadı", description: turkishError(error), variant: "destructive" });
        } finally {
          setBusy(false);
        }
      }}>Engellemeyi onayla</Button>
    </DialogContent></Dialog>}
  </div>;
}

export function AccountVisibility({ person }: { person: Person }) {
  const { updateMe, refresh } = useStore();
  const { toast } = useToast();
  const blocks = useQuery({
    queryKey: ["scene-blocks", person.id],
    queryFn: async () => {
      const { data, error } = await requireSupabase().from("scene_blocks").select("blocked_id").eq("blocker_id", person.id);
      if (error) throw error;
      return data;
    },
  });
  const verification = useQuery({
    queryKey: ["scene-verification", person.id],
    queryFn: async () => {
      const { data, error } = await requireSupabase().from("scene_verification_requests").select("state").eq("user_id", person.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [busy, setBusy] = useState(false);
  return <section className="scene-panel space-y-3 p-4 sm:p-6">
    <h2 className="text-xl font-bold">Görünürlük ve güvenlik</h2>
    <Button variant="secondary" disabled={busy} onClick={async () => {
      setBusy(true);
      try { await updateMe({ discovery_hidden: !person.discovery_hidden }); }
      catch { /* Store shows the error. */ } finally { setBusy(false); }
    }}>{person.discovery_hidden ? "Keşfet’te yeniden görün" : "Profilimi Keşfet’te gizle"}</Button>
    <p className="text-sm text-muted-foreground">Gizlemek mevcut eşleşmelerini ve sohbetlerini etkilemez.</p>
    <Button variant="secondary" disabled={busy} onClick={async () => {
      setBusy(true);
      try { await updateMe({ account_hidden: !person.account_hidden }); await refresh(); }
      catch { /* Store shows the error. */ } finally { setBusy(false); }
    }}>{person.account_hidden ? "Hesabımı yeniden görünür yap" : "Hesabımı gizle"}</Button>
    <p className="text-sm text-muted-foreground">Hesabı gizlemek profiline, favorilerine ve sohbetlerine erişimi yeniden açana kadar duraklatır.</p>
    <div>
      <Link href="/bildirimler" className="text-sm font-semibold text-brand-ink underline">Bildirim merkezi</Link>
    </div>
    <div>
      {verification.data ? <p className="text-sm">Doğrulama başvurusu: {verification.data.state === "pending" ? "İnceleme bekliyor" : verification.data.state === "verified" ? "Onaylandı" : "Reddedildi"}</p>
        : verification.isSuccess && <Button variant="secondary" disabled={busy} onClick={async () => {
          setBusy(true);
          const { error } = await requireSupabase().from("scene_verification_requests").insert({ user_id: person.id });
          if (error) toast({ title: "Başvuru kaydedilemedi", variant: "destructive" });
          else await verification.refetch();
          setBusy(false);
        }}>Doğrulama başvurusu yap</Button>}
    </div>
    {blocks.data?.map((row, i) => <div key={row.blocked_id} className="flex items-center gap-2 text-sm">
      <span>Engellenen profil {i + 1}</span>
      <Button size="sm" variant="ghost" disabled={busy} onClick={async () => {
        setBusy(true);
        const { error } = await requireSupabase().from("scene_blocks").delete().eq("blocker_id", person.id).eq("blocked_id", row.blocked_id);
        if (error) toast({ title: "Engel kaldırılamadı", variant: "destructive" });
        else { await blocks.refetch(); await refresh(); }
        setBusy(false);
      }}>Engeli kaldır</Button>
    </div>)}
  </section>;
}
