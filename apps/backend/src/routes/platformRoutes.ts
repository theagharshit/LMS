import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { authenticateJwt, isStrictAuthMode, requireRoles } from '@middlewares/authMiddleware';
import { requireApiKey, validateBody } from '@middlewares/platformMiddleware';
import {
  calculateRubric,
  checkAccessSchedule,
  checkSimilarity,
  createAuditLog,
  createAbsenceRequest,
  createParentVerification,
  createPayment,
  dispatchBulkFeedback,
  enrollStudent,
  joinByCode,
  exportClassroom,
  externalWebhook,
  geofenceCheck,
  getAuditLogs,
  getDbHealth,
  getGradeAnalytics,
  getMetrics,
  getPerformanceMatrix,
  getStudentIdToken,
  getQuizAttempt,
  getSearch,
  getStreamPostsPage,
  getSystemConfig,
  gradeQuizAttempt,
  ingestLocationPing,
  listPayments,
  markBulkAttendance,
  recordActivity,
  setSubstituteTeachers,
  setSystemConfig,
  streamTutor,
  updateUserRole,
  verifyParentAccount,
} from '@controllers/platformController';

export const platformRoutes = Router();

const rolesInStrictMode =
  (...roles: Array<'student' | 'teacher' | 'parent' | 'admin'>) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!isStrictAuthMode()) return requireRoles(...roles)(req, res, next);
    authenticateJwt(req, res, (error?: unknown) => {
      if (error) return next(error);
      return requireRoles(...roles)(req, res, next);
    });
  };

const attendanceSchema = z.object({
  records: z
    .array(
      z.object({
        studentId: z.string().min(1),
        date: z.iso.date(),
        status: z.enum(['present', 'absent', 'late', 'excused']),
        remarks: z.string().max(500).optional(),
      }),
    )
    .min(1)
    .max(100),
});

