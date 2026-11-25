create table public.scene_push_subscriptions (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  endpoint text not null check (char_length(endpoint) <= 2048 and endpoint ~ '^https://([a-z0-9-]+[.])*(push[.]apple[.]com|push[.]services[.]mozilla[.]com|notify[.]windows[.]com|fcm[.]googleapis[.]com)/'),
  p256dh text not null check (p256dh ~ '^[A-Za-z0-9_-]{86,90}$'),
  auth_secret text not null check (auth_secret ~ '^[A-Za-z0-9_-]{20,25}$'),
  primary key (user_id,endpoint)
);
alter table public.scene_push_subscriptions enable row level security;
grant select,insert,update,delete on public.scene_push_subscriptions to authenticated,service_role;
create policy "Own push subscriptions" on public.scene_push_subscriptions for all to authenticated
  using (user_id=(select auth.uid()))
  with check (user_id=(select auth.uid()) and (select scene_private.profile_age(auth.uid())) is not null);

create trigger scene_limit_push_subscriptions before insert on public.scene_push_subscriptions
  for each row execute function scene_private.limit_action('10');

create table scene_private.message_push_queue (
  message_id bigint primary key references public.messages(id) on delete cascade,
  recipient uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  attempt_at timestamptz,
  attempts smallint not null default 0
);
alter table scene_private.message_push_queue enable row level security;

create function scene_private.queue_message_push()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  insert into scene_private.message_push_queue(message_id,recipient)
    select new.id, candidate.id
    from public.matches m
    cross join lateral (select case when m.user_a=new.sender_id then m.user_b else m.user_a end as id) candidate
    where m.id=new.match_id and exists (
      select 1 from public.scene_push_subscriptions s where s.user_id=candidate.id
    );
  return new;
end;
$$;
revoke execute on function scene_private.queue_message_push() from public,anon,authenticated;
create trigger scene_message_push after insert on public.messages
  for each row execute function scene_private.queue_message_push();

create function public.claim_scene_push()
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
      join public.matches m on m.id=msg.match_id
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
revoke execute on function public.claim_scene_push() from public,anon,authenticated;
grant execute on function public.claim_scene_push() to service_role;

create function public.finish_scene_push(job bigint)
returns void language sql security definer set search_path=''
as $$ delete from scene_private.message_push_queue where message_id=job; $$;
revoke execute on function public.finish_scene_push(bigint) from public,anon,authenticated;
grant execute on function public.finish_scene_push(bigint) to service_role;
