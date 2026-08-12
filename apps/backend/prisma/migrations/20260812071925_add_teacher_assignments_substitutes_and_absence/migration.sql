-- CreateEnum
CREATE TYPE "SubstituteRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "TeacherAbsenceRequest" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "AbsenceStatus" NOT NULL DEFAULT 'pending',
    "reviewedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherAbsenceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubstituteRequest" (
    "id" TEXT NOT NULL,
    "teacherAbsenceRequestId" TEXT,
    "classroomId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "originalTeacherId" TEXT NOT NULL,
    "suggestedSubstituteId" TEXT,
    "assignedSubstituteId" TEXT,
    "reason" TEXT NOT NULL,
    "status" "SubstituteRequestStatus" NOT NULL DEFAULT 'PENDING',
    "responseNotes" TEXT,
    "createdByAdminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubstituteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherAssignmentAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "targetTeacherId" TEXT NOT NULL,
    "targetTeacherName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "subjectId" TEXT,
    "classroomId" TEXT,
    "details" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherAssignmentAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeacherAbsenceRequest_teacherId_status_idx" ON "TeacherAbsenceRequest"("teacherId", "status");

-- CreateIndex
CREATE INDEX "TeacherAbsenceRequest_reviewedByAdminId_idx" ON "TeacherAbsenceRequest"("reviewedByAdminId");

-- CreateIndex
CREATE INDEX "SubstituteRequest_classroomId_date_idx" ON "SubstituteRequest"("classroomId", "date");

-- CreateIndex
CREATE INDEX "SubstituteRequest_originalTeacherId_status_idx" ON "SubstituteRequest"("originalTeacherId", "status");

-- CreateIndex
CREATE INDEX "SubstituteRequest_assignedSubstituteId_status_idx" ON "SubstituteRequest"("assignedSubstituteId", "status");

-- CreateIndex
CREATE INDEX "TeacherAssignmentAuditLog_targetTeacherId_createdAt_idx" ON "TeacherAssignmentAuditLog"("targetTeacherId", "createdAt");

-- CreateIndex
CREATE INDEX "TeacherAssignmentAuditLog_actorId_createdAt_idx" ON "TeacherAssignmentAuditLog"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "TeacherAbsenceRequest" ADD CONSTRAINT "TeacherAbsenceRequest_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAbsenceRequest" ADD CONSTRAINT "TeacherAbsenceRequest_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubstituteRequest" ADD CONSTRAINT "SubstituteRequest_teacherAbsenceRequestId_fkey" FOREIGN KEY ("teacherAbsenceRequestId") REFERENCES "TeacherAbsenceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubstituteRequest" ADD CONSTRAINT "SubstituteRequest_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubstituteRequest" ADD CONSTRAINT "SubstituteRequest_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubstituteRequest" ADD CONSTRAINT "SubstituteRequest_originalTeacherId_fkey" FOREIGN KEY ("originalTeacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubstituteRequest" ADD CONSTRAINT "SubstituteRequest_suggestedSubstituteId_fkey" FOREIGN KEY ("suggestedSubstituteId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubstituteRequest" ADD CONSTRAINT "SubstituteRequest_assignedSubstituteId_fkey" FOREIGN KEY ("assignedSubstituteId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubstituteRequest" ADD CONSTRAINT "SubstituteRequest_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignmentAuditLog" ADD CONSTRAINT "TeacherAssignmentAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignmentAuditLog" ADD CONSTRAINT "TeacherAssignmentAuditLog_targetTeacherId_fkey" FOREIGN KEY ("targetTeacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignmentAuditLog" ADD CONSTRAINT "TeacherAssignmentAuditLog_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignmentAuditLog" ADD CONSTRAINT "TeacherAssignmentAuditLog_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
