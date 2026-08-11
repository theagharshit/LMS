-- Add missing ownership constraints and natural uniqueness after the core
-- normalized entities exist. The migration aborts if legacy data cannot be
-- linked safely; it never deletes or guesses away conflicting rows.
BEGIN;

ALTER TABLE "StoredFileRecord" ADD COLUMN "uploadedById" TEXT;

UPDATE "StoredFileRecord" f
SET "uploadedById" = u."id"
FROM "User" u
WHERE f."uploadedById" IS NULL
  AND (f."uploadedBy" = u."id" OR lower(trim(f."uploadedBy")) = lower(trim(u."name")));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "StoredFileRecord" WHERE "uploadedById" IS NULL) THEN
    RAISE EXCEPTION 'Integrity migration aborted: a stored file uploader cannot be resolved';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "Submission" GROUP BY "assignmentId", "studentId" HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Integrity migration aborted: duplicate assignment submission';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "QuizSubmission"
    GROUP BY "quizId", "studentId", "attemptNumber" HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Integrity migration aborted: duplicate quiz attempt number';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "AttendanceRecord" GROUP BY "studentId", "date" HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Integrity migration aborted: duplicate daily attendance record';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "NotificationRecord" n
    LEFT JOIN "User" u ON u."id" = n."recipientId" WHERE u."id" IS NULL
  ) OR EXISTS (
    SELECT 1 FROM "NotificationRecord" n
    LEFT JOIN "User" u ON u."id" = n."senderId"
    WHERE n."senderId" IS NOT NULL AND u."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Integrity migration aborted: notification references an unknown user';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "TokenRevocation" r LEFT JOIN "User" u ON u."id" = r."userId"
    WHERE u."id" IS NULL
  ) OR EXISTS (
    SELECT 1 FROM "SecurityAudit" a LEFT JOIN "User" u ON u."id" = a."userId"
    WHERE a."userId" IS NOT NULL AND u."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Integrity migration aborted: security record references an unknown user';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "PaymentRecord" p
    LEFT JOIN "User" student ON student."id" = p."studentId"
    LEFT JOIN "User" parent ON parent."id" = p."parentId"
    WHERE student."id" IS NULL OR parent."id" IS NULL
  ) OR EXISTS (
    SELECT 1 FROM "AbsenceRequest" a
    LEFT JOIN "User" student ON student."id" = a."studentId"
    LEFT JOIN "User" parent ON parent."id" = a."parentId"
    LEFT JOIN "User" teacher ON teacher."id" = a."teacherId"
    WHERE student."id" IS NULL OR parent."id" IS NULL
       OR (a."teacherId" IS NOT NULL AND teacher."id" IS NULL)
  ) OR EXISTS (
    SELECT 1 FROM "ParentVerificationToken" t
    LEFT JOIN "User" parent ON parent."id" = t."parentId" WHERE parent."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Integrity migration aborted: family workflow references an unknown user';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "SystemConfig" c LEFT JOIN "User" u ON u."id" = c."updatedBy"
    WHERE c."updatedBy" IS NOT NULL AND u."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Integrity migration aborted: config updater references an unknown user';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "Attachment"
    WHERE num_nonnulls("streamPostId", "assignmentId", "moduleItemId") <> 1
  ) THEN
    RAISE EXCEPTION 'Integrity migration aborted: every attachment must have exactly one owner';
  END IF;
END $$;

