-- Normalize recognized values in-place. Unknown answers remain readable until
-- the member chooses a replacement. No birth dates enter a client-facing view.
create function scene_private.profile_81_options(field text)
returns jsonb language sql immutable set search_path=''
as $$
  select case field
    when 'occupation' then '{"Acil tıp teknisyeni":"Acil tıp teknisyeni","Adli tıp uzmanı":"Adli tıp uzmanı","Akademisyen":"Akademisyen","Asker":"Asker","Aşçı":"Aşçı","Avukat":"Avukat","Bankacı":"Bankacı","Barista":"Barista","Beslenme uzmanı":"Beslenme uzmanı","Bilgi güvenliği uzmanı":"Bilgi güvenliği uzmanı","Bilgisayar mühendisi":"Bilgisayar mühendisi","Biyolog":"Biyolog","Biyomedikal mühendisi":"Biyomedikal mühendisi","Çevirmen":"Çevirmen","Çevre mühendisi":"Çevre mühendisi","Çiftçi":"Çiftçi","Çocuk gelişimi uzmanı":"Çocuk gelişimi uzmanı","Danışman":"Danışman","Dansçı":"Dansçı","Denizci":"Denizci","Diğer":"Diğer","Diş hekimi":"Diş hekimi","Diyetisyen":"Diyetisyen","Doktor":"Doktor","Eczacı":"Eczacı","Editör":"Editör","Eğitim danışmanı":"Eğitim danışmanı","Ekonomist":"Ekonomist","Elektrik mühendisi":"Elektrik mühendisi","Elektrik teknisyeni":"Elektrik teknisyeni","Elektrikçi":"Elektrikçi","Elektronik mühendisi":"Elektronik mühendisi","Emekli":"Emekli","Endüstri mühendisi":"Endüstri mühendisi","Estetisyen":"Estetisyen","Etkinlik yöneticisi":"Etkinlik yöneticisi","Finans analisti":"Finans analisti","Fizikçi":"Fizikçi","Fizyoterapist":"Fizyoterapist","Fotoğrafçı":"Fotoğrafçı","Garson":"Garson","Gayrimenkul danışmanı":"Gayrimenkul danışmanı","Gazeteci":"Gazeteci","Gemi kaptanı":"Gemi kaptanı","Gıda mühendisi":"Gıda mühendisi","Girişimci":"Girişimci","Grafik tasarımcı":"Grafik tasarımcı","Gümrük müşaviri":"Gümrük müşaviri","Güvenlik görevlisi":"Güvenlik görevlisi","Hakim":"Hakim","Halkla ilişkiler uzmanı":"Halkla ilişkiler uzmanı","Harita mühendisi":"Harita mühendisi","Hemşire":"Hemşire","Hukuk danışmanı":"Hukuk danışmanı","İç mimar":"İç mimar","İdari işler uzmanı":"İdari işler uzmanı","İhracat uzmanı":"İhracat uzmanı","İllüstratör":"İllüstratör","İnsan kaynakları uzmanı":"İnsan kaynakları uzmanı","İnşaat mühendisi":"İnşaat mühendisi","İş analisti":"İş analisti","İş geliştirme uzmanı":"İş geliştirme uzmanı","İş güvenliği uzmanı":"İş güvenliği uzmanı","İşletmeci":"İşletmeci","İtfaiyeci":"İtfaiyeci","Jeolog":"Jeolog","Kabin memuru":"Kabin memuru","Kameraman":"Kameraman","Karikatürist":"Karikatürist","Kasiyer":"Kasiyer","Kaynak ustası":"Kaynak ustası","Kimya mühendisi":"Kimya mühendisi","Kimyager":"Kimyager","Konuşma terapisti":"Konuşma terapisti","Kuaför":"Kuaför","Kurye":"Kurye","Kuyumcu":"Kuyumcu","Kütüphaneci":"Kütüphaneci","Laboratuvar teknisyeni":"Laboratuvar teknisyeni","Lojistik uzmanı":"Lojistik uzmanı","Makine mühendisi":"Makine mühendisi","Mali müşavir":"Mali müşavir","Marangoz":"Marangoz","Matematikçi":"Matematikçi","Medya planlama uzmanı":"Medya planlama uzmanı","Memur":"Memur","Mimar":"Mimar","Moda tasarımcısı":"Moda tasarımcısı","Muhasebe uzmanı":"Muhasebe uzmanı","Müşteri temsilcisi":"Müşteri temsilcisi","Müzisyen":"Müzisyen","Odyolog":"Odyolog","Otomotiv teknisyeni":"Otomotiv teknisyeni","Oyuncu":"Oyuncu","Öğrenci":"Öğrenci","Öğretim görevlisi":"Öğretim görevlisi","Öğretmen":"Öğretmen","Pastacı":"Pastacı","Pazarlamacı":"Pazarlamacı","Pilot":"Pilot","Polis":"Polis","Proje yöneticisi":"Proje yöneticisi","Psikolog":"Psikolog","Psikolojik danışman":"Psikolojik danışman","Radyo programcısı":"Radyo programcısı","Reklamcı":"Reklamcı","Restoran yöneticisi":"Restoran yöneticisi","Sağlık teknisyeni":"Sağlık teknisyeni","Sanat yönetmeni":"Sanat yönetmeni","Satın alma uzmanı":"Satın alma uzmanı","Satış danışmanı":"Satış danışmanı","Savcı":"Savcı","Senarist":"Senarist","Serbest çalışan":"Serbest çalışan","Servis görevlisi":"Servis görevlisi","Ses mühendisi":"Ses mühendisi","Sigortacı":"Sigortacı","Sistem yöneticisi":"Sistem yöneticisi","Sosyal hizmet uzmanı":"Sosyal hizmet uzmanı","Sosyal medya uzmanı":"Sosyal medya uzmanı","Sosyolog":"Sosyolog","Spor antrenörü":"Spor antrenörü","Sporcu":"Sporcu","Şehir plancısı":"Şehir plancısı","Şoför":"Şoför","Şu anda çalışmıyor":"Şu anda çalışmıyor","Tarım mühendisi":"Tarım mühendisi","Tekstil mühendisi":"Tekstil mühendisi","Terzi":"Terzi","Tesisatçı":"Tesisatçı","Tur rehberi":"Tur rehberi","Turizm uzmanı":"Turizm uzmanı","Uçak teknisyeni":"Uçak teknisyeni","Ulaştırma uzmanı":"Ulaştırma uzmanı","Ürün yöneticisi":"Ürün yöneticisi","Veri analisti":"Veri analisti","Veri bilimci":"Veri bilimci","Veteriner hekim":"Veteriner hekim","Video editörü":"Video editörü","Yapımcı":"Yapımcı","Yazar":"Yazar","Yazılım geliştirici":"Yazılım geliştirici","Yazılım mühendisi":"Yazılım mühendisi","Yönetmen":"Yönetmen","Ziraat mühendisi":"Ziraat mühendisi"}'::jsonb
    when 'education' then '{"primary":"İlkokul","middle":"Ortaokul","high_school":"Lise","associate":"Ön lisans","bachelors":"Lisans","masters":"Yüksek lisans","doctorate":"Doktora","other":"Diğer"}'::jsonb
    when 'smoking' then '{"never":"Kullanmıyorum","sometimes":"Ara sıra","regularly":"Düzenli","quit":"Bıraktım"}'::jsonb
    when 'alcohol' then '{"never":"Kullanmıyorum","sometimes":"Ara sıra","regularly":"Düzenli","quit":"Bıraktım"}'::jsonb
    when 'relationship' then '{"long_term":"Uzun süreli ilişki","short_term":"Kısa süreli ilişki","marriage":"Evlilik","open":"Tanışmaya açık","undecided":"Henüz karar vermedim"}'::jsonb
    when 'children' then '{"has_children":"Çocuğum var","wants_children":"Çocuk istiyorum","no_children":"Çocuk istemiyorum","undecided":"Henüz karar vermedim"}'::jsonb
    when 'sport' then '{"never":"Spor yapmıyorum","sometimes":"Ara sıra","regularly":"Düzenli"}'::jsonb
    when 'interests' then '{"Film ve dizi":"Film ve dizi","Müzik":"Müzik","Konser":"Konser","Kitap":"Kitap","Yazmak":"Yazmak","Tiyatro":"Tiyatro","Müze":"Müze","Fotoğrafçılık":"Fotoğrafçılık","Resim":"Resim","Tasarım":"Tasarım","Dans":"Dans","Seyahat":"Seyahat","Kamp":"Kamp","Doğa yürüyüşü":"Doğa yürüyüşü","Mutfak":"Mutfak","Kahve":"Kahve","Oyun":"Oyun","Teknoloji":"Teknoloji","Bilim":"Bilim","Gönüllülük":"Gönüllülük","Hayvanlar":"Hayvanlar","Fitness":"Fitness","Koşu":"Koşu","Bisiklet":"Bisiklet","Yüzme":"Yüzme","Yoga":"Yoga","Futbol":"Futbol","Basketbol":"Basketbol","Tenis":"Tenis","Moda":"Moda","Bahçecilik":"Bahçecilik","Podcast":"Podcast","Masa oyunları":"Masa oyunları","Anime":"Anime","Stand-up":"Stand-up","El işi":"El işi"}'::jsonb
    when 'genres' then '{"Aksiyon":"Aksiyon","Macera":"Macera","Animasyon":"Animasyon","Belgesel":"Belgesel","Bilim Kurgu":"Bilim Kurgu","Dram":"Dram","Fantastik":"Fantastik","Gerilim":"Gerilim","Gizem":"Gizem","Komedi":"Komedi","Korku":"Korku","Müzik":"Müzik","Romantik":"Romantik","Savaş":"Savaş","Suç":"Suç","Tarih":"Tarih","Aile":"Aile","Western":"Western","Biyografi":"Biyografi"}'::jsonb
    else '{}'::jsonb end;
