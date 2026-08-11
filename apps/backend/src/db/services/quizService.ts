import { prisma } from './prismaClient';
import { Quiz, QuizSubmission } from '@lms/shared';
import { badgeService } from './badgeService';
import { notificationService } from './notificationService';

function mapQuiz(q: {
  id: string;
  classroomId: string;
  classroomName: string;
  subject: string;
  title: string;
  description: string;
  durationMinutes: number;
  dueDate: string;
  totalQuestions: number;
  published: boolean;
  revealMarksMode: string;
  status: string;
  liveStartedAt?: string | null;
  createdAt: string;
  questions: {
    id: string;
    text: string;
    type: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    points: number;
  }[];
  resourceLinks?: { resourceId: string }[];
}): Quiz {
  return {
    ...q,
    liveStartedAt: q.liveStartedAt || undefined,
    revealMarksMode: (q.revealMarksMode as Quiz['revealMarksMode']) || 'immediate',
    status: (q.status as Quiz['status']) || (q.published ? 'published' : 'draft'),
    sourceResourceIds: q.resourceLinks?.map((l) => l.resourceId) || [],
    questions: q.questions.map((qt) => ({ ...qt, type: qt.type as Quiz['questions'][0]['type'] })),
  };
}

export class QuizService {
  public async getQuizzes(): Promise<Quiz[]> {
    const quizzes = await prisma.quiz.findMany({
      include: { questions: true, resourceLinks: true },
    });
    return quizzes.map(mapQuiz);
  }

  public async addQuiz(quiz: Omit<Quiz, 'id' | 'createdAt'>): Promise<Quiz> {
    const { questions, sourceResourceIds, ...quizData } = quiz;
    const status = quiz.status || (quiz.published ? 'published' : 'draft');
    const published = status === 'published' || status === 'live';

    const created = await prisma.quiz.create({
      data: {
        ...quizData,
        published,
        status,
        revealMarksMode: quiz.revealMarksMode || 'immediate',
        createdAt: new Date().toISOString(),
        questions: {
          create: questions.map((q) => ({
            text: q.text,
            type: q.type,
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            points: q.points,
          })),
        },
        resourceLinks: sourceResourceIds?.length
          ? {
              create: sourceResourceIds.map((resourceId) => ({ resourceId })),
            }
          : undefined,
      },
      include: { questions: true, resourceLinks: true },
    });

    if (status === 'published') {
      notificationService
        .dispatchBroadcastNotification({
          targetAudience: 'classroom',
          classroomId: created.classroomId,
          title: `📋 Quiz Assigned: ${created.title}`,
          body: `Your teacher will start this ${created.durationMinutes}-minute test in ${created.subject} when class begins.`,
          category: 'ACADEMIC',
          severity: 'normal',
          type: 'quiz',
        })
        .catch((err) => console.error('[QuizService] Notification dispatch failed', err));
    } else if (status === 'live') {
      notificationService
        .dispatchBroadcastNotification({
          targetAudience: 'classroom',
          classroomId: created.classroomId,
          title: `⚡ Test Started: ${created.title}`,
          body: `${created.durationMinutes} min assessment is now live in ${created.subject}!`,
          category: 'CRITICAL',
          severity: 'high',
          type: 'quiz',
        })
        .catch((err) => console.error('[QuizService] Notification dispatch failed', err));
    }

    return mapQuiz(created);
  }

  public async updateQuiz(id: string, quiz: Partial<Omit<Quiz, 'id' | 'createdAt'>>): Promise<Quiz | null> {
    const existing = await prisma.quiz.findUnique({
      where: { id },
      include: { submissions: true },
    });
    if (!existing) return null;

    const { questions, sourceResourceIds, ...quizData } = quiz;
    const status = quiz.status ?? existing.status;
    const published =
      status === 'published' || status === 'live' || (quiz.published ?? existing.published);

    await prisma.$transaction(async (tx) => {
      if (questions) {
        await tx.quizQuestion.deleteMany({ where: { quizId: id } });
        await tx.quizQuestion.createMany({
          data: questions.map((q) => ({
            quizId: id,
            text: q.text,
            type: q.type,
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            points: q.points,
          })),
        });
      }

      if (sourceResourceIds !== undefined) {
        await tx.quizResourceLink.deleteMany({ where: { quizId: id } });
        if (sourceResourceIds.length > 0) {
          await tx.quizResourceLink.createMany({
            data: sourceResourceIds.map((resourceId) => ({ quizId: id, resourceId })),
          });
        }
      }

      await tx.quiz.update({
        where: { id },
        data: {
          ...quizData,
          published,
          status,
          totalQuestions: questions?.length ?? quizData.totalQuestions ?? existing.totalQuestions,
        },
      });
    });

    const updated = await prisma.quiz.findUnique({
      where: { id },
      include: { questions: true, resourceLinks: true },
    });
    if (!updated) return null;

    if (
      status === 'published' &&
      existing.status !== 'published' &&
      existing.status !== 'live'
    ) {
      notificationService
        .dispatchBroadcastNotification({
          targetAudience: 'classroom',
          classroomId: updated.classroomId,
          title: `📋 Quiz Assigned: ${updated.title}`,
          body: `Your teacher will start this ${updated.durationMinutes}-minute test when class begins.`,
          category: 'ACADEMIC',
          severity: 'normal',
          type: 'quiz',
        })
        .catch((err) => console.error('[QuizService] Notification dispatch failed', err));
    }

    return mapQuiz(updated);
  }

