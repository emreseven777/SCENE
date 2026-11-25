-- Run as postgres against a disposable SCENE database. Fixtures roll back.
begin;
insert into auth.users(id, email, raw_user_meta_data)
values ('39000000-0000-0000-0000-000000000001','scene-test-a@example.invalid','{"name":"SCENE test A"}'),
       ('39000000-0000-0000-0000-000000000002','scene-test-b@example.invalid','{"name":"SCENE test B"}'),
       ('39000000-0000-0000-0000-000000000003','scene-test-c@example.invalid','{"name":"SCENE test C"}');
insert into auth.sessions(id,user_id)
values ('39000000-0000-0000-0000-000000000011','39000000-0000-0000-0000-000000000001');
insert into scene_private.administrators values ('39000000-0000-0000-0000-000000000001');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"39000000-0000-0000-0000-000000000001","session_id":"39000000-0000-0000-0000-000000000011"}',true);
do $$
begin
  if not public.scene_admin_access() then raise exception 'Administrator denied'; end if;
  begin
    perform public.complete_profile_identity((current_date-interval '17 years')::date,'İstanbul');
    raise exception 'Underage identity accepted';
  exception when check_violation then null;
  end;
end;
$$;
select public.complete_profile_identity((current_date-interval '24 years')::date,'İstanbul');
update public.profiles set gender='woman',looking_for='everyone',dating_goal='friends',onboarded=true
where id=auth.uid();

select set_config('request.jwt.claims','{"sub":"39000000-0000-0000-0000-000000000002","app_metadata":{"role":"admin"}}',true);
do $$
begin
  if public.scene_admin_access() then raise exception 'Unexpected administrator access'; end if;
  begin
    perform public.scene_moderation_queue('users',0);
    raise exception 'Moderation list accessed by regular account';
  exception when insufficient_privilege then null;
  end;
end;
$$;
select public.complete_profile_identity((current_date-interval '24 years')::date,'İstanbul');
update public.profiles set gender='man',looking_for='everyone',dating_goal='friends',onboarded=true
where id=auth.uid();
insert into public.likes(liked_id) values ('39000000-0000-0000-0000-000000000001');
insert into public.scene_verification_requests(user_id) values (auth.uid());
insert into public.scene_room_posts(room,body,spoiler) values ('drama','Test spoiler',true);

select set_config('request.jwt.claims','{"sub":"39000000-0000-0000-0000-000000000001","session_id":"39000000-0000-0000-0000-000000000011"}',true);
insert into public.likes(liked_id) values ('39000000-0000-0000-0000-000000000002');
do $$
declare chat uuid;
begin
  select id into strict chat from public.matches;
  insert into storage.objects(bucket_id,name,owner_id)
    values ('scene-chat',chat::text||'/'||auth.uid()::text||'/39000000-0000-0000-0000-000000000021.gif',auth.uid()::text);
  insert into public.messages(match_id,body,media_path,media_kind)
    values (chat,'Test message',chat::text||'/'||auth.uid()::text||'/39000000-0000-0000-0000-000000000021.gif','photo');
  insert into public.scene_shared_watchlist(match_id,title_id,title) values (chat,'inception','Başlangıç');
end;
$$;

select set_config('request.jwt.claims','{"sub":"39000000-0000-0000-0000-000000000002"}',true);
do $$
begin
  if not exists (select 1 from public.messages where body='Test message') then raise exception 'Message hidden from match'; end if;
  if not exists (select 1 from storage.objects where name like '%.gif') then raise exception 'GIF hidden from match'; end if;
  if not exists (select 1 from public.scene_shared_watchlist where title_id='inception') then raise exception 'Watchlist hidden from match'; end if;
end;
$$;
insert into public.scene_reports(reported_id,reason,category)
select '39000000-0000-0000-0000-000000000001','Test safety report',category
from unnest(array['fraud','insult','inappropriate_photo']) as category;
insert into public.scene_reports(reported_id,message_id,reason,category)
select sender_id,id,'Test message report','harassment' from public.messages where body='Test message';
insert into public.scene_reports(reported_id,reason,category)
values ('39000000-0000-0000-0000-000000000003','Test report privacy','spam');
insert into public.scene_blocks(blocked_id) values ('39000000-0000-0000-0000-000000000001');
do $$
begin
  if exists (select 1 from public.messages where body='Test message') then raise exception 'Blocked chat still visible'; end if;
  if exists (select 1 from storage.objects where name like '%.gif') then raise exception 'Blocked media still visible'; end if;
