import { reportCategories } from "@/components/report-profile";
import { requestKinds, requestStatuses } from "@/lib/privacy";
import { useAdminAccess } from "@/lib/admin-access";
import { useEffect, useState } from "react";
import { AVATAR_BUCKET } from "@/lib/avatars";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { requireSupabase, turkishError } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const queues = {
  users: "Kullanıcılar", reports: "Şikâyetler", verification: "Doğrulama",
  log: "İşlem kayıtları", privacy: "KVKK başvuruları", statistics: "İstatistikler",
} as const;
type Queue = keyof typeof queues;
type Row = {
  id: string | number; name?: string; state?: string; created_at?: string; until_at?: string;
  category?: keyof typeof reportCategories; safety_reports?: number; reported_message?: string; reported_id?: string; message_id?: number; pending_reports?: number; actor?: string;
  members?: number; active_members?: number; has_profile?: boolean;
  kind?: keyof typeof requestKinds; response?: string; action?: string; target?: string; reason?: string; profiles?: number; active_matches?: number; messages?: number;
};


type Action = { name: string; label: string };
function actionsFor(queue: Queue, row: Row): Action[] {
  if (queue === "privacy" && row.state !== "resolved") return [{ name: "privacy_reply", label: "Başvuruyu yanıtla" }];
  if (queue === "users" && row.has_profile !== false && row.state !== "deleting") return row.state === "active"
    ? [{ name: "suspend", label: "7 gün askıya al" }, { name: "ban", label: "Yasakla" }]
    : [{ name: "restore", label: "Kısıtlamayı kaldır" }];
  if (queue === "reports" && row.state === "pending") return [
    { name: "resolve_report", label: "Çözüldü olarak işaretle" }, { name: "dismiss_report", label: "Şikâyeti kapat" },
  ];
  if (queue === "verification" && row.state === "pending") return [
    { name: "reject_verification", label: "Başvuruyu reddet" },
  ];
  return [];
}

const states: Record<string, string> = {
  active: "Etkin", suspended: "Askıda", banned: "Yasaklı", deleting: "Siliniyor",
  pending: "İnceleme bekliyor", resolved: "Çözüldü", dismissed: "Kapatıldı", rejected: "Reddedildi", verified: "Doğrulandı",
};

