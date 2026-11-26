-- For an approved rollback to SCENE only. Complete the operator checks in the runbook.
-- Legacy signups omit scene_registration and use the existing SCENE onboarding age gate.
BEGIN;
SET LOCAL lock_timeout = '5s';
DROP TRIGGER scene_capture_registration ON auth.users;
CREATE TRIGGER scene_capture_registration BEFORE INSERT ON auth.users
FOR EACH ROW WHEN (NEW.raw_user_meta_data ? 'scene_registration')
EXECUTE FUNCTION scene_private.capture_registration_evidence();
COMMIT;
