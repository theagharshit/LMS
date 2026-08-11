-- Expand phase for core 3NF normalization.
-- Legacy columns remain intact until every application consumer has moved to the
-- canonical relations. The transaction aborts on inconsistent roll numbers;
-- no source row is deleted or silently rewritten.
BEGIN;

CREATE TABLE "School" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Kathmandu',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "School_name_key" ON "School"("name");

CREATE TABLE "Subject" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Subject_schoolId_idx" ON "Subject"("schoolId");
CREATE UNIQUE INDEX "Subject_schoolId_name_key" ON "Subject"("schoolId", "name");

CREATE TABLE "AcademicCohort" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "gradeLevel" INTEGER NOT NULL,
  "section" TEXT NOT NULL,
  CONSTRAINT "AcademicCohort_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AcademicCohort_schoolId_gradeLevel_idx" ON "AcademicCohort"("schoolId", "gradeLevel");
CREATE UNIQUE INDEX "AcademicCohort_schoolId_gradeLevel_section_key" ON "AcademicCohort"("schoolId", "gradeLevel", "section");

CREATE TABLE "AcademicTerm" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "startsAt" DATE,
  "endsAt" DATE,
  CONSTRAINT "AcademicTerm_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AcademicTerm_schoolId_name_key" ON "AcademicTerm"("schoolId", "name");
CREATE UNIQUE INDEX "AcademicTerm_schoolId_sequence_key" ON "AcademicTerm"("schoolId", "sequence");

CREATE TABLE "ParentStudent" (
  "parentId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "relationship" TEXT NOT NULL DEFAULT 'guardian',
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParentStudent_pkey" PRIMARY KEY ("parentId", "studentId")
);

CREATE TABLE "TeacherSubject" (
  "teacherId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  CONSTRAINT "TeacherSubject_pkey" PRIMARY KEY ("teacherId", "subjectId")
);

CREATE TABLE "ClassroomSubstitute" (
  "classroomId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClassroomSubstitute_pkey" PRIMARY KEY ("classroomId", "teacherId")
);

CREATE TABLE "ModuleCompletion" (
  "moduleItemId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModuleCompletion_pkey" PRIMARY KEY ("moduleItemId", "studentId")
);

ALTER TABLE "User" ADD COLUMN "phone" TEXT, ADD COLUMN "schoolId" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN "cohortId" TEXT, ADD COLUMN "normalizedRollNumber" INTEGER;
ALTER TABLE "Classroom" ADD COLUMN "cohortId" TEXT, ADD COLUMN "schoolId" TEXT, ADD COLUMN "subjectId" TEXT;
ALTER TABLE "CalendarEvent" ADD COLUMN "subjectId" TEXT;
ALTER TABLE "SubjectPerformance" ADD COLUMN "subjectId" TEXT;
ALTER TABLE "TermProgress" ADD COLUMN "termId" TEXT;

INSERT INTO "School" ("id", "name", "updatedAt")
SELECT 'school-' || substr(md5("schoolName"), 1, 16), "schoolName", CURRENT_TIMESTAMP
FROM "User"
GROUP BY "schoolName"
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "School" ("id", "name", "updatedAt")
SELECT 'school-default', 'Everest International Academy', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "School");

UPDATE "User" u
SET "schoolId" = s."id"
FROM "School" s
WHERE s."name" = u."schoolName";

WITH subject_names AS (
  SELECT u."schoolId", trim(c."subject") AS name
  FROM "Classroom" c JOIN "User" u ON u."id" = c."teacherId"
  UNION
  SELECT u."schoolId", trim(taught.name) AS name
  FROM "User" u CROSS JOIN LATERAL unnest(u."subjectsTaught") AS taught(name)
  UNION
  SELECT u."schoolId", trim(p."subject") AS name
  FROM "SubjectPerformance" p JOIN "User" u ON u."id" = p."studentId"
  UNION
  SELECT u."schoolId", trim(a."subject") AS name
  FROM "Assignment" a JOIN "Classroom" c ON c."id" = a."classroomId"
  JOIN "User" u ON u."id" = c."teacherId"
  UNION
  SELECT u."schoolId", trim(q."subject") AS name
  FROM "Quiz" q JOIN "Classroom" c ON c."id" = q."classroomId"
  JOIN "User" u ON u."id" = c."teacherId"
)
INSERT INTO "Subject" ("id", "schoolId", "name")
SELECT 'subject-' || substr(md5("schoolId" || ':' || lower(name)), 1, 16), "schoolId", name
FROM subject_names
WHERE name <> ''
GROUP BY "schoolId", name
ON CONFLICT ("schoolId", "name") DO NOTHING;

