-- Run after release approval, with pg_cron, pg_net and Supabase Vault enabled.
-- Vault names: movia_push_url (HTTPS function URL), movia_push_job_secret
-- (matches SCENE_PUSH_JOB_SECRET). The function checks its own job secret.
do $$
begin
  if not exists (select 1 from vault.decrypted_secrets
      where name='movia_push_job_secret' and octet_length(decrypted_secret)>=32)
    or not exists (select 1 from vault.decrypted_secrets
      where name='movia_push_url' and
        decrypted_secret ~ '^https://[a-z0-9]+[.]supabase[.]co/functions/v1/scene-push$') then
    raise exception 'MOVIA push requires a valid function URL and job secret in Vault';
  end if;
end;
$$;

select cron.schedule('movia-scene-push', '* * * * *', $job$
  with config as (
    select
      (select decrypted_secret from vault.decrypted_secrets where name='movia_push_url') url,
      (select decrypted_secret from vault.decrypted_secrets where name='movia_push_job_secret') job_secret
  )
  select net.http_post(
    url := url,
    headers := jsonb_build_object('Content-Type','application/json','x-scene-job-secret',job_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  )
  from config
  where url ~ '^https://[a-z0-9]+[.]supabase[.]co/functions/v1/scene-push$'
    and octet_length(job_secret)>=32;
$job$);