$$;

create function scene_private.profile_81_key(value text)
returns text language sql immutable set search_path=''
as $$
  select regexp_replace(
    translate(lower(translate(btrim(value),'İIÇĞÖŞÜ','iiçğöşü')), 'ıçğöşüâîû', 'icgosuaiu'),
    '[[:space:]]+', ' ', 'g'
  );
$$;

create function scene_private.profile_81_option(field text, input text)
returns text language sql immutable set search_path=''
as $$
  select case
    when scene_private.profile_81_key(input) in ('undisclosed','belirtmek istemiyorum','paylasmak istemiyorum') then 'undisclosed'
    else coalesce(
      (select key from jsonb_each_text(scene_private.profile_81_options(field))
       where scene_private.profile_81_key(input) in (scene_private.profile_81_key(key), scene_private.profile_81_key(value))
       order by (key=input) desc,key limit 1),
      case field || ':' || scene_private.profile_81_key(input)
        when 'occupation:yazilimci' then 'Yazılım geliştirici'
        when 'occupation:doktor hekim' then 'Doktor'
        when 'occupation:hekim' then 'Doktor'
        when 'education:universite' then 'bachelors'
        when 'education:universite mezunu' then 'bachelors'
        when 'education:lise mezunu' then 'high_school'
        when 'education:ilkogretim' then 'primary'
        when 'education:master' then 'masters'
        when 'education:phd' then 'doctorate'
        when 'smoking:icmiyorum' then 'never'
        when 'smoking:hayir' then 'never'
        when 'smoking:evet' then 'regularly'
        when 'smoking:bazen' then 'sometimes'
        when 'alcohol:icmiyorum' then 'never'
        when 'alcohol:hayir' then 'never'
        when 'alcohol:evet' then 'regularly'
        when 'alcohol:bazen' then 'sometimes'
        when 'sport:bazen' then 'sometimes'
        when 'sport:hayir' then 'never'
        when 'sport:evet' then 'regularly'
        when 'interests:sinema' then 'Film ve dizi'
        when 'interests:film' then 'Film ve dizi'
        when 'interests:kitap okumak' then 'Kitap'
        when 'genres:sci-fi' then 'Bilim Kurgu'
      end
    )
  end;
