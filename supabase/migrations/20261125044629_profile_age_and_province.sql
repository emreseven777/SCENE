create schema if not exists scene_private;
revoke all on schema scene_private from public, anon, authenticated;
grant usage on schema scene_private to authenticated;

create table if not exists scene_private.profile_birth_dates (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  birth_date date not null
);
alter table scene_private.profile_birth_dates enable row level security;
revoke all on scene_private.profile_birth_dates from public, anon, authenticated;

create or replace function scene_private.valid_province(province text)
returns boolean language sql immutable security invoker set search_path = ''
as $$
  select coalesce(province = any(array[
    'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya',
    'Ardahan', 'Artvin', 'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik',
    'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum',
    'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir',
    'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul',
    'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kırıkkale',
    'Kırklareli', 'Kırşehir', 'Kilis', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa',
    'Mardin', 'Mersin', 'Muğla', 'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye',
    'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop', 'Sivas', 'Şanlıurfa', 'Şırnak',
    'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat',
    'Zonguldak'
  ]::text[]), false);
$$;
revoke execute on function scene_private.valid_province(text) from public, anon;
grant execute on function scene_private.valid_province(text) to authenticated;

-- The private table is never joined into a client-visible view. Only age leaves it.
create or replace function scene_private.profile_age(profile_id uuid)
returns integer language sql stable security definer set search_path = ''
as $$
  select extract(year from age((current_timestamp at time zone 'Europe/Istanbul')::date, birth_date))::integer
  from scene_private.profile_birth_dates
  where user_id = profile_id and birth_date <=
    ((current_timestamp at time zone 'Europe/Istanbul')::date - interval '18 years')::date;
$$;
revoke execute on function scene_private.profile_age(uuid) from public, anon;
grant execute on function scene_private.profile_age(uuid) to authenticated;

create or replace function scene_private.complete_profile_identity(new_birth_date date, new_province text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  viewer uuid := auth.uid();
  latest_birth_date date := ((current_timestamp at time zone 'Europe/Istanbul')::date - interval '18 years')::date;
  existing_birth_date date;
begin
  if viewer is null then
    raise exception 'Oturum açman gerekiyor.' using errcode = '42501';
  end if;
  if not scene_private.valid_province(new_province) then
    raise exception 'Türkiye’nin 81 ilinden birini seç.' using errcode = '23514';
  end if;
  select birth_date into existing_birth_date
  from scene_private.profile_birth_dates where user_id = viewer;

  if existing_birth_date is null then
    if new_birth_date is null or not isfinite(new_birth_date) or new_birth_date > latest_birth_date then
      raise exception 'SCENE’i kullanmak için en az 18 yaşında olmalısın.' using errcode = '23514';
    end if;
    insert into scene_private.profile_birth_dates (user_id, birth_date)
    values (viewer, new_birth_date)
    on conflict (user_id) do nothing;
    select birth_date into existing_birth_date
    from scene_private.profile_birth_dates where user_id = viewer;
  end if;

  if new_birth_date is not null and existing_birth_date is distinct from new_birth_date then
    raise exception 'Kayıtlı doğum tarihi değiştirilemez.' using errcode = '23514';
  end if;
  update public.profiles set city = new_province where id = viewer;
end;
$$;
revoke execute on function scene_private.complete_profile_identity(date, text) from public, anon;
grant execute on function scene_private.complete_profile_identity(date, text) to authenticated;

create or replace function public.complete_profile_identity(new_birth_date date, new_province text)
returns void language sql security invoker set search_path = ''
as $$
  select scene_private.complete_profile_identity(new_birth_date, new_province);
$$;
revoke execute on function public.complete_profile_identity(date, text) from public, anon;
grant execute on function public.complete_profile_identity(date, text) to authenticated;

create or replace function scene_private.check_profile_identity()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if (tg_op = 'UPDATE' and new.city is distinct from old.city)
     or (tg_op = 'INSERT' and new.city <> '') then
    if not scene_private.valid_province(new.city) then
      raise exception 'Türkiye’nin 81 ilinden birini seç.' using errcode = '23514';
    end if;
  end if;

  if new.onboarded and (tg_op = 'INSERT' or not old.onboarded) then
    if scene_private.profile_age(new.id) is null or not scene_private.valid_province(new.city) then
      raise exception 'Önce doğum tarihini ve ilini kaydet.' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function scene_private.check_profile_identity() from public, anon, authenticated;
drop trigger if exists profiles_check_identity on public.profiles;
create trigger profiles_check_identity
  before insert or update of city, onboarded on public.profiles
  for each row execute function scene_private.check_profile_identity();

create or replace view public.scene_profiles
with (security_invoker = true) as
select id, name, city, bio, scene, onboarded, avatar_path, avatar_paths,
       scene_private.profile_age(id) as age
from public.profiles;
revoke all on public.scene_profiles from public, anon, authenticated;
grant select on public.scene_profiles to authenticated;

-- Keep the existing ownership and match policies, and require adult accounts
-- for social activity. Members with missing details can still read their own profile.
drop policy if exists "scene identity profiles read" on public.profiles;
create policy "scene identity profiles read" on public.profiles as restrictive for select to authenticated
  using (id = (select auth.uid()) or (select scene_private.profile_age(auth.uid())) is not null);

drop policy if exists "scene identity favorites read" on public.favorites;
create policy "scene identity favorites read" on public.favorites as restrictive for select to authenticated
  using (user_id = (select auth.uid()) or (select scene_private.profile_age(auth.uid())) is not null);

drop policy if exists "scene identity favorites insert" on public.favorites;
create policy "scene identity favorites insert" on public.favorites as restrictive for insert to authenticated
  with check ((select scene_private.profile_age(auth.uid())) is not null);

drop policy if exists "scene identity likes insert" on public.likes;
create policy "scene identity likes insert" on public.likes as restrictive for insert to authenticated
  with check ((select scene_private.profile_age(auth.uid())) is not null
    and scene_private.profile_age(liked_id) is not null);

drop policy if exists "scene identity passes insert" on public.passes;
create policy "scene identity passes insert" on public.passes as restrictive for insert to authenticated
  with check ((select scene_private.profile_age(auth.uid())) is not null);

drop policy if exists "scene identity matches read" on public.matches;
create policy "scene identity matches read" on public.matches as restrictive for select to authenticated
  using ((select scene_private.profile_age(auth.uid())) is not null);

drop policy if exists "scene identity messages read" on public.messages;
create policy "scene identity messages read" on public.messages as restrictive for select to authenticated
  using ((select scene_private.profile_age(auth.uid())) is not null);

drop policy if exists "scene identity messages insert" on public.messages;
create policy "scene identity messages insert" on public.messages as restrictive for insert to authenticated
  with check ((select scene_private.profile_age(auth.uid())) is not null);
