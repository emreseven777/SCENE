-- SCENE 8.3. Deploy only after the operator has approved and versioned the legal texts.
create table scene_private.registration_evidence (
  user_id uuid primary key references auth.users(id) on delete cascade deferrable initially deferred,
  terms_version text not null,
  notice_version text not null,
  privacy_version text not null,
  accepted_at timestamptz not null default statement_timestamp(),
  pending_birth_date date
);
create table scene_private.consent_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null check (purpose = 'device_push'),
  document_version text not null,
  granted boolean not null,
  recorded_at timestamptz not null default statement_timestamp()
);
create index scene_consent_events_user on scene_private.consent_events(user_id,purpose,id desc);
create table scene_private.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('access','correction','erasure','transfer','objection','other')),
  body text not null check (char_length(btrim(body)) between 10 and 2000),
  status text not null default 'received' check (status in ('received','resolved')),
  received_at timestamptz not null default statement_timestamp(),
  response text check (char_length(btrim(response)) between 10 and 2000),
  resolved_at timestamptz
);
create index scene_privacy_requests_user on scene_private.privacy_requests(user_id,received_at desc);
alter table scene_private.registration_evidence enable row level security;
alter table scene_private.consent_events enable row level security;
alter table scene_private.privacy_requests enable row level security;
revoke all on scene_private.registration_evidence, scene_private.consent_events, scene_private.privacy_requests from public, anon, authenticated;

-- Read the signup payload before it is stored. Birth date and acceptance metadata never become JWT user metadata.
create function scene_private.capture_registration_evidence()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
  details jsonb := new.raw_user_meta_data;
  submitted_date date;
  today date := (current_timestamp at time zone 'Europe/Istanbul')::date;
begin
  -- Internal fixtures and operators can provision non-email accounts without fabricating acceptance.
  if coalesce(new.raw_app_meta_data->>'provider','') <> 'email' and not coalesce(details ? 'scene_registration',false) then
    return new;
  end if;
  if details->'scene_registration'->'terms_accepted' is distinct from 'true'::jsonb
    or details->'scene_registration'->>'version' is distinct from '8.3-draft.1' then
    raise exception 'Güncel üyelik koşulları kabul edilmeli.' using errcode='23514';
  end if;
  if coalesce(details->'scene_registration'->>'birth_date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'Geçerli bir doğum tarihi gerekli.' using errcode='23514';
  end if;
  submitted_date := (details->'scene_registration'->>'birth_date')::date;
  if submitted_date > (today - interval '18 years')::date then
    raise exception 'SCENE üyeliği için 18 yaşını doldurmalısın.' using errcode='23514';
  end if;
  insert into scene_private.registration_evidence(user_id,terms_version,notice_version,privacy_version,pending_birth_date)
  values(new.id,'8.3-draft.1','8.3-draft.1','8.3-draft.1',submitted_date);
  new.raw_user_meta_data := details - 'scene_registration';
  return new;
end;
$$;

create function scene_private.finalize_registration_birth_date()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  insert into scene_private.profile_birth_dates(user_id,birth_date)
    select user_id,pending_birth_date from scene_private.registration_evidence where user_id=new.id and pending_birth_date is not null;
  update scene_private.registration_evidence set pending_birth_date=null where user_id=new.id;
  return new;
end;
$$;

-- Auth also copies email signup data into its identity record.
create function scene_private.scrub_legal_identity_metadata()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
  new.identity_data := new.identity_data - 'scene_registration';
  return new;
end;
$$;
create trigger scene_scrub_legal_identity before insert or update of identity_data on auth.identities
for each row when (new.identity_data ? 'scene_registration')
execute function scene_private.scrub_legal_identity_metadata();
revoke execute on function scene_private.scrub_legal_identity_metadata() from public,anon,authenticated;

create trigger scene_capture_registration before insert on auth.users
for each row execute function scene_private.capture_registration_evidence();
-- Runs after the existing on_auth_user_created trigger provisions the profile.
create trigger scene_finalize_registration after insert on auth.users
for each row execute function scene_private.finalize_registration_birth_date();
revoke execute on function scene_private.capture_registration_evidence(),scene_private.finalize_registration_birth_date()
  from public,anon,authenticated;

create function scene_private.active_privacy_session()
returns uuid language plpgsql stable security definer set search_path=''
as $$
declare viewer uuid := auth.uid();
begin
  if viewer is null or not exists (
    select 1 from auth.sessions where user_id=viewer and id::text=auth.jwt()->>'session_id'
      and (not_after is null or not_after > statement_timestamp())
  ) then
    raise exception 'Geçerli oturum gerekli.' using errcode='42501';
  end if;
  return viewer;
end;
$$;

create function scene_private.has_device_push_consent()
returns boolean language sql stable security definer set search_path=''
as $$
  select coalesce((select granted and document_version='8.3-draft.1' from scene_private.consent_events
    where user_id=auth.uid() and purpose='device_push'
    order by id desc limit 1),false);
$$;
create policy "Current push permission for new subscriptions" on public.scene_push_subscriptions as restrictive
  for insert to authenticated with check (scene_private.has_device_push_consent());
create policy "Current push permission for changed subscriptions" on public.scene_push_subscriptions as restrictive
  for update to authenticated with check (scene_private.has_device_push_consent());

create function scene_private.set_device_push_consent(choice boolean, version text)
returns void language plpgsql security definer set search_path=''
as $$
declare
  viewer uuid := scene_private.active_privacy_session();
  previous scene_private.consent_events;
begin
  if choice is null or version is distinct from '8.3-draft.1' then
    raise exception 'Geçersiz belge sürümü.' using errcode='23514';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('scene-privacy-'||viewer::text,0));
  select * into previous from scene_private.consent_events
    where user_id=viewer and purpose='device_push' order by id desc limit 1;
  if previous.granted is distinct from choice or previous.document_version is distinct from version then
    insert into scene_private.consent_events(user_id,purpose,document_version,granted)
    values (viewer,'device_push',version,choice);
  end if;
  if not choice then
    delete from public.scene_push_subscriptions where user_id=viewer;
    delete from scene_private.message_push_queue where recipient=viewer;
  end if;
