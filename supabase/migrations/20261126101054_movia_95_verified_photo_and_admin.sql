-- Review the existing primary photo, without creating a second copy in Storage.
alter table public.scene_verification_requests
  add column photo_object uuid,
  add column photo_version text;

create function scene_private.request_photo_review()
returns void language plpgsql security definer set search_path=''
as $$
declare
  viewer uuid := auth.uid();
  photo text;
  object_id uuid;
  object_version text;
begin
  if not scene_private.account_active(viewer) or scene_private.profile_age(viewer) is null then
    raise exception 'Fotoğraf incelemesi için etkin bir yetişkin hesabı gerekli.' using errcode='42501';
  end if;
  select avatar_path into photo from public.profiles where id=viewer and onboarded for update;
  select id,version into object_id,object_version from storage.objects
    where bucket_id='scene-avatars' and name=photo and owner_id=viewer::text;
  if object_id is null or object_version is null then
    raise exception 'Önce ana profil fotoğrafını yükle.';
  end if;
  if exists (select 1 from public.scene_verification_requests where user_id=viewer
    and requested_at > statement_timestamp()-interval '1 day'
    and (photo_object is not null or state <> 'pending')) then
    raise exception 'Yeni fotoğraf incelemesi istemek için bir gün bekle.';
  end if;
  insert into public.scene_verification_requests(user_id,photo_object,photo_version)
    values(viewer,object_id,object_version)
    on conflict (user_id) do update set photo_object=excluded.photo_object,
      photo_version=excluded.photo_version,state='pending',requested_at=statement_timestamp()
    where scene_verification_requests.photo_object is distinct from excluded.photo_object
       or scene_verification_requests.photo_version is distinct from excluded.photo_version
       or scene_verification_requests.state='rejected';
end;
$$;

create function scene_private.photo_review_info(subject uuid)
returns table(object_id uuid, object_version text, photo_path text) language sql stable security definer set search_path=''
as $$
  select o.id,o.version,o.name
  from public.scene_verification_requests v join public.profiles p on p.id=v.user_id
  join storage.objects o on o.id=v.photo_object and o.version=v.photo_version
    and o.name=p.avatar_path and o.bucket_id='scene-avatars' and o.owner_id=v.user_id::text
  where v.user_id=subject and v.state='pending' and scene_private.is_administrator();
$$;

