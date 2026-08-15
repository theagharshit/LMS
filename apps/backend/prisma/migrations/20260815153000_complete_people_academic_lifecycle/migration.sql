-- Complete student, parent, teacher, timetable, examination and archival lifecycle.
DO $$ BEGIN
  CREATE TYPE "StudentEnrollmentStatus" AS ENUM ('active', 'promoted', 'retained', 'left', 'graduated', 'transferred');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "TeacherEmploymentStatus" AS ENUM ('active', 'on_leave', 'left');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "ExamStatus" AS ENUM ('draft', 'published', 'marks_open', 'marks_closed', 'finalized', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "StudentLifecycleEventType" AS ENUM ('enrolled', 'promoted', 'retained', 'transferred', 'left', 'graduated', 'restored');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "ReportCardResult" AS ENUM ('promoted', 'retained', 'graduated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Subject"
  ADD COLUMN IF NOT EXISTS "code" TEXT,
  ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "AcademicTerm"
  ADD COLUMN IF NOT EXISTS "academicYearId" TEXT,
  ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;

DROP INDEX IF EXISTS "AcademicTerm_schoolId_name_key";
DROP INDEX IF EXISTS "AcademicTerm_schoolId_sequence_key";

ALTER TABLE "ParentStudent"
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "endedAt" TIMESTAMP(3);

ALTER TABLE "Classroom"
  ADD COLUMN IF NOT EXISTS "academicYearId" TEXT;

ALTER TABLE "ClassroomEnrollment"
  ADD COLUMN IF NOT EXISTS "endedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "StudentProfile"
  ADD COLUMN IF NOT EXISTS "admissionNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "admittedAt" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "leftAt" DATE,
  ADD COLUMN IF NOT EXISTS "dateOfBirth" DATE,
  ADD COLUMN IF NOT EXISTS "gender" TEXT,
  ADD COLUMN IF NOT EXISTS "bloodGroup" TEXT,
  ADD COLUMN IF NOT EXISTS "medicalNotes" TEXT;

CREATE TABLE IF NOT EXISTS "AcademicYear" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "startsAt" DATE NOT NULL,
  "endsAt" DATE NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TeacherProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "employeeNumber" TEXT,
  "joinedAt" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leftAt" DATE,
  "employmentStatus" "TeacherEmploymentStatus" NOT NULL DEFAULT 'active',
  "address" TEXT,
  "emergencyContactName" TEXT,
  "emergencyContactPhone" TEXT,
  "qualification" TEXT,
  "specialization" TEXT,
  CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ParentProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "address" TEXT,
  "occupation" TEXT,
  "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
  "verifiedAt" TIMESTAMP(3),
  CONSTRAINT "ParentProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StudentAcademicEnrollment" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "cohortId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "rollNumber" INTEGER NOT NULL,
  "status" "StudentEnrollmentStatus" NOT NULL DEFAULT 'active',
  "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "exitReason" TEXT,
  CONSTRAINT "StudentAcademicEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StudentLifecycleEvent" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "type" "StudentLifecycleEventType" NOT NULL,
  "fromCohortId" TEXT,
  "toCohortId" TEXT,
  "academicYearId" TEXT,
  "reason" TEXT,
  "metadata" JSONB,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentLifecycleEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TeachingAssignment" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "classroomId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "startsAt" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" DATE,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "TeachingAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TimetableSlot" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "classroomId" TEXT NOT NULL,
  "cohortId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "periodNumber" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "roomNumber" TEXT NOT NULL,
  "requiredBooks" TEXT,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "TimetableSlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BellScheduleEntry" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "BellScheduleEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SchoolHoliday" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "description" TEXT,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "SchoolHoliday_pkey" PRIMARY KEY ("id")
);

-- Some early installations received scheduling tables through `prisma db push`
-- before they entered migration history. Reconcile those legacy table shapes
-- while keeping this migration valid for a clean database.
ALTER TABLE "TimetableSlot"
  ADD COLUMN IF NOT EXISTS "academicYearId" TEXT,
  ADD COLUMN IF NOT EXISTS "requiredBooks" TEXT,
  ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'TimetableSlot'
      AND column_name = 'dayOfWeek' AND data_type <> 'integer'
  ) THEN
    ALTER TABLE "TimetableSlot" ALTER COLUMN "dayOfWeek" TYPE INTEGER
    USING CASE LOWER("dayOfWeek")
      WHEN 'sunday' THEN 0 WHEN 'monday' THEN 1 WHEN 'tuesday' THEN 2
      WHEN 'wednesday' THEN 3 WHEN 'thursday' THEN 4 WHEN 'friday' THEN 5
      WHEN 'saturday' THEN 6 ELSE "dayOfWeek"::INTEGER
    END;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'SchoolHoliday' AND column_name = 'title'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'SchoolHoliday' AND column_name = 'name'
  ) THEN
    ALTER TABLE "SchoolHoliday" RENAME COLUMN "title" TO "name";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'SchoolHoliday'
      AND column_name = 'date' AND data_type <> 'date'
  ) THEN
    ALTER TABLE "SchoolHoliday" ALTER COLUMN "date" TYPE DATE USING "date"::DATE;
  END IF;
