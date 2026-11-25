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
  genre_ids?: number[];
  vote_average?: number;
}

const genres: Record<number, string> = {
  28: "Aksiyon", 12: "Macera", 16: "Animasyon", 35: "Komedi", 80: "Suç",
  99: "Belgesel", 18: "Dram", 10751: "Aile", 14: "Fantastik", 36: "Tarih", 27: "Korku",
  10402: "Müzik", 9648: "Gizem", 10749: "Romantik", 878: "Bilim Kurgu", 53: "Gerilim",
  10752: "Savaş", 10759: "Aksiyon", 10765: "Bilim Kurgu",
};

async function tmdb(endpoint: string, params: URLSearchParams, token: string) {
  const response = await fetch(`https://api.themoviedb.org/3/${endpoint}?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("TMDB request failed");
  return response.json();
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
  const token = Deno.env.get("TMDB_READ_ACCESS_TOKEN");

  if (body?.mode === "details") {
    const match = typeof body.id === "string" && body.id.match(/^tmdb-(movie|tv)-([1-9][0-9]{0,9})$/);
    if (!match) return json({ error: "Invalid item" }, 400);
    if (!token) return json({ error: "Catalog unavailable" }, 503);
    try {
      const params = new URLSearchParams({ language: "tr-TR", append_to_response: "credits,videos" });
      const item = await tmdb(`${match[1]}/${match[2]}`,params,token);
      if (item.adult) return json({ error: "Unavailable" }, 404);
      type Video = { key: string; site: string; type: string };
      const findTrailer = (videos: Video[]) => videos.find((v) => v.site === "YouTube" && v.type === "Trailer" && /^[\w-]{11}$/.test(v.key));
      let trailer = findTrailer(item.videos?.results ?? []);
      if (!trailer) {
        const response = await tmdb(`${match[1]}/${match[2]}/videos`,new URLSearchParams({language:"en-US"}),token).catch(() => null);
        trailer = findTrailer(response?.results ?? []);
      }
      return json({
        overview: item.overview ?? "",
        cast: (item.credits?.cast ?? []).slice(0, 8).map((p: { name: string }) => p.name),
        rating: item.vote_average || null,
        trailer: trailer?.key ?? null,
      });
    } catch { return json({ error: "Details unavailable" }, 502); }
  }

  const query = typeof body?.query === "string" ? body.query.trim() : null;
  const type = body?.type;
  const page = body?.page;
  const discover = body?.mode === "discover";
  const genre = body?.genre;
  const year = body?.year;
  const sort = body?.sort;
  if (query === null || query.length > 120 || !["all", "film", "dizi"].includes(type)
    || !Number.isInteger(page) || page < 1 || page > 500
    || (discover && (type === "all" || (genre !== null && !Object.hasOwn(genres, genre))
      || (year !== null && (!Number.isInteger(year) || year < 1870 || year > 2100))
      || !["popularity.desc", "vote_average.desc"].includes(sort)))) {
    return json({ error: "Invalid search" }, 400);
  }
  if (!token) return json({ error: "Catalog unavailable" }, 503);
  const kinds = type === "all" ? (["movie", "tv"] as const) : ([type === "film" ? "movie" : "tv"] as const);
  try {
    const pages = await Promise.all(kinds.map(async (kind) => {
      const params = new URLSearchParams({ language: "tr-TR", include_adult: "false", page: String(page) });
      if (query) params.set("query", query);
      if (discover) {
        params.set("sort_by", sort);
        if (sort === "vote_average.desc") params.set("vote_count.gte", "100");
        if (genre !== null) params.set("with_genres", String(genre));
        if (year !== null) params.set(kind === "movie" ? "primary_release_year" : "first_air_date_year", String(year));
      }
      const endpoint = discover ? `discover/${kind}` : query ? `search/${kind}` : `${kind}/popular`;
      const result = await tmdb(endpoint, params, token) as { results: TmdbResult[]; total_pages: number };
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
            genres: (item.genre_ids ?? []).flatMap((id) => genres[id] ? [genres[id]] : []),
            rating: item.vote_average || null,
            by: "",
            overview: item.overview?.slice(0, 3000) ?? "",
            popularity: item.popularity ?? 0,
          }];
        }),
      };
    }));
    const titles = pages.flatMap((p) => p.items)
      .sort((a, b) => discover && sort === "vote_average.desc" ? (b.rating ?? 0) - (a.rating ?? 0) : b.popularity - a.popularity)
      .map(({ popularity: _popularity, ...title }) => title);
    return json({ titles, nextPage: pages.some((p) => p.hasMore) ? page + 1 : null });
  } catch {
    return json({ error: "Catalog temporarily unavailable" }, 502);
  }
});