end;
$$;

create function scene_private.submit_privacy_request(request_kind text, request_body text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare
  viewer uuid := scene_private.active_privacy_session();
  receipt uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('scene-privacy-'||viewer::text,0));
  if (select count(*) from scene_private.privacy_requests
      where user_id=viewer and received_at >= now()-interval '24 hours') >= 5 then
    raise exception 'Başvuru sınırına ulaşıldı.' using errcode='23514';
  end if;
  insert into scene_private.privacy_requests(user_id,kind,body)
  values(viewer,request_kind,btrim(request_body)) returning id into receipt;
  return receipt;
end;
$$;

create function scene_private.read_privacy_settings()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare viewer uuid := scene_private.active_privacy_session();
begin
  return jsonb_build_object(
    'registration', (select to_jsonb(e)-'user_id'-'pending_birth_date' from scene_private.registration_evidence e where user_id=viewer),
    'device_push', scene_private.has_device_push_consent(),
    'legacy_push', exists(select 1 from public.scene_push_subscriptions where user_id=viewer),
    'requests', coalesce((select jsonb_agg(to_jsonb(r)-'user_id' order by received_at desc)
      from scene_private.privacy_requests r where user_id=viewer),'[]'::jsonb));
end;
$$;

create function scene_private.export_personal_data()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare viewer uuid := scene_private.active_privacy_session();
begin
  return jsonb_build_object(
    'exported_at',statement_timestamp(),
    'account',(select jsonb_build_object('id',u.id,'email',u.email,'created_at',u.created_at,'email_confirmed_at',u.email_confirmed_at) from auth.users u where u.id=viewer),
    'profile',(select to_jsonb(p) from public.profiles p where p.id=viewer),
    'birth_date',(select birth_date from scene_private.profile_birth_dates where user_id=viewer),
    'preferences',(select to_jsonb(p)-'user_id' from public.scene_preferences p where user_id=viewer),
    'favorites',(select coalesce(jsonb_agg(to_jsonb(f)-'user_id'),'[]'::jsonb) from public.favorites f where user_id=viewer),
    'cinema_choices',(select coalesce(jsonb_agg(to_jsonb(c)-'user_id'),'[]'::jsonb) from public.cinema_choices c where user_id=viewer),
    'sent_messages',(select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'body',m.body,'created_at',m.created_at,'media_path',m.media_path) order by m.id),'[]'::jsonb) from public.messages m where sender_id=viewer and deleted_at is null),
    'community_posts',(select coalesce(jsonb_agg(to_jsonb(p)-'author_id'),'[]'::jsonb) from public.scene_room_posts p where author_id=viewer and removed_at is null),
    'account_actions',jsonb_build_object(
      'sent_likes',(select coalesce(jsonb_agg(jsonb_build_object('kind',l.kind,'created_at',l.created_at)),'[]'::jsonb) from public.likes l where liker_id=viewer),
      'reports',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'reason',r.reason,'created_at',r.created_at)),'[]'::jsonb) from public.scene_reports r where reporter_id=viewer),
      'verification',(select to_jsonb(v)-'user_id' from public.scene_verification_requests v where user_id=viewer)),
    'privacy',scene_private.read_privacy_settings(),
    'consents',(select coalesce(jsonb_agg(to_jsonb(c)-'user_id'-'id' order by id),'[]'::jsonb) from scene_private.consent_events c where user_id=viewer));