  public async startQuizLive(id: string): Promise<Quiz | null> {
    const existing = await prisma.quiz.findUnique({ where: { id } });
    if (!existing) return null;
    if (existing.status !== 'published') {
      throw new Error('Only published quizzes can be started');
    }

    const updated = await prisma.quiz.update({
      where: { id },
      data: {
        status: 'live',
        published: true,
        liveStartedAt: new Date().toISOString(),
      },
      include: { questions: true, resourceLinks: true },
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
      .catch((err) => console.error('[QuizService] Notification dispatch failed', err));

    return mapQuiz(updated);
  }

  public async deleteQuiz(id: string): Promise<boolean> {
    const existing = await prisma.quiz.findUnique({
      where: { id },
      include: { submissions: true },
    });
    if (!existing) return false;
    if (existing.submissions.length > 0) return false;

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
      include: { questions: true, resourceLinks: true },
    });

    if (revealMarksMode === 'immediate') {
      notificationService
        .dispatchBroadcastNotification({
          targetAudience: 'classroom',
          classroomId: updated.classroomId,
          title: `📊 Quiz Marks Published: ${updated.title}`,
          body: `Scores and detailed solution keys are now visible!`,
          category: 'CRITICAL',
          severity: 'high',
          type: 'quiz',
        })
        .catch((err) => console.error('[QuizService] Notification dispatch failed', err));
    }

    return mapQuiz(updated);
  }

  public async getQuizSubmissions(): Promise<QuizSubmission[]> {
    const subs = await prisma.quizSubmission.findMany();
    return subs.map((s) => ({
      ...s,
      startedAt: s.startedAt || undefined,
      timeSpentSeconds: s.timeSpentSeconds ?? undefined,
      answers: (s.answers as Record<string, string>) || {},
    }));
  }

  public async submitQuiz(
    submission: Omit<QuizSubmission, 'id' | 'completedAt'>,
  ): Promise<QuizSubmission> {
    const existing = await prisma.quizSubmission.findUnique({
      where: {
        quizId_studentId: {
          quizId: submission.quizId,
          studentId: submission.studentId,
        },
      },
    });
    if (existing) {
      throw new Error('Quiz already submitted');
    }

    let quizExists = await prisma.quiz.findUnique({ where: { id: submission.quizId } });
    if (!quizExists) {
      await prisma.quiz.create({
        data: {
          id: submission.quizId,
          classroomId: 'cls-math-8a',
          classroomName: 'Grade 8 Mathematics',
          subject: 'Mathematics',
          title: 'Online Assessment',
          description: 'Quiz evaluation',
          durationMinutes: 10,
          dueDate: '2026-08-15',
          totalQuestions: 1,
          published: true,
          status: 'published',
          revealMarksMode: 'immediate',
          createdAt: new Date().toISOString(),
        },
      });
      quizExists = await prisma.quiz.findUnique({ where: { id: submission.quizId } });
    }

    if (quizExists && submission.timeSpentSeconds !== undefined) {
      const maxSeconds = quizExists.durationMinutes * 60 + 30;
      if (submission.timeSpentSeconds > maxSeconds) {
        throw new Error('Submission exceeded allowed time');
      }
    }

    const created = await prisma.quizSubmission.create({
      data: {
        quizId: submission.quizId,
        studentId: submission.studentId,
        score: submission.score,
        totalPoints: submission.totalPoints,
        completedAt: new Date().toISOString(),
        startedAt: submission.startedAt,
        timeSpentSeconds: submission.timeSpentSeconds,
        answers: (submission.answers as any) || {},
      },
    });

    if (submission.score === submission.totalPoints && submission.totalPoints > 0) {
      await badgeService.assignBadge(
        submission.studentId,
        'bdg-def-2',
        'System',
        'Scored 100% on a quiz',
      );
    }

    return {
      ...created,
      startedAt: created.startedAt || undefined,
      timeSpentSeconds: created.timeSpentSeconds ?? undefined,
      answers: (created.answers as Record<string, string>) || {},
    };
  }
}

export const quizService = new QuizService();