$$;

create function scene_private.profile_81_normalize(field text, answer jsonb)
returns jsonb language plpgsql immutable set search_path=''
as $$
declare
  raw text := answer #>> '{}';
  normalized text;
  normalized_list text[];
  token text;
  size_cm integer;
begin
  if jsonb_typeof(answer) not in ('string','number','array') then return answer; end if;
  if jsonb_typeof(answer) <> 'array' and scene_private.profile_81_key(raw) in
    ('undisclosed','belirtmek istemiyorum','paylasmak istemiyorum') then return to_jsonb('undisclosed'::text); end if;

  if field='height' then
    normalized := regexp_replace(replace(scene_private.profile_81_key(raw),',','.'),'[[:space:]]','','g');
    if normalized ~ '^[0-9]{3}(cm)?$' then
      size_cm := left(normalized,3)::integer;
    elsif normalized ~ '^[12][.][0-9]{2}m?$' then
      size_cm := replace(left(normalized,4),'.','')::integer;
    end if;
    if size_cm between 130 and 240 then return to_jsonb(size_cm::text); end if;
  elsif field='sign' then
    if scene_private.profile_81_key(raw)='automatic' then
      return to_jsonb('automatic'::text);
    end if;
  elsif field in ('interests','genres') then
    if jsonb_typeof(answer)='array' then
      if exists(select 1 from jsonb_array_elements(answer) e where jsonb_typeof(e) <> 'string') then return answer; end if;
      normalized_list := array(select jsonb_array_elements_text(answer));
    elsif jsonb_typeof(answer)='string' then
      normalized_list := regexp_split_to_array(raw,'[,;/]');
    else return answer;
    end if;
    if cardinality(normalized_list) > 20 then return answer; end if;
    foreach token in array normalized_list loop
      normalized := scene_private.profile_81_option(field,token);
      if normalized is null or normalized='undisclosed' then return answer; end if;
    end loop;
    return to_jsonb(array(select distinct scene_private.profile_81_option(field,v) from unnest(normalized_list) v order by 1));
  elsif field in ('occupation','education','smoking','alcohol','relationship','children','sport') then
    normalized := scene_private.profile_81_option(field,raw);
    if normalized is not null then return to_jsonb(normalized); end if;
  end if;
  return answer;
