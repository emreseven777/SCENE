create table public.scene_preferences (
  user_id uuid primary key default auth.uid() references public.profiles(id) on delete cascade,
  show_seen boolean not null default true,
  show_presence boolean not null default true,
  blur_photos boolean not null default true,
  details jsonb not null default '{}' check (jsonb_typeof(details) = 'object' and octet_length(details::text) <= 5000),
  public_details boolean not null default false,
  instagram text check (instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  show_instagram boolean not null default false
);
alter table public.scene_preferences enable row level security;
grant select, insert, update on public.scene_preferences to authenticated;
create policy "Own preferences" on public.scene_preferences for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (select scene_private.profile_age(auth.uid())) is not null);

create function scene_private.visible_profile_details(person uuid)
returns table(details jsonb, instagram text) language sql stable security definer set search_path = ''
as $$
  select case when s.public_details or person = auth.uid() then s.details else '{}'::jsonb end,
    case when s.show_instagram or person = auth.uid() then s.instagram end
  from public.scene_preferences s
  where s.user_id = person and scene_private.unblocked(person) and scene_private.profile_listable(person)
    and scene_private.profile_age(auth.uid()) is not null;
$$;
revoke execute on function scene_private.visible_profile_details(uuid) from public, anon;
grant execute on function scene_private.visible_profile_details(uuid) to authenticated;
create function public.visible_profile_details(person uuid)
returns table(details jsonb, instagram text) language sql stable security invoker set search_path = ''
as $$ select * from scene_private.visible_profile_details(person); $$;
revoke execute on function public.visible_profile_details(uuid) from public, anon;
grant execute on function public.visible_profile_details(uuid) to authenticated;

create table public.scene_verification_requests (
  user_id uuid primary key default auth.uid() references public.profiles(id) on delete cascade,
  requested_at timestamptz not null default now(),
  state text not null default 'pending' check (state in ('pending','verified','rejected'))
);
alter table public.scene_verification_requests enable row level security;
grant select on public.scene_verification_requests to authenticated;
grant insert (user_id) on public.scene_verification_requests to authenticated;
create policy "Read own verification" on public.scene_verification_requests for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Request own verification" on public.scene_verification_requests for insert to authenticated
  with check (user_id = (select auth.uid()) and state = 'pending' and (select scene_private.profile_age(auth.uid())) is not null);

alter table public.messages
  add column media_path text,
  add column media_kind text check (media_kind in ('photo','audio')),
  add column reply_to bigint,
  add column deleted_at timestamptz,
  add column delivered_at timestamptz,
  add column seen_at timestamptz;

-- Clients may supply content, never server-owned delivery or deletion timestamps.
revoke insert, update on public.messages from authenticated;
grant insert (match_id,sender_id,body,media_path,media_kind,reply_to) on public.messages to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('scene-chat','scene-chat',false,8388608,array['image/jpeg','audio/webm','audio/mp4','audio/ogg','audio/mpeg','audio/aac']);
create function scene_private.chat_media_access(path text, publishing boolean)
returns boolean language sql stable security definer set search_path = ''
as $$
  select case when path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}[.](jpg|webm|m4a|ogg|mp3|aac)$'
    then exists (select 1 from public.matches m
      where m.id::text = split_part(path,'/',1) and scene_private.active_chat(m.id)
        and scene_private.profile_age(auth.uid()) is not null
        and (split_part(path,'/',2) = auth.uid()::text or (
          not publishing and exists (
            select 1 from public.messages msg where msg.match_id = m.id and msg.media_path = path and msg.deleted_at is null
          )
        )))
    else false end;
$$;
revoke execute on function scene_private.chat_media_access(text,boolean) from public, anon;
grant execute on function scene_private.chat_media_access(text,boolean) to authenticated;

create policy "Private chat files" on storage.objects for select to authenticated
  using (bucket_id='scene-chat' and scene_private.chat_media_access(name,false));
create policy "Upload to own chat folder" on storage.objects for insert to authenticated
  with check (bucket_id='scene-chat' and scene_private.chat_media_access(name,true)
    and split_part(name,'/',2)=(select auth.uid())::text);
create policy "Remove own detached chat file" on storage.objects for delete to authenticated
  using (bucket_id='scene-chat' and owner_id=(select auth.uid())::text
    and split_part(name,'/',2)=(select auth.uid())::text
    and not exists (select 1 from public.messages m where m.media_path = objects.name and m.deleted_at is null));

