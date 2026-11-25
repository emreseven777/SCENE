alter table public.favorites
  add column if not exists title_metadata jsonb
  check (title_metadata is null or (
    jsonb_typeof(title_metadata) = 'object' and octet_length(title_metadata::text) <= 16384
  ));

alter table public.profiles
  add column if not exists avatar_path text
  check (avatar_path is null or avatar_path ~ (
    '^' || id::text || '/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}[.]jpg$'
  ));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('scene-avatars', 'scene-avatars', false, 1048576, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "scene avatars read" on storage.objects;
create policy "scene avatars read" on storage.objects for select to authenticated
  using (bucket_id = 'scene-avatars' and (
    owner_id = (select auth.uid())::text or exists (
      select 1 from public.profiles p where p.id::text = split_part(objects.name, '/', 1) and p.avatar_path = objects.name
    )
  ));

drop policy if exists "scene avatars upload own" on storage.objects;
create policy "scene avatars upload own" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'scene-avatars' and name ~ (
      '^' || (select auth.uid())::text || '/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}[.]jpg$'
    )
  );

drop policy if exists "scene avatars delete own unused" on storage.objects;
create policy "scene avatars delete own unused" on storage.objects for delete to authenticated
  using (
    bucket_id = 'scene-avatars' and owner_id = (select auth.uid())::text
    and split_part(name, '/', 1) = (select auth.uid())::text
    and not exists (
      select 1 from public.profiles p where p.id = (select auth.uid()) and p.avatar_path = objects.name
    )
  );
