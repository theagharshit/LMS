import { NextFunction, Request, Response } from 'express';
import { createHash } from 'node:crypto';
import { platformService } from '@db/services/platformService';
import { attendanceService } from '@db/services/attendanceService';
import { classroomService } from '@db/services/classroomService';
import { notificationService } from '@db/services/notificationService';
import { authService } from '@db/services/authService';
import { prisma } from '@db/services/prismaClient';
import { bufferLocationPing } from '@utils/backgroundJobs';
import { broadcastLocation } from '@utils/realtime';
import { getAi } from '@utils/aiClient';
import { metricsRegistry } from '@middlewares/metricsMiddleware';
import { HttpError } from '@utils/httpError';
import { signToken } from '@utils/jwtUtils';

type Handler = (req: Request, res: Response) => Promise<unknown> | unknown;
export const asyncHandler =
  (handler: Handler) => (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(handler(req, res)).catch(next);

export const getMetrics = asyncHandler(async (_req, res) => {
  res.type(metricsRegistry.contentType).send(await metricsRegistry.metrics());
});

export const getDbHealth = asyncHandler(async (_req, res) =>
  res.json(await platformService.dbHealth()),
);

export const getSearch = asyncHandler(async (req, res) =>
  res.json({ status: 'success', ...(await platformService.search(String(req.query.q || ''))) }),
);

export const getStreamPostsPage = asyncHandler(async (req, res) => {
  res.json(
    await platformService.streamPosts(
      Number(req.query.limit || 20),
      req.query.cursor as string | undefined,
    ),
  );
});

export const markBulkAttendance = asyncHandler(async (req, res) => {
  const rows = await attendanceService.markBulk(
    req.body.records,
    req.user?.id,
  );
  res.status(201).json({ status: 'success', count: rows.length, attendance: rows });
});

export const getQuizAttempt = asyncHandler(async (req, res) =>
  res.json({
    status: 'success',
    quiz: await platformService.randomizedQuiz(req.params.quizId, req.params.studentId),
  }),
);

export const gradeQuizAttempt = asyncHandler(async (req, res) => {
  const result = await platformService.autoGradeQuiz(
    req.params.quizId,
    req.body.studentId,
    req.body.answers,
    req.body.sessionId,
  );
  res.status(201).json({ status: 'success', ...result });
});

export const calculateRubric = asyncHandler(async (req, res) =>
  res.json({ status: 'success', score: platformService.rubricScore(req.body) }),
);

export const getGradeAnalytics = asyncHandler(async (req, res) =>
  res.json({
    status: 'success',
    analytics: await platformService.gradeAnalytics(
      req.query.quizId as string | undefined,
      req.query.classroomId as string | undefined,
    ),
  }),
);

export const checkSimilarity = asyncHandler(async (req, res) =>
  res.json({
    status: 'success',
    similarityPercentage: platformService.similarity(req.body.first, req.body.second),
    flagged: platformService.similarity(req.body.first, req.body.second) >= 80,
  }),
);

export const getPerformanceMatrix = asyncHandler(async (req, res) =>
  res.json({
    status: 'success',
    performance: await platformService.performanceMatrix(req.params.studentId),
  }),
);

export const getStudentIdToken = asyncHandler(async (req, res) => {
  const student = await prisma.user.findFirst({
    where: { id: req.params.studentId, role: 'student', isArchived: false },
  });
  if (!student) throw new HttpError(404, 'Student not found.');
  const token = signToken(
    {
      id: student.id,
      name: student.name,
      email: student.email,
      role: 'student',
      tokenType: 'student-id',
    },
    '60s',
  );
  res.setHeader('Cache-Control', 'no-store');
  res.json({ status: 'success', qrPayload: token, expiresIn: 60 });
});

export const recordActivity = asyncHandler(async (req, res) =>
  res.json({
    status: 'success',
    profile: await platformService.recordDailyActivity(req.params.studentId, req.body.timezone),
  }),
);

export const enrollStudent = asyncHandler(async (req, res) => {
  const enrollment = await classroomService.enrollStudent(
    req.params.classroomId,
    req.body.studentId,
  );
  res.status(201).json({ status: 'success', enrollment });
});

export const setSubstituteTeachers = asyncHandler(async (req, res) => {
  const classroom = await platformService.setSubstituteTeachers(
    req.params.classroomId,
    req.body.substituteTeacherIds,
  );
  res.json({ status: 'success', classroom });
});

export const exportClassroom = asyncHandler(async (req, res) => {
  const csv = await platformService.exportClassroom(req.params.classroomId);
  res.attachment(`classroom-${req.params.classroomId}.csv`).type('text/csv').send(csv);
});

export const getAuditLogs = asyncHandler(async (req, res) =>
  res.json(
    await platformService.auditLogs({
      performedBy: req.query.performedBy as string | undefined,
      category: req.query.category as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      page: Math.max(1, Number(req.query.page || 1)),
      pageSize: Math.min(100, Math.max(1, Number(req.query.pageSize || 20))),
    }),
  ),
);

export const getSystemConfig = asyncHandler(async (_req, res) =>
  res.json({
    status: 'success',
    config: await prisma.systemConfig.findMany({ orderBy: { key: 'asc' } }),
  }),
);

export const setSystemConfig = asyncHandler(async (req, res) => {
  const config = await prisma.systemConfig.upsert({
    where: { key: req.params.key },
    update: { value: req.body.value, description: req.body.description, updatedBy: req.user?.id },
    create: {
      key: req.params.key,
      value: req.body.value,
      description: req.body.description,
      updatedBy: req.user?.id,
    },
  });
  res.json({ status: 'success', config });
});

export const updateUserRole = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin')
    throw new HttpError(403, 'Only administrators can change roles.');
  if (req.user.id === req.params.id) throw new HttpError(403, 'You cannot modify your own role.');
  const before = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!before) throw new HttpError(404, 'User not found.');
  if (String(before.role) === 'principal')
    throw new HttpError(403, 'Principal accounts cannot be changed by an administrator.');
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { role: req.body.role },
  });
  await prisma.auditTrail.create({
    data: {
      tableName: 'User',
      action: 'ROLE_CHANGE',
      previousData: { role: before.role },
      newData: { role: user.role },
      changedBy: req.user.id,
      category: 'security',
    },
  });
  await authService.revokeAllForUser(user.id, 'role-change');
  res.json({ status: 'success', user });
});

