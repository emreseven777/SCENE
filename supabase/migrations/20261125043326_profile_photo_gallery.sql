alter table public.profiles
  add column if not exists avatar_paths text[] not null default '{}'::text[]
  check (cardinality(avatar_paths) <= 6);

-- Retain existing object paths and make each existing photo the first slide.
update public.profiles
set avatar_paths = array[avatar_path]
where avatar_path is not null and cardinality(avatar_paths) = 0;

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
      '^' || owner_id::text || '/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}[.]jpg$'
    ) then
      raise exception 'Invalid profile photo path' using errcode = '23514';
    end if;
    seen := array_append(seen, photo);
  end loop;
  new.avatar_path := new.avatar_paths[1];
  return new;
end;
$$;

drop trigger if exists profiles_sync_photo_gallery on public.profiles;
create trigger profiles_sync_photo_gallery
  before insert or update of avatar_path, avatar_paths on public.profiles
  for each row execute function public.sync_profile_photo_gallery();
revoke execute on function public.sync_profile_photo_gallery() from public, anon, authenticated;

-- Keep the bucket private and the existing upload restrictions. Signed-in
-- viewers can read gallery photos. Uploads outside the gallery stay owner-only.
drop policy if exists "scene avatars read" on storage.objects;
create policy "scene avatars read" on storage.objects for select to authenticated
  using (bucket_id = 'scene-avatars' and (
    owner_id = (select auth.uid())::text or exists (
      select 1 from public.profiles p
      where p.id::text = split_part(objects.name, '/', 1)
        and objects.name = any(p.avatar_paths)
    )
  ));

drop policy if exists "scene avatars delete own unused" on storage.objects;
create policy "scene avatars delete own unused" on storage.objects for delete to authenticated
  using (
    bucket_id = 'scene-avatars' and owner_id = (select auth.uid())::text
    and split_part(name, '/', 1) = (select auth.uid())::text
    and not exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and objects.name = any(p.avatar_paths)
    )
  );
