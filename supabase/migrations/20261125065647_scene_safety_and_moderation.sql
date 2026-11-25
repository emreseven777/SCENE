-- Moderation state is writable only by trusted database operators and reviewed RPCs.
create table scene_private.administrators (
  user_id uuid primary key references public.profiles(id) on delete cascade
);
create table scene_private.account_restrictions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  state text not null check (state in ('suspended','banned','deleting')),
  until_at timestamptz,
  check ((state = 'suspended') = (until_at is not null))
);
create table scene_private.moderation_log (
  id bigint generated always as identity primary key,
  actor uuid references public.profiles(id) on delete set null,
  action text not null,
  target uuid,
  reason text not null,
  created_at timestamptz not null default now()
);
alter table scene_private.administrators enable row level security;
alter table scene_private.account_restrictions enable row level security;
alter table scene_private.moderation_log enable row level security;
revoke all on scene_private.administrators, scene_private.account_restrictions,
  scene_private.moderation_log from public, anon, authenticated;

alter table public.scene_reports
  add column resolution text not null default 'pending' check (resolution in ('pending','resolved','dismissed')),
  add column category text not null default 'other' check (category in ('impersonation','spam','harassment','underage','other'));
create index scene_pending_reports_by_user on public.scene_reports(reported_id,category)
  where resolution='pending';
revoke insert on public.scene_reports from authenticated;
grant insert (reported_id,message_id,reason,category) on public.scene_reports to authenticated;
revoke insert on public.scene_verification_requests from authenticated;
grant insert (user_id) on public.scene_verification_requests to authenticated;
create trigger scene_limit_verification before insert on public.scene_verification_requests
  for each row execute function scene_private.limit_action('5');