end;
$$;
delete from public.scene_blocks where blocker_id=auth.uid();

select set_config('request.jwt.claims','{"sub":"39000000-0000-0000-0000-000000000003"}',true);
select public.complete_profile_identity((current_date-interval '24 years')::date,'İstanbul');
do $$
begin
  begin
    if exists (select reporter_id from public.scene_reports where reported_id=auth.uid()) then
      raise exception 'Reported member read reporter identity';
    end if;
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.scene_moderation_queue('reports',0);
    raise exception 'Non-admin read the report queue';
  exception when insufficient_privilege then null;
  end;
end;
$$;
do $$
begin
  if exists (select 1 from public.messages where body='Test message') then raise exception 'Nonparticipant read the message'; end if;
  if exists (select 1 from storage.objects where name like '%.gif') then raise exception 'Nonparticipant read media'; end if;
end;
$$;

select set_config('request.jwt.claims','{"sub":"39000000-0000-0000-0000-000000000001","session_id":"39000000-0000-0000-0000-000000000011"}',true);
update public.profiles set account_hidden=true where id=auth.uid();
do $$
begin
  if exists (select 1 from public.matches) then raise exception 'Hidden account still sees active matches'; end if;
  if exists (select 1 from storage.objects where name like '%.gif') then raise exception 'Hidden account still sees conversation media'; end if;
end;
$$;
update public.profiles set account_hidden=false where id=auth.uid();
do $$
declare
  reports jsonb := public.scene_moderation_queue('reports',0);
begin
  if (select count(*) from jsonb_array_elements(reports) as report
      where report->>'category' in ('fraud','insult','inappropriate_photo')) <> 3 then
    raise exception 'New report categories missing from moderation queue';
  end if;
  if not exists (select 1 from jsonb_array_elements(reports) as report where report->>'reported_message' = 'Test message') then
    raise exception 'Message report missing from moderation queue';
  end if;
  if exists (select 1 from jsonb_array_elements(reports) as report where report ? 'reporter_id') then
    raise exception 'Reporter identity exposed in moderation queue';
  end if;
end;
$$;
select public.scene_moderate('reject_verification','39000000-0000-0000-0000-000000000002','Verification test decision');
select public.scene_moderate('suspend','39000000-0000-0000-0000-000000000002','Moderation test decision');
do $$
begin
  if exists (select 1 from public.matches) then raise exception 'Suspended match still visible'; end if;
  if not exists (select 1 from jsonb_array_elements(public.scene_moderation_queue('log',0)) as x where x->>'action'='suspend') then
    raise exception 'Missing moderation audit';
  end if;
end;
$$;
select public.scene_moderate('restore','39000000-0000-0000-0000-000000000002','Test restriction lifted');
select public.scene_moderate('ban','39000000-0000-0000-0000-000000000002','Test permanent ban');
do $$
begin
  if exists (select 1 from public.matches) then raise exception 'Banned match still visible'; end if;
  if not exists (select 1 from jsonb_array_elements(public.scene_moderation_queue('log',0)) as x where x->>'action'='ban') then
    raise exception 'Missing ban audit';
  end if;
end;
$$;
select public.scene_moderate('restore','39000000-0000-0000-0000-000000000002','Test restriction lifted');
select public.scene_hide_room_post(id,'Test room moderation') from public.scene_room_posts where body='Test spoiler';
select public.end_scene_match('39000000-0000-0000-0000-000000000002');

set local role service_role;
select public.scene_begin_account_deletion('39000000-0000-0000-0000-000000000003');

reset role;
do $$
begin
  if not exists (select 1 from public.messages where body='Test message') then raise exception 'Unmatch removed stored messages'; end if;
  if not exists (select 1 from public.matches where ended_at is not null) then raise exception 'Match not archived'; end if;
  if not exists (select 1 from scene_private.account_restrictions where user_id='39000000-0000-0000-0000-000000000003'
    and state='deleting') then raise exception 'Account deletion state not recorded'; end if;
  if not exists (select 1 from public.scene_room_posts where body='Test spoiler' and removed_at is not null) then raise exception 'Post was not moderated'; end if;
end;
$$;
rollback;
