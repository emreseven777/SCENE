-- The previous policy read the raw profiles table, which now hides non-matches.
-- Check only eligibility here so first likes work while raw profile data stays private.
create function scene_private.discovery_like_target(other uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select auth.uid() is not null and scene_private.unblocked(other) and exists (
    select 1 from public.profiles p
    where p.id=other and p.onboarded and not p.discovery_hidden
  );
$$;
revoke execute on function scene_private.discovery_like_target(uuid) from public,anon;
grant execute on function scene_private.discovery_like_target(uuid) to authenticated;

alter policy "Unblocked new likes" on public.likes
  with check (scene_private.discovery_like_target(liked_id));
