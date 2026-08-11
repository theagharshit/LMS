import { createHash, randomBytes } from 'node:crypto';
import { prisma } from './prismaClient';
import { withDeadlockRetry } from '@utils/transaction';
import { cacheService } from './cacheService';

const round2 = (value: number) => Math.round(value * 100) / 100;
const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

type PerformanceMatrix = {
  studentId: string;
  level: number;
  xpPoints: number;
  streakDays: number;
  attendancePercentage: number;
  subjects: Awaited<ReturnType<typeof prisma.subjectPerformance.findMany>>;
  terms: Awaited<ReturnType<typeof prisma.termProgress.findMany>>;
  generatedAt: string;
};

function seededShuffle<T>(items: T[], seedText: string): T[] {
  const result = [...items];
  let seed = Number.parseInt(createHash('sha256').update(seedText).digest('hex').slice(0, 8), 16);
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function tokenize(text: string) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .split(/\s+/)
      .filter(Boolean),
  );
}

export class PlatformService {
  async evaluateBadges(studentId: string) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId: studentId } });
    if (!profile) return [];
    const definitions = await prisma.badgeDefinition.findMany({ where: { isAutomatic: true } });
    const recentAttendance = await prisma.attendanceRecord.findMany({
      where: { studentId },
      orderBy: { date: 'desc' },
      take: 30,
    });
    const quizScores = await prisma.quizSubmission.findMany({
      where: { studentId },
      orderBy: { completedAt: 'desc' },
      take: 5,
    });
    const achievements = new Set<string>();
    if (
      recentAttendance.length >= 30 &&
      recentAttendance.every((record) => ['present', 'late'].includes(record.status))
    )
      achievements.add('attendance');
    if (
      quizScores.length >= 5 &&
      quizScores.every((row) => row.totalPoints > 0 && row.score / row.totalPoints >= 0.9)
    )
      achievements.add('quiz');
    const awarded = [];
    for (const definition of definitions) {
      const criteria =
        `${definition.criteria || ''} ${definition.category} ${definition.title}`.toLowerCase();
      if (![...achievements].some((achievement) => criteria.includes(achievement))) continue;
      const existing = await prisma.studentBadge.findFirst({
        where: { studentProfileId: profile.id, badgeDefinitionId: definition.id },
      });
      if (!existing)
        awarded.push(
          await prisma.studentBadge.create({
            data: {
              studentProfileId: profile.id,
              badgeDefinitionId: definition.id,
              earnedDate: new Date().toISOString().slice(0, 10),
              assignedById: null,
              remarks: 'Automatically awarded from verified milestone data.',
            },
          }),
        );
    }
    return awarded;
  }

  async recordDailyActivity(userId: string, timezone = 'Asia/Kathmandu') {
    const profile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!profile) return null;
    const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
    const lastDate = profile.lastStreakDate
      ? new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(profile.lastStreakDate)
      : null;
    const previous = new Date(`${localDate}T00:00:00Z`);
    previous.setUTCDate(previous.getUTCDate() - 1);
    const previousDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(previous);
    const streakDays =
      lastDate === localDate
        ? profile.streakDays
        : lastDate === previousDate
          ? profile.streakDays + 1
          : 1;
    const updated = await prisma.studentProfile.update({
      where: { userId },
      data: { streakDays, lastStreakDate: new Date() },
    });
    await cacheService.invalidate(`lms:performance:${userId}`, 'lms:student-profiles');
    return updated;
  }

  async awardXp(userId: string, xpEarned: number) {
    const updated = await withDeadlockRetry(() =>
      prisma.$transaction(async (tx) => {
        const profile = await tx.studentProfile.findUnique({ where: { userId } });
        if (!profile) throw new Error('Student profile not found.');
        const xpPoints = Math.max(0, profile.xpPoints + Math.max(0, xpEarned));
        const updated = await tx.studentProfile.update({
          where: { userId },
          data: { xpPoints },
        });
        return updated;
      }),
    );
    await cacheService.invalidate(`lms:performance:${userId}`, 'lms:student-profiles');
    return updated;
  }

  async randomizedQuiz(quizId: string, studentId: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });
    if (!quiz) throw new Error('Quiz not found.');
    if (quiz.availableFrom && quiz.availableFrom > new Date())
      throw new Error('Quiz is not open yet.');
    if (quiz.closesAt && quiz.closesAt <= new Date()) throw new Error('Quiz window has closed.');
    const attempts = await prisma.quizSubmission.count({ where: { quizId, studentId } });
    if (attempts >= quiz.maxAttempts) throw new Error('Maximum quiz attempts reached.');
    const shuffledQuestions = seededShuffle(quiz.questions, `${quizId}:${studentId}`);
    const existingSession = await prisma.quizAttemptSession.findFirst({
      where: { quizId, studentId, status: 'active', deadlineAt: { gt: new Date() } },
      orderBy: { startedAt: 'desc' },
    });
    const quizDeadline = quiz.closesAt?.getTime() || Number.POSITIVE_INFINITY;
    const durationDeadline = Date.now() + quiz.durationMinutes * 60_000;
    const session =
      existingSession ||
      (await prisma.quizAttemptSession.create({
        data: {
          quizId,
          studentId,
          attemptNumber: attempts + 1,
          questionOrder: shuffledQuestions.map((question) => question.id),
          deadlineAt: new Date(Math.min(quizDeadline, durationDeadline)),
        },
      }));
    return {
      ...quiz,
      attemptNumber: session.attemptNumber,
      sessionId: session.id,
      deadlineAt: session.deadlineAt,
      questions: shuffledQuestions.map((question) => ({
        ...question,
        options: seededShuffle(question.options, `${quizId}:${studentId}:${question.id}`),
        correctAnswer: undefined,
        explanation: undefined,
      })),
    };
  }

  async autoGradeQuiz(
    quizId: string,
    studentId: string,
    answers: Record<string, string>,
    sessionId?: string,
  ) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });
    if (!quiz) throw new Error('Quiz not found.');
    if (quiz.closesAt && quiz.closesAt <= new Date()) throw new Error('Quiz deadline has passed.');
    const attempts = await prisma.quizSubmission.count({ where: { quizId, studentId } });
    if (attempts >= quiz.maxAttempts) throw new Error('Maximum quiz attempts reached.');
    const objective = quiz.questions.filter((question) =>
      [
        'mcq',
        'multiple_choice',
        'true_false',
        'true/false',
        'fill_blank',
        'fill-in-the-blank',
      ].includes(question.type.toLowerCase()),
    );
    const score = objective.reduce((total, question) => {
      const actual = String(answers[question.id] ?? '')
        .trim()
        .toLocaleLowerCase();
      const expected = question.correctAnswer.trim().toLocaleLowerCase();
      return total + (actual === expected ? question.points : 0);
    }, 0);
    const totalPoints = quiz.questions.reduce((total, question) => total + question.points, 0);
    const submission = await withDeadlockRetry(() =>
      prisma.$transaction(async (tx) => {
        let attemptNumber = attempts + 1;
        let questionOrder = quiz.questions.map((question) => question.id);
        if (sessionId) {
          const session = await tx.quizAttemptSession.findFirst({
            where: { id: sessionId, quizId, studentId, status: 'active' },
          });
          if (!session || session.deadlineAt <= new Date())
            throw new Error('Quiz session is missing or expired.');
          attemptNumber = session.attemptNumber;
          questionOrder = Array.isArray(session.questionOrder)
            ? session.questionOrder.filter((value): value is string => typeof value === 'string')
            : questionOrder;
          await tx.quizAttemptSession.update({
            where: { id: session.id },
            data: { status: 'submitted', answers, submittedAt: new Date() },
          });
        }
        return tx.quizSubmission.create({
          data: {
            quizId,
            studentId,
            score,
            totalPoints,
            completedAt: new Date().toISOString(),
            answers,
            attemptNumber,
            questionOrder,
          },
        });
      }),
    );
    await this.awardXp(studentId, Math.round(score * 10));
    await this.evaluateBadges(studentId);
    return { submission, percentage: totalPoints ? round2((score / totalPoints) * 100) : 0 };
  }

  rubricScore(criteria: { structure: number; content: number; grammar: number }) {
    const bounded = (value: number) => Math.min(100, Math.max(0, value));
    return round2(
      bounded(criteria.structure) * 0.3 +
        bounded(criteria.content) * 0.5 +
        bounded(criteria.grammar) * 0.2,
    );
  }

  async gradeAnalytics(quizId?: string, classroomId?: string) {
    const rows = await prisma.quizSubmission.findMany({
      where: { quizId, quiz: classroomId ? { classroomId } : undefined },
      select: { score: true, totalPoints: true },
    });
    const scores = rows
      .map((row) => (row.totalPoints ? (row.score / row.totalPoints) * 100 : 0))
      .sort((a, b) => a - b);
    if (!scores.length)
      return { count: 0, mean: 0, median: 0, standardDeviation: 0, lowest: 0, highest: 0 };
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const middle = Math.floor(scores.length / 2);
    const median = scores.length % 2 ? scores[middle] : (scores[middle - 1] + scores[middle]) / 2;
    const variance = scores.reduce((sum, score) => sum + (score - mean) ** 2, 0) / scores.length;
    return {
      count: scores.length,
      mean: round2(mean),
      median: round2(median),
      standardDeviation: round2(Math.sqrt(variance)),
      lowest: round2(scores[0]),
      highest: round2(scores.at(-1) || 0),
    };
  }

  similarity(first: string, second: string) {
    const a = tokenize(first);
    const b = tokenize(second);
    const intersection = [...a].filter((token) => b.has(token)).length;
    const union = new Set([...a, ...b]).size;
    return union ? round2((intersection / union) * 100) : 0;
  }

  async performanceMatrix(studentId: string): Promise<PerformanceMatrix> {
    const cacheKey = `lms:performance:${studentId}`;
    const cached = await cacheService.get<PerformanceMatrix>(cacheKey);
    if (cached) return cached;
    const [profile, subjects, terms, attendance] = await Promise.all([
      prisma.studentProfile.findUnique({ where: { userId: studentId } }),
      prisma.subjectPerformance.findMany({ where: { studentId } }),
      prisma.termProgress.findMany({ where: { studentId } }),
      prisma.attendanceRecord.findMany({ where: { studentId }, select: { status: true } }),
    ]);
    const present = attendance.filter((record) =>
      ['present', 'late'].includes(record.status),
    ).length;
    const result = {
      studentId,
      level: Math.floor(Math.sqrt((profile?.xpPoints || 0) / 100)),
      xpPoints: profile?.xpPoints || 0,
      streakDays: profile?.streakDays || 0,
      attendancePercentage: attendance.length
        ? round2((present / attendance.length) * 100)
        : 0,
      subjects,
      terms,
      generatedAt: new Date().toISOString(),
    };
    await cacheService.set(cacheKey, result, 300);
    return result;
  }

  async flagOverdue() {
    const assignments = await prisma.assignment.findMany({
      select: { id: true, dueDate: true, dueTime: true },
    });
    let changed = 0;
    for (const assignmentRecord of assignments) {
      const dueAt = new Date(`${assignmentRecord.dueDate}T${assignmentRecord.dueTime || '23:59'}`);
      if (!Number.isNaN(dueAt.valueOf()) && dueAt < new Date()) {
        const result = await prisma.submission.updateMany({
          where: { assignmentId: assignmentRecord.id, status: { in: ['pending', 'draft'] } },
          data: { status: 'overdue' },
        });
        changed += result.count;
        const fullAssignment = await prisma.assignment.findUnique({
          where: { id: assignmentRecord.id },
          include: { classroom: { include: { enrollments: { include: { student: true } } } } },
        });
        if (fullAssignment) {
          for (const enrollment of fullAssignment.classroom.enrollments) {
            const existing = await prisma.submission.findFirst({
              where: {
                assignmentId: fullAssignment.id,
                studentId: enrollment.studentId,
              },
            });
            if (!existing) {
              await prisma.submission.create({
                data: {
                  assignmentId: fullAssignment.id,
                  studentId: enrollment.studentId,
                  studentName: enrollment.student.name,
                  studentAvatar: enrollment.student.avatar,
                  status: 'overdue',
                  submittedAt: dueAt.toISOString(),
                },
              });
              changed += 1;
            }
          }
        }
      }
    }
    return changed;
  }

  async autoSubmitExpiredQuizSessions() {
    const sessions = await prisma.quizAttemptSession.findMany({
      where: { status: 'active', deadlineAt: { lte: new Date() } },
      include: { quiz: { include: { questions: true } } },
    });
    for (const session of sessions) {
      const answers = (session.answers as Record<string, string>) || {};
      const score = session.quiz.questions.reduce((total, question) => {
        const actual = String(answers[question.id] || '')
          .trim()
          .toLowerCase();
        return (
          total + (actual === question.correctAnswer.trim().toLowerCase() ? question.points : 0)
        );
      }, 0);
      const totalPoints = session.quiz.questions.reduce(
        (total, question) => total + question.points,
        0,
      );
      await withDeadlockRetry(() =>
        prisma.$transaction([
          prisma.quizAttemptSession.update({
            where: { id: session.id },
            data: { status: 'auto_submitted', submittedAt: new Date() },
          }),
          prisma.quizSubmission.create({
            data: {
              quizId: session.quizId,
              studentId: session.studentId,
              score,
              totalPoints,
              completedAt: new Date().toISOString(),
              answers,
              attemptNumber: session.attemptNumber,
              questionOrder: session.questionOrder,
            },
          }),
        ]),
      );
      await this.awardXp(session.studentId, Math.round(score * 10));
      await this.evaluateBadges(session.studentId);
    }
    return sessions.length;
  }

  async setSubstituteTeachers(classroomId: string, substituteTeacherIds: string[]) {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: { subjectRef: true },
    });
    if (!classroom) throw new Error('Classroom not found.');
    const uniqueTeacherIds = [...new Set(substituteTeacherIds)];
    const teachers = await prisma.user.findMany({
      where: { id: { in: uniqueTeacherIds }, role: 'teacher', isArchived: false },
      include: { teacherSubjects: { include: { subject: true } } },
    });
    if (teachers.length !== uniqueTeacherIds.length)
      throw new Error('Every substitute must be an active teacher.');
    const mismatched = teachers.find(
      (teacher) => {
        const allocatedSubjects = teacher.teacherSubjects.map((entry) => entry.subject.name);
        const classroomSubject = classroom.subjectRef.name;
        return (
          allocatedSubjects.length > 0 &&
          !allocatedSubjects.some(
            (subject) => subject.toLowerCase() === classroomSubject.toLowerCase(),
          )
        );
      },
    );
    if (mismatched)
      throw new Error(`${mismatched.name} is not allocated to ${classroom.subjectRef.name}.`);
    return prisma.$transaction(async (tx) => {
      await tx.classroomSubstitute.deleteMany({ where: { classroomId } });
      if (uniqueTeacherIds.length)
        await tx.classroomSubstitute.createMany({
          data: uniqueTeacherIds.map((teacherId) => ({ classroomId, teacherId })),
        });
      return tx.classroom.findUniqueOrThrow({
        where: { id: classroomId },
        include: { substitutes: true },
      });
    });
  }

  async streamPosts(limit: number, cursor?: string) {
    const take = Math.min(100, Math.max(1, limit));
    const rows = await prisma.streamPost.findMany({
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { comments: true, attachments: true },
    });
    const hasNextPage = rows.length > take;
    const data = rows.slice(0, take);
    return {
      data,
      meta: { limit: take, nextCursor: hasNextPage ? data.at(-1)?.id : null, hasNextPage },
    };
  }

  async auditLogs(filters: {
    performedBy?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    pageSize: number;
  }) {
    const where = {
      changedBy: filters.performedBy,
      category: filters.category,
      createdAt:
        filters.startDate || filters.endDate
          ? {
              gte: filters.startDate ? new Date(filters.startDate) : undefined,
              lte: filters.endDate ? new Date(filters.endDate) : undefined,
            }
          : undefined,
    };
    const [data, total] = await prisma.$transaction([
      prisma.auditTrail.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      prisma.auditTrail.count({ where }),
    ]);
    return {
      data,
      meta: {
        total,
        page: filters.page,
        pageSize: filters.pageSize,
        totalPages: Math.ceil(total / filters.pageSize),
      },
    };
  }

  async search(query: string) {
    const q = query.trim().slice(0, 100);
    if (q.length < 2) return { users: [], classrooms: [] };
    const [users, classrooms] = await Promise.all([
      prisma.user.findMany({
        where: {
          isArchived: false,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 20,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          studentProfile: { select: { cohortRef: true } },
        },
      }),
      prisma.classroom.findMany({
        where: {
          isArchived: false,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { subjectRef: { name: { contains: q, mode: 'insensitive' } } },
            { code: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 20,
        select: {
          id: true,
          name: true,
          subjectRef: { select: { name: true } },
          cohortRef: { select: { gradeLevel: true, section: true } },
          code: true,
        },
      }),
    ]);
    return {
      users: users.map(({ studentProfile, ...user }) => ({
        ...user,
        gradeLevel: studentProfile?.cohortRef.gradeLevel,
        section: studentProfile?.cohortRef.section,
      })),
      classrooms: classrooms.map(({ subjectRef, cohortRef, ...classroom }) => ({
        ...classroom,
        subject: subjectRef.name,
        gradeLevel: cohortRef.gradeLevel,
        section: cohortRef.section,
      })),
    };
  }

  async dbHealth() {
    const checks = await Promise.all([
      prisma.studentProfile.count({ where: { user: { is: null } } }).catch(() => 0),
      prisma.classroomEnrollment
        .count({ where: { OR: [{ classroom: { is: null } }, { student: { is: null } }] } })
        .catch(() => 0),
      prisma.submission
        .count({ where: { OR: [{ assignment: { is: null } }, { student: { is: null } }] } })
        .catch(() => 0),
    ]);
    const orphanCount = checks.reduce((sum, count) => sum + count, 0);
    return {
      status: orphanCount === 0 ? 'healthy' : 'degraded',
      orphanCount,
      checks: { studentProfiles: checks[0], enrollments: checks[1], submissions: checks[2] },
      checkedAt: new Date().toISOString(),
    };
  }

  async exportClassroom(classroomId: string) {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        enrollments: { include: { student: true } },
        quizzes: { include: { submissions: true } },
      },
    });
    if (!classroom) throw new Error('Classroom not found.');
    const header = ['Student ID', 'Student Name', 'Roll Number', 'Attendance %', 'Average Quiz %'];
    const rows = await Promise.all(
      classroom.enrollments.map(async ({ student }) => {
        const [attendance, profile] = await Promise.all([
          prisma.attendanceRecord.findMany({ where: { studentId: student.id } }),
          prisma.studentProfile.findUnique({ where: { userId: student.id } }),
        ]);
        const submissions = classroom.quizzes
          .flatMap((quiz) => quiz.submissions)
          .filter((submission) => submission.studentId === student.id);
        const average = submissions.length
          ? submissions.reduce(
              (sum, submission) =>
                sum +
                (submission.totalPoints ? (submission.score / submission.totalPoints) * 100 : 0),
              0,
            ) / submissions.length
          : 0;
        return [
          student.id,
          student.name,
          profile?.normalizedRollNumber || '',
          attendance.length
            ? (attendance.filter((item) => ['present', 'late'].includes(item.status)).length /
                attendance.length) *
              100
            : 0,
          round2(average),
        ];
      }),
    );
    return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
  }

  async createVerificationToken(parentId: string) {
    const token = randomBytes(32).toString('base64url');
    await prisma.parentVerificationToken.create({
      data: {
        parentId,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    return token;
  }
}

export const platformService = new PlatformService();
