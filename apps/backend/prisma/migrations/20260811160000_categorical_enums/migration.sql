-- Promote stable categorical values from free text/check-only storage to native enums.
BEGIN;

UPDATE "StudentLocationRecord" SET "category" = CASE lower("category")
  WHEN 'classroom' THEN 'in_class'
  WHEN 'lab' THEN 'laboratory'
  WHEN 'transit' THEN 'en_route_bus'
  ELSE lower("category") END;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "AttendanceRecord" WHERE "status" NOT IN ('present','absent','late','excused'))
    OR EXISTS (SELECT 1 FROM "Submission" WHERE "status" NOT IN ('pending','draft','submitted','graded','returned','late','overdue'))
    OR EXISTS (SELECT 1 FROM "Quiz" WHERE "revealMarksMode" NOT IN ('immediate','later'))
    OR EXISTS (SELECT 1 FROM "QuizAttemptSession" WHERE "status" NOT IN ('active','submitted','auto_submitted','expired'))
    OR EXISTS (SELECT 1 FROM "NotificationRecord" WHERE "category" NOT IN ('CRITICAL','ACADEMIC','COMMUNICATION'))
    OR EXISTS (SELECT 1 FROM "NotificationRecord" WHERE "severity" NOT IN ('urgent','high','normal','info'))
    OR EXISTS (SELECT 1 FROM "NotificationRecord" WHERE "type" NOT IN ('general','assignment','quiz','attendance','location','announcement','badge','message'))
    OR EXISTS (SELECT 1 FROM "PaymentRecord" WHERE "status" NOT IN ('pending','paid','failed','refunded','overdue'))
    OR EXISTS (SELECT 1 FROM "AbsenceRequest" WHERE "status" NOT IN ('pending','approved','rejected','cancelled'))
    OR EXISTS (SELECT 1 FROM "StoredFileRecord" WHERE "integrityStatus" NOT IN ('verified','scanning','quarantined'))
    OR EXISTS (SELECT 1 FROM "StudentLocationRecord" WHERE "category" NOT IN ('in_class','canteen_lunch','en_route_bus','library','sports_ground','assembly_hall','dismissed_home','laboratory'))
  THEN
    RAISE EXCEPTION 'Enum migration aborted: an unsupported categorical value exists';
  END IF;
END $$;

ALTER TABLE "AttendanceRecord" DROP CONSTRAINT "AttendanceRecord_status_check";
ALTER TABLE "Submission" DROP CONSTRAINT "Submission_status_check";
ALTER TABLE "Quiz" DROP CONSTRAINT "Quiz_reveal_marks_mode_check";
ALTER TABLE "QuizAttemptSession" DROP CONSTRAINT "QuizAttemptSession_status_check";
ALTER TABLE "NotificationRecord" DROP CONSTRAINT "NotificationRecord_category_check",
  DROP CONSTRAINT "NotificationRecord_severity_check", DROP CONSTRAINT "NotificationRecord_type_check";
ALTER TABLE "PaymentRecord" DROP CONSTRAINT "PaymentRecord_status_check";
ALTER TABLE "AbsenceRequest" DROP CONSTRAINT "AbsenceRequest_status_check";

CREATE TYPE "AttendanceStatus" AS ENUM ('present','absent','late','excused');
CREATE TYPE "SubmissionStatus" AS ENUM ('pending','draft','submitted','graded','returned','late','overdue');
CREATE TYPE "QuizRevealMarksMode" AS ENUM ('immediate','later');
CREATE TYPE "QuizAttemptStatus" AS ENUM ('active','submitted','auto_submitted','expired');
CREATE TYPE "NotificationCategory" AS ENUM ('CRITICAL','ACADEMIC','COMMUNICATION');
CREATE TYPE "NotificationSeverity" AS ENUM ('urgent','high','normal','info');
CREATE TYPE "NotificationType" AS ENUM ('general','assignment','quiz','attendance','location','announcement','badge','message');
CREATE TYPE "PaymentStatus" AS ENUM ('pending','paid','failed','refunded','overdue');
CREATE TYPE "AbsenceStatus" AS ENUM ('pending','approved','rejected','cancelled');
CREATE TYPE "FileIntegrityStatus" AS ENUM ('verified','scanning','quarantined');
CREATE TYPE "LocationCategory" AS ENUM ('in_class','canteen_lunch','en_route_bus','library','sports_ground','assembly_hall','dismissed_home','laboratory');

ALTER TABLE "Quiz" ALTER COLUMN "revealMarksMode" DROP DEFAULT;
ALTER TABLE "QuizAttemptSession" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "NotificationRecord" ALTER COLUMN "category" DROP DEFAULT,
  ALTER COLUMN "severity" DROP DEFAULT, ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "AbsenceRequest" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "AttendanceRecord" ALTER COLUMN "status" TYPE "AttendanceStatus" USING "status"::text::"AttendanceStatus";
ALTER TABLE "Submission" ALTER COLUMN "status" TYPE "SubmissionStatus" USING "status"::text::"SubmissionStatus";
ALTER TABLE "Quiz" ALTER COLUMN "revealMarksMode" TYPE "QuizRevealMarksMode" USING "revealMarksMode"::text::"QuizRevealMarksMode";
ALTER TABLE "QuizAttemptSession" ALTER COLUMN "status" TYPE "QuizAttemptStatus" USING "status"::text::"QuizAttemptStatus";
ALTER TABLE "NotificationRecord" ALTER COLUMN "category" TYPE "NotificationCategory" USING "category"::text::"NotificationCategory",
  ALTER COLUMN "severity" TYPE "NotificationSeverity" USING "severity"::text::"NotificationSeverity",
  ALTER COLUMN "type" TYPE "NotificationType" USING "type"::text::"NotificationType";
ALTER TABLE "PaymentRecord" ALTER COLUMN "status" TYPE "PaymentStatus" USING "status"::text::"PaymentStatus";
ALTER TABLE "AbsenceRequest" ALTER COLUMN "status" TYPE "AbsenceStatus" USING "status"::text::"AbsenceStatus";
ALTER TABLE "StoredFileRecord" ALTER COLUMN "integrityStatus" TYPE "FileIntegrityStatus" USING "integrityStatus"::text::"FileIntegrityStatus";
ALTER TABLE "StudentLocationRecord" ALTER COLUMN "category" TYPE "LocationCategory" USING "category"::text::"LocationCategory";

ALTER TABLE "Quiz" ALTER COLUMN "revealMarksMode" SET DEFAULT 'immediate'::"QuizRevealMarksMode";
ALTER TABLE "QuizAttemptSession" ALTER COLUMN "status" SET DEFAULT 'active'::"QuizAttemptStatus";
ALTER TABLE "NotificationRecord" ALTER COLUMN "category" SET DEFAULT 'COMMUNICATION'::"NotificationCategory",
  ALTER COLUMN "severity" SET DEFAULT 'normal'::"NotificationSeverity",
  ALTER COLUMN "type" SET DEFAULT 'general'::"NotificationType";
ALTER TABLE "AbsenceRequest" ALTER COLUMN "status" SET DEFAULT 'pending'::"AbsenceStatus";

COMMIT;
