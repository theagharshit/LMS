BEGIN;

DROP TABLE IF EXISTS "QuizResourceLink";
DROP TABLE IF EXISTS "StudyResource";
ALTER TABLE "QuizSubmission" DROP CONSTRAINT IF EXISTS "QuizSubmission_timeSpentSeconds_check";
ALTER TABLE "QuizSubmission" DROP COLUMN IF EXISTS "startedAt", DROP COLUMN IF EXISTS "timeSpentSeconds";
ALTER TABLE "StudentProfile" DROP COLUMN IF EXISTS "idCardPhotoUrl";
ALTER TABLE "Quiz" DROP COLUMN IF EXISTS "status", DROP COLUMN IF EXISTS "liveStartedAt";
DROP TYPE IF EXISTS "StudyResourceType";
DROP TYPE IF EXISTS "QuizStatus";

COMMIT;
