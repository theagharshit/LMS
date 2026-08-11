-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('student', 'teacher', 'parent', 'admin');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "avatar" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "gradeLevel" INTEGER,
    "section" TEXT,
    "rollNumber" INTEGER,
    "childrenIds" TEXT[],
    "subjectsTaught" TEXT[],
    "passwordHash" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "lastSessionIp" TEXT,
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attendancePercentage" DOUBLE PRECISION NOT NULL,
    "streakDays" INTEGER NOT NULL,
    "xpPoints" INTEGER NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "parentName" TEXT NOT NULL,
    "parentPhone" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "lastStreakDate" TIMESTAMP(3),
    "level" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BadgeDefinition" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isAutomatic" BOOLEAN NOT NULL DEFAULT false,
    "criteria" TEXT,

    CONSTRAINT "BadgeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentBadge" (
    "id" TEXT NOT NULL,
    "earnedDate" TEXT NOT NULL,
    "assignedBy" TEXT,
    "remarks" TEXT,
    "badgeDefinitionId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,

    CONSTRAINT "StudentBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Classroom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "teacherName" TEXT NOT NULL,
    "teacherAvatar" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "colorTheme" TEXT NOT NULL,
    "bannerImage" TEXT NOT NULL,
    "meetLink" TEXT,
    "code" TEXT NOT NULL,
    "maxCapacity" INTEGER NOT NULL DEFAULT 40,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "substituteTeacherIds" TEXT[],

    CONSTRAINT "Classroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomEnrollment" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamPost" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorAvatar" TEXT NOT NULL,
    "authorRole" "UserRole" NOT NULL,
    "content" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "StreamPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostComment" (
    "id" TEXT NOT NULL,
    "streamPostId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "authorAvatar" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "PostComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" TEXT,
    "streamPostId" TEXT,
    "assignmentId" TEXT,
    "moduleItemId" TEXT,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleItem" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "unitName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "completedByStudentIds" TEXT[],

    CONSTRAINT "ModuleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "classroomName" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "dueDate" TEXT NOT NULL,
    "dueTime" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL,
    "rubric" TEXT[],
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "studentAvatar" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "responseText" TEXT,
    "grade" DOUBLE PRECISION,
    "feedback" TEXT,
    "annotated" BOOLEAN NOT NULL DEFAULT false,
    "similarityScore" DOUBLE PRECISION,
    "submittedAt" TEXT NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "classroomName" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "dueDate" TEXT NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "revealMarksMode" TEXT NOT NULL DEFAULT 'immediate',
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "availableFrom" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" TEXT[],
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "points" INTEGER NOT NULL,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizSubmission" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "totalPoints" INTEGER NOT NULL,
    "completedAt" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "questionOrder" JSONB,

    CONSTRAINT "QuizSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "markedBy" TEXT NOT NULL,
    "remarks" TEXT,
    "checkInTime" TEXT,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentControlSettings" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "allowTeacherDirectChat" BOOLEAN NOT NULL,
    "allowPeerDiscussion" BOOLEAN NOT NULL,
    "missingHomeworkAlerts" BOOLEAN NOT NULL,
    "lowAttendanceAlerts" BOOLEAN NOT NULL,
    "weeklyDigestEmail" BOOLEAN NOT NULL,
    "screenTimeLimitMinutes" INTEGER NOT NULL,
    "requireApprovalForOutboundMsgs" BOOLEAN NOT NULL,
    "blackoutStart" TEXT,
    "blackoutEnd" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kathmandu',

    CONSTRAINT "ParentControlSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT,
    "description" TEXT NOT NULL,
    "subject" TEXT,
    "nepaliDateBS" TEXT,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectMessage" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderRole" "UserRole" NOT NULL,
    "senderAvatar" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "receiverName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "approvedByParent" BOOLEAN,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectPerformance" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "scorePercentage" DOUBLE PRECISION NOT NULL,
    "grade" TEXT NOT NULL,
    "assignmentsCompleted" INTEGER NOT NULL,
    "totalAssignments" INTEGER NOT NULL,
    "quizzesScoreAvg" DOUBLE PRECISION NOT NULL,
    "teacherRemark" TEXT NOT NULL,

    CONSTRAINT "SubjectPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoredFileRecord" (
    "id" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sizeFormatted" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "classroomId" TEXT,
    "checksum" TEXT NOT NULL,
    "integrityStatus" TEXT NOT NULL,
    "downloadUrl" TEXT NOT NULL,
    "uploadedAt" TEXT NOT NULL,

    CONSTRAINT "StoredFileRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentLocationRecord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "currentLocation" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "busNumber" TEXT,
    "updatedBy" TEXT NOT NULL,
    "updatedByRole" TEXT NOT NULL,
    "notes" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "StudentLocationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TermProgress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TermProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentActivity" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "StudentActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRecord" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "senderId" TEXT,
    "senderName" TEXT,
    "senderRole" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'COMMUNICATION',
    "severity" TEXT NOT NULL DEFAULT 'normal',
    "type" TEXT NOT NULL DEFAULT 'general',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "NotificationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enableAcademic" BOOLEAN NOT NULL DEFAULT true,
    "enableCommunication" BOOLEAN NOT NULL DEFAULT true,
    "enableReminders" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "deviceFingerprint" TEXT NOT NULL,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenRevocation" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenRevocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityAudit" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "event" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "ipAddress" TEXT,
    "requestId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditTrail" (
    "id" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousData" JSONB,
    "newData" JSONB,
    "changedBy" TEXT,
    "category" TEXT NOT NULL DEFAULT 'database',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditTrail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeworkVersion" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "responseText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeworkVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRecord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NPR',
    "status" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbsenceRequest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "teacherId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbsenceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentVerificationToken" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scopes" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE INDEX "StudentProfile_gradeLevel_section_idx" ON "StudentProfile"("gradeLevel", "section");

-- CreateIndex
CREATE UNIQUE INDEX "Classroom_code_key" ON "Classroom"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomEnrollment_classroomId_studentId_key" ON "ClassroomEnrollment"("classroomId", "studentId");

-- CreateIndex
CREATE INDEX "Submission_studentId_status_idx" ON "Submission"("studentId", "status");

-- CreateIndex
CREATE INDEX "AttendanceRecord_studentId_date_idx" ON "AttendanceRecord"("studentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ParentControlSettings_studentId_key" ON "ParentControlSettings"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_expiresAt_idx" ON "RefreshToken"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TokenRevocation_jti_key" ON "TokenRevocation"("jti");

-- CreateIndex
CREATE INDEX "TokenRevocation_userId_expiresAt_idx" ON "TokenRevocation"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "SecurityAudit_userId_createdAt_idx" ON "SecurityAudit"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditTrail_changedBy_category_createdAt_idx" ON "AuditTrail"("changedBy", "category", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "HomeworkVersion_submissionId_version_key" ON "HomeworkVersion"("submissionId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRecord_invoiceNo_key" ON "PaymentRecord"("invoiceNo");

-- CreateIndex
CREATE INDEX "PaymentRecord_studentId_createdAt_idx" ON "PaymentRecord"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "AbsenceRequest_studentId_status_idx" ON "AbsenceRequest"("studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ParentVerificationToken_tokenHash_key" ON "ParentVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ParentVerificationToken_parentId_expiresAt_idx" ON "ParentVerificationToken"("parentId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBadge" ADD CONSTRAINT "StudentBadge_badgeDefinitionId_fkey" FOREIGN KEY ("badgeDefinitionId") REFERENCES "BadgeDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBadge" ADD CONSTRAINT "StudentBadge_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomEnrollment" ADD CONSTRAINT "ClassroomEnrollment_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomEnrollment" ADD CONSTRAINT "ClassroomEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamPost" ADD CONSTRAINT "StreamPost_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamPost" ADD CONSTRAINT "StreamPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_streamPostId_fkey" FOREIGN KEY ("streamPostId") REFERENCES "StreamPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_streamPostId_fkey" FOREIGN KEY ("streamPostId") REFERENCES "StreamPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_moduleItemId_fkey" FOREIGN KEY ("moduleItemId") REFERENCES "ModuleItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleItem" ADD CONSTRAINT "ModuleItem_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizSubmission" ADD CONSTRAINT "QuizSubmission_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizSubmission" ADD CONSTRAINT "QuizSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentControlSettings" ADD CONSTRAINT "ParentControlSettings_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectPerformance" ADD CONSTRAINT "SubjectPerformance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredFileRecord" ADD CONSTRAINT "StoredFileRecord_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentLocationRecord" ADD CONSTRAINT "StudentLocationRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermProgress" ADD CONSTRAINT "TermProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentActivity" ADD CONSTRAINT "StudentActivity_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkVersion" ADD CONSTRAINT "HomeworkVersion_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
