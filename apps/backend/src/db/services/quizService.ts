import { prisma } from './prismaClient';
import { Quiz, QuizSubmission } from '@lms/shared';
import { badgeService } from './badgeService';
import { notificationService } from './notificationService';

const quizInclude = {
  questions: true,
  resourceLinks: true,
  classroom: { include: { subjectRef: true } },
} as const;

const mapQuiz = (quiz: any): Quiz => ({
  id: quiz.id,
  classroomId: quiz.classroomId,
  classroomName: quiz.classroom.name,
  subject: quiz.classroom.subjectRef.name,
  title: quiz.title,
  description: quiz.description,
  durationMinutes: quiz.durationMinutes,
  dueDate: quiz.dueDate,
  totalQuestions: quiz.questions.length,
  questions: quiz.questions.map((question: any) => ({
    ...question,
    type: question.type as Quiz['questions'][number]['type'],
  })),
  published: quiz.published,
  revealMarksMode: quiz.revealMarksMode as Quiz['revealMarksMode'],
  status: quiz.status as Quiz['status'],
  liveStartedAt: quiz.liveStartedAt?.toISOString(),
  sourceResourceIds: quiz.resourceLinks.map((link: any) => link.resourceId),
  createdAt: quiz.createdAt,
});

const validateResourceLinks = async (classroomId: string, resourceIds: string[]) => {
  if (!resourceIds.length) return;
  const uniqueIds = [...new Set(resourceIds)];
  const count = await prisma.studyResource.count({
    where: { id: { in: uniqueIds }, classroomId },
  });
  if (count !== uniqueIds.length) {
    throw new Error('Every source resource must belong to the selected classroom.');
  }
};

export class QuizService {
  public async getQuizzes(): Promise<Quiz[]> {
    const quizzes = await prisma.quiz.findMany({ include: quizInclude });
    return quizzes.map(mapQuiz);
  }

  public async addQuiz(quiz: Omit<Quiz, 'id' | 'createdAt'>): Promise<Quiz> {
    const classroom = await prisma.classroom.findUniqueOrThrow({
      where: { id: quiz.classroomId },
      include: { subjectRef: true },
    });
    const sourceResourceIds = [...new Set(quiz.sourceResourceIds || [])];
    await validateResourceLinks(quiz.classroomId, sourceResourceIds);

    const status = quiz.status || (quiz.published ? 'published' : 'draft');
    const published = status === 'published' || status === 'live';
    const created = await prisma.quiz.create({
      data: {
        classroomId: quiz.classroomId,
        title: quiz.title,
        description: quiz.description,
        durationMinutes: quiz.durationMinutes,
        dueDate: quiz.dueDate,
        published,
        status,
        liveStartedAt: status === 'live' ? new Date() : undefined,
        revealMarksMode: quiz.revealMarksMode || 'immediate',
        createdAt: new Date().toISOString(),
        questions: {
          create: quiz.questions.map((question) => ({
            text: question.text,
            type: question.type,
            options: question.options || [],
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
            points: question.points,
          })),
        },
        resourceLinks: sourceResourceIds.length
          ? { create: sourceResourceIds.map((resourceId) => ({ resourceId })) }
          : undefined,
      },
      include: quizInclude,
    });

    if (status !== 'draft') {
      notificationService
        .dispatchBroadcastNotification({
          targetAudience: 'classroom',
          classroomId: created.classroomId,
          title:
            status === 'live'
              ? `⚡ Test Started: ${created.title}`
              : `📋 Quiz Assigned: ${created.title}`,
          body:
            status === 'live'
              ? `${created.durationMinutes} min assessment is now live in ${classroom.subjectRef.name}!`
              : `Your teacher published this ${created.durationMinutes}-minute quiz in ${classroom.subjectRef.name}.`,
          category: status === 'live' ? 'CRITICAL' : 'ACADEMIC',
          severity: status === 'live' ? 'high' : 'normal',
          type: 'quiz',
        })
        .catch((error) => console.error('[QuizService] Notification dispatch failed', error));
    }

    return mapQuiz(created);
  }

  public async updateQuiz(
    id: string,
    quiz: Partial<Omit<Quiz, 'id' | 'createdAt'>>,
  ): Promise<Quiz | null> {
    const existing = await prisma.quiz.findUnique({
      where: { id },
      include: { submissions: { select: { id: true } } },
    });
    if (!existing) return null;
    if (quiz.questions && existing.submissions.length) {
      throw new Error('Questions cannot be replaced after students have submitted this quiz.');
    }

    const sourceResourceIds = quiz.sourceResourceIds
      ? [...new Set(quiz.sourceResourceIds)]
      : undefined;
    if (sourceResourceIds) await validateResourceLinks(existing.classroomId, sourceResourceIds);
    const status = quiz.status || existing.status;

    await prisma.$transaction(async (tx) => {
      if (quiz.questions) {
        await tx.quizQuestion.deleteMany({ where: { quizId: id } });
        await tx.quizQuestion.createMany({
          data: quiz.questions.map((question) => ({
            quizId: id,
            text: question.text,
            type: question.type,
            options: question.options || [],
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
            points: question.points,
          })),
        });
      }
      if (sourceResourceIds) {
        await tx.quizResourceLink.deleteMany({ where: { quizId: id } });
        if (sourceResourceIds.length) {
          await tx.quizResourceLink.createMany({
            data: sourceResourceIds.map((resourceId) => ({ quizId: id, resourceId })),
          });
        }
      }
      await tx.quiz.update({
        where: { id },
        data: {
          title: quiz.title,
          description: quiz.description,
          durationMinutes: quiz.durationMinutes,
          dueDate: quiz.dueDate,
          revealMarksMode: quiz.revealMarksMode,
          status,
          published: status === 'published' || status === 'live',
          liveStartedAt: status === 'live' ? existing.liveStartedAt || new Date() : null,
        },
      });
    });

    const updated = await prisma.quiz.findUnique({ where: { id }, include: quizInclude });
    return updated ? mapQuiz(updated) : null;
  }

