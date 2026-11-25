create table public.scene_room_posts (
  id uuid primary key default gen_random_uuid(),
  room text not null check (room in ('drama','comedy','science-fiction','horror','animation')),
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  spoiler boolean not null default false,
  created_at timestamptz not null default now(),
  removed_at timestamptz
);
alter table public.scene_room_posts enable row level security;
create index scene_room_posts_recent on public.scene_room_posts(room,created_at desc,id) where removed_at is null;
grant select on public.scene_room_posts to authenticated;
grant insert(room,body,spoiler) on public.scene_room_posts to authenticated;
create policy "Read visible room posts" on public.scene_room_posts for select to authenticated
  using (removed_at is null and scene_private.profile_age(auth.uid()) is not null
    and scene_private.account_active(auth.uid()) and scene_private.account_visible(auth.uid()) and scene_private.unblocked(author_id));
create policy "Post in a room" on public.scene_room_posts for insert to authenticated
  with check (author_id=auth.uid() and scene_private.profile_age(auth.uid()) is not null
    and scene_private.account_active(auth.uid()) and scene_private.account_visible(auth.uid()) and removed_at is null);
create trigger scene_limit_room_posts before insert on public.scene_room_posts
  for each row execute function scene_private.limit_action('12');
alter publication supabase_realtime add table public.scene_room_posts;

create function scene_private.hide_room_post(post uuid, explanation text)
returns void language plpgsql security definer set search_path=''
as $$
begin
  if not scene_private.is_administrator() then
    raise exception 'Yönetici yetkisi gerekli.' using errcode='42501';
  end if;
  if explanation is null or char_length(btrim(explanation)) not between 5 and 500 then
    raise exception '5–500 karakterlik bir karar gerekçesi gir.';
  end if;
  update public.scene_room_posts set removed_at=statement_timestamp() where id=post and removed_at is null;
  if not found then raise exception 'Gönderi bulunamadı veya daha önce kaldırıldı.'; end if;
  insert into scene_private.moderation_log(actor,action,target,reason)
  values(auth.uid(),'hide_room_post',post,btrim(explanation));
end;
$$;
create function public.scene_hide_room_post(post uuid, explanation text)
returns void language sql security invoker set search_path=''
as $$ select scene_private.hide_room_post(post,explanation); $$;
revoke execute on function scene_private.hide_room_post(uuid,text),public.scene_hide_room_post(uuid,text) from public,anon;
grant execute on function scene_private.hide_room_post(uuid,text),public.scene_hide_room_post(uuid,text) to authenticated;

create table public.scene_shared_watchlist (
  match_id uuid not null references public.matches(id) on delete cascade,
  title_id text not null check (title_id ~ '^[a-z0-9-]{1,64}$'),
  title text not null check (char_length(btrim(title)) between 1 and 300),
  added_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(match_id,title_id)
);
alter table public.scene_shared_watchlist enable row level security;
grant select,delete on public.scene_shared_watchlist to authenticated;
grant insert(match_id,title_id,title) on public.scene_shared_watchlist to authenticated;
create policy "Match can read shared watchlist" on public.scene_shared_watchlist for select to authenticated
  using (scene_private.profile_age(auth.uid()) is not null and scene_private.active_chat(match_id));
create policy "Match can add to shared watchlist" on public.scene_shared_watchlist for insert to authenticated
  with check (added_by=auth.uid() and scene_private.profile_age(auth.uid()) is not null and scene_private.active_chat(match_id));
create policy "Match can remove from shared watchlist" on public.scene_shared_watchlist for delete to authenticated
  using (scene_private.profile_age(auth.uid()) is not null and scene_private.active_chat(match_id));
create trigger scene_limit_shared_watchlist before insert on public.scene_shared_watchlist
  for each row execute function scene_private.limit_action('20');
alter publication supabase_realtime add table public.scene_shared_watchlist;

-- GIF attachments use the private image path and existing photo privacy controls.
update storage.buckets set allowed_mime_types=array_append(allowed_mime_types,'image/gif')
where id='scene-chat' and not ('image/gif'=any(allowed_mime_types));
create or replace function scene_private.chat_media_access(path text, publishing boolean)
returns boolean language sql stable security definer set search_path = ''
as $$
  select case when path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}[.](jpg|gif|webm|m4a|ogg|mp3|aac)$'
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
create or replace function scene_private.check_message_content()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if (new.media_path is null) <> (new.media_kind is null) then
    raise exception 'Geçersiz mesaj eki.' using errcode='23514';
  end if;
  if new.media_path is not null and (
    not scene_private.chat_media_access(new.media_path,true)
    or split_part(new.media_path,'/',1) <> new.match_id::text
    or (new.media_kind = 'photo') <> (new.media_path ~ '[.](jpg|gif)$')
    or not exists (select 1 from storage.objects o where o.bucket_id='scene-chat' and o.name=new.media_path)
  ) then raise exception 'Geçersiz mesaj eki.' using errcode='23514'; end if;
  if new.reply_to is not null and not exists (
    select 1 from public.messages m where m.id = new.reply_to and m.match_id = new.match_id
  ) then raise exception 'Geçersiz yanıt.' using errcode='23514'; end if;
  return new;
end;
$$;
