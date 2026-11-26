-- Apply viewer permissions to a bounded set of requested IDs before projecting private fields.
create function scene_private.read_discovery_profiles(profile_ids uuid[])
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
  where p.id = any(profile_ids) and cardinality(profile_ids) between 1 and 24
    and auth.uid() is not null and (
    p.id=auth.uid() or (
      scene_private.profile_age(auth.uid()) is not null
      and scene_private.unblocked(p.id)
      and scene_private.profile_listable(p.id)
    )
  );
$$;
revoke execute on function scene_private.read_discovery_profiles(uuid[]) from public,anon;
grant execute on function scene_private.read_discovery_profiles(uuid[]) to authenticated;

create function public.scene_profiles_for(profile_ids uuid[])
returns table(id uuid, name text, city text, bio text, scene text, onboarded boolean,
  avatar_path text, avatar_paths text[], age integer, gender text, looking_for text, dating_goal text,
  discovery_hidden boolean, account_hidden boolean, discovery_details jsonb, verified_photo boolean)
language sql stable security invoker set search_path=''
as $$
  select * from scene_private.read_discovery_profiles(profile_ids);
$$;
revoke execute on function public.scene_profiles_for(uuid[]) from public,anon;
grant execute on function public.scene_profiles_for(uuid[]) to authenticated;
