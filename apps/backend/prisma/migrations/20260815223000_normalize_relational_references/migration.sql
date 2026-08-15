-- Normalize mutable identity and placement data around canonical foreign-key references.
-- This migration backfills every new reference before removing redundant text columns.

-- Creator references are added as nullable first so existing content can be backfilled.
ALTER TABLE "Assignment" ADD COLUMN "createdById" TEXT;
ALTER TABLE "ModuleItem" ADD COLUMN "createdById" TEXT;
ALTER TABLE "Quiz" ADD COLUMN "createdById" TEXT;

UPDATE "Assignment" AS assignment
SET "createdById" = classroom."teacherId"
FROM "Classroom" AS classroom
WHERE classroom."id" = assignment."classroomId";

UPDATE "ModuleItem" AS module_item
SET "createdById" = classroom."teacherId"
FROM "Classroom" AS classroom
WHERE classroom."id" = module_item."classroomId";

UPDATE "Quiz" AS quiz
SET "createdById" = classroom."teacherId"
FROM "Classroom" AS classroom
WHERE classroom."id" = quiz."classroomId";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Assignment" WHERE "createdById" IS NULL)
    OR EXISTS (SELECT 1 FROM "ModuleItem" WHERE "createdById" IS NULL)
    OR EXISTS (SELECT 1 FROM "Quiz" WHERE "createdById" IS NULL) THEN
    RAISE EXCEPTION 'Cannot normalize content creators because one or more classroom teachers are missing';
  END IF;
END $$;

ALTER TABLE "Assignment" ALTER COLUMN "createdById" SET NOT NULL;
ALTER TABLE "ModuleItem" ALTER COLUMN "createdById" SET NOT NULL;
ALTER TABLE "Quiz" ALTER COLUMN "createdById" SET NOT NULL;

-- Preserve external location reporters as first-class school-scoped records.
CREATE TABLE "ExternalLocationReporter" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  CONSTRAINT "ExternalLocationReporter_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExternalLocationReporter_schoolId_idx"
  ON "ExternalLocationReporter"("schoolId");
CREATE UNIQUE INDEX "ExternalLocationReporter_schoolId_name_key"
  ON "ExternalLocationReporter"("schoolId", "name");

ALTER TABLE "StudentLocationRecord"
  ADD COLUMN "updatedById" TEXT,
  ADD COLUMN "externalReporterId" TEXT;

-- Prefer an existing school user when the legacy updater name identifies one.
UPDATE "StudentLocationRecord" AS location
SET "updatedById" = (
  SELECT updater."id"
  FROM "User" AS student
  JOIN "User" AS updater ON updater."schoolId" = student."schoolId"
  WHERE student."id" = location."studentId"
    AND LOWER(TRIM(updater."name")) = LOWER(TRIM(location."updatedBy"))
  ORDER BY updater."id"
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM "User" AS student
  JOIN "User" AS updater ON updater."schoolId" = student."schoolId"
  WHERE student."id" = location."studentId"
    AND LOWER(TRIM(updater."name")) = LOWER(TRIM(location."updatedBy"))
);

INSERT INTO "ExternalLocationReporter" ("id", "schoolId", "name", "role")
SELECT DISTINCT
  'legacy-location-reporter-' || SUBSTRING(
    MD5(student."schoolId" || ':' || COALESCE(NULLIF(TRIM(location."updatedBy"), ''), 'Unknown reporter')),
    1,
    24
  ),
  student."schoolId",
  COALESCE(NULLIF(TRIM(location."updatedBy"), ''), 'Unknown reporter'),
  COALESCE(NULLIF(TRIM(location."updatedByRole"), ''), 'external')
FROM "StudentLocationRecord" AS location
JOIN "User" AS student ON student."id" = location."studentId"
WHERE location."updatedById" IS NULL
ON CONFLICT ("schoolId", "name") DO NOTHING;

UPDATE "StudentLocationRecord" AS location
SET "externalReporterId" = reporter."id"
FROM "User" AS student
JOIN "ExternalLocationReporter" AS reporter ON reporter."schoolId" = student."schoolId"
WHERE student."id" = location."studentId"
  AND reporter."name" = COALESCE(NULLIF(TRIM(location."updatedBy"), ''), 'Unknown reporter')
  AND location."updatedById" IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "StudentLocationRecord"
    WHERE "updatedById" IS NULL AND "externalReporterId" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot normalize one or more student location reporters';
  END IF;

  IF EXISTS (
    SELECT "studentId"
    FROM "StudentLocationRecord"
    GROUP BY "studentId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot establish one current location per student while duplicate records exist';
  END IF;
END $$;

-- Academic placement must already exist in the normalized enrollment history.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "StudentProfile" AS profile
    WHERE NOT EXISTS (
      SELECT 1
      FROM "StudentAcademicEnrollment" AS enrollment
      WHERE enrollment."studentId" = profile."userId"
        AND enrollment."cohortId" = profile."cohortId"
        AND enrollment."rollNumber" = profile."normalizedRollNumber"
    )
  ) THEN
    RAISE EXCEPTION 'Cannot remove StudentProfile placement fields before enrollment history is backfilled';
  END IF;