create function scene_private.account_active(person uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select person is not null and exists (select 1 from public.profiles where id=person)
    and not exists (
      select 1 from scene_private.account_restrictions
      where user_id=person and (state <> 'suspended' or until_at > statement_timestamp())
    );
$$;
revoke execute on function scene_private.account_active(uuid) from public, anon;
grant execute on function scene_private.account_active(uuid) to authenticated;

alter table public.profiles add column account_hidden boolean not null default false;
create or replace view public.scene_profiles with (security_invoker=true) as
select id,name,city,bio,scene,onboarded,avatar_path,avatar_paths,
  scene_private.profile_age(id) as age,gender,looking_for,dating_goal,discovery_hidden,account_hidden
from public.profiles;

create function scene_private.account_visible(person uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists (select 1 from public.profiles where id=person and not account_hidden);
$$;
revoke execute on function scene_private.account_visible(uuid) from public,anon;
grant execute on function scene_private.account_visible(uuid) to authenticated;

alter table public.matches add column ended_at timestamptz;
create index scene_matches_user_b on public.matches(user_b);
create index scene_blocks_blocked on public.scene_blocks(blocked_id);

create or replace function scene_private.unblocked(other uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and (other=auth.uid() or (
    scene_private.account_active(auth.uid()) and scene_private.account_active(other)
    and scene_private.account_visible(auth.uid()) and scene_private.account_visible(other)
    and not exists (
      select 1 from public.scene_blocks
      where (blocker_id=auth.uid() and blocked_id=other)
         or (blocker_id=other and blocked_id=auth.uid())
    )
    and not exists (
      select 1 from public.matches
      where user_a=least(auth.uid(),other) and user_b=greatest(auth.uid(),other)
        and ended_at is not null
    )
  ));
$$;

create or replace function scene_private.active_chat(chat uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.matches m
    where m.id=chat and m.ended_at is null and auth.uid() in (m.user_a,m.user_b)
      and scene_private.unblocked(case when m.user_a=auth.uid() then m.user_b else m.user_a end)
  );
$$;

create or replace function public.is_match_participant(m uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select scene_private.active_chat(m); $$;

-- Ordinary unmatching and removing a reciprocal like archive the conversation.
create or replace function public.handle_like_delete()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.matches set ended_at=statement_timestamp()
  where user_a=least(old.liker_id,old.liked_id) and user_b=greatest(old.liker_id,old.liked_id)
    and ended_at is null;
  return old;
end;
$$;
revoke execute on function public.handle_like_delete(),public.handle_like_insert(),
  public.handle_new_user(),public.touch_profile() from public, anon, authenticated;
revoke delete, update on public.matches from authenticated;
-- Core tables explicitly retain the grants needed by their RLS policies.
grant select,update on public.profiles to authenticated;
grant select on public.scene_profiles,public.matches to authenticated;
grant select,insert,delete on public.favorites,public.likes to authenticated;
grant select,insert,update,delete on public.passes to authenticated;
grant select on public.messages to authenticated;
grant usage on sequence public.messages_id_seq to authenticated;

create function scene_private.end_match(other uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare viewer uuid := auth.uid();
begin
  if viewer is null or other is null or viewer=other
    or scene_private.profile_age(viewer) is null then
    raise exception 'Eşleşme kaldırılamadı.' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(least(viewer,other)::text || greatest(viewer,other)::text,0));
  update public.matches set ended_at=statement_timestamp()
    where user_a=least(viewer,other) and user_b=greatest(viewer,other) and ended_at is null;
  if found then
    delete from public.likes where (liker_id=viewer and liked_id=other) or (liker_id=other and liked_id=viewer);
  end if;
end;
$$;
create function public.end_scene_match(other uuid)
returns void language sql security invoker set search_path = ''
as $$ select scene_private.end_match(other); $$;
revoke execute on function scene_private.end_match(uuid),public.end_scene_match(uuid) from public, anon;
grant execute on function scene_private.end_match(uuid),public.end_scene_match(uuid) to authenticated;

create function scene_private.can_like_profile(other uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists (
    select 1 from public.profiles viewer cross join public.profiles candidate
    where viewer.id=auth.uid() and candidate.id=other
      and viewer.onboarded and candidate.onboarded
      and (viewer.looking_for='everyone' or (viewer.looking_for='women' and candidate.gender='woman')
        or (viewer.looking_for='men' and candidate.gender='man'))
      and (candidate.looking_for='everyone' or (candidate.looking_for='women' and viewer.gender='woman')
        or (candidate.looking_for='men' and viewer.gender='man'))
  );
$$;
revoke execute on function scene_private.can_like_profile(uuid) from public,anon;
grant execute on function scene_private.can_like_profile(uuid) to authenticated;
create policy "Mutual dating preferences" on public.likes as restrictive for insert to authenticated
  with check (scene_private.can_like_profile(liked_id));

create policy "Favorite owner visibility" on public.favorites as restrictive for select to authenticated
  using (user_id=(select auth.uid()) or (
    scene_private.unblocked(user_id) and scene_private.profile_listable(user_id)
  ));
create policy "Active profile editing" on public.profiles as restrictive for update to authenticated
  using (scene_private.account_active(id)) with check (scene_private.account_active(id));
create policy "Active media uploader" on storage.objects as restrictive for insert to authenticated
  with check (bucket_id not in ('scene-avatars','scene-chat') or scene_private.account_active(auth.uid()));

do $$
declare relation text;
begin
  foreach relation in array array['likes','passes','favorites','cinema_choices','scene_signals',
    'scene_verification_requests','scene_push_subscriptions'] loop
    execute format('create policy "Active account insert" on public.%I as restrictive for insert to authenticated
      with check ((select scene_private.account_active(auth.uid())))', relation);
  end loop;
  foreach relation in array array['passes','cinema_choices','scene_signals','scene_preferences','scene_push_subscriptions'] loop
    execute format('create policy "Active account update" on public.%I as restrictive for update to authenticated
      using ((select scene_private.account_active(auth.uid()))) with check ((select scene_private.account_active(auth.uid())))', relation);
  end loop;
end;
$$;

create function scene_private.is_administrator()
returns boolean language sql stable security definer set search_path = ''
as $$
  select scene_private.account_active(auth.uid())
    and exists (select 1 from scene_private.administrators where user_id=auth.uid())
    and exists (
      select 1 from auth.sessions
      where id::text=auth.jwt()->>'session_id' and user_id=auth.uid()
        and (not_after is null or not_after > statement_timestamp())
    );
$$;
revoke execute on function scene_private.is_administrator() from public, anon;
grant execute on function scene_private.is_administrator() to authenticated;

create function scene_private.moderation_queue(queue_name text, page_start integer)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare result jsonb;
begin
  if not scene_private.is_administrator() then
    raise exception 'Yönetici yetkisi gerekli.' using errcode='42501';
  end if;
  if page_start is null or page_start < 0 then raise exception 'Geçersiz sayfa.'; end if;
  case queue_name
    when 'users' then
      select jsonb_agg(to_jsonb(page)) into result from (
        select p.id, p.name, p.created_at, r.until_at,
          case when r.until_at <= statement_timestamp() then 'active' else coalesce(r.state,'active') end as state,
          (select count(*) from public.scene_reports q where q.reported_id=p.id and q.resolution='pending') as pending_reports,
          (select count(*) from public.scene_reports q where q.reported_id=p.id and q.resolution='pending'
            and q.category in ('impersonation','spam','underage')) as safety_reports
        from public.profiles p left join scene_private.account_restrictions r on r.user_id=p.id
        order by p.created_at desc,p.id limit 25 offset page_start
      ) page;
    when 'reports' then
      select jsonb_agg(to_jsonb(page)) into result from (
        select r.id, r.reported_id, r.reason, r.category, r.message_id, r.resolution as state, r.created_at,
          case when m.deleted_at is null then m.body end as reported_message
        from public.scene_reports r left join public.messages m on m.id=r.message_id and m.sender_id=r.reported_id
        order by (r.resolution='pending') desc,r.created_at desc,r.id limit 25 offset page_start
      ) page;
    when 'verification' then
      select jsonb_agg(to_jsonb(page)) into result from (
        select v.user_id as id, p.name, v.state, v.requested_at as created_at
        from public.scene_verification_requests v join public.profiles p on p.id=v.user_id
        order by (v.state='pending') desc,v.requested_at desc,v.user_id limit 25 offset page_start
      ) page;
    when 'log' then
      select jsonb_agg(to_jsonb(page)) into result from (
        select id, actor, action, target, reason, created_at from scene_private.moderation_log
        order by id desc limit 25 offset page_start
      ) page;
    when 'statistics' then
      select jsonb_build_array(jsonb_build_object(
        'profiles', (select count(*) from public.profiles where onboarded),
        'active_matches', (select count(*) from public.matches where ended_at is null),
        'messages', (select count(*) from public.messages where deleted_at is null),
        'pending_reports', (select count(*) from public.scene_reports where resolution='pending')
      )) into result;
    else raise exception 'Geçersiz liste.';
  end case;
  return coalesce(result,'[]'::jsonb);
end;
$$;
create function public.scene_moderation_queue(queue_name text,page_start integer)
returns jsonb language sql stable security invoker set search_path = ''
as $$ select scene_private.moderation_queue(queue_name,page_start); $$;

create function scene_private.moderate(action_name text, subject uuid, explanation text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not scene_private.is_administrator() then
    raise exception 'Yönetici yetkisi gerekli.' using errcode='42501';
  end if;
  if subject is null or explanation is null or char_length(btrim(explanation)) not between 5 and 500 then
    raise exception '5–500 karakterlik bir karar gerekçesi gir.';
  end if;
  case action_name
    when 'suspend','ban' then
      if exists (select 1 from scene_private.administrators where user_id=subject) then
        raise exception 'Yönetici hesaplarını yalnızca veritabanı operatörü yönetebilir.' using errcode='42501';
      end if;
      insert into scene_private.account_restrictions(user_id,state,until_at)
      values(subject,case when action_name='ban' then 'banned' else 'suspended' end,
        case when action_name='suspend' then statement_timestamp()+interval '7 days' end)
      on conflict (user_id) do update set state=excluded.state,until_at=excluded.until_at
      where account_restrictions.state <> 'deleting';
    when 'restore' then
      delete from scene_private.account_restrictions where user_id=subject and state <> 'deleting';
    when 'resolve_report','dismiss_report' then
      update public.scene_reports set resolution=case when action_name='resolve_report' then 'resolved' else 'dismissed' end
        where id=subject and resolution='pending';
    when 'reject_verification' then
      update public.scene_verification_requests set state='rejected' where user_id=subject and state='pending';
    else raise exception 'Geçersiz işlem.';
  end case;
  if not found then raise exception 'Kayıt değişti veya bulunamadı.'; end if;
  insert into scene_private.moderation_log(actor,action,target,reason)
  values(auth.uid(),action_name,subject,btrim(explanation));
end;
$$;
create function public.scene_moderate(action_name text,subject uuid,explanation text)
returns void language sql security invoker set search_path = ''
as $$ select scene_private.moderate(action_name,subject,explanation); $$;
revoke execute on function scene_private.moderation_queue(text,integer),public.scene_moderation_queue(text,integer),
  scene_private.moderate(text,uuid,text),public.scene_moderate(text,uuid,text) from public, anon;
grant execute on function scene_private.moderation_queue(text,integer),public.scene_moderation_queue(text,integer),
  scene_private.moderate(text,uuid,text),public.scene_moderate(text,uuid,text) to authenticated;

create function public.scene_admin_access()
returns boolean language sql stable security invoker set search_path = ''
as $$ select scene_private.is_administrator(); $$;
revoke execute on function public.scene_admin_access() from public, anon;
grant execute on function public.scene_admin_access() to authenticated;

create function public.scene_begin_account_deletion(account uuid)
returns void language sql security definer set search_path = ''
as $$
  insert into scene_private.account_restrictions(user_id,state)
  values(account,'deleting')
  on conflict (user_id) do update set state='deleting',until_at=null;
$$;
revoke execute on function public.scene_begin_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.scene_begin_account_deletion(uuid) to service_role;

create or replace function public.claim_scene_push()
returns table(message_id bigint, recipient uuid, subscriptions jsonb)
language plpgsql security definer set search_path=''
as $$
begin
  delete from scene_private.message_push_queue q
  where q.created_at < now() - interval '1 day' or q.attempts>=4;

  return query
  with locked as (
    select q.message_id from scene_private.message_push_queue q
    where q.attempt_at is null or q.attempt_at < now() - interval '5 minutes'
    order by q.created_at for update skip locked limit 20
  ), claimed as (
    update scene_private.message_push_queue q set attempt_at=now(), attempts=q.attempts+1
    from locked l where l.message_id=q.message_id returning q.message_id,q.recipient
  )
  select c.message_id,c.recipient,coalesce((
    select jsonb_agg(jsonb_build_object('endpoint', visible.endpoint, 'p256dh', visible.p256dh, 'auth', visible.auth_secret))
    from (
      select s.endpoint,s.p256dh,s.auth_secret
      from public.scene_push_subscriptions s
      join public.messages msg on msg.id=c.message_id and msg.deleted_at is null
      join public.matches m on m.id=msg.match_id and m.ended_at is null
        and scene_private.account_active(m.user_a) and scene_private.account_active(m.user_b)
        and scene_private.account_visible(m.user_a) and scene_private.account_visible(m.user_b)
      where s.user_id=c.recipient and not exists (
        select 1 from public.scene_blocks b where
          (b.blocker_id=m.user_a and b.blocked_id=m.user_b) or (b.blocker_id=m.user_b and b.blocked_id=m.user_a)
      )
      and not exists (select 1 from public.scene_read_marks r where r.user_id=c.recipient and r.match_id=m.id and r.through_id>=msg.id)
      order by s.endpoint limit 5
    ) visible
  ),'[]'::jsonb) from claimed c;
end;
$$;
