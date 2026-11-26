-- Keep existing discovery clients on the same view while separating private profile fields.
create function scene_private.can_read_full_profile(person uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select auth.uid() is not null and (
    person=auth.uid() or (
      scene_private.profile_age(auth.uid()) is not null
      and scene_private.unblocked(person)
      and exists (
        select 1 from public.matches
        where user_a=least(auth.uid(),person) and user_b=greatest(auth.uid(),person)
          and ended_at is null
      )
    )
  );
$$;
revoke execute on function scene_private.can_read_full_profile(uuid) from public,anon;
grant execute on function scene_private.can_read_full_profile(uuid) to authenticated;

create policy "Full profiles require an active match"
  on public.profiles as restrictive for select to authenticated
  using (scene_private.can_read_full_profile(id));

create function scene_private.read_discovery_profiles()
returns table(id uuid, name text, city text, bio text, scene text, onboarded boolean,
  avatar_path text, avatar_paths text[], age integer, gender text, looking_for text, dating_goal text,
  discovery_hidden boolean, account_hidden boolean, discovery_details jsonb, verified_photo boolean)
language sql stable security definer set search_path=''
as $$
  select p.id,p.name,p.city,
    case when access.full_profile then p.bio else '' end,
    case when access.full_profile then p.scene else '' end,
    p.onboarded,p.avatar_path,
    case when access.full_profile then p.avatar_paths
      when p.avatar_path is not null then array[p.avatar_path] else '{}'::text[] end,
    scene_private.profile_age(p.id),p.gender,p.looking_for,p.dating_goal,
    p.discovery_hidden,p.account_hidden,
    scene_private.profile_81_discovery(p.id),scene_private.has_verified_photo(p.id)
  from public.profiles p
  cross join lateral (select scene_private.can_read_full_profile(p.id) as full_profile) access
  where auth.uid() is not null and (
    p.id=auth.uid() or (
      scene_private.profile_age(auth.uid()) is not null
      and scene_private.unblocked(p.id)
      and scene_private.profile_listable(p.id)
    )
  );
$$;
revoke execute on function scene_private.read_discovery_profiles() from public,anon;
grant execute on function scene_private.read_discovery_profiles() to authenticated;

create or replace view public.scene_profiles with (security_invoker=true) as
select * from scene_private.read_discovery_profiles();

create or replace function scene_private.visible_profile_details(person uuid)
returns table(details jsonb, instagram text) language sql stable security definer set search_path=''
as $$
  select
    case when s.public_details or p.id=auth.uid() then
      (coalesce(s.details,'{}'::jsonb)-'sign')
      || case when p.id=auth.uid()
            or (s.public_details and s.details->>'sign'='automatic')
         then jsonb_strip_nulls(jsonb_build_object('sign',scene_private.zodiac_for_date(b.birth_date)))
         else '{}'::jsonb end
    else '{}'::jsonb end,
    case when s.show_instagram or p.id=auth.uid() then s.instagram end
  from public.profiles p
  left join public.scene_preferences s on s.user_id=p.id
  left join scene_private.profile_birth_dates b on b.user_id=p.id
  where p.id=person and scene_private.can_read_full_profile(person)
    and scene_private.profile_age(auth.uid()) is not null;
$$;

create function scene_private.can_read_profile_photo(object_name text)
returns boolean language sql stable security definer set search_path=''
as $$
  select auth.uid() is not null and scene_private.profile_age(auth.uid()) is not null and exists (
    select 1 from public.profiles p
    where p.id::text=split_part(object_name,'/',1)
      and scene_private.unblocked(p.id)
      and scene_private.profile_listable(p.id)
      and (object_name=p.avatar_path or (
        scene_private.can_read_full_profile(p.id) and object_name=any(p.avatar_paths)
      ))
  );
$$;
revoke execute on function scene_private.can_read_profile_photo(text) from public,anon;
grant execute on function scene_private.can_read_profile_photo(text) to authenticated;

alter policy "scene avatars read" on storage.objects
  using (bucket_id='scene-avatars' and (
    owner_id=(select auth.uid())::text or scene_private.can_read_profile_photo(name)
  ));