create function scene_private.can_read_review_photo(object_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select scene_private.is_administrator() and exists (
    select 1 from public.scene_verification_requests v
    join public.profiles p on p.id=v.user_id
    join storage.objects o on o.id=v.photo_object and o.version=v.photo_version and o.name=p.avatar_path
    where v.photo_object=object_id and v.state='pending' and o.bucket_id='scene-avatars'
      and o.owner_id=v.user_id::text
  );
$$;

create policy "Administrators can review submitted primary photos"
  on storage.objects for select to authenticated
  using (bucket_id='scene-avatars' and scene_private.can_read_review_photo(id));

create function scene_private.approve_photo_review(subject uuid, expected_object uuid, expected_version text, explanation text)
returns void language plpgsql security definer set search_path=''
as $$
begin
  if not scene_private.is_administrator() or subject=auth.uid() then
    raise exception 'Başka bir yönetici incelemeli.' using errcode='42501';
  end if;
  if explanation is null or char_length(btrim(explanation)) not between 5 and 500 then
    raise exception '5–500 karakterlik bir karar gerekçesi gir.';
  end if;
  perform 1 from public.profiles where id=subject for update;
  update public.scene_verification_requests v set state='verified'
  where v.user_id=subject and v.state='pending' and v.photo_object=expected_object
    and v.photo_version=expected_version
    and exists(select 1 from scene_private.photo_review_info(subject) i
      where i.object_id=expected_object and i.object_version=expected_version);
  if not found then raise exception 'Fotoğraf veya başvuru değişti. Yeniden incele.'; end if;
  insert into scene_private.moderation_log(actor,action,target,reason)
    values(auth.uid(),'approve_photo_review',subject,btrim(explanation));
end;
$$;

create function scene_private.has_verified_photo(subject uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select auth.uid() is not null
    and (subject=auth.uid() or (scene_private.profile_age(auth.uid()) is not null
      and scene_private.unblocked(subject) and scene_private.profile_listable(subject)))
    and exists (
      select 1 from public.scene_verification_requests v join public.profiles p on p.id=v.user_id
      join storage.objects o on o.id=v.photo_object and o.version=v.photo_version
        and o.name=p.avatar_path and o.bucket_id='scene-avatars' and o.owner_id=v.user_id::text
      where v.user_id=subject and v.state='verified'
    );
$$;

create or replace view public.scene_profiles with (security_invoker=true) as
select id,name,city,bio,scene,onboarded,avatar_path,avatar_paths,
  scene_private.profile_age(id) as age,gender,looking_for,dating_goal,discovery_hidden,account_hidden,
  scene_private.profile_81_discovery(id) as discovery_details,
  scene_private.has_verified_photo(id) as verified_photo
from public.profiles;

create function scene_private.admin_users(search_text text, state_filter text, page_start integer)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare
  term text := lower(btrim(coalesce(search_text,'')));
  result jsonb;
begin
  if not scene_private.is_administrator() then
    raise exception 'Yönetici yetkisi gerekli.' using errcode='42501';
  end if;
  if page_start is null or page_start<0 or char_length(term)>120
    or coalesce(state_filter,'') not in ('','active','suspended','banned','deleting') then
    raise exception 'Geçersiz arama.';
  end if;
  select coalesce(jsonb_agg(to_jsonb(page) order by page.created_at desc,page.id),'[]'::jsonb) into result from (
    select u.id,p.name,u.created_at,r.until_at,s.state,(p.id is not null) as has_profile,
      (select count(*) from public.scene_reports q where q.reported_id=u.id and q.resolution='pending') as pending_reports,
      (select count(*) from public.scene_reports q where q.reported_id=u.id and q.resolution='pending'
       and q.category in ('impersonation','spam','underage')) as safety_reports
    from auth.users u left join public.profiles p on p.id=u.id
    left join scene_private.account_restrictions r on r.user_id=u.id
    cross join lateral (select case when r.until_at<=statement_timestamp() then 'active'
      else coalesce(r.state,'active') end as state) s
    where u.deleted_at is null and (coalesce(state_filter,'')='' or s.state=state_filter)
      and (term='' or strpos(lower(p.name),term)>0 or u.id::text=term or lower(u.email)=term)
    order by u.created_at desc,u.id limit 25 offset page_start
  ) page;
  return result;
end;
$$;

create function scene_private.admin_statistics()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
begin
  if not scene_private.is_administrator() then
    raise exception 'Yönetici yetkisi gerekli.' using errcode='42501';
  end if;
  return jsonb_build_array((scene_private.moderation_queue('statistics',0)->0) || jsonb_build_object(
    'members', (select count(*) from auth.users where deleted_at is null),
    'active_members', (select count(*) from auth.users u join public.profiles p on p.id=u.id
      where u.deleted_at is null and p.onboarded
        and u.last_sign_in_at >= statement_timestamp()-interval '30 days'
        and scene_private.account_active(u.id))
  ));
end;
$$;

create function public.scene_request_photo_review()
returns void language sql security invoker set search_path=''
as $$ select scene_private.request_photo_review(); $$;
create function public.scene_photo_review_info(subject uuid)
returns table(object_id uuid, object_version text, photo_path text) language sql stable security invoker set search_path=''
as $$ select * from scene_private.photo_review_info(subject); $$;
create function public.scene_approve_photo_review(subject uuid, expected_object uuid, expected_version text, explanation text)
returns void language sql security invoker set search_path=''
as $$ select scene_private.approve_photo_review(subject,expected_object,expected_version,explanation); $$;
create function public.scene_admin_users(search_text text,state_filter text,page_start integer)
returns jsonb language sql stable security invoker set search_path=''
as $$ select scene_private.admin_users(search_text,state_filter,page_start); $$;
create function public.scene_admin_statistics()
returns jsonb language sql stable security invoker set search_path=''
as $$ select scene_private.admin_statistics(); $$;

revoke execute on function scene_private.request_photo_review(),scene_private.photo_review_info(uuid),
  scene_private.can_read_review_photo(uuid),scene_private.approve_photo_review(uuid,uuid,text,text),
  scene_private.has_verified_photo(uuid),scene_private.admin_users(text,text,integer),scene_private.admin_statistics(),
  public.scene_request_photo_review(),public.scene_photo_review_info(uuid),public.scene_approve_photo_review(uuid,uuid,text,text),
  public.scene_admin_users(text,text,integer),public.scene_admin_statistics() from public,anon;
grant execute on function scene_private.request_photo_review(),scene_private.photo_review_info(uuid),
  scene_private.can_read_review_photo(uuid),scene_private.approve_photo_review(uuid,uuid,text,text),
  scene_private.has_verified_photo(uuid),scene_private.admin_users(text,text,integer),scene_private.admin_statistics(),
  public.scene_request_photo_review(),public.scene_photo_review_info(uuid),public.scene_approve_photo_review(uuid,uuid,text,text),
  public.scene_admin_users(text,text,integer),public.scene_admin_statistics() to authenticated;