WITH cohort_values AS (
  SELECT u."schoolId", p."gradeLevel", p."section"
  FROM "StudentProfile" p JOIN "User" u ON u."id" = p."userId"
  UNION
  SELECT u."schoolId", c."gradeLevel", c."section"
  FROM "Classroom" c JOIN "User" u ON u."id" = c."teacherId"
)
INSERT INTO "AcademicCohort" ("id", "schoolId", "gradeLevel", "section")
SELECT 'cohort-' || substr(md5("schoolId" || ':' || "gradeLevel"::text || ':' || "section"), 1, 16),
       "schoolId", "gradeLevel", "section"
FROM cohort_values
GROUP BY "schoolId", "gradeLevel", "section"
ON CONFLICT ("schoolId", "gradeLevel", "section") DO NOTHING;

UPDATE "StudentProfile" p
SET "cohortId" = c."id", "normalizedRollNumber" = u."rollNumber"
FROM "User" u, "AcademicCohort" c
WHERE u."id" = p."userId"
  AND c."schoolId" = u."schoolId"
  AND c."gradeLevel" = p."gradeLevel"
  AND c."section" = p."section";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "StudentProfile"
    WHERE "cohortId" IS NULL OR "normalizedRollNumber" IS NULL
  ) THEN
    RAISE EXCEPTION 'Normalization aborted: every student requires a cohort and roll number';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "StudentProfile"
    GROUP BY "cohortId", "normalizedRollNumber" HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Normalization aborted: duplicate roll number within an academic cohort';
  END IF;
END $$;

UPDATE "Classroom" c
SET "schoolId" = u."schoolId",
    "subjectId" = s."id",
    "cohortId" = ac."id"
FROM "User" u, "Subject" s, "AcademicCohort" ac
WHERE u."id" = c."teacherId"
  AND s."schoolId" = u."schoolId" AND lower(s."name") = lower(c."subject")
  AND ac."schoolId" = u."schoolId"
  AND ac."gradeLevel" = c."gradeLevel" AND ac."section" = c."section";

WITH term_names AS (
  SELECT u."schoolId", tp."term"
  FROM "TermProgress" tp JOIN "User" u ON u."id" = tp."studentId"
  GROUP BY u."schoolId", tp."term"
), ordered AS (
  SELECT "schoolId", "term",
         row_number() OVER (
           PARTITION BY "schoolId"
           ORDER BY CASE
             WHEN lower("term") LIKE '1st%' THEN 1
             WHEN lower("term") LIKE 'mid%' THEN 2
             WHEN lower("term") LIKE '2nd%' THEN 3
             WHEN lower("term") LIKE 'final%' THEN 4
             ELSE 100
           END, "term"
         )::integer AS sequence
  FROM term_names
)
INSERT INTO "AcademicTerm" ("id", "schoolId", "name", "sequence")
SELECT 'term-' || substr(md5("schoolId" || ':' || lower("term")), 1, 16),
       "schoolId", "term", sequence
FROM ordered
ON CONFLICT ("schoolId", "name") DO NOTHING;

UPDATE "TermProgress" tp
SET "termId" = at."id"
FROM "User" u, "AcademicTerm" at
WHERE u."id" = tp."studentId"
  AND at."schoolId" = u."schoolId"
  AND at."name" = tp."term";

UPDATE "SubjectPerformance" sp
SET "subjectId" = s."id"
FROM "User" u, "Subject" s
WHERE u."id" = sp."studentId"
  AND s."schoolId" = u."schoolId"
  AND lower(s."name") = lower(sp."subject");

INSERT INTO "ParentStudent" ("parentId", "studentId", "isPrimary")
SELECT u."id", child."studentId", child.ordinality = 1
FROM "User" u
CROSS JOIN LATERAL unnest(u."childrenIds") WITH ORDINALITY child("studentId", ordinality)
JOIN "User" student ON student."id" = child."studentId"
WHERE u."role" = 'parent'
ON CONFLICT ("parentId", "studentId") DO NOTHING;

