-- PostgreSQL assertions for SCENE 8.3. Fixtures are rolled back.
begin;
do $$
declare cutoff date := ((current_timestamp at time zone 'Europe/Istanbul')::date - interval '18 years')::date;
begin
  begin
    insert into auth.users(id,raw_app_meta_data,raw_user_meta_data)
    values ('83000000-0000-0000-0000-000000000009','{"provider":"email"}','{}');
    raise exception 'Signup without terms accepted';
  exception when check_violation then null;
  end;
  begin
    insert into auth.users(id,raw_app_meta_data,raw_user_meta_data)
    values ('83000000-0000-0000-0000-000000000009','{"provider":"email"}',
      jsonb_build_object('scene_registration',jsonb_build_object('birth_date',cutoff+1,'version','8.3-draft.1','terms_accepted',true)));
    raise exception 'Underage signup accepted';
  exception when check_violation then null;
  end;
  begin
    insert into auth.users(id,raw_app_meta_data,raw_user_meta_data)
    values ('83000000-0000-0000-0000-000000000009','{"provider":"email"}',
      jsonb_build_object('scene_registration',jsonb_build_object('birth_date',cutoff,'version','stale','terms_accepted',true)));
    raise exception 'Wrong terms version accepted';
  exception when check_violation then null;
  end;
  insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data)
  values ('83000000-0000-0000-0000-000000000001','scene-83-qa@example.invalid','{"provider":"email"}',
      jsonb_build_object('name','QA', 'scene_registration',jsonb_build_object('birth_date',cutoff-3,'version','8.3-draft.1','terms_accepted',true)));
  if exists (select 1 from auth.users where id='83000000-0000-0000-0000-000000000001' and raw_user_meta_data ? 'scene_registration') then
    raise exception 'Registration payload persisted in metadata';
  end if;
  -- GoTrue can write the original payload back while processing signup.
  update auth.users
  set raw_user_meta_data = raw_user_meta_data ||
    '{"name":"Updated QA","scene_registration":{"birth_date":"2000-01-01","terms_accepted":false}}'::jsonb
  where id='83000000-0000-0000-0000-000000000001';
  if not exists (select 1 from auth.users where id='83000000-0000-0000-0000-000000000001'
      and raw_user_meta_data->>'name'='Updated QA' and not (raw_user_meta_data ? 'scene_registration')) then
    raise exception 'Auth update did not scrub only the registration payload';
  end if;
  if not exists (select 1 from scene_private.registration_evidence where user_id='83000000-0000-0000-0000-000000000001'
        and terms_version='8.3-draft.1' and accepted_at is not null and pending_birth_date is null) then
    raise exception 'Signup evidence not recorded or date duplicated';
  end if;
  if (select birth_date from scene_private.profile_birth_dates where user_id='83000000-0000-0000-0000-000000000001') is distinct from cutoff-3 then
    raise exception 'Private birth date not recorded';
  end if;
end;
$$;
insert into auth.users(id,email,raw_user_meta_data) values
  ('83000000-0000-0000-0000-000000000002','scene-83-other@example.invalid','{"name":"Other"}'),
  ('83000000-0000-0000-0000-000000000003','scene-83-admin@example.invalid','{"name":"Admin"}');
insert into auth.identities(id,user_id,provider_id,provider,identity_data) values
  ('83000000-0000-0000-0000-000000000021','83000000-0000-0000-0000-000000000001',
   '83000000-0000-0000-0000-000000000001','email','{"scene_registration":{"birth_date":"1990-10-01"}}');
do $$
begin
  if exists (select 1 from auth.identities where id='83000000-0000-0000-0000-000000000021' and identity_data ? 'scene_registration') then
    raise exception 'Registration metadata persisted in the identity record';
  end if;
end;
$$;
insert into auth.sessions(id,user_id) values
  ('83000000-0000-0000-0000-000000000011','83000000-0000-0000-0000-000000000001'),
  ('83000000-0000-0000-0000-000000000012','83000000-0000-0000-0000-000000000002'),
  ('83000000-0000-0000-0000-000000000013','83000000-0000-0000-0000-000000000003');
insert into scene_private.administrators(user_id) values ('83000000-0000-0000-0000-000000000003');
set local role anon;
do $$
begin
  begin
    perform public.scene_privacy_settings();
    raise exception 'Anonymous privacy access permitted';
  exception when insufficient_privilege then null;
  end;
end;
$$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"83000000-0000-0000-0000-000000000001"}',true);
do $$
begin
  begin
    perform public.scene_privacy_export();
    raise exception 'Export accepted without a live session';
  exception when insufficient_privilege then null;
  end;
end;
$$;
select set_config('request.jwt.claims','{"sub":"83000000-0000-0000-0000-000000000001","session_id":"83000000-0000-0000-0000-000000000011"}',true);
do $$
begin
  if (public.scene_privacy_settings()->>'device_push')::boolean then raise exception 'Push preselected'; end if;
  begin
    insert into public.scene_push_subscriptions(endpoint,p256dh,auth_secret)
    values('https://fcm.googleapis.com/scene-83-test',repeat('a',87),repeat('a',22));
    raise exception 'Push accepted without consent';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.scene_privacy_inbox(0);
    raise exception 'Regular user read inbox';
  exception when insufficient_privilege then null;
  end;
  if public.scene_privacy_export() #>> '{account,email}' <> 'scene-83-qa@example.invalid'
    or public.scene_privacy_export()::text like '%scene-83-other@example.invalid%' then
    raise exception 'Export has wrong account';
  end if;
end;
$$;
select public.scene_privacy_request('access','Kişisel verilerime ilişkin test talebi');
select public.scene_device_push_consent(true,'8.3-draft.1');
insert into public.scene_push_subscriptions(endpoint,p256dh,auth_secret) values
  ('https://fcm.googleapis.com/scene-83-test',repeat('a',87),repeat('a',22)),
  ('https://fcm.googleapis.com/scene-83-second',repeat('a',87),repeat('a',22));
select public.scene_device_push_consent(false,'8.3-draft.1');
do $$
begin
  if (public.scene_privacy_settings()->>'device_push')::boolean
    or exists(select 1 from public.scene_push_subscriptions where user_id=auth.uid())
    or jsonb_array_length(public.scene_privacy_export()->'consents') <> 2 then
    raise exception 'Withdrawal evidence or device cleanup failed';
  end if;
end;
$$;
select set_config('request.jwt.claims','{"sub":"83000000-0000-0000-0000-000000000002","session_id":"83000000-0000-0000-0000-000000000012"}',true);
do $$
begin
  if jsonb_array_length(public.scene_privacy_settings()->'requests') <> 0 then
    raise exception 'Other member can see the request';
  end if;
end;
$$;
select set_config('request.jwt.claims','{"sub":"83000000-0000-0000-0000-000000000003","session_id":"83000000-0000-0000-0000-000000000013"}',true);
select public.scene_privacy_review((public.scene_privacy_inbox(0)->0->>'id')::uuid,'Test yanıtı güvenli kanala kaydedildi.');
select set_config('request.jwt.claims','{"sub":"83000000-0000-0000-0000-000000000001","session_id":"83000000-0000-0000-0000-000000000011"}',true);
do $$
begin
  if public.scene_privacy_settings() #>> '{requests,0,status}' <> 'resolved' or
    public.scene_privacy_settings() #>> '{requests,0,response}' <> 'Test yanıtı güvenli kanala kaydedildi.' then
    raise exception 'Request owner cannot see the answer';
  end if;
end;
$$;
rollback;