export default function Admin() {
  const { session } = useAuth();
  const access = useAdminAccess();
  const [queue, setQueue] = useState<Queue>("users");
  const [offset, setOffset] = useState(0);
  const [decision, setDecision] = useState<{ subject: string; action: Action }>();
  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");
  const [serverSearch, setServerSearch] = useState("");
  const [reviewId, setReviewId] = useState<string>();
  const [reviewLoaded, setReviewLoaded] = useState(false);
  const [stateFilter, setStateFilter] = useState("");
  useEffect(() => {
    if (queue !== "users") return;
    const timer = window.setTimeout(() => {
      setServerSearch(search.trim());
      setOffset(0);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, queue]);

  const review = useQuery({
    queryKey: ["scene-photo-review", session?.user.id, reviewId],
    enabled: access.data === true && queue === "verification" && !!reviewId,
    retry: false, gcTime: 0,
    queryFn: async () => {
      const db = requireSupabase();
      const { data, error } = await db.rpc("scene_photo_review_info", { subject: reviewId }).maybeSingle<{
        object_id: string; object_version: string; photo_path: string;
      }>();
      if (error) throw error;
      if (!data) throw new Error("İncelenebilecek güncel bir fotoğraf yok.");
      const signed = await db.storage.from(AVATAR_BUCKET).createSignedUrl(data.photo_path, 45);
      if (signed.error) throw signed.error;
      return { ...data, url: signed.data.signedUrl };
    },
  });
  const rows = useQuery({
    queryKey: ["scene-moderation", session?.user.id, queue, offset, queue === "users" ? serverSearch : "", queue === "users" ? stateFilter : ""],
    enabled: access.data === true,
    gcTime: 0,
    queryFn: async () => {
      const db = requireSupabase();
      const { data, error } = queue === "privacy"
        ? await db.rpc("scene_privacy_inbox", { page_start: offset })
        : queue === "users"
          ? await db.rpc("scene_admin_users", { search_text: serverSearch, state_filter: stateFilter, page_start: offset })
          : queue === "statistics" ? await db.rpc("scene_admin_statistics")
            : await db.rpc("scene_moderation_queue", { queue_name: queue, page_start: offset });
      if (error) throw error;
      return data as Row[];
    },
  });
  const mutation = useMutation({
    mutationFn: async (selected: NonNullable<typeof decision>) => {
      const db = requireSupabase();
      const { error } = selected.action.name === "privacy_reply"
        ? await db.rpc("scene_privacy_review", { request_id: selected.subject, reply: reason.trim() })
        : selected.action.name === "approve_photo_review"
          ? await db.rpc("scene_approve_photo_review", {
            subject: selected.subject, expected_object: review.data?.object_id,
            expected_version: review.data?.object_version, explanation: reason.trim(),
          })
          : await db.rpc("scene_moderate", { action_name: selected.action.name, subject: selected.subject, explanation: reason.trim() });
      if (error) throw error;
    },
    onSuccess: async () => { setDecision(undefined); setReviewId(undefined); setReviewLoaded(false); setReason(""); await rows.refetch(); },
  });

  const minimum = queue === "privacy" ? 10 : 5;
  const maximum = queue === "privacy" ? 2000 : 500;

  const filterStates = queue === "users" ? ["active", "suspended", "banned", "deleting"] : Array.from(new Set((rows.data ?? []).flatMap((row) => row.state ? [row.state] : [])));
  const query = search.trim().toLocaleLowerCase("tr-TR");
  const visibleRows = (rows.data ?? []).filter((row) => {
    if (queue === "statistics" || queue === "users") return true;
    if (stateFilter && row.state !== stateFilter) return false;
    return !query || [row.id, row.name, row.state, row.reported_id]
      .some((value) => String(value ?? "").toLocaleLowerCase("tr-TR").includes(query));
  });

  return <main className="scene-page max-w-4xl">
    <h1 className="scene-title mb-4">Yönetim</h1>
    {access.isPending && <p role="status">Yetki denetleniyor…</p>}
    {access.isError && <p role="alert">{turkishError(access.error)}</p>}
    {access.data === false && <p role="alert">Bu sayfa yönetici yetkisi gerektirir.</p>}
    {access.data && <>
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Yönetim bölümleri">
        {Object.entries(queues).map(([key, label]) => <Button key={key} variant={queue === key ? "default" : "secondary"} disabled={mutation.isPending} aria-pressed={queue === key}
          onClick={() => { setQueue(key as Queue); setSearch(""); setServerSearch(""); setReviewId(undefined); setReviewLoaded(false); setStateFilter(""); setOffset(0); setDecision(undefined); mutation.reset(); }}>{label}</Button>)}
      </nav>
      <div className="scene-panel mb-4 flex flex-wrap items-end gap-3 p-3">
        {queue !== "statistics" && <label className="flex-1 text-sm">{queue === "users" ? "Tüm üyeleri ara" : "Bu sayfadaki kayıtları ara"}
          <input className="mt-1 w-full rounded-lg border bg-card p-2 text-base" value={search} maxLength={120} disabled={mutation.isPending} onChange={(event) => { setSearch(event.target.value); setDecision(undefined); }} placeholder={queue === "users" ? "Ad, kullanıcı numarası veya tam e-posta" : "Ad, kayıt numarası veya durum"} />
        </label>}
        {(filterStates.length > 0 || stateFilter) && <label className="text-sm">{queue === "users" ? "Üye durumu" : "Bu sayfadaki durum"}
          <select className="mt-1 block h-11 rounded-lg border bg-card px-3 text-base" value={stateFilter} disabled={mutation.isPending}
            onChange={(event) => { setStateFilter(event.target.value); if (queue === "users") setOffset(0); setDecision(undefined); }}>
            <option value="">Tümü</option>
            {Array.from(new Set([...filterStates, ...(stateFilter ? [stateFilter] : [])])).map((state) =>
              <option key={state} value={state}>{(queue === "privacy" ? requestStatuses[state] : states[state]) ?? state}</option>)}
          </select>
        </label>}
        <Button variant="outline" disabled={rows.isFetching || mutation.isPending} onClick={() => void rows.refetch()}>Yenile</Button>
      </div>
      {(query || stateFilter) && rows.data?.length && visibleRows.length === 0 ? <p role="status">Bu sayfada filtrelere uygun kayıt yok.</p> : null}
      {rows.isPending && <p role="status">Kayıtlar yükleniyor…</p>}
      {rows.isError && <p role="alert">{turkishError(rows.error)}</p>}
      {rows.data?.length === 0 && <p>Bu bölümde kayıt yok.</p>}
      {visibleRows.map((row) => queue === "statistics" ? <dl key="statistics" className="scene-panel grid grid-cols-2 gap-3 p-4">
        <div><dt>Toplam üye</dt><dd>{row.members}</dd></div>
        <div><dt>Son 30 günde giriş yapan etkin üyeler</dt><dd>{row.active_members}</dd></div>
        <div><dt>Kurulumu tamamlanan profiller</dt><dd>{row.profiles}</dd></div>
        <div><dt>Kaldırılmamış eşleşmeler</dt><dd>{row.active_matches}</dd></div>
        <div><dt>Silinmemiş özel mesajlar</dt><dd>{row.messages}</dd></div>
        <div><dt>Bekleyen şikâyetler</dt><dd>{row.pending_reports}</dd></div>
      </dl> : <article key={row.id} className="scene-panel mb-3 space-y-2 p-4">
        <h2 className="break-words font-semibold">{row.name || (row.kind && requestKinds[row.kind]) || row.action || row.id}</h2>
        <p className="break-all text-xs text-muted-foreground">{row.id} · {row.created_at && new Date(row.created_at).toLocaleString("tr-TR")}</p>
        {row.state && <p>{(queue === "privacy" ? requestStatuses[row.state] : states[row.state]) ?? row.state}</p>}
        {row.until_at && row.state === "suspended" && <p>Askı bitişi {new Date(row.until_at).toLocaleString("tr-TR")}</p>}
        {!!row.safety_reports && <p>{row.safety_reports} açık sahte profil, spam veya yaş sınırı bildirimi</p>}
        {row.category && <p>{reportCategories[row.category]}</p>}
        {row.pending_reports !== undefined && <p>{row.pending_reports} açık şikâyet</p>}
        {row.reported_id && <p className="break-all">Şikâyet edilen hesap {row.reported_id}</p>}
        {row.message_id != null && <p>Mesaj kaydı {row.message_id}</p>}
        {row.reported_message && <blockquote className="break-words border-l pl-3">{row.reported_message}</blockquote>}
        {row.reason && <p className="whitespace-pre-wrap break-words">{row.reason}</p>}
        {row.response && <p className="whitespace-pre-wrap break-words">Yanıt · {row.response}</p>}
        {row.actor && <p className="break-all">Yönetici {row.actor}</p>}
        {row.target && <p className="break-all">İlgili kayıt {row.target}</p>}
        {queue === "verification" && row.state === "pending" && <div className="space-y-2">
          <Button type="button" size="sm" variant="outline" disabled={mutation.isPending} onClick={() => {
            setDecision(undefined); setReviewLoaded(false); setReviewId(String(row.id));
            if (reviewId === String(row.id)) void review.refetch();
          }}>Ana fotoğrafı incele</Button>
          {reviewId === String(row.id) && <>
            {review.isFetching && <p role="status">Fotoğraf hazırlanıyor…</p>}
            {review.isError && <p role="alert">{turkishError(review.error)}</p>}
            {review.data && !review.isFetching && <>
              <img key={review.data.url} src={review.data.url} alt="İnceleme için gönderilen ana profil fotoğrafı"
                className="max-h-72 rounded-xl object-contain" referrerPolicy="no-referrer"
                onLoad={() => setReviewLoaded(true)} onError={() => setReviewLoaded(false)} />
              {row.id !== session?.user.id && <Button size="sm" disabled={!reviewLoaded || mutation.isPending} onClick={() => {
                mutation.reset(); setReason("");
                setDecision({ subject: String(row.id), action: { name: "approve_photo_review", label: "Ana fotoğrafı onayla" } });
              }}>Ana fotoğrafı onayla</Button>}
            </>}
          </>}
        </div>}
        <div className="flex flex-wrap gap-2">
          {actionsFor(queue, row).map((action) => <Button key={action.name} size="sm" variant="secondary" disabled={mutation.isPending}
            onClick={() => { mutation.reset(); setReason(""); setDecision({ subject: String(row.id), action }); }}>{action.label}</Button>)}
        </div>
        {decision?.subject === String(row.id) && <form className="space-y-2" onSubmit={(event) => {
          event.preventDefault();
          if (!mutation.isPending && reason.trim().length >= minimum && reason.trim().length <= maximum) mutation.mutate(decision);
        }}>
          <label className="block text-sm">{queue === "privacy" ? "Başvuru sahibine gönderilecek yanıt" : `${decision.action.label} için gerekçe`}
            <Textarea required minLength={minimum} maxLength={maximum} value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          {mutation.isError && <p role="alert">{turkishError(mutation.error)}</p>}
          <p className="text-xs text-muted-foreground">{reason.trim().length} / {maximum} karakter</p>
          <Button size="sm" disabled={mutation.isPending || reason.trim().length < minimum || reason.trim().length > maximum}>Kararı kaydet</Button>
          <Button size="sm" type="button" variant="ghost" disabled={mutation.isPending} onClick={() => setDecision(undefined)}>Vazgeç</Button>
        </form>}
      </article>)}
      {queue !== "statistics" && <div className="flex gap-2">
        <Button variant="outline" disabled={!offset || mutation.isPending} onClick={() => { setDecision(undefined); setReviewId(undefined); if (queue !== "users") setStateFilter(""); setOffset(offset - 25); }}>Önceki</Button>
        <Button variant="outline" disabled={rows.data?.length !== 25 || mutation.isPending} onClick={() => { setDecision(undefined); setReviewId(undefined); if (queue !== "users") setStateFilter(""); setOffset(offset + 25); }}>Sonraki</Button>
      </div>}
    </>}
  </main>;
}