end;
$$;

create function scene_private.require_push_consent()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if auth.uid() is not null then
    perform pg_advisory_xact_lock(hashtextextended('scene-privacy-'||new.user_id::text,0));
    if new.user_id <> auth.uid() or not scene_private.has_device_push_consent() then
      raise exception 'Bildirim izni gerekli.' using errcode='42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger scene_require_push_consent before insert or update on public.scene_push_subscriptions
for each row execute function scene_private.require_push_consent();
revoke execute on function scene_private.require_push_consent() from public,anon,authenticated;

create function scene_private.privacy_inbox(page_start integer)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
begin
  if not scene_private.is_administrator() then
    raise exception 'Yetki gerekli.' using errcode='42501';
  end if;
  return coalesce((select jsonb_agg(to_jsonb(r)) from (
    select id,user_id as target,kind,body as reason,status as state,received_at as created_at,response
    from scene_private.privacy_requests order by (status='resolved'),received_at,id
    limit 25 offset greatest(coalesce(page_start,0),0)
  ) r),'[]'::jsonb);
end;
$$;

create function scene_private.review_privacy_request(request_id uuid, reply text)
returns void language plpgsql security definer set search_path=''
as $$
begin
  if not scene_private.is_administrator() then
    raise exception 'Yetki gerekli.' using errcode='42501';
  end if;
  update scene_private.privacy_requests
    set response=btrim(reply),status='resolved',resolved_at=statement_timestamp()
    where id=request_id and status<>'resolved' and char_length(btrim(reply)) between 10 and 2000;
  if not found then raise exception 'Başvuru açık değil veya yanıt geçersiz.' using errcode='23514'; end if;
  insert into scene_private.moderation_log(actor,action,target,reason)
  values(auth.uid(),'privacy_reply',request_id,'KVKK başvurusu yanıtlandı');
end;
$$;

create function public.scene_privacy_inbox(page_start integer) returns jsonb language sql stable security invoker set search_path=''
as $$ select scene_private.privacy_inbox(page_start); $$;
create function public.scene_privacy_review(request_id uuid, reply text) returns void language sql security invoker set search_path=''
as $$ select scene_private.review_privacy_request(request_id,reply); $$;
revoke execute on function scene_private.privacy_inbox(integer),scene_private.review_privacy_request(uuid,text),
  public.scene_privacy_inbox(integer),public.scene_privacy_review(uuid,text) from public,anon,authenticated;
grant execute on function scene_private.privacy_inbox(integer),scene_private.review_privacy_request(uuid,text),
  public.scene_privacy_inbox(integer),public.scene_privacy_review(uuid,text) to authenticated;

-- Only trusted operators may read the inbox or respond. Member RPCs never accept a user ID.
create function public.scene_privacy_settings() returns jsonb language sql stable security invoker set search_path=''
as $$ select scene_private.read_privacy_settings(); $$;
create function public.scene_privacy_export() returns jsonb language sql stable security invoker set search_path=''
as $$ select scene_private.export_personal_data(); $$;
create function public.scene_privacy_request(request_kind text, request_body text) returns uuid language sql security invoker set search_path=''
as $$ select scene_private.submit_privacy_request(request_kind,request_body); $$;
create function public.scene_device_push_consent(choice boolean, version text) returns void language sql security invoker set search_path=''
as $$ select scene_private.set_device_push_consent(choice,version); $$;

revoke execute on function scene_private.active_privacy_session(),scene_private.has_device_push_consent(),
  scene_private.set_device_push_consent(boolean,text),scene_private.submit_privacy_request(text,text),
  scene_private.read_privacy_settings(),scene_private.export_personal_data(),
  public.scene_privacy_settings(),public.scene_privacy_export(),public.scene_privacy_request(text,text),
  public.scene_device_push_consent(boolean,text) from public,anon,authenticated;
grant execute on function scene_private.has_device_push_consent(),scene_private.set_device_push_consent(boolean,text),
  scene_private.submit_privacy_request(text,text),scene_private.read_privacy_settings(),scene_private.export_personal_data(),
  public.scene_privacy_settings(),public.scene_privacy_export(),public.scene_privacy_request(text,text),
  public.scene_device_push_consent(boolean,text) to authenticated;