CREATE UNIQUE INDEX "Submission_assignmentId_studentId_key" ON "Submission"("assignmentId", "studentId");
CREATE UNIQUE INDEX "QuizSubmission_quizId_studentId_attemptNumber_key" ON "QuizSubmission"("quizId", "studentId", "attemptNumber");
CREATE INDEX "QuizSubmission_studentId_completedAt_idx" ON "QuizSubmission"("studentId", "completedAt");
CREATE UNIQUE INDEX "AttendanceRecord_studentId_date_key" ON "AttendanceRecord"("studentId", "date");
CREATE INDEX "NotificationRecord_recipientId_read_createdAt_idx" ON "NotificationRecord"("recipientId", "read", "createdAt");
CREATE INDEX "NotificationRecord_senderId_idx" ON "NotificationRecord"("senderId");
CREATE INDEX "PaymentRecord_parentId_createdAt_idx" ON "PaymentRecord"("parentId", "createdAt");
CREATE INDEX "AbsenceRequest_parentId_status_idx" ON "AbsenceRequest"("parentId", "status");
CREATE INDEX "AbsenceRequest_teacherId_status_idx" ON "AbsenceRequest"("teacherId", "status");

ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_exactly_one_owner_check"
  CHECK (num_nonnulls("streamPostId", "assignmentId", "moduleItemId") = 1);
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_nonnegative_progress_check"
  CHECK ("streakDays" >= 0 AND "xpPoints" >= 0);
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_capacity_check" CHECK ("maxCapacity" > 0);
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_total_points_check" CHECK ("totalPoints" > 0);
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_points_check" CHECK ("points" > 0);
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_grade_check"
  CHECK ("grade" IS NULL OR "grade" >= 0);
ALTER TABLE "SubjectPerformance" ADD CONSTRAINT "SubjectPerformance_score_check"
  CHECK ("scorePercentage" BETWEEN 0 AND 100 AND "quizzesScoreAvg" BETWEEN 0 AND 100
    AND "assignmentsCompleted" >= 0 AND "totalAssignments" >= "assignmentsCompleted");
ALTER TABLE "TermProgress" ADD CONSTRAINT "TermProgress_score_check" CHECK ("score" BETWEEN 0 AND 100);
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_amount_check" CHECK ("amount" >= 0);
ALTER TABLE "AbsenceRequest" ADD CONSTRAINT "AbsenceRequest_date_order_check" CHECK ("endDate" >= "startDate");

ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_status_check"
  CHECK ("status" IN ('present', 'absent', 'late', 'excused'));
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_status_check"
  CHECK ("status" IN ('pending', 'draft', 'submitted', 'graded', 'returned', 'overdue'));
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_reveal_marks_mode_check"
  CHECK ("revealMarksMode" IN ('immediate', 'later'));
ALTER TABLE "QuizAttemptSession" ADD CONSTRAINT "QuizAttemptSession_status_check"
  CHECK ("status" IN ('active', 'submitted', 'auto_submitted', 'expired'));
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_status_check"
  CHECK ("status" IN ('pending', 'paid', 'failed', 'refunded', 'overdue'));
ALTER TABLE "AbsenceRequest" ADD CONSTRAINT "AbsenceRequest_status_check"
  CHECK ("status" IN ('pending', 'approved', 'rejected', 'cancelled'));
ALTER TABLE "NotificationRecord" ADD CONSTRAINT "NotificationRecord_category_check"
  CHECK ("category" IN ('CRITICAL', 'ACADEMIC', 'COMMUNICATION'));
ALTER TABLE "NotificationRecord" ADD CONSTRAINT "NotificationRecord_severity_check"
  CHECK ("severity" IN ('urgent', 'high', 'normal', 'info'));
ALTER TABLE "NotificationRecord" ADD CONSTRAINT "NotificationRecord_type_check"
  CHECK ("type" IN ('general', 'assignment', 'quiz', 'attendance', 'location', 'announcement', 'badge', 'message'));

ALTER TABLE "StoredFileRecord" ADD CONSTRAINT "StoredFileRecord_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotificationRecord" ADD CONSTRAINT "NotificationRecord_recipientId_fkey"
  FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationRecord" ADD CONSTRAINT "NotificationRecord_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TokenRevocation" ADD CONSTRAINT "TokenRevocation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecurityAudit" ADD CONSTRAINT "SecurityAudit_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AbsenceRequest" ADD CONSTRAINT "AbsenceRequest_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AbsenceRequest" ADD CONSTRAINT "AbsenceRequest_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AbsenceRequest" ADD CONSTRAINT "AbsenceRequest_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ParentVerificationToken" ADD CONSTRAINT "ParentVerificationToken_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SystemConfig" ADD CONSTRAINT "SystemConfig_updatedBy_fkey"
  FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
