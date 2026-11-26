alter table public.likes add column photo_path text, add column photo_comment text;
alter table public.likes add constraint movia_like_photo_comment_check check (
  (photo_path is null and photo_comment is null) or
  (photo_path is not null and photo_comment is not null and char_length(btrim(photo_comment)) between 2 and 240)
);

create function scene_private.check_like_photo_comment()
returns trigger language plpgsql security definer set search_path=''
as $$
declare current_photo text;
begin
  if new.liker_id is distinct from auth.uid() or not scene_private.can_like_profile(new.liked_id) then
    raise exception 'Bu profile yorumlu beğeni gönderilemez.' using errcode='42501';
  end if;
  select avatar_path into current_photo from public.profiles where id=new.liked_id for share;
  if new.photo_path is distinct from current_photo or current_photo is null or not exists (
    select 1 from storage.objects where bucket_id='scene-avatars' and name=current_photo
      and owner_id=new.liked_id::text
  ) then
    raise exception 'Profil fotoğrafı değişti. Kartı yenileyip tekrar dene.' using errcode='23514';
  end if;
  new.photo_comment := btrim(new.photo_comment);
  return new;
end;
$$;
revoke execute on function scene_private.check_like_photo_comment() from public,anon,authenticated;

create trigger movia_like_photo_comment before insert on public.likes
for each row when (new.photo_path is not null)
execute function scene_private.check_like_photo_comment();
