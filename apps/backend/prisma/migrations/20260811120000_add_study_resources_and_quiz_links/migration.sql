-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'draft';

-- AlterTable
ALTER TABLE "QuizSubmission" ADD COLUMN "startedAt" TEXT;
ALTER TABLE "QuizSubmission" ADD COLUMN "timeSpentSeconds" INTEGER;

-- CreateTable
CREATE TABLE "StudyResource" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeFormatted" TEXT,
    "tags" TEXT[],
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "StudyResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizResourceLink" (
    "quizId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,

    CONSTRAINT "QuizResourceLink_pkey" PRIMARY KEY ("quizId","resourceId")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuizSubmission_quizId_studentId_key" ON "QuizSubmission"("quizId", "studentId");

-- AddForeignKey
ALTER TABLE "StudyResource" ADD CONSTRAINT "StudyResource_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyResource" ADD CONSTRAINT "StudyResource_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizResourceLink" ADD CONSTRAINT "QuizResourceLink_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizResourceLink" ADD CONSTRAINT "QuizResourceLink_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "StudyResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
