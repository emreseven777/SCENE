-- Disposable PostgreSQL with all MOVIA migrations applied.
begin;
insert into auth.users(id,email,raw_user_meta_data)
values
 ('96000000-0000-0000-0000-000000000001','movia96-a@example.invalid','{"name":"Fixture A","scene_registration":{"birth_date":"1996-01-01","terms_accepted":true,"version":"8.3-draft.1"}}'),
 ('96000000-0000-0000-0000-000000000002','movia96-b@example.invalid','{"name":"Fixture B","scene_registration":{"birth_date":"1996-01-01","terms_accepted":true,"version":"8.3-draft.1"}}');
insert into storage.objects(bucket_id,name,owner_id) values
 ('scene-avatars','96000000-0000-0000-0000-000000000002/96000000-0000-0000-0000-000000000011.jpg','96000000-0000-0000-0000-000000000002'),
 ('scene-avatars','96000000-0000-0000-0000-000000000002/96000000-0000-0000-0000-000000000012.jpg','96000000-0000-0000-0000-000000000002');
update public.profiles set bio='Fixture biography',scene='Fixture scene', avatar_paths=array[
 '96000000-0000-0000-0000-000000000002/96000000-0000-0000-0000-000000000011.jpg',
 '96000000-0000-0000-0000-000000000002/96000000-0000-0000-0000-000000000012.jpg'
] where id='96000000-0000-0000-0000-000000000002';
insert into public.scene_preferences(user_id,show_instagram,instagram,public_details)
values ('96000000-0000-0000-0000-000000000002',true,'fixture_example',true);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"96000000-0000-0000-0000-000000000001"}',true);
do $$
declare
  subject constant uuid := '96000000-0000-0000-0000-000000000002';
begin
  if exists(select 1 from public.profiles where id=subject) then raise exception 'Raw profile leaked before match'; end if;
  if not exists(select 1 from public.scene_profiles where id=subject and bio='' and scene='' and cardinality(avatar_paths)=1 and avatar_path=avatar_paths[1]) then
    raise exception 'Discovery should return only the primary photo and masked profile text';
  end if;
  if exists(select 1 from public.visible_profile_details(subject)) then raise exception 'Profile details leaked before match'; end if;
  if (select count(*) from storage.objects where bucket_id='scene-avatars' and owner_id=subject::text) <> 1 then
    raise exception 'Exactly one discovery photo should be readable';
  end if;
end;
$$;

-- First likes must not depend on selecting the recipient's raw profile.
reset role;
update public.profiles set city='İstanbul',gender='woman',looking_for='everyone',dating_goal='friends',onboarded=true
where id::text like '96000000-%';
set local role authenticated;
insert into public.likes(liked_id) values ('96000000-0000-0000-0000-000000000002');

reset role;
insert into public.matches(user_a,user_b) values
 ('96000000-0000-0000-0000-000000000001','96000000-0000-0000-0000-000000000002');
set local role authenticated;
do $$
declare subject constant uuid := '96000000-0000-0000-0000-000000000002';
begin
  if not exists(select 1 from public.profiles where id=subject and bio='Fixture biography') then raise exception 'Matched profile missing'; end if;
  if not exists(select 1 from public.scene_profiles where id=subject and cardinality(avatar_paths)=2) then raise exception 'Matched gallery missing'; end if;
  if not exists(select 1 from public.visible_profile_details(subject) where instagram='fixture_example') then raise exception 'Opted-in matched details missing'; end if;
  if (select count(*) from storage.objects where bucket_id='scene-avatars' and owner_id=subject::text) <> 2 then raise exception 'Matched gallery access missing'; end if;
end;
$$;

insert into public.scene_blocks(blocked_id) values ('96000000-0000-0000-0000-000000000002');
do $$
declare subject constant uuid := '96000000-0000-0000-0000-000000000002';
begin
  if exists(select 1 from public.scene_profiles where id=subject)
    or exists(select 1 from public.visible_profile_details(subject))
    or exists(select 1 from storage.objects where bucket_id='scene-avatars' and owner_id=subject::text) then
    raise exception 'Blocked profile or photos still accessible';
  end if;
  if has_function_privilege('anon','scene_private.read_discovery_profiles()','EXECUTE') then raise exception 'Anonymous discovery access'; end if;
end;
$$;

select set_config('request.jwt.claims','{"sub":"96000000-0000-0000-0000-000000000002"}',true);
update public.profiles set bio='Owner update allowed' where id=auth.uid();
do $$
begin
  if not exists(select 1 from public.scene_profiles where id=auth.uid() and bio='Owner update allowed' and cardinality(avatar_paths)=2) then
    raise exception 'Owner editing or gallery access regressed';
  end if;
end;
$$;
rollback;