create function scene_private.check_message_content()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if (new.media_path is null) <> (new.media_kind is null) then
    raise exception 'Geçersiz mesaj eki.' using errcode='23514';
  end if;
  if new.media_path is not null and (
    not scene_private.chat_media_access(new.media_path,true)
    or split_part(new.media_path,'/',1) <> new.match_id::text
    or (new.media_kind = 'photo') <> (new.media_path like '%.jpg')
    or not exists (select 1 from storage.objects o where o.bucket_id='scene-chat' and o.name=new.media_path)
  ) then raise exception 'Geçersiz mesaj eki.' using errcode='23514'; end if;
  if new.reply_to is not null and not exists (
    select 1 from public.messages m where m.id = new.reply_to and m.match_id = new.match_id
  ) then raise exception 'Geçersiz yanıt.' using errcode='23514'; end if;
  return new;
end;
$$;
revoke execute on function scene_private.check_message_content() from public, anon, authenticated;
create trigger scene_message_content before insert on public.messages
  for each row execute function scene_private.check_message_content();
create unique index scene_message_media on public.messages(media_path) where media_path is not null;

create table public.scene_read_marks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  through_id bigint not null,
  primary key (user_id,match_id)
);
alter table public.scene_read_marks enable row level security;
grant select on public.scene_read_marks to authenticated;
create policy "Own read marks" on public.scene_read_marks for select to authenticated
  using (user_id=(select auth.uid()) and scene_private.active_chat(match_id));

create function scene_private.ack_scene_messages(chat uuid, through_message bigint, mark_seen boolean)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  viewer uuid := auth.uid();
  shown boolean := coalesce((select show_seen from public.scene_preferences where user_id=viewer),true);
begin
  if not scene_private.active_chat(chat) or scene_private.profile_age(viewer) is null then
    raise exception 'Sohbete erişim yok.' using errcode='42501';
  end if;
  if not exists (select 1 from public.messages where id=through_message and match_id=chat and sender_id<>viewer) then return; end if;
  update public.messages set delivered_at=coalesce(delivered_at,statement_timestamp()),
    seen_at=case when mark_seen and shown then coalesce(seen_at,statement_timestamp()) else seen_at end
  where match_id=chat and sender_id<>viewer and id<=through_message and deleted_at is null
    and (delivered_at is null or (mark_seen and shown and seen_at is null));
  if mark_seen then
    insert into public.scene_read_marks as marks values(viewer,chat,through_message)
    on conflict(user_id,match_id) do update set through_id=greatest(marks.through_id,excluded.through_id);
  end if;
end;
$$;
revoke execute on function scene_private.ack_scene_messages(uuid,bigint,boolean) from public, anon;
grant execute on function scene_private.ack_scene_messages(uuid,bigint,boolean) to authenticated;
create function public.ack_scene_messages(chat uuid,through_message bigint,mark_seen boolean)
returns void language sql security invoker set search_path='' as $$ select scene_private.ack_scene_messages(chat,through_message,mark_seen); $$;
revoke execute on function public.ack_scene_messages(uuid,bigint,boolean) from public, anon;
grant execute on function public.ack_scene_messages(uuid,bigint,boolean) to authenticated;

create function scene_private.remove_scene_message(message bigint)
returns text language plpgsql security definer set search_path=''
as $$
declare detached text;
begin
  select media_path into detached from public.messages
    where id=message and sender_id=auth.uid() and scene_private.active_chat(match_id) and deleted_at is null
    for update;
  if not found then raise exception 'Mesaj silinemedi.' using errcode='42501'; end if;
  update public.messages set body='Mesaj silindi.',media_kind=null,media_path=null,deleted_at=statement_timestamp()
    where id=message;
  return detached;
end;
$$;
revoke execute on function scene_private.remove_scene_message(bigint) from public, anon;
grant execute on function scene_private.remove_scene_message(bigint) to authenticated;
create function public.remove_scene_message(message bigint)
returns text language sql security invoker set search_path='' as $$ select scene_private.remove_scene_message(message); $$;
revoke execute on function public.remove_scene_message(bigint) from public, anon;
grant execute on function public.remove_scene_message(bigint) to authenticated;

