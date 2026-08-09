import { prisma } from './prismaClient';
import { Quiz, QuizSubmission } from '@lms/shared';
import { badgeService } from './badgeService';

export class QuizService {
  public async getQuizzes(): Promise<Quiz[]> {
    const quizzes = await prisma.quiz.findMany({
      include: { questions: true },
    });
    return quizzes.map((q) => ({
      ...q,
      questions: q.questions.map((qt) => ({ ...qt, type: qt.type as any })),
    }));
  }

  public async addQuiz(quiz: Omit<Quiz, 'id' | 'createdAt'>): Promise<Quiz> {
    const created = await prisma.quiz.create({
      data: {
        ...quiz,
        createdAt: new Date().toISOString(),
        questions: {
          create: quiz.questions.map((q) => ({
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
    return {
      ...created,
      questions: created.questions.map((qt) => ({ ...qt, type: qt.type as any })),
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
    const created = await prisma.quizSubmission.create({
      data: {
        quizId: submission.quizId,
        studentId: submission.studentId,
        score: submission.score,
        totalPoints: submission.totalPoints,
        completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        answers: (submission.answers as any) || {},
      },
    });

    // Auto-trigger: Quiz Master badge if score is 100%
    if (submission.score === submission.totalPoints && submission.totalPoints > 0) {
      await badgeService.assignBadge(submission.studentId, 'bdg-def-2', 'System', 'Scored 100% on a quiz');
    }

    return {
      ...created,
      answers: (created.answers as Record<string, string>) || {},
    };
  }
}

export const quizService = new QuizService();
