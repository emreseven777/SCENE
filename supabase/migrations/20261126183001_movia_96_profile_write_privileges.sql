-- Preserve existing owner edits while keeping database-managed fields read-only.
revoke update on public.profiles from authenticated;
grant update (name,city,bio,scene,onboarded,avatar_path,avatar_paths,
  gender,looking_for,dating_goal,discovery_hidden,account_hidden)
on public.profiles to authenticated;
