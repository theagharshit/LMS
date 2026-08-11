-- Manual rollback. Recreates every removed compatibility column and derives it
-- from the still-authoritative normalized relationships before constraints are relaxed.
BEGIN;

ALTER TABLE "User"
  ADD COLUMN "schoolName" TEXT,
  ADD COLUMN "gradeLevel" INTEGER,
  ADD COLUMN "section" TEXT,
  ADD COLUMN "rollNumber" INTEGER,
  ADD COLUMN "childrenIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "subjectsTaught" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "User" u SET "schoolName" = s."name" FROM "School" s WHERE s."id" = u."schoolId";
UPDATE "User" u SET
  "gradeLevel" = c."gradeLevel", "section" = c."section",
  "rollNumber" = p."normalizedRollNumber"
FROM "StudentProfile" p JOIN "AcademicCohort" c ON c."id" = p."cohortId"
WHERE p."userId" = u."id";
UPDATE "User" u SET "childrenIds" = links.ids
FROM (SELECT "parentId", array_agg("studentId" ORDER BY "createdAt") ids
      FROM "ParentStudent" GROUP BY "parentId") links WHERE links."parentId" = u."id";
UPDATE "User" u SET "subjectsTaught" = assignments.names
FROM (SELECT ts."teacherId", array_agg(s."name" ORDER BY s."name") names
      FROM "TeacherSubject" ts JOIN "Subject" s ON s."id" = ts."subjectId"
      GROUP BY ts."teacherId") assignments WHERE assignments."teacherId" = u."id";
ALTER TABLE "User" ALTER COLUMN "schoolName" SET NOT NULL;

ALTER TABLE "StudentProfile"
  ADD COLUMN "attendancePercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "gradeLevel" INTEGER,
  ADD COLUMN "section" TEXT,
  ADD COLUMN "parentName" TEXT NOT NULL DEFAULT 'Parent',
  ADD COLUMN "parentPhone" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "level" INTEGER NOT NULL DEFAULT 0;
UPDATE "StudentProfile" p SET "gradeLevel" = c."gradeLevel", "section" = c."section"
FROM "AcademicCohort" c WHERE c."id" = p."cohortId";
UPDATE "StudentProfile" p SET
  "attendancePercentage" = stats.percentage,
  "level" = floor(sqrt(p."xpPoints" / 100.0))::integer
FROM (
  SELECT "studentId",
    100.0 * count(*) FILTER (WHERE "status" IN ('present', 'late')) / NULLIF(count(*), 0) percentage
  FROM "AttendanceRecord" GROUP BY "studentId"
) stats WHERE stats."studentId" = p."userId";
UPDATE "StudentProfile" p SET "parentName" = parent."name", "parentPhone" = COALESCE(parent."phone", '')
FROM "ParentStudent" link JOIN "User" parent ON parent."id" = link."parentId"
WHERE link."studentId" = p."userId" AND link."isPrimary";
ALTER TABLE "StudentProfile" ALTER COLUMN "gradeLevel" SET NOT NULL, ALTER COLUMN "section" SET NOT NULL;

ALTER TABLE "Classroom"
  ADD COLUMN "subject" TEXT,
  ADD COLUMN "gradeLevel" INTEGER,
  ADD COLUMN "section" TEXT,
  ADD COLUMN "teacherName" TEXT,
  ADD COLUMN "teacherAvatar" TEXT,
  ADD COLUMN "substituteTeacherIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "Classroom" c SET
  "subject" = s."name", "gradeLevel" = cohort."gradeLevel", "section" = cohort."section",
  "teacherName" = teacher."name", "teacherAvatar" = teacher."avatar"
FROM "Subject" s, "AcademicCohort" cohort, "User" teacher
WHERE s."id" = c."subjectId" AND cohort."id" = c."cohortId" AND teacher."id" = c."teacherId";
UPDATE "Classroom" c SET "substituteTeacherIds" = subs.ids
FROM (SELECT "classroomId", array_agg("teacherId") ids FROM "ClassroomSubstitute" GROUP BY "classroomId") subs
WHERE subs."classroomId" = c."id";
ALTER TABLE "Classroom" ALTER COLUMN "subject" SET NOT NULL, ALTER COLUMN "gradeLevel" SET NOT NULL,
  ALTER COLUMN "section" SET NOT NULL, ALTER COLUMN "teacherName" SET NOT NULL,
  ALTER COLUMN "teacherAvatar" SET NOT NULL;

