-- Candidate IDs are deliberately separate from the full profile and media APIs.
create index movia_profiles_discovery_eligible on public.profiles (id)
  where onboarded and not discovery_hidden and not account_hidden;

-- This mapping preserves the original catalog IDs used in stored favorites.
create function scene_private.canonical_favorite(title text)
returns text language sql immutable strict set search_path=''
as $$
  select case title
    when 'godfather' then 'tmdb-movie-238'
    when 'pulp' then 'tmdb-movie-680'
    when 'fightclub' then 'tmdb-movie-550'
    when 'inception' then 'tmdb-movie-27205'
    when 'interstellar' then 'tmdb-movie-157336'
    when 'darkknight' then 'tmdb-movie-155'
    when 'parasite' then 'tmdb-movie-496243'
    when 'spirited' then 'tmdb-movie-129'
    when 'shawshank' then 'tmdb-movie-278'
    when 'whiplash' then 'tmdb-movie-244786'
    when 'lalaland' then 'tmdb-movie-313369'
    when 'joker' then 'tmdb-movie-475557'
    when 'matrix' then 'tmdb-movie-603'
    when 'her' then 'tmdb-movie-152601'
    when 'eternal' then 'tmdb-movie-38'
    when 'moodlove' then 'tmdb-movie-843'
    when 'sunrise' then 'tmdb-movie-76'
    when 'taxi' then 'tmdb-movie-103'
    when 'amelie' then 'tmdb-movie-194'
    when 'breakingbad' then 'tmdb-tv-1396'
    when 'got' then 'tmdb-tv-1399'
    when 'stranger' then 'tmdb-tv-66732'
    when 'dark' then 'tmdb-tv-70523'
    when 'chernobyl' then 'tmdb-tv-87108'
    when 'succession' then 'tmdb-tv-76331'
    when 'bear' then 'tmdb-tv-136315'
    when 'severance' then 'tmdb-tv-95396'
    when 'truedetective' then 'tmdb-tv-46648'
    when 'fleabag' then 'tmdb-tv-67070'
    when 'office' then 'tmdb-tv-2316'
    else title
  end;
$$;
revoke execute on function scene_private.canonical_favorite(text) from public,anon;
grant execute on function scene_private.canonical_favorite(text) to authenticated;
create index movia_favorites_by_owner_canonical
  on public.favorites (user_id,scene_private.canonical_favorite(title_id));

create function scene_private.discover_candidates(page_size integer, after_shared integer, after_id uuid)
returns table(profile_id uuid, shared_favorites integer)
language plpgsql stable security definer set search_path=''
as $$
declare
  viewer uuid := auth.uid();
begin
  if page_size is null or page_size not between 1 and 50
     or (after_shared is null) <> (after_id is null)
     or after_shared < 0 then
    raise exception 'Geçersiz keşfet sayfası.' using errcode='22023';
  end if;

  if not scene_private.account_active(viewer) or not scene_private.account_visible(viewer)
    or scene_private.profile_age(viewer) is null then
    return;
  end if;

  return query
  with mine as materialized (
    select distinct scene_private.canonical_favorite(title_id) as title_id from public.favorites where user_id=viewer
  ), candidates as (
    select p.id, (
      select count(distinct mine.title_id)::integer
      from public.favorites f join mine on mine.title_id=scene_private.canonical_favorite(f.title_id)
      where f.user_id=p.id
    ) as shared
    from public.profiles p join public.profiles own on own.id=viewer
    where p.id<>viewer and p.onboarded and not p.discovery_hidden and not p.account_hidden
      and p.gender is not null and p.looking_for is not null and p.dating_goal is not null
      and scene_private.valid_province(p.city) and scene_private.profile_age(p.id) is not null
      and (own.looking_for is null or own.looking_for='everyone'
        or (own.looking_for='women' and p.gender='woman')
        or (own.looking_for='men' and p.gender='man'))
      and (p.looking_for='everyone' or (p.looking_for='women' and own.gender='woman')
        or (p.looking_for='men' and own.gender='man'))
      and scene_private.unblocked(p.id)
      and not exists (select 1 from public.passes where user_id=viewer and passed_id=p.id)
      and not exists (select 1 from public.likes where liker_id=viewer and liked_id=p.id)
      and not exists (select 1 from public.matches m
        where m.user_a=least(viewer,p.id) and m.user_b=greatest(viewer,p.id) and m.ended_at is null)
  )
  select c.id,c.shared from candidates c
  where after_id is null or c.shared<after_shared or (c.shared=after_shared and c.id>after_id)
  order by c.shared desc,c.id
  limit page_size;
end;
$$;

create function public.scene_discover_candidates(page_size integer default 24,
  after_shared integer default null, after_id uuid default null)
returns table(profile_id uuid, shared_favorites integer)
language sql stable security invoker set search_path=''
as $$ select * from scene_private.discover_candidates(page_size,after_shared,after_id); $$;
revoke execute on function scene_private.discover_candidates(integer,integer,uuid),
  public.scene_discover_candidates(integer,integer,uuid) from public,anon;
grant execute on function scene_private.discover_candidates(integer,integer,uuid),
  public.scene_discover_candidates(integer,integer,uuid) to authenticated;
