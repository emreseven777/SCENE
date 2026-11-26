import { useState } from "react";
import { Link } from "wouter";
import { setPushConsent } from "@/lib/privacy";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { requireSupabase, turkishError } from "@/lib/supabase";

const webPushEnabled = import.meta.env.VITE_MOVIA_WEB_PUSH_ENABLED === "true";
const publicKey = webPushEnabled
  ? import.meta.env.VITE_SCENE_PUSH_PUBLIC_KEY as string | undefined
  : undefined;

function urlScope() {
  return new URL(import.meta.env.BASE_URL, window.location.origin);
}

export function PushSettings({ user }: { user: string }) {
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const client = useQueryClient();
  const [status, setStatus] = useState("");
  const supported = !!publicKey && window.isSecureContext && "PushManager" in window
    && "Notification" in window && "serviceWorker" in navigator;
  const subscription = useQuery({
    queryKey: ["push-subscription", user], enabled: supported,
    queryFn: async () => {
      const registration = await navigator.serviceWorker.getRegistration(urlScope().href);
      const item = await registration?.pushManager.getSubscription();
      if (!item) return false;
      const { data, error } = await requireSupabase().from("scene_push_subscriptions")
        .select("endpoint").eq("user_id",user).eq("endpoint",item.endpoint).maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
  return <section className="scene-panel mt-5 space-y-2 p-4">
    <h2 className="text-xl font-bold">Mesaj bildirimleri</h2>
    {!webPushEnabled ? <p className="text-sm text-muted-foreground">Arka plan bildirimleri bu sürümde kapalı.</p>
      : !publicKey ? <p className="text-sm text-muted-foreground">Bu kurulumda arka plan bildirimleri yapılandırılmadı.</p>
      : !supported ? <p className="text-sm text-muted-foreground">Bu tarayıcıda arka plan bildirimi kullanılamıyor. iPhone’da MOVIA DATING’i Ana Ekran’a ekleyip oradan aç.</p>
        : <>
          {subscription.isSuccess && !subscription.data && <div className="flex items-start gap-2 text-sm">
            <input id="scene-device-push-consent" type="checkbox" className="mt-1 accent-primary"
              checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <div><label htmlFor="scene-device-push-consent">Bu cihazda mesaj bildirimi almak için açık rıza veriyorum.</label>{" "}
              <Link href="/kurallar?belge=bildirim-rizasi" className="text-brand-ink underline">Rıza metni</Link></div>
          </div>}
          <Button variant="secondary" disabled={busy || !subscription.isSuccess || (!subscription.data && !consent)} onClick={async () => {
          setBusy(true); setStatus("");
          try {
            if (!subscription.data && await Notification.requestPermission() !== "granted") throw new Error("Bildirim izni verilmedi.");
            const registration = await navigator.serviceWorker.register(new URL("sw.js",urlScope()));
            const ready = registration.active ? registration : await navigator.serviceWorker.ready;
            const existing = await ready.pushManager.getSubscription();
            const table = requireSupabase().from("scene_push_subscriptions");
            if (subscription.data && existing) {
              const { error } = await table.delete().eq("user_id",user).eq("endpoint",existing.endpoint);
              if (error) throw error;
              await existing.unsubscribe();
              setStatus("Bildirimler kapatıldı.");
            } else {
              const item = existing ?? await ready.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKey });
              const keys = item.toJSON().keys;
              await setPushConsent(true);
              const { error } = await table.upsert({ user_id:user,endpoint:item.endpoint,p256dh:keys?.p256dh,auth_secret:keys?.auth });
              if (error) throw error;
              setStatus("Bu cihaz için bildirimler açıldı.");
            }
            setConsent(false);
            void client.invalidateQueries({ queryKey: ["scene-privacy", user] });
            await subscription.refetch();
          } catch (error) { setStatus(turkishError(error)); }
          finally { setBusy(false); }
        }}>{subscription.data ? "Bu cihazda kapat" : "Bu cihazda aç"}</Button></>}
    {status && <p role="status" className="text-sm">{status}</p>}
  </section>;
}
