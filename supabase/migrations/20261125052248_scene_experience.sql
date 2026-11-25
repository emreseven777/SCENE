-- SCENE 3.0. Existing records and the original TMDB/favorites API remain intact.
alter table public.likes add column kind text not null default 'like' check (kind in ('like', 'super'));
alter table public.profiles
  add column gender text check (gender in ('woman','man','nonbinary','other')),
  add column looking_for text check (looking_for in ('women','men','everyone')),
  add column dating_goal text check (dating_goal in ('relationship','dates','friends','undecided')),
  add column discovery_hidden boolean not null default false;

create or replace view public.scene_profiles
with (security_invoker = true) as
select id, name, city, bio, scene, onboarded, avatar_path, avatar_paths,
       scene_private.profile_age(id) as age, gender, looking_for, dating_goal, discovery_hidden
from public.profiles;

create table public.cinema_choices (
  user_id uuid not null references public.profiles(id) on delete cascade,
  title_id text not null check (title_id ~ '^[a-z0-9-]{1,64}$'),
  choice text not null check (choice in ('favorite','disliked','watchlist','unseen')),
  title_metadata jsonb not null check (jsonb_typeof(title_metadata) = 'object' and octet_length(title_metadata::text) <= 16000),
  updated_at timestamptz not null default now(),
  primary key (user_id,title_id)
);
alter table public.cinema_choices enable row level security;
grant select, insert, update, delete on public.cinema_choices to authenticated;
create policy "Own cinema choices" on public.cinema_choices for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (select scene_private.profile_age(auth.uid())) is not null);

create table public.scene_blocks (
  blocker_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.scene_blocks enable row level security;
grant select, insert, delete on public.scene_blocks to authenticated;
create policy "Own blocks" on public.scene_blocks to authenticated
  using (blocker_id = (select auth.uid()))
  with check (blocker_id = (select auth.uid()) and (select scene_private.profile_age(auth.uid())) is not null);

create or replace function scene_private.unblocked(other uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and not exists (
    select 1 from public.scene_blocks
    where (blocker_id = auth.uid() and blocked_id = other)
       or (blocker_id = other and blocked_id = auth.uid())
  );
$$;
revoke execute on function scene_private.unblocked(uuid) from public, anon;
grant execute on function scene_private.unblocked(uuid) to authenticated;

create or replace function scene_private.active_chat(chat uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.matches m where m.id = chat and auth.uid() in (m.user_a,m.user_b)
    and scene_private.unblocked(case when m.user_a = auth.uid() then m.user_b else m.user_a end)
  );
$$;
revoke execute on function scene_private.active_chat(uuid) from public, anon;
grant execute on function scene_private.active_chat(uuid) to authenticated;

create policy "Unblocked profiles" on public.profiles as restrictive for select to authenticated
  using (scene_private.unblocked(id));
create policy "Unblocked matches" on public.matches as restrictive for select to authenticated
  using (scene_private.unblocked(case when user_a = auth.uid() then user_b else user_a end));
create policy "Unblocked messages read" on public.messages as restrictive for select to authenticated
  using (scene_private.active_chat(match_id));
create policy "Unblocked messages write" on public.messages as restrictive for insert to authenticated
  with check (scene_private.active_chat(match_id));
create policy "Unblocked likes" on public.likes as restrictive for select to authenticated
  using (scene_private.unblocked(case when liker_id = auth.uid() then liked_id else liker_id end));
create policy "Unblocked new likes" on public.likes as restrictive for insert to authenticated
  with check (scene_private.unblocked(liked_id) and exists (
    select 1 from public.profiles p where p.id = liked_id and p.onboarded and not p.discovery_hidden
  ));
create policy "Incoming likes" on public.likes for select to authenticated
  using (liked_id = (select auth.uid()) and (select scene_private.profile_age(auth.uid())) is not null);

create table public.scene_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  message_id bigint,
  reason text not null check (char_length(btrim(reason)) between 5 and 500),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);
alter table public.scene_reports enable row level security;
grant insert on public.scene_reports to authenticated;
create policy "Submit own report" on public.scene_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and (select scene_private.profile_age(auth.uid())) is not null
    and (message_id is null or exists (
      select 1 from public.messages m where m.id = message_id and m.sender_id = reported_id
        and scene_private.active_chat(m.match_id)
    )));

create table scene_private.action_limits (
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  window_start timestamptz not null,
  amount integer not null,
  primary key (user_id, action)
);
alter table scene_private.action_limits enable row level security;

create or replace function scene_private.limit_action()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  viewer uuid := auth.uid();
  current_count integer;
  stamp timestamptz := statement_timestamp();