END $$;

ALTER TABLE "SchoolHoliday"
  ADD COLUMN IF NOT EXISTS "academicYearId" TEXT,
  ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "Exam" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "termId" TEXT,
  "name" TEXT NOT NULL,
  "status" "ExamStatus" NOT NULL DEFAULT 'draft',
  "startsAt" DATE NOT NULL,
  "endsAt" DATE NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ExamSubject" (
  "id" TEXT NOT NULL,
  "examId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "classroomId" TEXT,
  "examDate" DATE,
  "startTime" TEXT,
  "endTime" TEXT,
  "totalMarks" DOUBLE PRECISION NOT NULL,
  "passMarks" DOUBLE PRECISION NOT NULL,
  "marksDueAt" TIMESTAMP(3),
  CONSTRAINT "ExamSubject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ExamMark" (
  "id" TEXT NOT NULL,
  "examSubjectId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "marksObtained" DOUBLE PRECISION,
  "isAbsent" BOOLEAN NOT NULL DEFAULT false,
  "remarks" TEXT,
  "submittedById" TEXT NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExamMark_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StudentReportCard" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "cohortId" TEXT NOT NULL,
  "finalPercentage" DOUBLE PRECISION NOT NULL,
  "finalGrade" TEXT NOT NULL,
  "attendancePercentage" DOUBLE PRECISION NOT NULL,
  "result" "ReportCardResult" NOT NULL,
  "snapshot" JSONB NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentReportCard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StudentReportCardSubject" (
  "id" TEXT NOT NULL,
  "reportCardId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "percentage" DOUBLE PRECISION NOT NULL,
  "grade" TEXT NOT NULL,
  "teacherRemark" TEXT,
  CONSTRAINT "StudentReportCardSubject_pkey" PRIMARY KEY ("id")
);

-- Preserve the currently active state when upgrading an existing installation.
-- Every legacy school gets a bounded current calendar year; administrators can
-- subsequently create the institution's exact academic calendar and roll over.
INSERT INTO "AcademicYear" (
  "id", "schoolId", "name", "startsAt", "endsAt", "isActive", "isArchived", "createdAt", "updatedAt"
)
SELECT
  'legacy-academic-year-' || "id",
  "id",
  EXTRACT(YEAR FROM CURRENT_DATE)::TEXT,
  MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 1, 1),
  MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 12, 31),
  true,
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "School"
WHERE NOT EXISTS (
  SELECT 1 FROM "AcademicYear" AS existing WHERE existing."schoolId" = "School"."id"
)
ON CONFLICT ("id") DO NOTHING;

