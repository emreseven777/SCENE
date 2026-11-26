create function scene_private.export_movia_interactions()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare viewer uuid := scene_private.active_privacy_session();
begin
  return jsonb_build_object(
    'profile_voice', (select to_jsonb(v)-'user_id' from public.scene_profile_voice v where user_id=viewer),
    'sent_photo_comments', coalesce((select jsonb_agg(jsonb_build_object(
      'comment',l.photo_comment,'created_at',l.created_at) order by l.created_at)
      from public.likes l where l.liker_id=viewer and l.photo_comment is not null), '[]'::jsonb),
    'cinema_duels', coalesce((select jsonb_agg(jsonb_build_object(
      'id',d.id,'expires_at',d.expires_at,
      'answers',case when m.user_a=viewer then d.a_answers else d.b_answers end))
      from scene_private.cinema_duels d join public.matches m on m.id=d.match_id
      where viewer in (m.user_a,m.user_b)), '[]'::jsonb)
  );
end;
$$;
revoke execute on function scene_private.export_movia_interactions() from public,anon;
grant execute on function scene_private.export_movia_interactions() to authenticated;

create or replace function public.scene_privacy_export()
returns jsonb language sql stable security invoker set search_path=''
as $$ select scene_private.export_personal_data() || scene_private.export_movia_interactions(); $$;
