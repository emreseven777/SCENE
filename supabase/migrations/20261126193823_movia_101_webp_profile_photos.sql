-- Preserve existing objects and owner-only write access while allowing WebP uploads.
update storage.buckets
set allowed_mime_types = array_append(allowed_mime_types, 'image/webp')
where id = 'scene-avatars' and not ('image/webp' = any(allowed_mime_types));

alter table public.profiles drop constraint profiles_check,
  add constraint profiles_check check (avatar_path is null or avatar_path ~ (
    '^' || id::text || '/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}[.](jpg|webp)$'
  ));

alter policy "scene avatars upload own" on storage.objects with check (
  bucket_id = 'scene-avatars' and name ~ (
    '^' || (select auth.uid())::text || '/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}[.](jpg|webp)$'
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
      '^' || owner_id::text || '/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}[.](jpg|webp)$'
    ) then
      raise exception 'Invalid profile photo path' using errcode = '23514';
    end if;
    seen := array_append(seen, photo);
  end loop;
  new.avatar_path := new.avatar_paths[1];
  return new;
end;
$$;