UPDATE "AcademicTerm" AS term
SET "academicYearId" = (
  SELECT year."id" FROM "AcademicYear" AS year
  WHERE year."schoolId" = term."schoolId"
  ORDER BY year."isActive" DESC, year."startsAt" DESC LIMIT 1
)
WHERE term."academicYearId" IS NULL;

UPDATE "Classroom" AS classroom
SET "academicYearId" = (
  SELECT year."id" FROM "AcademicYear" AS year
  WHERE year."schoolId" = classroom."schoolId"
  ORDER BY year."isActive" DESC, year."startsAt" DESC LIMIT 1
)
WHERE classroom."academicYearId" IS NULL;

UPDATE "TimetableSlot" AS slot
SET "academicYearId" = COALESCE(
  (SELECT classroom."academicYearId" FROM "Classroom" AS classroom WHERE classroom."id" = slot."classroomId"),
  (SELECT year."id" FROM "AcademicYear" AS year WHERE year."schoolId" = slot."schoolId"
   ORDER BY year."isActive" DESC, year."startsAt" DESC LIMIT 1)
)
WHERE slot."academicYearId" IS NULL;

UPDATE "SchoolHoliday" AS holiday
SET "academicYearId" = COALESCE(
  (SELECT year."id" FROM "AcademicYear" AS year
   WHERE year."schoolId" = holiday."schoolId" AND holiday."date" BETWEEN year."startsAt" AND year."endsAt"
   ORDER BY year."isActive" DESC, year."startsAt" DESC LIMIT 1),
  (SELECT year."id" FROM "AcademicYear" AS year
   WHERE year."schoolId" = holiday."schoolId"
   ORDER BY year."isActive" DESC, year."startsAt" DESC LIMIT 1)
)
WHERE holiday."academicYearId" IS NULL;

ALTER TABLE "TimetableSlot" ALTER COLUMN "academicYearId" SET NOT NULL;
ALTER TABLE "SchoolHoliday" ALTER COLUMN "academicYearId" SET NOT NULL;

INSERT INTO "TeacherProfile" (
  "id", "userId", "joinedAt", "leftAt", "employmentStatus"
)
SELECT
  'legacy-teacher-profile-' || "id",
  "id",
  "createdAt"::DATE,
  CASE WHEN "isArchived" THEN CURRENT_DATE ELSE NULL END,
  CASE WHEN "isArchived" THEN 'left'::"TeacherEmploymentStatus" ELSE 'active'::"TeacherEmploymentStatus" END
FROM "User"
WHERE "role" = 'teacher'
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "ParentProfile" ("id", "userId", "verificationStatus", "verifiedAt")
SELECT
  'legacy-parent-profile-' || "id",
  "id",
  'verified_enrolled',
  "createdAt"
FROM "User"
WHERE "role" = 'parent'
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "StudentAcademicEnrollment" (
  "id", "studentId", "cohortId", "academicYearId", "rollNumber", "status", "enrolledAt", "endedAt", "exitReason"
)
SELECT
  'legacy-student-enrollment-' || profile."userId",
  profile."userId",
  profile."cohortId",
  year."id",
  profile."normalizedRollNumber",
  CASE
    WHEN usr."isArchived" OR profile."isArchived" THEN 'left'::"StudentEnrollmentStatus"
    ELSE 'active'::"StudentEnrollmentStatus"
  END,
  usr."createdAt",
  CASE WHEN usr."isArchived" OR profile."isArchived" THEN CURRENT_TIMESTAMP ELSE NULL END,
  CASE WHEN usr."isArchived" OR profile."isArchived" THEN 'Archived before lifecycle migration' ELSE NULL END