export const dispatchBulkFeedback = asyncHandler(async (req, res) => {
  const outcomes = await Promise.all(
    req.body.studentIds.map((recipientId: string) =>
      notificationService.dispatchNotification({
        recipientId,
        senderId: req.user?.id,
        senderName: req.user?.name || 'Teacher',
        senderRole: req.user?.role || 'teacher',
        title: req.body.title || 'Teacher Feedback',
        body: req.body.feedback,
        category: 'ACADEMIC',
        type: 'message',
      }),
    ),
  );
  res.json({ status: 'success', dispatched: outcomes.filter(Boolean).length });
});

export const createAbsenceRequest = asyncHandler(async (req, res) => {
  const request = await prisma.absenceRequest.create({
    data: {
      ...req.body,
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
    },
  });
  res.status(201).json({ status: 'success', request });
});

export const listPayments = asyncHandler(async (req, res) =>
  res.json({
    status: 'success',
    payments: await prisma.paymentRecord.findMany({
      where: { studentId: req.params.studentId },
      orderBy: { createdAt: 'desc' },
    }),
  }),
);

export const createPayment = asyncHandler(async (req, res) => {
  const payment = await prisma.paymentRecord.create({
    data: { ...req.body, paidAt: req.body.paidAt ? new Date(req.body.paidAt) : undefined },
  });
  res.status(201).json({ status: 'success', payment });
});

export const createParentVerification = asyncHandler(async (req, res) => {
  const token = await platformService.createVerificationToken(req.params.parentId);
  await notificationService.dispatchNotification({
    recipientId: req.params.parentId,
    senderName: 'Sikshya LMS',
    senderRole: 'admin',
    title: 'Verify your parent account',
    body: `Use this one-time verification token within 24 hours: ${token}`,
    category: 'COMMUNICATION',
    severity: 'normal',
    type: 'general',
  });
  res.status(201).json({ status: 'success', token, expiresIn: 86400 });
});

