import { createClient } from "npm:@supabase/supabase-js@2.119.2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { ...cors, "Cache-Control": "no-store" } });
}

interface TmdbResult {
  id: number;
  adult?: boolean;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string;
  overview?: string;
  popularity?: number;
}

const posterPath = /^\/[\w-]+\.(?:jpg|png|webp)$/i;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const jwt = request.headers.get("Authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!jwt) return json({ error: "Sign in required" }, 401);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.getUser(jwt);
  if (error || !data.user) return json({ error: "Sign in required" }, 401);

  const body = await request.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim() : null;
  const type = body?.type;
  const page = body?.page;
  if (query === null || query.length > 120 || !["all", "film", "dizi"].includes(type)
    || !Number.isInteger(page) || page < 1 || page > 500) {
    return json({ error: "Invalid search" }, 400);
  }

  const token = Deno.env.get("TMDB_READ_ACCESS_TOKEN");
  if (!token) return json({ error: "Catalog unavailable" }, 503);

  const kinds = type === "all" ? (["movie", "tv"] as const) : ([type === "film" ? "movie" : "tv"] as const);
  try {
    const pages = await Promise.all(kinds.map(async (kind) => {
      const params = new URLSearchParams({ language: "tr-TR", include_adult: "false", page: String(page) });
      if (query) params.set("query", query);
      const endpoint = query ? `search/${kind}` : `${kind}/popular`;
      const response = await fetch(`https://api.themoviedb.org/3/${endpoint}?${params}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error("TMDB request failed");
      const result = await response.json() as { results: TmdbResult[]; total_pages: number };
      return {
        hasMore: page < Math.min(500, result.total_pages),
        items: result.results.flatMap((item) => {
          const title = item.title || item.name || item.original_title || item.original_name;
          if (item.adult || !title) return [];
          const path = item.poster_path;
          return [{
            id: `tmdb-${kind}-${item.id}`,
            type: kind === "movie" ? "film" : "dizi",
            title,
            original: item.original_title || item.original_name,
            year: Number((item.release_date || item.first_air_date || "").slice(0, 4)) || 0,
            poster: path && posterPath.test(path) ? `https://image.tmdb.org/t/p/w500${path}` : "",
            genres: [],
            by: "",
            overview: item.overview?.slice(0, 3000) ?? "",
            popularity: item.popularity ?? 0,
          }];
        }),
      };
    }));
    const titles = pages.flatMap((p) => p.items)
      .sort((a, b) => b.popularity - a.popularity)
      .map(({ popularity: _popularity, ...title }) => title);
    return json({ titles, nextPage: pages.some((p) => p.hasMore) ? page + 1 : null });
  } catch {
    return json({ error: "Catalog temporarily unavailable" }, 502);
  }
});
