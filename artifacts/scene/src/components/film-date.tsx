import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { requireSupabase, turkishError } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export function FilmDate({ chat, user, titles }: { chat: string; user: string; titles: string[] }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const dates = useQuery({
    queryKey: ["film-dates", chat],
    queryFn: async () => {
      const { data, error } = await requireSupabase().from("scene_film_dates").select("id,title,starts_at,sender_id,state").eq("match_id", chat).order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
    refetchInterval: 8000,
  });
  const mutate = async (id?: string, state?: "accepted" | "declined") => {
    setBusy(true);
    try {
      const result = id
        ? await requireSupabase().from("scene_film_dates").update({ state }).eq("id", id).select("id").single()
        : await requireSupabase().from("scene_film_dates").insert({ match_id: chat, title: title.trim(), starts_at: new Date(date).toISOString() });
      if (result.error) throw result.error;
      if (!id) { setDate(""); setTitle(""); }
      await dates.refetch();
    } catch (error) {
      toast({ title: "Film randevusu güncellenemedi", description: turkishError(error), variant: "destructive" });
    } finally { setBusy(false); }
  };
  return <>
    <Button type="button" variant="ghost" size="icon" className="ml-auto shrink-0" onClick={() => setOpen(true)} aria-label="Film randevuları"><CalendarDays /></Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent>
      <DialogTitle>Film randevuları</DialogTitle>
      <DialogDescription>Bir yapım ve buluşma zamanı öner.</DialogDescription>
      <form className="grid gap-2" onSubmit={(event) => { event.preventDefault(); if (!busy) void mutate(); }}>
        <label className="text-sm">Yapım<input className="block w-full rounded-lg border p-2" list="film-date-suggestions" maxLength={160} value={title} required onChange={(event) => setTitle(event.target.value)} /></label>
        <datalist id="film-date-suggestions">{titles.map((item) => <option key={item}>{item}</option>)}</datalist>
        <label className="text-sm">Tarih ve saat<input className="block w-full rounded-lg border p-2" type="datetime-local" value={date} required onChange={(event) => setDate(event.target.value)} /></label>
        <Button disabled={busy}>Teklif gönder</Button>
      </form>
      <ul className="space-y-2">
        {dates.data?.map((item) => <li key={item.id} className="rounded-xl border bg-muted p-3">
          <strong>{item.title}</strong><p className="text-sm">{new Date(item.starts_at).toLocaleString("tr-TR")}</p>
          <p className="text-sm">{{ pending: "Yanıt bekliyor", accepted: "Kabul edildi", declined: "Reddedildi" }[item.state as string]}</p>
          {item.sender_id !== user && item.state === "pending" && Date.parse(item.starts_at) > Date.now() && <div className="mt-2 flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => void mutate(item.id, "accepted")}>Kabul et</Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => void mutate(item.id, "declined")}>Reddet</Button>
          </div>}
        </li>)}
      </ul>
      {dates.isError && <p role="alert">Teklifler yüklenemedi.</p>}
      <Link href="/sinema" className="text-sm text-brand-ink underline">Kataloğa göz at</Link>
    </DialogContent></Dialog>
  </>;
}