ALTER TABLE "ModuleItem" ADD COLUMN "completedByStudentIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "ModuleItem" m SET "completedByStudentIds" = completions.ids
FROM (SELECT "moduleItemId", array_agg("studentId") ids FROM "ModuleCompletion" GROUP BY "moduleItemId") completions
WHERE completions."moduleItemId" = m."id";

ALTER TABLE "Assignment" ADD COLUMN "classroomName" TEXT, ADD COLUMN "subject" TEXT;
UPDATE "Assignment" a SET "classroomName" = c."name", "subject" = s."name"
FROM "Classroom" c JOIN "Subject" s ON s."id" = c."subjectId" WHERE c."id" = a."classroomId";
ALTER TABLE "Assignment" ALTER COLUMN "classroomName" SET NOT NULL, ALTER COLUMN "subject" SET NOT NULL;

ALTER TABLE "Quiz" ADD COLUMN "classroomName" TEXT, ADD COLUMN "subject" TEXT, ADD COLUMN "totalQuestions" INTEGER NOT NULL DEFAULT 0;
UPDATE "Quiz" q SET "classroomName" = c."name", "subject" = s."name",
  "totalQuestions" = (SELECT count(*) FROM "QuizQuestion" qq WHERE qq."quizId" = q."id")
FROM "Classroom" c JOIN "Subject" s ON s."id" = c."subjectId" WHERE c."id" = q."classroomId";
ALTER TABLE "Quiz" ALTER COLUMN "classroomName" SET NOT NULL, ALTER COLUMN "subject" SET NOT NULL;

ALTER TABLE "SubjectPerformance" ADD COLUMN "subject" TEXT;
UPDATE "SubjectPerformance" p SET "subject" = s."name" FROM "Subject" s WHERE s."id" = p."subjectId";
ALTER TABLE "SubjectPerformance" ALTER COLUMN "subject" SET NOT NULL;
ALTER TABLE "TermProgress" ADD COLUMN "term" TEXT;
UPDATE "TermProgress" p SET "term" = t."name" FROM "AcademicTerm" t WHERE t."id" = p."termId";
ALTER TABLE "TermProgress" ALTER COLUMN "term" SET NOT NULL;

ALTER TABLE "StoredFileRecord" ADD COLUMN "sizeFormatted" TEXT, ADD COLUMN "uploadedBy" TEXT;
UPDATE "StoredFileRecord" f SET
  "sizeFormatted" = CASE WHEN f."sizeBytes" < 1024 THEN f."sizeBytes" || ' B'
    WHEN f."sizeBytes" < 1048576 THEN round(f."sizeBytes" / 1024.0, 1) || ' KB'
    ELSE round(f."sizeBytes" / 1048576.0, 2) || ' MB' END,
  "uploadedBy" = u."name"
FROM "User" u WHERE u."id" = f."uploadedById";
ALTER TABLE "StoredFileRecord" ALTER COLUMN "sizeFormatted" SET NOT NULL, ALTER COLUMN "uploadedBy" SET NOT NULL;

ALTER TABLE "StoredFileRecord" ALTER COLUMN "uploadedById" DROP NOT NULL;
ALTER TABLE "TermProgress" ALTER COLUMN "termId" DROP NOT NULL;
ALTER TABLE "SubjectPerformance" ALTER COLUMN "subjectId" DROP NOT NULL;
ALTER TABLE "Classroom" ALTER COLUMN "schoolId" DROP NOT NULL, ALTER COLUMN "subjectId" DROP NOT NULL, ALTER COLUMN "cohortId" DROP NOT NULL;
ALTER TABLE "StudentProfile" ALTER COLUMN "cohortId" DROP NOT NULL, ALTER COLUMN "normalizedRollNumber" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "schoolId" DROP NOT NULL;
ALTER TABLE "StudentProfile" ALTER COLUMN "normalizedRollNumber" DROP DEFAULT;
DROP SEQUENCE "StudentProfile_normalizedRollNumber_seq";

COMMIT;
