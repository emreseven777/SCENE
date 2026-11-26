import { reportCategories } from "@/components/report-profile";
import { requestKinds, requestStatuses } from "@/lib/privacy";
import { useAdminAccess } from "@/lib/admin-access";
import { useState } from "react";
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
  kind?: keyof typeof requestKinds; response?: string; action?: string; target?: string; reason?: string; profiles?: number; active_matches?: number; messages?: number;
};


type Action = { name: string; label: string };
function actionsFor(queue: Queue, row: Row): Action[] {
  if (queue === "privacy" && row.state !== "resolved") return [{ name: "privacy_reply", label: "Başvuruyu yanıtla" }];
  if (queue === "users" && row.state !== "deleting") return row.state === "active"
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
  const rows = useQuery({
    queryKey: ["scene-moderation", session?.user.id, queue, offset],
    enabled: access.data === true,
    gcTime: 0,
    queryFn: async () => {
      const db = requireSupabase();
      const { data, error } = queue === "privacy"
        ? await db.rpc("scene_privacy_inbox", { page_start: offset })
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
        : await db.rpc("scene_moderate", { action_name: selected.action.name, subject: selected.subject, explanation: reason.trim() });
      if (error) throw error;
    },
    onSuccess: async () => { setDecision(undefined); setReason(""); await rows.refetch(); },
  });

  const minimum = queue === "privacy" ? 10 : 5;
  const maximum = queue === "privacy" ? 2000 : 500;

  const visibleRows = (rows.data ?? []).filter((row) => queue === "statistics" || !search.trim() || [row.id, row.name, row.state, row.reported_id].some((value) => String(value ?? "").toLocaleLowerCase("tr-TR").includes(search.trim().toLocaleLowerCase("tr-TR"))));

  return <main className="scene-page max-w-4xl">
    <h1 className="scene-title mb-4">Yönetim</h1>
    {access.isPending && <p role="status">Yetki denetleniyor…</p>}
    {access.isError && <p role="alert">{turkishError(access.error)}</p>}
    {access.data === false && <p role="alert">Bu sayfa yönetici yetkisi gerektirir.</p>}
    {access.data && <>
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Yönetim bölümleri">
        {Object.entries(queues).map(([key, label]) => <Button key={key} variant={queue === key ? "default" : "secondary"} disabled={mutation.isPending} aria-pressed={queue === key}
          onClick={() => { setQueue(key as Queue); setSearch(""); setOffset(0); setDecision(undefined); mutation.reset(); }}>{label}</Button>)}
      </nav>
      <div className="scene-panel mb-4 flex flex-wrap items-end gap-3 p-3">
        {queue !== "statistics" && <label className="flex-1 text-sm">Bu sayfadaki kayıtları ara
          <input className="mt-1 w-full rounded-lg border bg-card p-2 text-base" value={search} disabled={mutation.isPending} onChange={(event) => { setSearch(event.target.value); setDecision(undefined); }} placeholder="Ad, kayıt numarası veya durum" />
        </label>}
        <Button variant="outline" disabled={rows.isFetching || mutation.isPending} onClick={() => void rows.refetch()}>Yenile</Button>
      </div>
      {search.trim() && rows.data?.length && visibleRows.length === 0 ? <p role="status">Bu sayfada aramana uygun kayıt yok.</p> : null}
      {rows.isPending && <p role="status">Kayıtlar yükleniyor…</p>}
      {rows.isError && <p role="alert">{turkishError(rows.error)}</p>}
      {rows.data?.length === 0 && <p>Bu bölümde kayıt yok.</p>}
      {visibleRows.map((row) => queue === "statistics" ? <dl key="statistics" className="scene-panel grid grid-cols-2 gap-3 p-4">
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
        <Button variant="outline" disabled={!offset || mutation.isPending} onClick={() => { setDecision(undefined); setOffset(offset - 25); }}>Önceki</Button>
        <Button variant="outline" disabled={rows.data?.length !== 25 || mutation.isPending} onClick={() => { setDecision(undefined); setOffset(offset + 25); }}>Sonraki</Button>
      </div>}
    </>}
  </main>;
}
