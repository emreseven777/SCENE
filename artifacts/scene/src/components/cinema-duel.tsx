import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { requireSupabase, turkishError } from "@/lib/supabase";

type Duel = { id: string; answered: number; partner_answered: number } & (
  { state: "playing"; question: string; choices: string[] }
  | { state: "completed"; score: number; partner_score: number }
  | { state: "waiting" | "expired" }
);

export function CinemaDuel({ chat, viewer }: { chat: string; viewer: string }) {
  const [open, setOpen] = useState(false);
  const client = useQueryClient();
  const key = ["scene-cinema-duel", viewer, chat];
  const duel = useQuery({
    queryKey: key, enabled: open, refetchInterval: 3000, gcTime: 0,
    queryFn: async () => {
      const {data, error} = await requireSupabase().rpc("scene_cinema_duel", {chat, command: "read"});
      if (error) throw error;
      return data as Duel | null;
    },
  });
  const action = useMutation({
    mutationFn: async (choice?: number) => {
      const current = duel.data;
      if (choice !== undefined && current?.state !== "playing") throw new Error("Soru artık etkin değil.");
      const {data, error} = await requireSupabase().rpc("scene_cinema_duel", choice === undefined ? {chat, command:"start"} :
        {chat, command:"answer", expected_round:current!.id, question_number:current!.answered+1, choice});
      if (error) throw error;
      return data as Duel | null;
    },
    onMutate: async () => { await client.cancelQueries({queryKey:key}); },
    onSuccess: (data) => { client.setQueryData(key, data); },
  });
  const current = duel.data;
  return <details className="border-b px-4 py-2 text-sm" onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer font-semibold">Canlı sinema düellosu</summary>
    {open && <div className="max-h-52 space-y-2 overflow-y-auto py-2">
      {duel.isPending && <p role="status">Düello yükleniyor…</p>}
      {duel.isError && <p role="alert">{turkishError(duel.error)}</p>}
      {action.isError && <p role="alert">{turkishError(action.error)}</p>}
      {current?.state === "playing" && <>
        <p className="text-muted-foreground">Soru {current.answered + 1} / 3 · Eşleşmen {current.partner_answered} soru yanıtladı</p>
        <p className="font-semibold">{current.question}</p>
        <div className="flex flex-wrap gap-1.5">
          {current.choices.map((choice, index) => <Button key={choice} size="sm" variant="outline" disabled={action.isPending}
            onClick={() => action.mutate(index + 1)}>{choice}</Button>)}
        </div>
      </>}
      {current?.state === "waiting" && <p role="status">Yanıtların kaydedildi. Eşleşmenin turu tamamlaması bekleniyor.</p>}
      {current?.state === "completed" && <p role="status">Sen {current.score}/3 · Eşleşmen {current.partner_score}/3</p>}
      {current?.state === "expired" && <p role="status">Düellonun süresi doldu.</p>}
      {duel.isSuccess && (!current || current.state === "expired" || current.state === "completed") &&
        <Button size="sm" disabled={action.isPending} onClick={() => action.mutate(undefined)}>Yeni düello başlat</Button>}
    </div>}
  </details>;
}
