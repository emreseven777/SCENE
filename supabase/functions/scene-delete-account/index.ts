import { createClient } from "npm:@supabase/supabase-js@2.119.2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (status: number) => Response.json({ ok: status === 200 }, { status, headers: { ...cors, "Cache-Control": "no-store" } });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return reply(405);
  const jwt = request.headers.get("Authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!jwt) return reply(401);
  const body = await request.json().catch(() => null);
  if (body?.confirmation !== "HESABIMI SİL" || typeof body.password !== "string" ||
    !body.password || body.password.length > 256) return reply(400);

  const url = Deno.env.get("SUPABASE_URL")!;
  const options = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };
  const auth = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, options);
  const verified = await auth.auth.getUser(jwt);
  const user = verified.data.user;
  if (verified.error || !user?.email) return reply(401);
  const reauth = await auth.auth.signInWithPassword({ email: user.email, password: body.password });
  if (reauth.error || reauth.data.user?.id !== user.id) return reply(401);
  // Revoke the temporary password-confirmation session.
  await auth.auth.signOut({ scope: "local" });

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, options);
  for (let attempt = 0; attempt < 50; attempt++) {
    const { data, error } = await admin.rpc("scene_owned_files", { account: user.id });
    if (error) return reply(503);
    const files = data as { bucket: string; path: string }[];
    if (!files.length) {
      const result = await admin.auth.admin.deleteUser(user.id);
      return reply(result.error ? 503 : 200);
    }
    for (const bucket of ["scene-avatars", "scene-chat"]) {
      const paths = files.filter((file) => file.bucket === bucket).map((file) => file.path);
      if (!paths.length) continue;
      const result = await admin.storage.from(bucket).remove(paths);
      if (result.error) return reply(503);
    }
  }
  return reply(503);
});