end;
$$;

update public.scene_preferences p
set details=normalized.value
from (
  select user_id,coalesce(jsonb_object_agg(key, scene_private.profile_81_normalize(key,value)),'{}'::jsonb) value
  from public.scene_preferences cross join lateral jsonb_each(details)
  group by user_id
) normalized
where p.user_id=normalized.user_id and p.details is distinct from normalized.value
  and octet_length(normalized.value::text) <= 5000;

-- Resolve unambiguous legacy film/show names without a network call.
with candidates as (
  select p.user_id,entry.field,f.title_metadata->>'id' id,min(f.title_metadata->>'title') name,
    min(f.title_metadata->>'year') as release_year
  from public.scene_preferences p
  cross join lateral (values ('movie','movie'),('series','tv')) entry(field,kind)
  join public.favorites f on f.user_id=p.user_id
  where jsonb_typeof(p.details->entry.field)='string'
    and scene_private.profile_81_key(p.details->>entry.field) <> 'undisclosed'
    and f.title_metadata->>'id' ~ ('^tmdb-' || entry.kind || '-[1-9][0-9]{0,9}$')
    and char_length(btrim(f.title_metadata->>'title')) between 1 and 180
    and scene_private.profile_81_key(p.details->>entry.field) in (
      scene_private.profile_81_key(f.title_metadata->>'title'), scene_private.profile_81_key(f.title_metadata->>'original')
    )
  group by p.user_id,entry.field,f.title_metadata->>'id'
), resolved as (
  select user_id,field,(array_agg(jsonb_strip_nulls(jsonb_build_object(
    'id',id,'name',name,'year',case when release_year ~ '^[0-9]{4}$' and release_year between '1870' and '2100' then release_year::integer end
  ))))[1] value
  from candidates group by user_id,field having count(*)=1
), patches as (
  select user_id,jsonb_object_agg(field,value) value from resolved group by user_id
)
update public.scene_preferences p set details=p.details || patches.value from patches where p.user_id=patches.user_id
  and octet_length((p.details || patches.value)::text) <= 5000;

create function scene_private.check_profile_81_details()
returns trigger language plpgsql set search_path=''
as $$
declare
  field text;
  answer jsonb;
  answer_type text;
  prefix text;
  previous jsonb;
