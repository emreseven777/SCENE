-- GoTrue can write its in-memory signup payload back to auth.users after insertion.
create function scene_private.scrub_registration_user_metadata()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
  new.raw_user_meta_data := new.raw_user_meta_data - 'scene_registration';
  return new;
end;
$$;

create trigger scene_scrub_registration_user_metadata before update of raw_user_meta_data on auth.users
for each row when (new.raw_user_meta_data ? 'scene_registration')
execute function scene_private.scrub_registration_user_metadata();

revoke execute on function scene_private.scrub_registration_user_metadata() from public, anon, authenticated;

update auth.users
set raw_user_meta_data = raw_user_meta_data - 'scene_registration'
where raw_user_meta_data ? 'scene_registration';
