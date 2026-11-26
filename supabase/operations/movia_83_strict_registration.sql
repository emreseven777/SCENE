-- Re-arm strict registration only when the matching MOVIA release is ready.
BEGIN;
SET LOCAL lock_timeout = '5s';
DROP TRIGGER scene_capture_registration ON auth.users;
CREATE TRIGGER scene_capture_registration BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION scene_private.capture_registration_evidence();
COMMIT;