FROM "StudentProfile" AS profile
JOIN "User" AS usr ON usr."id" = profile."userId"
JOIN LATERAL (
  SELECT "id" FROM "AcademicYear"
  WHERE "schoolId" = usr."schoolId"
  ORDER BY "isActive" DESC, "startsAt" DESC LIMIT 1
) AS year ON true
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "StudentLifecycleEvent" (
  "id", "studentId", "type", "toCohortId", "academicYearId", "reason", "createdAt"
)
SELECT
  'legacy-student-lifecycle-' || profile."userId",
  profile."userId",
  'enrolled'::"StudentLifecycleEventType",
  profile."cohortId",
  year."id",
  'Imported from the pre-lifecycle data model',
  usr."createdAt"
FROM "StudentProfile" AS profile
JOIN "User" AS usr ON usr."id" = profile."userId"
JOIN LATERAL (
  SELECT "id" FROM "AcademicYear"
  WHERE "schoolId" = usr."schoolId"
  ORDER BY "isActive" DESC, "startsAt" DESC LIMIT 1
) AS year ON true
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "ParentControlSettings" (
  "id", "studentId", "allowTeacherDirectChat", "allowPeerDiscussion",
  "missingHomeworkAlerts", "lowAttendanceAlerts", "weeklyDigestEmail",
  "screenTimeLimitMinutes", "requireApprovalForOutboundMsgs", "timezone"
)
SELECT
  'legacy-parent-controls-' || profile."userId",
  profile."userId",
  true,
  false,
  true,
  true,
  true,
  120,
  true,
  school."timezone"
FROM "StudentProfile" AS profile
JOIN "User" AS usr ON usr."id" = profile."userId"
JOIN "School" AS school ON school."id" = usr."schoolId"
WHERE NOT EXISTS (
  SELECT 1 FROM "ParentControlSettings" AS settings
  WHERE settings."studentId" = profile."userId"
);

INSERT INTO "TeachingAssignment" (
  "id", "teacherId", "classroomId", "subjectId", "academicYearId", "startsAt", "endsAt", "isActive"
)
SELECT
  'legacy-teaching-assignment-' || classroom."id",
  classroom."teacherId",
  classroom."id",
  classroom."subjectId",
  classroom."academicYearId",
  CURRENT_DATE,
  CASE WHEN classroom."isArchived" OR teacher."isArchived" THEN CURRENT_DATE ELSE NULL END,
  NOT (classroom."isArchived" OR teacher."isArchived")
FROM "Classroom" AS classroom
JOIN "User" AS teacher ON teacher."id" = classroom."teacherId"
ON CONFLICT ("id") DO NOTHING;

UPDATE "ClassroomEnrollment" AS enrollment
SET
  "isActive" = NOT (student."isArchived" OR classroom."isArchived"),
  "endedAt" = CASE
    WHEN student."isArchived" OR classroom."isArchived" THEN CURRENT_TIMESTAMP
    ELSE NULL
  END
FROM "User" AS student, "Classroom" AS classroom
WHERE enrollment."studentId" = student."id"
  AND enrollment."classroomId" = classroom."id";

UPDATE "ParentStudent" AS link
SET
  "isActive" = NOT (parent."isArchived" OR student."isArchived"),
  "endedAt" = CASE
    WHEN parent."isArchived" OR student."isArchived" THEN CURRENT_TIMESTAMP
    ELSE NULL
  END
FROM "User" AS parent, "User" AS student
WHERE link."parentId" = parent."id"
  AND link."studentId" = student."id";