  public async startQuizLive(id: string): Promise<Quiz | null> {
    const existing = await prisma.quiz.findUnique({ where: { id } });
    if (!existing) return null;
    if (existing.status !== 'published') throw new Error('Only published quizzes can be started.');

    const updated = await prisma.quiz.update({
      where: { id },
      data: { status: 'live', published: true, liveStartedAt: new Date() },
      include: quizInclude,
    });
    notificationService
      .dispatchBroadcastNotification({
        targetAudience: 'classroom',
        classroomId: updated.classroomId,
        title: `⚡ Test Started: ${updated.title}`,
        body: `${updated.durationMinutes} min assessment is now live! Open your classroom to begin.`,
        category: 'CRITICAL',
        severity: 'high',
        type: 'quiz',
      })
      .catch((error) => console.error('[QuizService] Notification dispatch failed', error));
    return mapQuiz(updated);
  }

  public async deleteQuiz(id: string): Promise<boolean> {
    const existing = await prisma.quiz.findUnique({
      where: { id },
      include: { _count: { select: { submissions: true } } },
    });
    if (!existing || existing._count.submissions > 0) return false;
    await prisma.quiz.delete({ where: { id } });
    return true;
  }

  public async updateQuizMarksMode(
    id: string,
    revealMarksMode: 'immediate' | 'later',
  ): Promise<Quiz | null> {
    const existing = await prisma.quiz.findUnique({ where: { id } });
    if (!existing) return null;
    const updated = await prisma.quiz.update({
      where: { id },
      data: { revealMarksMode },
      include: quizInclude,
    });
    if (revealMarksMode === 'immediate') {
      notificationService
        .dispatchBroadcastNotification({
          targetAudience: 'classroom',
          classroomId: updated.classroomId,
          title: `📊 Quiz Marks Published: ${updated.title}`,
          body: 'Scores and detailed solution keys are now visible!',
          category: 'CRITICAL',
          severity: 'high',
          type: 'quiz',
        })
        .catch((error) => console.error('[QuizService] Notification dispatch failed', error));
    }
    return mapQuiz(updated);
  }

  public async getQuizSubmissions(): Promise<QuizSubmission[]> {
    const submissions = await prisma.quizSubmission.findMany();
    return submissions.map((submission) => ({
      ...submission,
      startedAt: submission.startedAt?.toISOString(),
      timeSpentSeconds: submission.timeSpentSeconds ?? undefined,
      answers: (submission.answers as Record<string, string>) || {},
    }));
  }

  public async submitQuiz(
    submission: Omit<QuizSubmission, 'id' | 'completedAt'>,
  ): Promise<QuizSubmission> {
    let quiz = await prisma.quiz.findUnique({ where: { id: submission.quizId } });
    if (!quiz) {
      quiz = await prisma.quiz.create({
        data: {
          id: submission.quizId,
          classroomId: 'cls-math-8a',
          title: 'Online Assessment',
          description: 'Quiz evaluation',
          durationMinutes: 10,
          dueDate: '2026-08-15',
          published: true,
          status: 'published',
          revealMarksMode: 'immediate',
          createdAt: new Date().toISOString(),
        },
      });
    }
    if (submission.timeSpentSeconds !== undefined) {
      if (
        submission.timeSpentSeconds < 0 ||
        submission.timeSpentSeconds > quiz.durationMinutes * 60 + 30
      ) {
        throw new Error('Submission time is outside the allowed quiz duration.');
      }
    }

    const latestAttempt = await prisma.quizSubmission.aggregate({
      where: { quizId: submission.quizId, studentId: submission.studentId },
      _max: { attemptNumber: true },
    });
    const attemptNumber = (latestAttempt._max.attemptNumber || 0) + 1;

    const created = await prisma.quizSubmission.create({
      data: {
        quizId: submission.quizId,
        studentId: submission.studentId,
        score: submission.score,
        totalPoints: submission.totalPoints,
        completedAt: new Date().toISOString(),
        startedAt: submission.startedAt ? new Date(submission.startedAt) : undefined,
        timeSpentSeconds: submission.timeSpentSeconds,
        answers: submission.answers || {},
        attemptNumber,
      },
    });
    if (submission.score === submission.totalPoints && submission.totalPoints > 0) {
      await badgeService.assignBadge(
        submission.studentId,
        'bdg-def-2',
        undefined,
        'Scored 100% on a quiz',
      );
    }
    return {
      ...created,
      startedAt: created.startedAt?.toISOString(),
      timeSpentSeconds: created.timeSpentSeconds ?? undefined,
      answers: (created.answers as Record<string, string>) || {},
    };
  }
}

export const quizService = new QuizService();