begin
  if viewer is null then return new; end if;
  insert into scene_private.action_limits as limits (user_id,action,window_start,amount)
    values(viewer,tg_table_name,stamp,1)
  on conflict (user_id,action) do update set
    amount = case when limits.window_start <= stamp - interval '1 minute' then 1 else limits.amount + 1 end,
    window_start = case when limits.window_start <= stamp - interval '1 minute' then stamp else limits.window_start end
  returning amount into current_count;
  if current_count > tg_argv[0]::integer then
    raise exception 'Çok fazla işlem yaptın. Biraz bekle.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function scene_private.limit_action() from public, anon, authenticated;
create trigger scene_limit_likes before insert on public.likes for each row execute function scene_private.limit_action('40');
create trigger scene_limit_messages before insert on public.messages for each row execute function scene_private.limit_action('30');
create trigger scene_limit_reports before insert on public.scene_reports for each row execute function scene_private.limit_action('5');

-- One transaction updates the cinema record and existing favorite, including undo.
create function public.set_cinema_choice(item_id text, item_metadata jsonb, item_choice text, is_favorite boolean)
returns void language plpgsql security invoker set search_path = ''
as $$
begin
  if auth.uid() is null or scene_private.profile_age(auth.uid()) is null then
    raise exception 'Önce profilini tamamla.' using errcode = '42501';
  end if;
  if item_choice is null then
    delete from public.cinema_choices where user_id = auth.uid() and title_id = item_id;
  else
    insert into public.cinema_choices(user_id,title_id,title_metadata,choice)
    values(auth.uid(),item_id,item_metadata,item_choice)
    on conflict(user_id,title_id) do update set
      title_metadata=excluded.title_metadata, choice=excluded.choice, updated_at=now();
  end if;
  if is_favorite then
    insert into public.favorites(user_id,title_id,title_metadata)
    values(auth.uid(),item_id,item_metadata)
    on conflict(user_id,title_id) do nothing;
  else
    delete from public.favorites where user_id=auth.uid() and title_id=item_id;
  end if;
end;
$$;
revoke execute on function public.set_cinema_choice(text,jsonb,text,boolean) from public, anon;
grant execute on function public.set_cinema_choice(text,jsonb,text,boolean) to authenticated;

create function scene_private.profile_listable(person uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select person=auth.uid() or exists (
    select 1 from public.profiles p where p.id=person and (
      not p.discovery_hidden or exists (
        select 1 from public.matches m where auth.uid() in (m.user_a,m.user_b)
          and person in (m.user_a,m.user_b)
      )
    )
  );
$$;
revoke execute on function scene_private.profile_listable(uuid) from public,anon;
grant execute on function scene_private.profile_listable(uuid) to authenticated;
create policy "Discovery visibility" on public.profiles as restrictive for select to authenticated
  using (scene_private.profile_listable(id));

-- Serialize concurrent outgoing likes for the same pair so a reciprocal pair
-- always has an opportunity to observe the earlier committed insert.
create function scene_private.lock_like_pair()
returns trigger language plpgsql set search_path=''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(least(new.liker_id,new.liked_id)::text || greatest(new.liker_id,new.liked_id)::text, 0));
  return new;
end;
$$;
revoke execute on function scene_private.lock_like_pair() from public,anon,authenticated;
create trigger scene_like_pair before insert on public.likes for each row execute function scene_private.lock_like_pair();

create function scene_private.undo_scene_swipe(other uuid, was_pass boolean)
returns void language plpgsql security definer set search_path=''
as $$
declare viewer uuid := auth.uid();
begin
  if viewer is null or viewer=other or scene_private.profile_age(viewer) is null then
    raise exception 'Bu işlem için profilini tamamla.' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(least(viewer,other)::text || greatest(viewer,other)::text,0));
  if was_pass then
    delete from public.passes where user_id=viewer and passed_id=other;
    return;
  end if;
  if exists(select 1 from public.matches where user_a=least(viewer,other) and user_b=greatest(viewer,other)) then
    raise exception 'Bu beğeni eşleşti. Eşleşmeler bölümünden yönetebilirsin.' using errcode='23514';
  end if;
  delete from public.likes where liker_id=viewer and liked_id=other;
end;
$$;
revoke execute on function scene_private.undo_scene_swipe(uuid,boolean) from public,anon;
grant execute on function scene_private.undo_scene_swipe(uuid,boolean) to authenticated;
create function public.undo_scene_swipe(other uuid,was_pass boolean)
returns void language sql security invoker set search_path=''
as $$ select scene_private.undo_scene_swipe(other,was_pass); $$;
revoke execute on function public.undo_scene_swipe(uuid,boolean) from public,anon;
grant execute on function public.undo_scene_swipe(uuid,boolean) to authenticated;
