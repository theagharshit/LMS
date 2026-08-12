BEGIN;

CREATE TYPE "QuizStatus" AS ENUM ('draft', 'published', 'live');
CREATE TYPE "StudyResourceType" AS ENUM ('pdf', 'video', 'link', 'image', 'doc', 'notes');

ALTER TABLE "Quiz"
  ADD COLUMN "status" "QuizStatus" NOT NULL DEFAULT 'draft',
  ADD COLUMN "liveStartedAt" TIMESTAMPTZ(3);

UPDATE "Quiz" SET "status" = 'published' WHERE "published" = true;

ALTER TABLE "QuizSubmission"
  ADD COLUMN "startedAt" TIMESTAMPTZ(3),
  ADD COLUMN "timeSpentSeconds" INTEGER;

ALTER TABLE "QuizSubmission"
  ADD CONSTRAINT "QuizSubmission_timeSpentSeconds_check"
  CHECK ("timeSpentSeconds" IS NULL OR "timeSpentSeconds" >= 0);

ALTER TABLE "StudentProfile" ADD COLUMN "idCardPhotoUrl" TEXT;

CREATE TABLE "StudyResource" (
  "id" TEXT NOT NULL,
  "classroomId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" "StudyResourceType" NOT NULL,
  "url" TEXT NOT NULL,
  "mimeType" TEXT,
  "sizeFormatted" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudyResource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuizResourceLink" (
  "quizId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  CONSTRAINT "QuizResourceLink_pkey" PRIMARY KEY ("quizId", "resourceId")
);

CREATE INDEX "StudyResource_classroomId_createdAt_idx" ON "StudyResource"("classroomId", "createdAt");
CREATE INDEX "StudyResource_teacherId_createdAt_idx" ON "StudyResource"("teacherId", "createdAt");
CREATE INDEX "QuizResourceLink_resourceId_idx" ON "QuizResourceLink"("resourceId");

ALTER TABLE "StudyResource" ADD CONSTRAINT "StudyResource_classroomId_fkey"
  FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyResource" ADD CONSTRAINT "StudyResource_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizResourceLink" ADD CONSTRAINT "QuizResourceLink_quizId_fkey"
  FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizResourceLink" ADD CONSTRAINT "QuizResourceLink_resourceId_fkey"
  FOREIGN KEY ("resourceId") REFERENCES "StudyResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