begin
  -- Upserts execute the INSERT trigger first even when the final write is UPDATE.
  if tg_op='UPDATE' then
    previous := old.details;
  else
    select details into previous from public.scene_preferences where user_id=new.user_id;
    previous := coalesce(previous,'{}'::jsonb);
  end if;
  for field,answer in select * from jsonb_each(new.details) loop
    if answer is not distinct from (previous->field) or answer='"undisclosed"'::jsonb then continue; end if;
    answer_type := jsonb_typeof(answer);
    if field in ('height','occupation','education','smoking','alcohol','relationship','children','sport','sign','genres','interests') then
      answer := scene_private.profile_81_normalize(field,answer);
      answer_type := jsonb_typeof(answer);
      new.details := jsonb_set(new.details,array[field],answer);
      if answer='"undisclosed"'::jsonb then continue; end if;
      if field='height' then
        if answer_type='string' and answer #>> '{}' ~ '^(13[0-9]|1[4-9][0-9]|2[0-3][0-9]|240)$' then continue; end if;
      elsif field='sign' then
        if answer='"automatic"'::jsonb then continue; end if;
      elsif field in ('genres','interests') then
        if answer_type='array' and jsonb_array_length(answer) <= 20 and not exists (
          select 1 from jsonb_array_elements(answer) item
          where jsonb_typeof(item)<>'string' or not (scene_private.profile_81_options(field) ? (item #>> '{}'))
        ) then continue; end if;
      elsif answer_type='string' and scene_private.profile_81_options(field) ? (answer #>> '{}') then
        continue;
      end if;
    elsif field in ('movie','series','actor','director') then
      prefix := case field when 'movie' then 'movie' when 'series' then 'tv' else 'person' end;
      if answer_type='object' and answer->>'id' ~ ('^tmdb-'||prefix||'-[1-9][0-9]{0,9}$')
        and jsonb_typeof(answer->'name')='string' and char_length(btrim(answer->>'name')) between 1 and 180
        and (not (answer ? 'year') or (
          jsonb_typeof(answer->'year')='number' and answer->>'year' ~ '^[0-9]{4}$' and answer->>'year' between '1870' and '2100'
        )) and (answer - array['id','name','year'])='{}'::jsonb then continue; end if;
    else
      continue; -- Keep unrelated profile prompts compatible.
    end if;
    raise exception 'Geçersiz profil seçimi: %',field using errcode='23514';
  end loop;
  return new;
end;
$$;
revoke execute on function scene_private.check_profile_81_details() from public,anon,authenticated;
create trigger scene_profile_81_details before insert or update of details on public.scene_preferences
  for each row execute function scene_private.check_profile_81_details();

create function scene_private.zodiac_for_date(birthday date)
returns text language sql immutable set search_path=''
as $$
  select case
    when md>=1222 or md<=119 then 'Oğlak'
    when md<=218 then 'Kova' when md<=320 then 'Balık' when md<=419 then 'Koç'
    when md<=520 then 'Boğa' when md<=620 then 'İkizler' when md<=722 then 'Yengeç'
    when md<=822 then 'Aslan' when md<=922 then 'Başak' when md<=1022 then 'Terazi'
    when md<=1121 then 'Akrep' else 'Yay' end
  from (select extract(month from birthday)*100+extract(day from birthday) md) x
  where birthday is not null;
$$;
revoke execute on function scene_private.zodiac_for_date(date) from public,anon,authenticated;

create or replace function scene_private.visible_profile_details(person uuid)
returns table(details jsonb, instagram text) language sql stable security definer set search_path=''
as $$
  select
    case when s.public_details or p.id=auth.uid() then
      (coalesce(s.details,'{}'::jsonb)-'sign')
      || case when p.id=auth.uid()
            or (s.public_details and s.details->>'sign'='automatic')
         then jsonb_strip_nulls(jsonb_build_object('sign',scene_private.zodiac_for_date(b.birth_date)))
         else '{}'::jsonb end
    else '{}'::jsonb end,
    case when s.show_instagram or p.id=auth.uid() then s.instagram end
  from public.profiles p
  left join public.scene_preferences s on s.user_id=p.id
  left join scene_private.profile_birth_dates b on b.user_id=p.id
  where p.id=person and scene_private.unblocked(person) and scene_private.profile_listable(person)
    and scene_private.profile_age(auth.uid()) is not null;
$$;

create function scene_private.profile_81_discovery(person uuid)
returns jsonb language sql stable security definer set search_path=''
as $$
  select coalesce((select jsonb_object_agg(key,value)
    from public.scene_preferences s cross join lateral jsonb_each(s.details)
    where s.user_id=person and s.public_details and scene_private.unblocked(person)
      and scene_private.profile_listable(person) and scene_private.profile_age(auth.uid()) is not null
      and key in ('height','occupation','education','smoking','alcohol','relationship','children','sport','genres','interests','movie','series')
      and value <> '"undisclosed"'::jsonb
  ),'{}'::jsonb);
$$;
revoke execute on function scene_private.profile_81_discovery(uuid) from public,anon;
grant execute on function scene_private.profile_81_discovery(uuid) to authenticated;

create or replace view public.scene_profiles with (security_invoker=true) as
select id,name,city,bio,scene,onboarded,avatar_path,avatar_paths,
  scene_private.profile_age(id) as age,gender,looking_for,dating_goal,discovery_hidden,account_hidden,
  scene_private.profile_81_discovery(id) as discovery_details
from public.profiles;
