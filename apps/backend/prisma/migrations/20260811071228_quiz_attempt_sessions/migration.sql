-- CreateTable
CREATE TABLE "QuizAttemptSession" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "questionOrder" JSONB NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "QuizAttemptSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuizAttemptSession_status_deadlineAt_idx" ON "QuizAttemptSession"("status", "deadlineAt");

-- CreateIndex
CREATE INDEX "QuizAttemptSession_studentId_quizId_idx" ON "QuizAttemptSession"("studentId", "quizId");

-- AddForeignKey
ALTER TABLE "QuizAttemptSession" ADD CONSTRAINT "QuizAttemptSession_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttemptSession" ADD CONSTRAINT "QuizAttemptSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