export const verifyParentAccount = asyncHandler(async (req, res) => {
  const token = await prisma.parentVerificationToken.findFirst({
    where: {
      tokenHash: createHash('sha256').update(req.body.token).digest('hex'),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (!token) throw new HttpError(400, 'Verification token is invalid or expired.');
  await prisma.$transaction([
    prisma.parentVerificationToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    }),
    prisma.auditTrail.create({
      data: {
        tableName: 'User',
        action: 'PARENT_VERIFIED',
        changedBy: token.parentId,
        category: 'security',
        newData: { verified: true },
      },
    }),
  ]);
  res.json({ status: 'success', parentId: token.parentId, verified: true });
});

export const ingestLocationPing = asyncHandler(async (req, res) => {
  const buffered = bufferLocationPing(req.body);
  const delivered = broadcastLocation(req.body);
  res.status(202).json({ status: 'success', ...buffered, realtimeSubscribers: delivered });
});

export const geofenceCheck = asyncHandler(async (req, res) => {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(req.body.latitude - req.body.schoolLatitude);
  const dLon = toRadians(req.body.longitude - req.body.schoolLongitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(req.body.schoolLatitude)) *
      Math.cos(toRadians(req.body.latitude)) *
      Math.sin(dLon / 2) ** 2;
  const distanceMeters = 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const outside = distanceMeters > req.body.radiusMeters;
  if (outside)
    await notificationService.dispatchBroadcastNotification({
      targetAudience: 'parents',
      title: 'Safe-zone alert',
      body: `${req.body.studentName || 'A student'} left the configured school safe zone.`,
      category: 'CRITICAL',
      severity: 'urgent',
      type: 'location',
    });
  res.json({ status: 'success', outside, distanceMeters: Math.round(distanceMeters) });
});

export const checkAccessSchedule = asyncHandler(async (req, res) => {
  const settings = await prisma.parentControlSettings.findUnique({
    where: { studentId: req.params.studentId },
  });
  if (!settings?.blackoutStart || !settings.blackoutEnd)
    return res.json({ status: 'success', allowed: true });
  const now = new Intl.DateTimeFormat('en-GB', {
    timeZone: settings.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
  const wraps = settings.blackoutStart > settings.blackoutEnd;
  const blocked = wraps
    ? now >= settings.blackoutStart || now < settings.blackoutEnd
    : now >= settings.blackoutStart && now < settings.blackoutEnd;
  res.json({
    status: 'success',
    allowed: !blocked,
    blackoutStart: settings.blackoutStart,
    blackoutEnd: settings.blackoutEnd,
    timezone: settings.timezone,
  });
});

const tutorCache = new Map<string, string>();
export const streamTutor = asyncHandler(async (req, res) => {
  const key = createHash('sha256').update(JSON.stringify(req.body)).digest('hex');
  const fallback =
    tutorCache.get(key) ||
    `Let’s work through “${req.body.prompt}” step by step. Start by listing what you already know, then identify the single concept the question is testing.`;
  res.status(200).set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  const send = (event: string, data: unknown) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  try {
    const ai = getAi();
    if (!ai) throw new Error('AI provider unavailable');
    let fullText = '';
    const stream = await ai.models.generateContentStream({
      model: 'gemini-3.6-flash',
      contents: req.body.prompt,
    });
    for await (const chunk of stream) {
      if (chunk.text) {
        fullText += chunk.text;
        send('chunk', { text: chunk.text });
      }
    }
    tutorCache.set(key, fullText);
    send('done', { cached: false });
  } catch {
    send('chunk', { text: fallback });
    send('done', { cached: true });
  }
  res.end();
});

export const externalWebhook = asyncHandler(async (req, res) =>
  res.status(202).json({
    status: 'accepted',
    requestId: req.requestId,
    payloadHash: createHash('sha256').update(JSON.stringify(req.body)).digest('hex'),
  }),
);
