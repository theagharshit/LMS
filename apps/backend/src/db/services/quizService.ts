import { prisma } from './prismaClient';
import { Quiz, QuizSubmission } from '@lms/shared';
import { badgeService } from './badgeService';
import { notificationService } from './notificationService';

export class QuizService {
  public async getQuizzes(): Promise<Quiz[]> {
    const quizzes = await prisma.quiz.findMany({
      include: { questions: true, classroom: { include: { subjectRef: true } } },
    });
    return quizzes.map((q) => ({
      ...q,
      classroomName: q.classroom.name,
      subject: q.classroom.subjectRef.name,
      totalQuestions: q.questions.length,
      revealMarksMode: (q.revealMarksMode as any) || 'immediate',
      questions: q.questions.map((qt) => ({ ...qt, type: qt.type as any })),
    }));
  }

  public async addQuiz(quiz: Omit<Quiz, 'id' | 'createdAt'>): Promise<Quiz> {
    const { questions, ...quizData } = quiz;
    const classroom = await prisma.classroom.findUniqueOrThrow({
      where: { id: quiz.classroomId },
      include: { subjectRef: true },
    });
    const created = await prisma.quiz.create({
      data: {
        classroomId: quizData.classroomId,
        title: quizData.title,
        description: quizData.description,
        durationMinutes: quizData.durationMinutes,
        dueDate: quizData.dueDate,
        published: quizData.published,
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
      },
      include: { questions: true },
    });

    // Auto-trigger CRITICAL notification to enrolled students
    notificationService
      .dispatchBroadcastNotification({
        targetAudience: 'classroom',
        classroomId: created.classroomId,
        title: `⚡ Quiz Released: ${created.title}`,
        body: `${created.durationMinutes} min assessment ready in ${classroom.subjectRef.name}`,
        category: 'CRITICAL',
        severity: 'high',
        type: 'quiz',
      })
      .catch((err) => console.error('[QuizService] Notification dispatch failed', err));

    return {
      ...created,
      classroomName: classroom.name,
      subject: classroom.subjectRef.name,
      totalQuestions: created.questions.length,
      revealMarksMode: (created.revealMarksMode as any) || 'immediate',
      questions: created.questions.map((qt) => ({ ...qt, type: qt.type as any })),
    };
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
      include: { questions: true, classroom: { include: { subjectRef: true } } },
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

    return {
      ...updated,
      classroomName: updated.classroom.name,
      subject: updated.classroom.subjectRef.name,
      totalQuestions: updated.questions.length,
      revealMarksMode: (updated.revealMarksMode as any) || 'immediate',
      questions: updated.questions.map((qt) => ({ ...qt, type: qt.type as any })),
    };
  }

  public async getQuizSubmissions(): Promise<QuizSubmission[]> {
    const subs = await prisma.quizSubmission.findMany();
    return subs.map((s) => ({
      ...s,
      answers: (s.answers as Record<string, string>) || {},
    }));
  }

  public async submitQuiz(
    submission: Omit<QuizSubmission, 'id' | 'completedAt'>,
  ): Promise<QuizSubmission> {
    let quizExists = await prisma.quiz.findUnique({ where: { id: submission.quizId } });
    if (!quizExists) {
      // Auto-provision fallback Quiz record if target quizId does not exist in DB (for demo/mock quizzes)
      await prisma.quiz.create({
        data: {
          id: submission.quizId,
          classroomId: 'cls-math-8a',
          title: 'Online Assessment',
          description: 'Quiz evaluation',
          durationMinutes: 10,
          dueDate: '2026-08-15',
          published: true,
          revealMarksMode: 'immediate',
          createdAt: new Date().toISOString(),
        },
      });
    }

    const latestAttempt = await prisma.quizSubmission.aggregate({
      where: { quizId: submission.quizId, studentId: submission.studentId },
      _max: { attemptNumber: true },
    });
    const created = await prisma.quizSubmission.create({
      data: {
        quizId: submission.quizId,
        studentId: submission.studentId,
        score: submission.score,
        totalPoints: submission.totalPoints,
        completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        answers: (submission.answers as any) || {},
        attemptNumber: (latestAttempt._max.attemptNumber || 0) + 1,
      },
    });

    // Auto-trigger: Quiz Master badge if score is 100%
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
      answers: (created.answers as Record<string, string>) || {},
    };
  }
}

export const quizService = new QuizService();
