-- Voice uses the existing private media bucket so export, backups and deletion retain coverage.
create table public.scene_profile_voice (
  user_id uuid primary key default auth.uid() references public.profiles(id) on delete cascade,
  prompt smallint not null check (prompt between 1 and 3),
  object_path text not null unique,
  check (object_path ~ ('^profile-voice/'||user_id::text||'/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}[.](webm|m4a|ogg)$'))
);
alter table public.scene_profile_voice enable row level security;
revoke all on public.scene_profile_voice from public,anon,authenticated;
grant select,delete on public.scene_profile_voice to authenticated;
grant insert (prompt,object_path),update (prompt,object_path) on public.scene_profile_voice to authenticated;

create policy "Owner and active matches can read voice prompts" on public.scene_profile_voice
  for select to authenticated using (scene_private.can_read_full_profile(user_id));
create policy "Owner may remove voice prompt" on public.scene_profile_voice
  for delete to authenticated using (user_id=(select auth.uid()));
create function scene_private.owns_profile_voice_object(path text)
returns boolean language sql stable security definer set search_path=''
as $$
  select auth.uid() is not null and exists (
    select 1 from storage.objects where bucket_id='scene-chat' and name=path
      and owner_id=auth.uid()::text and name like 'profile-voice/%'
  );
$$;
revoke execute on function scene_private.owns_profile_voice_object(text) from public,anon;
grant execute on function scene_private.owns_profile_voice_object(text) to authenticated;

create policy "Owner may publish voice prompt" on public.scene_profile_voice
  for insert to authenticated with check (
    user_id=(select auth.uid()) and scene_private.account_active(user_id)
    and scene_private.profile_age(user_id) is not null
    and scene_private.owns_profile_voice_object(object_path)
  );
create policy "Owner may replace voice prompt" on public.scene_profile_voice
  for update to authenticated using (user_id=(select auth.uid())) with check (
    user_id=(select auth.uid()) and scene_private.account_active(user_id)
    and scene_private.profile_age(user_id) is not null
    and scene_private.owns_profile_voice_object(object_path)
  );

create function scene_private.can_upload_profile_voice()
returns boolean language plpgsql volatile security definer set search_path=''
as $$
declare viewer uuid := auth.uid();
begin
  if viewer is null or not scene_private.account_active(viewer)
    or scene_private.profile_age(viewer) is null then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended('movia-profile-voice:'||viewer::text,0));
  return (select count(*) from storage.objects where bucket_id='scene-chat'
    and owner_id=viewer::text and name like 'profile-voice/%') < 4;
end;
$$;
revoke execute on function scene_private.can_upload_profile_voice() from public,anon;
grant execute on function scene_private.can_upload_profile_voice() to authenticated;

create policy "Members upload their own voice prompt" on storage.objects for insert to authenticated
  with check (bucket_id='scene-chat'
    and name ~ ('^profile-voice/'||auth.uid()::text||'/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}[.](webm|m4a|ogg)$')
    and scene_private.can_upload_profile_voice());

create policy "Owner and matched members read voice media" on storage.objects for select to authenticated
  using (bucket_id='scene-chat' and name like 'profile-voice/%' and (
    owner_id=(select auth.uid())::text or exists (
      select 1 from public.scene_profile_voice v where v.object_path=name and v.user_id::text=owner_id
    )
  ));
create policy "Published voice prompts cannot be deleted by ordinary media removal"
  on storage.objects as restrictive for delete to authenticated
  using (bucket_id<>'scene-chat' or name not like 'profile-voice/%'
    or not exists (select 1 from public.scene_profile_voice v where v.object_path=name));