END $$;

-- Required references must be complete before nullability is tightened.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "PostComment" WHERE "authorId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot normalize comments with a missing author';
  END IF;
  IF EXISTS (SELECT 1 FROM "AttendanceRecord" WHERE "markedById" IS NULL) THEN
    RAISE EXCEPTION 'Cannot normalize attendance with a missing marker';
  END IF;
END $$;

-- Replace delete-cascade identity relationships with history-preserving restrictions.
ALTER TABLE "AttendanceRecord" DROP CONSTRAINT "AttendanceRecord_markedById_fkey";
ALTER TABLE "AttendanceRecord" DROP CONSTRAINT "AttendanceRecord_studentId_fkey";
ALTER TABLE "DirectMessage" DROP CONSTRAINT "DirectMessage_receiverId_fkey";
ALTER TABLE "DirectMessage" DROP CONSTRAINT "DirectMessage_senderId_fkey";
ALTER TABLE "NotificationRecord" DROP CONSTRAINT "NotificationRecord_recipientId_fkey";
ALTER TABLE "PostComment" DROP CONSTRAINT "PostComment_authorId_fkey";
ALTER TABLE "StreamPost" DROP CONSTRAINT "StreamPost_authorId_fkey";
ALTER TABLE "StudentLocationRecord" DROP CONSTRAINT "StudentLocationRecord_studentId_fkey";
ALTER TABLE "StudentProfile" DROP CONSTRAINT "StudentProfile_cohortId_fkey";
ALTER TABLE "Submission" DROP CONSTRAINT "Submission_studentId_fkey";
ALTER TABLE "TeacherAssignmentAuditLog" DROP CONSTRAINT "TeacherAssignmentAuditLog_actorId_fkey";
ALTER TABLE "TeacherAssignmentAuditLog" DROP CONSTRAINT "TeacherAssignmentAuditLog_targetTeacherId_fkey";

DROP INDEX "StudentProfile_cohortId_isArchived_idx";
DROP INDEX "StudentProfile_cohortId_normalizedRollNumber_key";

ALTER TABLE "AttendanceRecord"
  DROP COLUMN "studentName",
  ALTER COLUMN "markedById" SET NOT NULL;

ALTER TABLE "DirectMessage"
  DROP COLUMN "receiverName",
  DROP COLUMN "senderAvatar",
  DROP COLUMN "senderName",
  DROP COLUMN "senderRole";

ALTER TABLE "NotificationRecord"
  DROP COLUMN "senderName",
  DROP COLUMN "senderRole";

ALTER TABLE "PostComment"
  DROP COLUMN "authorAvatar",
  DROP COLUMN "authorName",
  ALTER COLUMN "authorId" SET NOT NULL;

ALTER TABLE "StreamPost"
  DROP COLUMN "authorAvatar",
  DROP COLUMN "authorName",
  DROP COLUMN "authorRole";

ALTER TABLE "StudentLocationRecord"
  DROP COLUMN "studentName",
  DROP COLUMN "updatedBy",
  DROP COLUMN "updatedByRole";

ALTER TABLE "StudentProfile"
  DROP COLUMN "cohortId",
  DROP COLUMN "normalizedRollNumber";

ALTER TABLE "Submission"
  DROP COLUMN "studentAvatar",
  DROP COLUMN "studentName";

ALTER TABLE "TeacherAssignmentAuditLog"
  DROP COLUMN "actorName",
  DROP COLUMN "actorRole",
  DROP COLUMN "targetTeacherName";

CREATE UNIQUE INDEX "StudentLocationRecord_studentId_key"
  ON "StudentLocationRecord"("studentId");
CREATE INDEX "StudentLocationRecord_updatedById_idx"
  ON "StudentLocationRecord"("updatedById");
CREATE INDEX "StudentLocationRecord_externalReporterId_idx"
  ON "StudentLocationRecord"("externalReporterId");
CREATE INDEX "StudentProfile_isArchived_idx" ON "StudentProfile"("isArchived");

ALTER TABLE "StreamPost" ADD CONSTRAINT "StreamPost_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ModuleItem" ADD CONSTRAINT "ModuleItem_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_markedById_fkey"
  FOREIGN KEY ("markedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_receiverId_fkey"
  FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentLocationRecord" ADD CONSTRAINT "StudentLocationRecord_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentLocationRecord" ADD CONSTRAINT "StudentLocationRecord_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentLocationRecord" ADD CONSTRAINT "StudentLocationRecord_externalReporterId_fkey"
  FOREIGN KEY ("externalReporterId") REFERENCES "ExternalLocationReporter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExternalLocationReporter" ADD CONSTRAINT "ExternalLocationReporter_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotificationRecord" ADD CONSTRAINT "NotificationRecord_recipientId_fkey"
  FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeacherAssignmentAuditLog" ADD CONSTRAINT "TeacherAssignmentAuditLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeacherAssignmentAuditLog" ADD CONSTRAINT "TeacherAssignmentAuditLog_targetTeacherId_fkey"
  FOREIGN KEY ("targetTeacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