create table public.scene_reactions (
  message_id bigint not null references public.messages(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  emoji text not null check (emoji in ('❤️','😂','👍','😮')),
  primary key(message_id,user_id)
);
alter table public.scene_reactions enable row level security;
grant select,insert,update,delete on public.scene_reactions to authenticated;
create policy "Chat reaction readers" on public.scene_reactions for select to authenticated
  using (exists (select 1 from public.messages m where m.id=message_id and m.deleted_at is null));
create policy "Chat reaction owner" on public.scene_reactions for all to authenticated
  using (user_id=(select auth.uid()) and exists (select 1 from public.messages m where m.id=message_id and m.deleted_at is null))
  with check (user_id=(select auth.uid()) and exists (select 1 from public.messages m where m.id=message_id and m.deleted_at is null));

create table public.scene_signals (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  scope text not null check (scope='presence' or scope ~ '^[0-9a-f-]{36}$'),
  updated_at timestamptz not null default now(),
  primary key(user_id,scope)
);
alter table public.scene_signals enable row level security;
grant select,insert,update on public.scene_signals to authenticated;
create function scene_private.visible_signal(owner uuid, signal_scope text)
returns boolean language sql stable security definer set search_path=''
as $$
  select owner=auth.uid() or (scene_private.profile_age(auth.uid()) is not null and
    case when signal_scope='presence' then
      coalesce((select show_presence from public.scene_preferences where user_id=owner),true)
      and exists (select 1 from public.matches m where auth.uid() in (m.user_a,m.user_b) and owner in (m.user_a,m.user_b) and scene_private.active_chat(m.id))
    else exists (select 1 from public.matches m where m.id::text=signal_scope and scene_private.active_chat(m.id)) end);
$$;
revoke execute on function scene_private.visible_signal(uuid,text) from public, anon;
grant execute on function scene_private.visible_signal(uuid,text) to authenticated;
create policy "Visible chat signals" on public.scene_signals for select to authenticated using (scene_private.visible_signal(user_id,scope));
create policy "Own chat signals" on public.scene_signals for all to authenticated
  using (user_id=(select auth.uid()))
  with check (user_id=(select auth.uid()) and scene_private.profile_age(auth.uid()) is not null
    and (scope='presence' or exists(select 1 from public.matches m where m.id::text=scope and scene_private.active_chat(m.id))));
create function scene_private.stamp_signal() returns trigger language plpgsql set search_path=''
as $$ begin new.updated_at := statement_timestamp(); return new; end; $$;
revoke execute on function scene_private.stamp_signal() from public,anon,authenticated;
create trigger scene_signal_clock before insert or update on public.scene_signals for each row execute function scene_private.stamp_signal();

create table public.scene_film_dates (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  starts_at timestamptz not null,
  created_at timestamptz not null default now(),
  state text not null default 'pending' check (state in ('pending','accepted','declined'))
);
alter table public.scene_film_dates enable row level security;
grant select on public.scene_film_dates to authenticated;
revoke insert,update on public.scene_film_dates from authenticated;
grant insert(match_id,title,starts_at),update(state) on public.scene_film_dates to authenticated;
create policy "Chat film dates" on public.scene_film_dates for select to authenticated
  using (scene_private.active_chat(match_id) and (select scene_private.profile_age(auth.uid())) is not null);
create policy "Offer chat film date" on public.scene_film_dates for insert to authenticated
  with check (sender_id=(select auth.uid()) and scene_private.active_chat(match_id)
    and (select scene_private.profile_age(auth.uid())) is not null and starts_at>now() and state='pending');
create policy "Respond to film date" on public.scene_film_dates for update to authenticated
  using (sender_id<>(select auth.uid()) and scene_private.active_chat(match_id) and starts_at>now() and state='pending')
  with check (sender_id<>(select auth.uid()) and scene_private.active_chat(match_id) and state in ('accepted','declined'));
create trigger scene_limit_film_dates before insert on public.scene_film_dates for each row execute function scene_private.limit_action('4');

do $$
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table public.scene_reactions,public.scene_signals,public.scene_film_dates,public.likes;
  end if;
end;
$$;

-- The deletion function can enumerate only objects belonging to the authenticated
-- account selected by the server. Normal clients cannot execute this helper.
create function public.scene_owned_files(account uuid)
returns table(bucket text, path text)
language sql stable security invoker set search_path=''
as $$
  select bucket_id,name from storage.objects where owner_id=account::text
    and bucket_id in ('scene-avatars','scene-chat')
  order by bucket_id,name limit 100;
$$;
revoke execute on function public.scene_owned_files(uuid) from public, anon, authenticated;
grant execute on function public.scene_owned_files(uuid) to service_role;

create function scene_private.require_dating_fields()
returns trigger language plpgsql set search_path=''
as $$
begin
  if ((new.onboarded and not old.onboarded)
     or old.gender is not null or new.gender is not null
     or old.looking_for is not null or new.looking_for is not null
     or old.dating_goal is not null or new.dating_goal is not null) and (
    btrim(new.name) = '' or new.gender is null or new.looking_for is null or new.dating_goal is null
  ) then raise exception 'Tanışma tercihlerini ve adını tamamla.' using errcode='23514'; end if;
  return new;
end;
$$;
revoke execute on function scene_private.require_dating_fields() from public,anon,authenticated;
create trigger scene_dating_fields before update of name,onboarded,gender,looking_for,dating_goal on public.profiles
  for each row execute function scene_private.require_dating_fields();