platformRoutes.get('/metrics', rolesInStrictMode('admin'), getMetrics);
platformRoutes.get('/system/db-health', rolesInStrictMode('admin'), getDbHealth);
platformRoutes.get('/db/search', rolesInStrictMode('admin', 'teacher'), getSearch);
platformRoutes.get('/db/stream-posts', getStreamPostsPage);
platformRoutes.post(
  '/db/attendance/bulk',
  rolesInStrictMode('teacher', 'admin'),
  validateBody(attendanceSchema),
  markBulkAttendance,
);
platformRoutes.get(
  '/db/quizzes/:quizId/attempt/:studentId',
  rolesInStrictMode('student', 'teacher', 'admin'),
  getQuizAttempt,
);
platformRoutes.post(
  '/db/quizzes/:quizId/grade',
  rolesInStrictMode('student'),
  validateBody(
    z.object({
      studentId: z.string().min(1),
      sessionId: z.string().min(1).optional(),
      answers: z.record(z.string(), z.string()),
    }),
  ),
  gradeQuizAttempt,
);
platformRoutes.post(
  '/db/grading/rubric',
  rolesInStrictMode('teacher', 'admin'),
  validateBody(z.object({ structure: z.number(), content: z.number(), grammar: z.number() })),
  calculateRubric,
);
platformRoutes.get(
  '/db/grading/analytics',
  rolesInStrictMode('teacher', 'admin'),
  getGradeAnalytics,
);
platformRoutes.post(
  '/db/submissions/similarity',
  rolesInStrictMode('teacher', 'admin'),
  validateBody(z.object({ first: z.string().max(100_000), second: z.string().max(100_000) })),
  checkSimilarity,
);
platformRoutes.get(
  '/db/students/:studentId/performance',
  rolesInStrictMode('student', 'teacher', 'parent', 'admin'),
  getPerformanceMatrix,
);
platformRoutes.get(
  '/db/students/:studentId/id-token',
  rolesInStrictMode('student', 'teacher', 'admin'),
  getStudentIdToken,
);
platformRoutes.post(
  '/db/students/:studentId/activity',
  rolesInStrictMode('student'),
  validateBody(z.object({ timezone: z.string().max(80).default('Asia/Kathmandu') })),
  recordActivity,
);
platformRoutes.post(
  '/db/classrooms/join',
  rolesInStrictMode('student'),
  validateBody(z.object({ code: z.string().min(1).max(20) })),
  joinByCode,
);
platformRoutes.post(
  '/db/classrooms/:classroomId/enrollments',
  rolesInStrictMode('teacher', 'admin'),
  validateBody(z.object({ studentId: z.string().min(1) })),
  enrollStudent,
);
platformRoutes.put(
  '/db/classrooms/:classroomId/substitutes',
  rolesInStrictMode('teacher', 'admin'),
  validateBody(z.object({ substituteTeacherIds: z.array(z.string().min(1)).max(10) })),
  setSubstituteTeachers,
);
platformRoutes.get(
  '/db/classrooms/:classroomId/export.csv',
  rolesInStrictMode('teacher', 'admin'),
  exportClassroom,
);
platformRoutes.get('/db/audit-logs', rolesInStrictMode('admin'), getAuditLogs);
platformRoutes.post(
  '/db/audit-logs',
  rolesInStrictMode('admin'),
  validateBody(
    z.object({
      action: z.string().trim().min(1).max(120),
      category: z.string().trim().min(1).max(80),
      details: z.string().trim().min(1).max(2_000),
      tableName: z.string().trim().min(1).max(80).optional(),
    }),
  ),
  createAuditLog,
);
platformRoutes.get('/system/config', rolesInStrictMode('admin'), getSystemConfig);
platformRoutes.put(
  '/system/config/:key',
  rolesInStrictMode('admin'),
  validateBody(z.object({ value: z.json(), description: z.string().max(500).optional() })),
  setSystemConfig,
);
platformRoutes.put(
  '/db/users/:id/role',
  rolesInStrictMode('admin'),
  validateBody(z.object({ role: z.enum(['student', 'teacher', 'parent', 'admin']) })),
  updateUserRole,
);
platformRoutes.post(
  '/db/feedback/bulk',
  rolesInStrictMode('teacher', 'admin'),
  validateBody(
    z.object({
      studentIds: z.array(z.string()).min(1).max(100),
      title: z.string().trim().min(1).max(120),
      feedback: z.string().min(1).max(2_000),
    }),
  ),
  dispatchBulkFeedback,
);
platformRoutes.post(
  '/db/absence-requests',
  rolesInStrictMode('parent', 'admin'),
  validateBody(
    z.object({
      studentId: z.string(),
      parentId: z.string(),
      teacherId: z.string().optional(),
      startDate: z.iso.datetime(),
      endDate: z.iso.datetime(),
      reason: z.string().min(3).max(2_000),
    }),
  ),
  createAbsenceRequest,
);
platformRoutes.get('/db/payments/:studentId', rolesInStrictMode('parent', 'admin'), listPayments);
platformRoutes.post(
  '/db/payments',
  rolesInStrictMode('admin'),
  validateBody(
    z.object({
      studentId: z.string(),
      parentId: z.string(),
      invoiceNo: z.string(),
      amount: z.number().positive(),
      currency: z.string().length(3).default('NPR'),
      status: z.enum(['pending', 'paid', 'failed', 'refunded']),
      description: z.string().max(500),
      paidAt: z.iso.datetime().optional(),
    }),
  ),
  createPayment,
);
platformRoutes.post(
  '/db/parents/:parentId/verification',
  rolesInStrictMode('admin'),
  createParentVerification,
);
platformRoutes.post(
  '/db/parents/verify',
  validateBody(z.object({ token: z.string().min(20).max(200) })),
  verifyParentAccount,
);
platformRoutes.post(
  '/db/location-pings',
  rolesInStrictMode('teacher', 'admin'),
  validateBody(
    z.object({
      studentId: z.string(),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      location: z.string(),
      category: z.enum([
        'in_class',
        'canteen_lunch',
        'en_route_bus',
        'library',
        'sports_ground',
        'assembly_hall',
        'dismissed_home',
        'laboratory',
      ]),
      busNumber: z.string().optional(),
      notes: z.string().max(500).optional(),
    }),
  ),
  ingestLocationPing,
);
platformRoutes.post(
  '/db/geofence/check',
  rolesInStrictMode('teacher', 'admin'),
  validateBody(
    z.object({
      studentId: z.string().min(1),
      latitude: z.number(),
      longitude: z.number(),
      schoolLatitude: z.number(),
      schoolLongitude: z.number(),
      radiusMeters: z.number().positive().max(100_000),
    }),
  ),
  geofenceCheck,
);
platformRoutes.get('/db/students/:studentId/access-schedule', checkAccessSchedule);
platformRoutes.post(
  '/ai/tutor/stream',
  rolesInStrictMode('student'),
  validateBody(
    z.object({
      prompt: z.string().min(2).max(5_000),
      subject: z.string().max(100).optional(),
      gradeLevel: z.number().int().min(1).max(12).optional(),
    }),
  ),
  streamTutor,
);
platformRoutes.post('/integrations/webhook', requireApiKey, externalWebhook);
