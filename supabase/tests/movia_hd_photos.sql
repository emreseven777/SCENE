-- Run on a disposable Supabase database with all migrations applied.
begin;

insert into auth.users(id,email,raw_user_meta_data) values
 ('94000000-0000-0000-0000-000000000001','movia-hd-a@example.invalid','{"name":"HD Viewer","scene_registration":{"birth_date":"1996-01-01","terms_accepted":true,"version":"8.3-draft.1"}}'),
 ('94000000-0000-0000-0000-000000000002','movia-hd-b@example.invalid','{"name":"HD Owner","scene_registration":{"birth_date":"1996-01-01","terms_accepted":true,"version":"8.3-draft.1"}}');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"94000000-0000-0000-0000-000000000002"}',true);
insert into storage.objects(bucket_id,name,owner_id) values
 ('scene-avatars','94000000-0000-0000-0000-000000000002/94000000-0000-8000-0000-000000000011.png','94000000-0000-0000-0000-000000000002'),
 ('scene-avatars','94000000-0000-0000-0000-000000000002/94000000-0000-8000-0000-000000000011.png.thumb.webp','94000000-0000-0000-0000-000000000002'),
 ('scene-avatars','94000000-0000-0000-0000-000000000002/94000000-0000-8000-0000-000000000012.jpg','94000000-0000-0000-0000-000000000002'),
 ('scene-avatars','94000000-0000-0000-0000-000000000002/94000000-0000-8000-0000-000000000012.jpg.thumb.webp','94000000-0000-0000-0000-000000000002');
update public.profiles set avatar_paths=array[
 '94000000-0000-0000-0000-000000000002/94000000-0000-8000-0000-000000000011.png',
 '94000000-0000-0000-0000-000000000002/94000000-0000-8000-0000-000000000012.jpg'
] where id=auth.uid();

do $$
begin
  if (select count(*) from storage.objects where bucket_id='scene-avatars' and owner_id=auth.uid()::text) <> 4 then
    raise exception 'Owner must see both originals and both thumbnails';
  end if;
  delete from storage.objects where bucket_id='scene-avatars' and owner_id=auth.uid()::text;
  if found then raise exception 'Referenced originals and thumbnails must be protected from deletion'; end if;
end;
$$;

select set_config('request.jwt.claims','{"sub":"94000000-0000-0000-0000-000000000001"}',true);
do $$
begin
  if (select count(*) from storage.objects where bucket_id='scene-avatars' and owner_id='94000000-0000-0000-0000-000000000002') <> 2
    or not exists(select 1 from storage.objects where name like '%000000000011.png.thumb.webp') then
    raise exception 'Discovery should see only the primary HD photo and its thumbnail';
  end if;
  begin
    insert into storage.objects(bucket_id,name,owner_id) values
      ('scene-avatars','94000000-0000-0000-0000-000000000002/94000000-0000-8000-0000-000000000013.png.thumb.webp',auth.uid()::text);
    raise exception 'A viewer must not be able to write thumbnails for another user';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
insert into public.matches(user_a,user_b) values
 ('94000000-0000-0000-0000-000000000001','94000000-0000-0000-0000-000000000002');
set local role authenticated;
do $$
begin
  if (select count(*) from storage.objects where bucket_id='scene-avatars' and owner_id='94000000-0000-0000-0000-000000000002') <> 4 then
    raise exception 'A match must be able to see both originals and thumbnails';
  end if;
end;
$$;

insert into public.scene_blocks(blocked_id) values ('94000000-0000-0000-0000-000000000002');
do $$
begin
  if exists(select 1 from storage.objects where bucket_id='scene-avatars' and owner_id='94000000-0000-0000-0000-000000000002') then
    raise exception 'A block must prevent new original and thumbnail reads';
  end if;
end;
$$;

reset role;
set local role anon;
do $$
begin
  if exists(select 1 from storage.objects where bucket_id='scene-avatars' and owner_id='94000000-0000-0000-0000-000000000002') then
    raise exception 'Private originals and thumbnails must be inaccessible anonymously';
  end if;
end;
$$;

rollback;
