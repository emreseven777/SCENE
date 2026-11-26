create table scene_private.cinema_duel_questions (
  id smallint primary key,
  question text not null,
  choices text[] not null check (cardinality(choices)=3),
  answer smallint not null check (answer between 1 and 3)
);
insert into scene_private.cinema_duel_questions values
  (1,'Ruhların Kaçışı filmindeki hamamı kim yönetir?',array['Yubaba','Chihiro','Haku'],1),
  (2,'Whiplash filminde Andrew hangi enstrümanı çalar?',array['Gitar','Davul','Keman'],2),
  (3,'Kış Uykusu filminin yönetmeni kimdir?',array['Reha Erdem','Zeki Demirkubuz','Nuri Bilge Ceylan'],3),
  (4,'Arrival filmindeki Louise Banks’in uzmanlığı nedir?',array['Dilbilim','Matematik','Mimarlık'],1),
  (5,'Dark dizisinin ana yerleşimi hangisidir?',array['Hawkins','Winden','Twin Peaks'],2),
  (6,'WALL-E filminde WALL-E’nin görevi nedir?',array['Bitki yetiştirmek','Gemi kullanmak','Çöp toplamak'],3);

create table scene_private.cinema_duels (
  match_id uuid primary key references public.matches(id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  question_ids smallint[] not null check (cardinality(question_ids)=3),
  a_answers smallint[] not null default '{}'::smallint[],
  b_answers smallint[] not null default '{}'::smallint[],
  expires_at timestamptz not null default (now()+interval '10 minutes')
);
alter table scene_private.cinema_duel_questions enable row level security;
alter table scene_private.cinema_duels enable row level security;
revoke all on scene_private.cinema_duel_questions,scene_private.cinema_duels from public,anon,authenticated;

create function scene_private.cinema_duel(chat uuid, command text, expected_round uuid, question_number integer, choice integer)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  duel scene_private.cinema_duels%rowtype;
  is_a boolean;
  mine smallint[];
  theirs smallint[];
  result jsonb;
begin
  if not scene_private.active_chat(chat) then
    raise exception 'Düello için etkin eşleşme gerekli.' using errcode='42501';
  end if;
  if command is null or command not in ('read','start','answer') then
    raise exception 'Geçersiz düello işlemi.' using errcode='22023';
  end if;
  select user_a=auth.uid() into is_a from public.matches where id=chat;
  if command<>'read' then
    perform pg_advisory_xact_lock(hashtextextended('movia-duel:'||chat::text,0));
    if not scene_private.active_chat(chat) then
      raise exception 'Eşleşme artık etkin değil.' using errcode='42501';
    end if;
  end if;
  select * into duel from scene_private.cinema_duels where match_id=chat;

  if command='start' and (duel.id is null or duel.expires_at<=statement_timestamp()
    or (cardinality(duel.a_answers)=3 and cardinality(duel.b_answers)=3)) then
    insert into scene_private.cinema_duels (match_id,question_ids)
    values(chat, array(select id from scene_private.cinema_duel_questions order by random() limit 3))
    on conflict (match_id) do update set id=excluded.id, question_ids=excluded.question_ids,
      expires_at=excluded.expires_at,a_answers=excluded.a_answers,b_answers=excluded.b_answers
    returning * into duel;
  end if;
  if duel.id is null then return null; end if;
  mine := case when is_a then duel.a_answers else duel.b_answers end;
  theirs := case when is_a then duel.b_answers else duel.a_answers end;

  if command='answer' then
    if expected_round is distinct from duel.id or duel.expires_at<=statement_timestamp()
      or question_number is null or question_number not between 1 and 3 or question_number<>cardinality(mine)+1
      or choice is null or choice not between 1 and 3 then
      raise exception 'Düello veya soru değişti. Tekrar kontrol et.' using errcode='22023';
    end if;
    mine := array_append(mine,choice::smallint);
    update scene_private.cinema_duels set
      a_answers=case when is_a then mine else a_answers end,
      b_answers=case when is_a then b_answers else mine end
    where match_id=chat;
  end if;

  result := jsonb_build_object('id',duel.id,'answered',cardinality(mine),'partner_answered',cardinality(theirs));
  if cardinality(mine)=3 and cardinality(theirs)=3 then
    return result || (select jsonb_build_object('state','completed','score',count(*) filter(where q.answer=mine[n]),
      'partner_score',count(*) filter(where q.answer=theirs[n]))
      from generate_subscripts(duel.question_ids,1) n join scene_private.cinema_duel_questions q on q.id=duel.question_ids[n]);
  elsif duel.expires_at<=statement_timestamp() then
    return result || '{"state":"expired"}'::jsonb;
  elsif cardinality(mine)=3 then
    return result || '{"state":"waiting"}'::jsonb;
  end if;
  return result || (select jsonb_build_object('state','playing','question',q.question,'choices',q.choices)
    from scene_private.cinema_duel_questions q where q.id=duel.question_ids[cardinality(mine)+1]);
end;
$$;

create function public.scene_cinema_duel(chat uuid, command text, expected_round uuid default null,
  question_number integer default null, choice integer default null)
returns jsonb language sql security invoker set search_path=''
as $$ select scene_private.cinema_duel(chat,command,expected_round,question_number,choice); $$;
revoke execute on function scene_private.cinema_duel(uuid,text,uuid,integer,integer),
  public.scene_cinema_duel(uuid,text,uuid,integer,integer) from public,anon;
grant execute on function scene_private.cinema_duel(uuid,text,uuid,integer,integer),
  public.scene_cinema_duel(uuid,text,uuid,integer,integer) to authenticated;
