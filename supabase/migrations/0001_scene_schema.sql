-- SCENE: real multi-user schema for Supabase.
-- Private account data (email, password hash) stays in Supabase's auth.users table,
-- which the app never reads. Public profile data lives in public.profiles.
-- Every table has Row Level Security; anonymous (logged-out) visitors get no access.

-- ---------- Profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 40),
  city text not null default '' check (char_length(city) <= 40),
  bio text not null default '' check (char_length(bio) <= 240),
  scene text not null default '' check (char_length(scene) <= 200),
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Favorites (films and TV shows) ----------
create table if not exists public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  title_id text not null check (char_length(title_id) between 1 and 64),
  created_at timestamptz not null default now(),
  primary key (user_id, title_id)
);

-- ---------- Likes (one-directional, private to the liker) ----------
create table if not exists public.likes (
  liker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  liked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (liker_id, liked_id),
  check (liker_id <> liked_id)
);

-- ---------- Passes (skipped people, private) ----------
create table if not exists public.passes (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  passed_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, passed_id),
  check (user_id <> passed_id)
);

-- ---------- Matches (created only by the database on mutual likes) ----------
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);

-- ---------- Private messages (only between matched users) ----------
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  match_id uuid not null references public.matches (id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists messages_match_idx on public.messages (match_id, created_at);
create index if not exists likes_liked_idx on public.likes (liked_id);

-- ---------- Helper: is the current user part of this match? ----------
create or replace function public.is_match_participant(m uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.matches
    where id = m and auth.uid() in (user_a, user_b)
  );
$$;

-- ---------- Create a profile automatically for each new account ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), 'Yeni izleyici'), 40))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Keep updated_at fresh, block changing protected columns ----------
create or replace function public.touch_profile()
returns trigger language plpgsql as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_profile();

-- ---------- Mutual like => match; removed like => match removed ----------
create or replace function public.handle_like_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.likes where liker_id = new.liked_id and liked_id = new.liker_id) then
    insert into public.matches (user_a, user_b)
    values (least(new.liker_id, new.liked_id), greatest(new.liker_id, new.liked_id))
    on conflict (user_a, user_b) do nothing;
  end if;
  delete from public.passes where user_id = new.liker_id and passed_id = new.liked_id;
  return new;
end;
$$;
drop trigger if exists likes_after_insert on public.likes;
create trigger likes_after_insert after insert on public.likes
  for each row execute function public.handle_like_insert();

create or replace function public.handle_like_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.matches
  where user_a = least(old.liker_id, old.liked_id) and user_b = greatest(old.liker_id, old.liked_id);
  return old;
end;
$$;
drop trigger if exists likes_after_delete on public.likes;
create trigger likes_after_delete after delete on public.likes
  for each row execute function public.handle_like_delete();

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.favorites enable row level security;
alter table public.likes enable row level security;
alter table public.passes enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;

revoke all on public.profiles, public.favorites, public.likes, public.passes, public.matches, public.messages from anon;
revoke execute on function public.is_match_participant(uuid) from anon, public;
grant execute on function public.is_match_participant(uuid) to authenticated;

-- Profiles: signed-in users can read public profile fields; only the owner can edit.
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Favorites: visible to signed-in users (needed for shared counts); only owner changes.
drop policy if exists "favorites read" on public.favorites;
create policy "favorites read" on public.favorites for select to authenticated using (true);
drop policy if exists "favorites insert own" on public.favorites;
create policy "favorites insert own" on public.favorites for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "favorites delete own" on public.favorites;
create policy "favorites delete own" on public.favorites for delete to authenticated using (user_id = auth.uid());

-- Likes: you only see and manage your own outgoing likes.
drop policy if exists "likes read own" on public.likes;
create policy "likes read own" on public.likes for select to authenticated using (liker_id = auth.uid());
drop policy if exists "likes insert own" on public.likes;
create policy "likes insert own" on public.likes for insert to authenticated with check (liker_id = auth.uid());
drop policy if exists "likes delete own" on public.likes;
create policy "likes delete own" on public.likes for delete to authenticated using (liker_id = auth.uid());

-- Passes: private to the user.
drop policy if exists "passes own" on public.passes;
create policy "passes own" on public.passes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Matches: only the two participants can see them. No direct inserts (trigger only).
drop policy if exists "matches read participants" on public.matches;
create policy "matches read participants" on public.matches for select to authenticated
  using (auth.uid() in (user_a, user_b));
drop policy if exists "matches delete participants" on public.matches;
create policy "matches delete participants" on public.matches for delete to authenticated
  using (auth.uid() in (user_a, user_b));

-- Messages: only the two matched people can read; you can only send as yourself.
drop policy if exists "messages read participants" on public.messages;
create policy "messages read participants" on public.messages for select to authenticated
  using (public.is_match_participant(match_id));
drop policy if exists "messages insert participants" on public.messages;
create policy "messages insert participants" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_match_participant(match_id));

-- ---------- Live updates for chat and matches ----------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'messages') then
      alter publication supabase_realtime add table public.messages;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'matches') then
      alter publication supabase_realtime add table public.matches;
    end if;
  end if;
end $$;
