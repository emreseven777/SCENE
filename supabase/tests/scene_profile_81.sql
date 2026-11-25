-- Run as postgres against a disposable SCENE database. Fixtures roll back.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
  ('81000000-0000-0000-0000-000000000001','scene-81-a@example.invalid','{"name":"Profil A"}'),
  ('81000000-0000-0000-0000-000000000002','scene-81-b@example.invalid','{"name":"Profil B"}');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"81000000-0000-0000-0000-000000000001"}',true);
select public.complete_profile_identity('1994-01-19','İstanbul');
insert into public.scene_preferences(user_id,details) values (
  auth.uid(),'{"height":"130","education":"Üniversite mezunu","sign":"automatic","occupation":"yazilimci",
  "genres":["Dram","Dram","Bilim Kurgu"],"interests":["sinema","yoga"],"smoking":"undisclosed",
  "movie":{"id":"tmdb-movie-2","name":"Bir film","year":2022},"children":"wants_children"}'
);
do $$
declare details jsonb;
begin
  select s.details into details from public.scene_preferences s where user_id=auth.uid();
  if details->>'education' <> 'bachelors' or details->>'occupation' <> 'Yazılım geliştirici'
     or jsonb_array_length(details->'genres')<>2 or not (details->'interests' ? 'Film ve dizi') then
    raise exception 'Option normalization failed: %',details;
  end if;
  if (select v.details->>'sign' from public.visible_profile_details(auth.uid()) v) is distinct from 'Oğlak' then
    raise exception 'Automatic zodiac failed';
  end if;
  begin
    update public.scene_preferences s set details=jsonb_set(s.details,'{height}','"241"') where user_id=auth.uid();
    raise exception 'Out of range height accepted';
  exception when check_violation then null;
  end;
  begin
    update public.scene_preferences s set details=jsonb_set(s.details,'{education}','"unknown"') where user_id=auth.uid();
    raise exception 'Unknown education accepted';
  exception when check_violation then null;
  end;
  begin
    update public.scene_preferences s set details=jsonb_set(s.details,'{director}','{"id":"tmdb-tv-1","name":"Wrong type"}') where user_id=auth.uid();
    raise exception 'Wrong TMDB type accepted';
  exception when check_violation then null;
  end;
  begin
    update public.scene_preferences s set details=jsonb_set(s.details,'{genres}','["Invented"]') where user_id=auth.uid();
    raise exception 'Unknown genre accepted';
  exception when check_violation then null;
  end;
  begin
    perform birth_date from scene_private.profile_birth_dates;
    raise exception 'Birth date readable by signed-in client';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claims','{"sub":"81000000-0000-0000-0000-000000000002"}',true);
select public.complete_profile_identity('1995-02-01','İzmir');
do $$
begin
  if (select discovery_details from public.scene_profiles where id='81000000-0000-0000-0000-000000000001') is distinct from '{}'::jsonb then
    raise exception 'Private preferences leaked through discovery';
  end if;
  if (select details from public.visible_profile_details('81000000-0000-0000-0000-000000000001')) is distinct from '{}'::jsonb then
    raise exception 'Private zodiac leaked through profile';
  end if;
end;
$$;

select set_config('request.jwt.claims','{"sub":"81000000-0000-0000-0000-000000000001"}',true);
update public.scene_preferences set public_details=true where user_id=auth.uid();
select set_config('request.jwt.claims','{"sub":"81000000-0000-0000-0000-000000000002"}',true);
do $$
declare profile jsonb;
begin
  select discovery_details into profile from public.scene_profiles where id='81000000-0000-0000-0000-000000000001';
  if profile->>'height' is distinct from '130' or profile ? 'smoking' or profile ? 'sign' or profile ? 'birth_date' then
    raise exception 'Discovery details exposed unexpected fields: %',profile;
  end if;
  if (select details->>'sign' from public.visible_profile_details('81000000-0000-0000-0000-000000000001')) is distinct from 'Oğlak' then
    raise exception 'Opted-in zodiac not visible';
  end if;
end;
$$;
rollback;
