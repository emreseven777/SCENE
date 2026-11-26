begin;
insert into auth.users(id,email,raw_user_meta_data)
select ('97000000-0000-0000-0000-00000000000'||n)::uuid, 'movia97-'||n||'@example.invalid',
  '{"name":"Fixture","scene_registration":{"birth_date":"1996-01-01","terms_accepted":true,"version":"8.3-draft.1"}}'
from generate_series(1,4) n;
update public.profiles set city='İstanbul',gender='woman',looking_for='everyone',dating_goal='friends',onboarded=true
where id::text like '97000000-%';
insert into public.favorites(user_id,title_id) values
 ('97000000-0000-0000-0000-000000000001','inception'),
 ('97000000-0000-0000-0000-000000000002','inception'),
 ('97000000-0000-0000-0000-000000000002','tmdb-movie-27205'),
 ('97000000-0000-0000-0000-000000000001','movia97-isolated-ranking-fixture'),
 ('97000000-0000-0000-0000-000000000002','movia97-isolated-ranking-fixture');
update public.profiles set discovery_hidden=true where id='97000000-0000-0000-0000-000000000004';

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"97000000-0000-0000-0000-000000000001"}',true);
do $$
declare first_id uuid; first_score integer;
begin
  select profile_id,shared_favorites into strict first_id,first_score from public.scene_discover_candidates(1);
  if first_id<>'97000000-0000-0000-0000-000000000002' or first_score<>2 then
    raise exception 'Equivalent catalog IDs should count once and rank first';
  end if;
  if exists (select 1 from public.scene_discover_candidates(50,first_score,first_id)
    where profile_id in (first_id,'97000000-0000-0000-0000-000000000004')) then
    raise exception 'Duplicate or hidden profile appeared after cursor';
  end if;
  if not exists (select 1 from public.scene_discover_candidates(50,first_score,first_id)
    where profile_id='97000000-0000-0000-0000-000000000003') then
    raise exception 'Second eligible test candidate missing';
  end if;
  if has_column_privilege(current_user,'public.profiles','created_at','UPDATE')
    or not has_column_privilege(current_user,'public.profiles','avatar_paths','UPDATE') then
    raise exception 'Unexpected profile write permissions';
  end if;
end;
$$;
insert into public.passes(passed_id) values ('97000000-0000-0000-0000-000000000002');
insert into public.scene_blocks(blocked_id) values ('97000000-0000-0000-0000-000000000003');
do $$
begin
  if exists(select 1 from public.scene_discover_candidates(50)
    where profile_id::text like '97000000-%') then
    raise exception 'Passed or blocked fixture appeared in discovery';
  end if;
  if has_function_privilege('anon','public.scene_discover_candidates(integer,integer,uuid)','EXECUTE') then
    raise exception 'Anonymous discovery access';
  end if;
end;
$$;
rollback;
