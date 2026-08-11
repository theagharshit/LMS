-- Contract phase. All canonical foreign keys were populated and application
-- reads/writes were moved before these duplicated source columns are removed.
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "User" WHERE "schoolId" IS NULL)
    OR EXISTS (
      SELECT 1 FROM "StudentProfile"
      WHERE "cohortId" IS NULL OR "normalizedRollNumber" IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM "Classroom"
      WHERE "schoolId" IS NULL OR "subjectId" IS NULL OR "cohortId" IS NULL
    )
    OR EXISTS (SELECT 1 FROM "SubjectPerformance" WHERE "subjectId" IS NULL)
    OR EXISTS (SELECT 1 FROM "TermProgress" WHERE "termId" IS NULL)
    OR EXISTS (SELECT 1 FROM "StoredFileRecord" WHERE "uploadedById" IS NULL)
  THEN
    RAISE EXCEPTION 'Contract migration aborted: canonical references are incomplete';
  END IF;
END $$;

ALTER TABLE "User" ALTER COLUMN "schoolId" SET NOT NULL;
ALTER TABLE "StudentProfile" ALTER COLUMN "cohortId" SET NOT NULL;
ALTER TABLE "StudentProfile" ALTER COLUMN "normalizedRollNumber" SET NOT NULL;
ALTER TABLE "Classroom" ALTER COLUMN "schoolId" SET NOT NULL;
ALTER TABLE "Classroom" ALTER COLUMN "subjectId" SET NOT NULL;
ALTER TABLE "Classroom" ALTER COLUMN "cohortId" SET NOT NULL;
ALTER TABLE "SubjectPerformance" ALTER COLUMN "subjectId" SET NOT NULL;
ALTER TABLE "TermProgress" ALTER COLUMN "termId" SET NOT NULL;
ALTER TABLE "StoredFileRecord" ALTER COLUMN "uploadedById" SET NOT NULL;

CREATE SEQUENCE "StudentProfile_normalizedRollNumber_seq";
SELECT setval(
  '"StudentProfile_normalizedRollNumber_seq"',
  COALESCE((SELECT max("normalizedRollNumber") FROM "StudentProfile"), 0) + 1,
  false
);
ALTER SEQUENCE "StudentProfile_normalizedRollNumber_seq"
  OWNED BY "StudentProfile"."normalizedRollNumber";
ALTER TABLE "StudentProfile" ALTER COLUMN "normalizedRollNumber"
  SET DEFAULT nextval('"StudentProfile_normalizedRollNumber_seq"');

ALTER TABLE "User"
  DROP COLUMN "schoolName",
  DROP COLUMN "gradeLevel",
  DROP COLUMN "section",
  DROP COLUMN "rollNumber",
  DROP COLUMN "childrenIds",
  DROP COLUMN "subjectsTaught";

ALTER TABLE "StudentProfile"
  DROP COLUMN "attendancePercentage",
  DROP COLUMN "gradeLevel",
  DROP COLUMN "section",
  DROP COLUMN "parentName",
  DROP COLUMN "parentPhone",
  DROP COLUMN "level";

ALTER TABLE "Classroom"
  DROP COLUMN "subject",
  DROP COLUMN "gradeLevel",
  DROP COLUMN "section",
  DROP COLUMN "teacherName",
  DROP COLUMN "teacherAvatar",
  DROP COLUMN "substituteTeacherIds";

ALTER TABLE "ModuleItem" DROP COLUMN "completedByStudentIds";
ALTER TABLE "Assignment" DROP COLUMN "classroomName", DROP COLUMN "subject";
ALTER TABLE "Quiz" DROP COLUMN "classroomName", DROP COLUMN "subject", DROP COLUMN "totalQuestions";
ALTER TABLE "SubjectPerformance" DROP COLUMN "subject";
ALTER TABLE "TermProgress" DROP COLUMN "term";
ALTER TABLE "StoredFileRecord" DROP COLUMN "sizeFormatted", DROP COLUMN "uploadedBy";

COMMIT;
