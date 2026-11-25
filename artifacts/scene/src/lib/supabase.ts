import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey);

// Supabase keeps only the session tokens in browser storage so logins survive
// closing the app. Passwords are sent to Supabase once and never stored.
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error("Supabase yapılandırılmadı.");
  return supabase;
}

export async function downloadPrivateObject(bucket: string, path: string, signal: AbortSignal): Promise<Blob> {
  const { data, error } = await requireSupabase().auth.getSession();
  if (error) throw error;
  if (!data.session || !url || !anonKey) throw new Error("Oturum açman gerekiyor.");
  const objectKey = [bucket, ...path.split("/")].map(encodeURIComponent).join("/");
  const endpoint = new URL(`${url.replace(/\/$/, "")}/storage/v1/object/authenticated/${objectKey}`);
  // Vary the URL so an intermediary cannot replay a previous authorized download after a block.
  endpoint.searchParams.set("request", crypto.randomUUID());
  const response = await fetch(endpoint, {
    cache: "no-store",
    headers: { apikey: anonKey, Authorization: `Bearer ${data.session.access_token}` },
    signal,
  });
  if (!response.ok) throw new Error("Dosyaya erişilemiyor.");
  return response.blob();
}

const AUTH_ERRORS: Record<string, string> = {
  "Invalid login credentials": "E-posta veya şifre hatalı.",
  "Email not confirmed": "E-postanı henüz onaylamadın. Gelen kutundaki bağlantıya dokun.",
  "User already registered": "Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.",
  "Password should be at least 6 characters.": "Şifre en az 6 karakter olmalı.",
  "Unable to validate email address: invalid format": "Geçerli bir e-posta adresi gir.",
  "Email rate limit exceeded": "Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.",
};

export function turkishError(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e);
  if (AUTH_ERRORS[msg]) return AUTH_ERRORS[msg];
  if (/password/i.test(msg) && /characters/i.test(msg)) return "Şifre yeterince güçlü değil. En az 6 karakter kullan.";
  if (/rate limit/i.test(msg)) return "Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.";
  if (/fetch|network/i.test(msg)) return "Bağlantı kurulamadı. İnternetini kontrol et.";
  if (/relation .* does not exist|schema cache/i.test(msg)) return "Veritabanı henüz hazır değil. Kurulum tamamlanınca tekrar dene.";
  return msg || "Bir şeyler ters gitti.";
}