UPDATE "User" parent_user
SET "phone" = profile."parentPhone"
FROM "ParentStudent" link
JOIN "StudentProfile" profile ON profile."userId" = link."studentId"
WHERE parent_user."id" = link."parentId" AND link."isPrimary";

INSERT INTO "TeacherSubject" ("teacherId", "subjectId")
SELECT u."id", s."id"
FROM "User" u
CROSS JOIN LATERAL unnest(u."subjectsTaught") AS taught(name)
JOIN "Subject" s ON s."schoolId" = u."schoolId" AND lower(s."name") = lower(taught.name)
WHERE u."role" = 'teacher'
ON CONFLICT ("teacherId", "subjectId") DO NOTHING;

INSERT INTO "ClassroomSubstitute" ("classroomId", "teacherId")
SELECT c."id", substitute.teacher_id
FROM "Classroom" c CROSS JOIN LATERAL unnest(c."substituteTeacherIds") AS substitute(teacher_id)
JOIN "User" u ON u."id" = substitute.teacher_id
ON CONFLICT ("classroomId", "teacherId") DO NOTHING;

INSERT INTO "ModuleCompletion" ("moduleItemId", "studentId")
SELECT m."id", completion.student_id
FROM "ModuleItem" m CROSS JOIN LATERAL unnest(m."completedByStudentIds") AS completion(student_id)
JOIN "User" u ON u."id" = completion.student_id
ON CONFLICT ("moduleItemId", "studentId") DO NOTHING;

CREATE INDEX "ParentStudent_studentId_isPrimary_idx" ON "ParentStudent"("studentId", "isPrimary");
CREATE INDEX "TeacherSubject_subjectId_idx" ON "TeacherSubject"("subjectId");
CREATE INDEX "ClassroomSubstitute_teacherId_idx" ON "ClassroomSubstitute"("teacherId");
CREATE INDEX "ModuleCompletion_studentId_idx" ON "ModuleCompletion"("studentId");
CREATE INDEX "User_schoolId_role_isArchived_idx" ON "User"("schoolId", "role", "isArchived");
CREATE INDEX "StudentProfile_cohortId_isArchived_idx" ON "StudentProfile"("cohortId", "isArchived");
CREATE UNIQUE INDEX "StudentProfile_cohortId_normalizedRollNumber_key" ON "StudentProfile"("cohortId", "normalizedRollNumber");
CREATE INDEX "Classroom_schoolId_cohortId_idx" ON "Classroom"("schoolId", "cohortId");
CREATE INDEX "Classroom_teacherId_idx" ON "Classroom"("teacherId");
CREATE INDEX "Classroom_subjectId_idx" ON "Classroom"("subjectId");
CREATE INDEX "SubjectPerformance_subjectId_idx" ON "SubjectPerformance"("subjectId");
CREATE UNIQUE INDEX "SubjectPerformance_studentId_subjectId_key" ON "SubjectPerformance"("studentId", "subjectId");
CREATE INDEX "TermProgress_termId_idx" ON "TermProgress"("termId");
CREATE UNIQUE INDEX "TermProgress_studentId_termId_key" ON "TermProgress"("studentId", "termId");

ALTER TABLE "Subject" ADD CONSTRAINT "Subject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicCohort" ADD CONSTRAINT "AcademicCohort_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicTerm" ADD CONSTRAINT "AcademicTerm_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParentStudent" ADD CONSTRAINT "ParentStudent_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentStudent" ADD CONSTRAINT "ParentStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherSubject" ADD CONSTRAINT "TeacherSubject_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherSubject" ADD CONSTRAINT "TeacherSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "AcademicCohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "AcademicCohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassroomSubstitute" ADD CONSTRAINT "ClassroomSubstitute_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassroomSubstitute" ADD CONSTRAINT "ClassroomSubstitute_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModuleCompletion" ADD CONSTRAINT "ModuleCompletion_moduleItemId_fkey" FOREIGN KEY ("moduleItemId") REFERENCES "ModuleItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModuleCompletion" ADD CONSTRAINT "ModuleCompletion_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SubjectPerformance" ADD CONSTRAINT "SubjectPerformance_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TermProgress" ADD CONSTRAINT "TermProgress_termId_fkey" FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
