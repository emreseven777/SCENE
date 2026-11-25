alter function public.touch_profile() set search_path = '';

-- The policy helper delegates to the existing, caller-scoped private function.
alter function public.is_match_participant(uuid) security invoker;

-- Some hosted projects provide this DDL event-trigger helper.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