CREATE UNIQUE INDEX IF NOT EXISTS "AcademicYear_schoolId_name_key" ON "AcademicYear"("schoolId", "name");
CREATE INDEX IF NOT EXISTS "AcademicYear_schoolId_isActive_isArchived_idx" ON "AcademicYear"("schoolId", "isActive", "isArchived");
CREATE UNIQUE INDEX IF NOT EXISTS "TeacherProfile_userId_key" ON "TeacherProfile"("userId");
CREATE INDEX IF NOT EXISTS "TeacherProfile_employmentStatus_idx" ON "TeacherProfile"("employmentStatus");
CREATE UNIQUE INDEX IF NOT EXISTS "ParentProfile_userId_key" ON "ParentProfile"("userId");
CREATE INDEX IF NOT EXISTS "ParentProfile_verificationStatus_idx" ON "ParentProfile"("verificationStatus");
CREATE UNIQUE INDEX IF NOT EXISTS "StudentAcademicEnrollment_studentId_academicYearId_key" ON "StudentAcademicEnrollment"("studentId", "academicYearId");
CREATE UNIQUE INDEX IF NOT EXISTS "StudentAcademicEnrollment_academicYearId_cohortId_rollNumber_key" ON "StudentAcademicEnrollment"("academicYearId", "cohortId", "rollNumber");
CREATE INDEX IF NOT EXISTS "StudentAcademicEnrollment_cohortId_academicYearId_status_idx" ON "StudentAcademicEnrollment"("cohortId", "academicYearId", "status");
CREATE INDEX IF NOT EXISTS "StudentAcademicEnrollment_studentId_status_idx" ON "StudentAcademicEnrollment"("studentId", "status");
CREATE INDEX IF NOT EXISTS "StudentLifecycleEvent_studentId_createdAt_idx" ON "StudentLifecycleEvent"("studentId", "createdAt");
CREATE INDEX IF NOT EXISTS "StudentLifecycleEvent_academicYearId_type_idx" ON "StudentLifecycleEvent"("academicYearId", "type");
CREATE UNIQUE INDEX IF NOT EXISTS "TeachingAssignment_teacherId_classroomId_academicYearId_key" ON "TeachingAssignment"("teacherId", "classroomId", "academicYearId");
CREATE INDEX IF NOT EXISTS "TeachingAssignment_teacherId_academicYearId_isActive_idx" ON "TeachingAssignment"("teacherId", "academicYearId", "isActive");
CREATE INDEX IF NOT EXISTS "TeachingAssignment_classroomId_isActive_idx" ON "TeachingAssignment"("classroomId", "isActive");
CREATE UNIQUE INDEX IF NOT EXISTS "TimetableSlot_active_teacher_slot_key" ON "TimetableSlot"("academicYearId", "dayOfWeek", "periodNumber", "teacherId") WHERE "isArchived" = false;
CREATE UNIQUE INDEX IF NOT EXISTS "TimetableSlot_active_cohort_slot_key" ON "TimetableSlot"("academicYearId", "dayOfWeek", "periodNumber", "cohortId") WHERE "isArchived" = false;
CREATE UNIQUE INDEX IF NOT EXISTS "TimetableSlot_active_room_slot_key" ON "TimetableSlot"("academicYearId", "dayOfWeek", "periodNumber", "roomNumber") WHERE "isArchived" = false;
CREATE INDEX IF NOT EXISTS "TimetableSlot_schoolId_academicYearId_dayOfWeek_periodNumber_idx" ON "TimetableSlot"("schoolId", "academicYearId", "dayOfWeek", "periodNumber");
CREATE INDEX IF NOT EXISTS "TimetableSlot_classroomId_isArchived_idx" ON "TimetableSlot"("classroomId", "isArchived");
CREATE UNIQUE INDEX IF NOT EXISTS "BellScheduleEntry_active_sequence_key" ON "BellScheduleEntry"("academicYearId", "sequence") WHERE "isArchived" = false;
CREATE INDEX IF NOT EXISTS "BellScheduleEntry_schoolId_academicYearId_isArchived_idx" ON "BellScheduleEntry"("schoolId", "academicYearId", "isArchived");
CREATE UNIQUE INDEX IF NOT EXISTS "SchoolHoliday_schoolId_date_key" ON "SchoolHoliday"("schoolId", "date");
CREATE INDEX IF NOT EXISTS "SchoolHoliday_academicYearId_isArchived_date_idx" ON "SchoolHoliday"("academicYearId", "isArchived", "date");
CREATE UNIQUE INDEX IF NOT EXISTS "Exam_academicYearId_name_key" ON "Exam"("academicYearId", "name");
CREATE INDEX IF NOT EXISTS "Exam_schoolId_academicYearId_status_idx" ON "Exam"("schoolId", "academicYearId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "ExamSubject_examId_subjectId_classroomId_key" ON "ExamSubject"("examId", "subjectId", "classroomId");
CREATE INDEX IF NOT EXISTS "ExamSubject_classroomId_examDate_idx" ON "ExamSubject"("classroomId", "examDate");
CREATE UNIQUE INDEX IF NOT EXISTS "ExamMark_examSubjectId_studentId_key" ON "ExamMark"("examSubjectId", "studentId");
CREATE INDEX IF NOT EXISTS "ExamMark_studentId_submittedAt_idx" ON "ExamMark"("studentId", "submittedAt");
CREATE INDEX IF NOT EXISTS "ExamMark_submittedById_submittedAt_idx" ON "ExamMark"("submittedById", "submittedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "StudentReportCard_studentId_academicYearId_key" ON "StudentReportCard"("studentId", "academicYearId");
CREATE INDEX IF NOT EXISTS "StudentReportCard_academicYearId_cohortId_idx" ON "StudentReportCard"("academicYearId", "cohortId");
CREATE UNIQUE INDEX IF NOT EXISTS "StudentReportCardSubject_reportCardId_subjectId_key" ON "StudentReportCardSubject"("reportCardId", "subjectId");
CREATE INDEX IF NOT EXISTS "StudentReportCardSubject_subjectId_idx" ON "StudentReportCardSubject"("subjectId");
CREATE INDEX IF NOT EXISTS "AcademicTerm_academicYearId_sequence_idx" ON "AcademicTerm"("academicYearId", "sequence");
CREATE UNIQUE INDEX IF NOT EXISTS "AcademicTerm_active_name_key" ON "AcademicTerm"("schoolId", "academicYearId", "name") WHERE "isArchived" = false;
CREATE UNIQUE INDEX IF NOT EXISTS "AcademicTerm_active_sequence_key" ON "AcademicTerm"("schoolId", "academicYearId", "sequence") WHERE "isArchived" = false;
CREATE INDEX IF NOT EXISTS "Classroom_academicYearId_isArchived_idx" ON "Classroom"("academicYearId", "isArchived");
CREATE INDEX IF NOT EXISTS "ClassroomEnrollment_studentId_isActive_idx" ON "ClassroomEnrollment"("studentId", "isActive");

-- Replace foreign keys/indexes from the pre-migration scheduling prototype.
ALTER TABLE "TimetableSlot" DROP CONSTRAINT IF EXISTS "TimetableSlot_schoolId_fkey";
ALTER TABLE "TimetableSlot" DROP CONSTRAINT IF EXISTS "TimetableSlot_classroomId_fkey";
ALTER TABLE "TimetableSlot" DROP CONSTRAINT IF EXISTS "TimetableSlot_cohortId_fkey";
ALTER TABLE "TimetableSlot" DROP CONSTRAINT IF EXISTS "TimetableSlot_subjectId_fkey";
ALTER TABLE "TimetableSlot" DROP CONSTRAINT IF EXISTS "TimetableSlot_teacherId_fkey";
ALTER TABLE "SchoolHoliday" DROP CONSTRAINT IF EXISTS "SchoolHoliday_schoolId_fkey";
DROP INDEX IF EXISTS "TimetableSlot_schoolId_cohortId_dayOfWeek_periodNumber_acad_key";
DROP INDEX IF EXISTS "TimetableSlot_schoolId_roomNumber_dayOfWeek_periodNumber_ac_key";
DROP INDEX IF EXISTS "TimetableSlot_schoolId_teacherId_dayOfWeek_periodNumber_aca_key";

ALTER TABLE "AcademicYear" ADD CONSTRAINT "AcademicYear_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AcademicTerm" ADD CONSTRAINT "AcademicTerm_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentProfile" ADD CONSTRAINT "ParentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentAcademicEnrollment" ADD CONSTRAINT "StudentAcademicEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentAcademicEnrollment" ADD CONSTRAINT "StudentAcademicEnrollment_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "AcademicCohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentAcademicEnrollment" ADD CONSTRAINT "StudentAcademicEnrollment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentLifecycleEvent" ADD CONSTRAINT "StudentLifecycleEvent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentLifecycleEvent" ADD CONSTRAINT "StudentLifecycleEvent_fromCohortId_fkey" FOREIGN KEY ("fromCohortId") REFERENCES "AcademicCohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentLifecycleEvent" ADD CONSTRAINT "StudentLifecycleEvent_toCohortId_fkey" FOREIGN KEY ("toCohortId") REFERENCES "AcademicCohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Broadcast metadata keeps school announcements canonical and removable without
-- inventing client-side IDs or losing the original audience after a reload.
ALTER TABLE "NotificationRecord" ADD COLUMN IF NOT EXISTS "broadcastId" TEXT;
ALTER TABLE "NotificationRecord" ADD COLUMN IF NOT EXISTS "targetAudience" TEXT;
CREATE INDEX IF NOT EXISTS "NotificationRecord_broadcastId_idx" ON "NotificationRecord"("broadcastId");
ALTER TABLE "StudentLifecycleEvent" ADD CONSTRAINT "StudentLifecycleEvent_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentLifecycleEvent" ADD CONSTRAINT "StudentLifecycleEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "AcademicCohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BellScheduleEntry" ADD CONSTRAINT "BellScheduleEntry_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BellScheduleEntry" ADD CONSTRAINT "BellScheduleEntry_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchoolHoliday" ADD CONSTRAINT "SchoolHoliday_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchoolHoliday" ADD CONSTRAINT "SchoolHoliday_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_termId_fkey" FOREIGN KEY ("termId") REFERENCES "AcademicTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExamSubject" ADD CONSTRAINT "ExamSubject_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExamSubject" ADD CONSTRAINT "ExamSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExamSubject" ADD CONSTRAINT "ExamSubject_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExamMark" ADD CONSTRAINT "ExamMark_examSubjectId_fkey" FOREIGN KEY ("examSubjectId") REFERENCES "ExamSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExamMark" ADD CONSTRAINT "ExamMark_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExamMark" ADD CONSTRAINT "ExamMark_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentReportCard" ADD CONSTRAINT "StudentReportCard_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentReportCard" ADD CONSTRAINT "StudentReportCard_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentReportCard" ADD CONSTRAINT "StudentReportCard_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "AcademicCohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentReportCardSubject" ADD CONSTRAINT "StudentReportCardSubject_reportCardId_fkey" FOREIGN KEY ("reportCardId") REFERENCES "StudentReportCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentReportCardSubject" ADD CONSTRAINT "StudentReportCardSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AcademicYear" ADD CONSTRAINT "AcademicYear_dates_check" CHECK ("endsAt" >= "startsAt" AND "endsAt" <= "startsAt" + INTERVAL '366 days');
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_day_check" CHECK ("dayOfWeek" BETWEEN 0 AND 6);
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_period_check" CHECK ("periodNumber" BETWEEN 1 AND 20);
ALTER TABLE "ExamSubject" ADD CONSTRAINT "ExamSubject_marks_check" CHECK ("totalMarks" > 0 AND "passMarks" >= 0 AND "passMarks" <= "totalMarks");
ALTER TABLE "ExamMark" ADD CONSTRAINT "ExamMark_absence_or_marks_check" CHECK (("isAbsent" = true AND "marksObtained" IS NULL) OR ("isAbsent" = false AND "marksObtained" IS NOT NULL AND "marksObtained" >= 0));
