# SCENE

SCENE is a Turkish-language, mobile-first social networking prototype that connects people through their favorite films and TV shows.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/scene` — the SCENE web app (React + Vite). Talks directly to Supabase from the browser.
- `supabase/migrations/0001_scene_schema.sql` — source of truth for SCENE's database tables and Row Level Security policies (profiles, favorites, likes, passes, matches, messages).
- `artifacts/scene/src/lib/catalog.ts` — built-in catalog and stable mapping between legacy and TMDB favorite IDs.
- `supabase/functions/tmdb-catalog` — authenticated TMDB catalog search.
- `supabase/migrations/0002_catalog_and_avatars.sql` — catalog metadata and private profile photo storage. See [iPhone setup](supabase/KURULUM.md).

## Architecture decisions

- Real multi-user app on the user's own Supabase project (email/password auth, email confirmation ON). Do not migrate to the Replit database.
- Only the publishable/anon key is used in the browser; privacy is enforced by RLS. Never use a service_role key in frontend code.
- Emails stay in Supabase `auth.users`; other users only see `profiles` fields. Matches are created by a database trigger on mutual likes, never by the client.
- Passwords are never stored by the app; Supabase keeps only session tokens in the browser so logins persist.
- No sample people, fake replies or demo badges. Empty states must be honest.

## Product

Sign up / log in, discover real users, compare shared favorites, like profiles, match on mutual likes, and chat privately with matches (live updates). Navigation uses Keşfet, Eşleşmeler, Mesajlar, and Profil.

## User preferences

- All app content is in Turkish.
- Modern cinematic appearance: black backgrounds, white text, and red accents.
- Mobile-first. The user works from an iPhone and needs simple, step-by-step instructions.
- Never pretend the app is connected or authenticated when it isn't.

## Gotchas

- Schema changes must be applied to Supabase (SQL Editor or `psql "$SUPABASE_DB_URL" -f ...`); there is no Drizzle push for SCENE tables.
- Supabase Auth Site URL / Redirect URLs must include the dev domain and, later, the published URL, or email confirmation links break.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
