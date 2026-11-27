-- Increase the private avatar bucket limit to match private chat.
update storage.buckets
set file_size_limit = 8388608,
    allowed_mime_types = case when 'image/png' = any(allowed_mime_types)
      then allowed_mime_types else array_append(allowed_mime_types, 'image/png') end
where id = 'scene-avatars';

alter table public.profiles drop constraint profiles_check,
  add constraint profiles_check check (avatar_path is null or avatar_path ~ (
    '^' || id::text || '/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}[.](jpg|webp|png)$'
  ));

alter policy "scene avatars upload own" on storage.objects with check (
  bucket_id = 'scene-avatars' and name ~ (
    '^' || (select auth.uid())::text || '/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}[.](jpg|webp|png)$'
  )
);

-- Only the owner can create a thumbnail and only for the HD path format.
create policy "scene avatar thumbnails upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'scene-avatars' and name ~ (
    '^' || (select auth.uid())::text ||
    '/[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|webp|png)[.]thumb[.]webp$'
  ));

-- Thumbnail access is governed by the exact profile visibility rules of its source.
create policy "scene avatar thumbnails read" on storage.objects for select to authenticated
  using (bucket_id = 'scene-avatars'
    and name ~ '/[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|webp|png)[.]thumb[.]webp$'
    and scene_private.can_read_profile_photo(left(name, -11)));

alter policy "scene avatars delete own unused" on storage.objects
  using (
    bucket_id = 'scene-avatars' and owner_id = (select auth.uid())::text
    and split_part(name, '/', 1) = (select auth.uid())::text
    and not exists (
      select 1 from public.profiles p where p.id = (select auth.uid())
        and regexp_replace(objects.name, '[.]thumb[.]webp$', '') = any(p.avatar_paths)
    )
  );

create or replace function public.sync_profile_photo_gallery()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  photo text;
  owner_id uuid := new.id;
  seen text[] := '{}'::text[];
begin
  if tg_op = 'UPDATE' then
    owner_id := old.id;
    -- Older clients update only avatar_path. Keep the remaining slides.
    if new.avatar_paths is not distinct from old.avatar_paths
       and new.avatar_path is distinct from old.avatar_path then
      new.avatar_paths := coalesce(old.avatar_paths[2:6], '{}'::text[]);
      if new.avatar_path is not null then
        new.avatar_paths := array_prepend(new.avatar_path, array_remove(new.avatar_paths, new.avatar_path));
      end if;
    end if;
  elsif new.avatar_paths = '{}'::text[] and new.avatar_path is not null then
    new.avatar_paths := array[new.avatar_path];
  end if;

  if new.avatar_paths is null or cardinality(new.avatar_paths) > 6
     or (cardinality(new.avatar_paths) > 0 and
         (array_ndims(new.avatar_paths) <> 1 or array_lower(new.avatar_paths, 1) <> 1)) then
    raise exception 'Invalid profile gallery' using errcode = '23514';
  end if;

  foreach photo in array new.avatar_paths loop
    if photo is null or photo = any(seen) or photo !~ (
      '^' || owner_id::text || '/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}[.](jpg|webp|png)$'
    ) then
      raise exception 'Invalid profile photo path' using errcode = '23514';
    end if;
    seen := array_append(seen, photo);
  end loop;
  new.avatar_path := new.avatar_paths[1];
  return new;
end;
$$;
