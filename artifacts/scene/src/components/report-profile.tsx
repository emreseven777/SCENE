import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { requireSupabase, turkishError } from "@/lib/supabase";

export function ReportProfile({ person, message, onClose }: { person: string; message?: string; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}><DialogContent>
    <DialogTitle>{message ? "Mesajı şikâyet et" : "Profili şikâyet et"}</DialogTitle>
    <DialogDescription>Şikâyet diğer üyelerle paylaşılmaz.</DialogDescription>
    <form className="grid gap-3" onSubmit={async (event) => {
      event.preventDefault();
      if (busy || reason.trim().length < 5) return;
      setBusy(true);
      const { error } = await requireSupabase().from("scene_reports").insert({ reported_id: person, message_id: message ?? null, reason: reason.trim() });
      setBusy(false);
      if (error) toast({ title: "Şikâyet gönderilemedi", description: turkishError(error), variant: "destructive" });
      else { toast({ title: "Şikâyet kaydedildi" }); onClose(); }
    }}>
      <label className="text-sm">Neden<textarea className="mt-1 block w-full rounded-lg border p-2 text-base" required minLength={5} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      <Button disabled={busy}>Şikâyeti gönder</Button>
    </form>
  </DialogContent></Dialog>;
}
