import { createClient } from "npm:@supabase/supabase-js@2.119.2";
import webpush from "npm:web-push@3.6.7";

interface Endpoint { endpoint: string; p256dh: string; auth: string }
interface Job { message_id: string | number; recipient: string; subscriptions: Endpoint[] }

const allowedDomains = ["push.apple.com", "push.services.mozilla.com", "notify.windows.com", "fcm.googleapis.com"];
function allowed(endpoint: string) {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && !url.port && !url.username && !url.password &&
      allowedDomains.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
  } catch { return false; }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  const cronSecret = Deno.env.get("SCENE_PUSH_JOB_SECRET");
  if (!cronSecret || request.headers.get("x-scene-job-secret") !== cronSecret) return new Response(null, { status: 401 });
  const subject = Deno.env.get("SCENE_VAPID_SUBJECT");
  const publicKey = Deno.env.get("SCENE_VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("SCENE_VAPID_PRIVATE_KEY");
  if (!subject || !publicKey || !privateKey) return new Response(null, { status: 503 });
  try { webpush.setVapidDetails(subject, publicKey, privateKey); }
  catch { return new Response(null, { status: 503 }); }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.rpc("claim_scene_push");
  if (error) return new Response(null, { status: 503 });
  await Promise.all((data as Job[]).map(async (job) => {
    const results = await Promise.all(job.subscriptions.map(async (subscription) => {
      if (!allowed(subscription.endpoint)) return false;
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        }, JSON.stringify({ tag: `scene-message-${job.message_id}` }), { TTL: 300, timeout: 5000 });
        return true;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status !== 404 && status !== 410) return false;
        const removed = await admin.from("scene_push_subscriptions").delete().eq("user_id",job.recipient).eq("endpoint",subscription.endpoint);
        return !removed.error;
      }
    }));
    if (results.every(Boolean)) await admin.rpc("finish_scene_push", { job: job.message_id });
  }));
  return Response.json({ processed: data.length });
});
