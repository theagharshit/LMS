import { Router } from 'express';
import {
  addClassroom,
  addStreamPost,
  addPostComment,
  addAssignment,
  addQuiz,
  updateQuiz,
  deleteQuiz,
  startQuizLive,
  updateQuizMarksMode,
  markAttendance,
  updateStudentLocation,
  generateQuizAi,
  askTeacherAssistantAi,
  getResources,
  addResource,
  updateResource,
  deleteResource,
  getModules,
  addModule,
  updateModule,
  deleteModule,
  gradeSubmission,
} from '@controllers/teacherController';
import { requireRolesWhenStrict } from '@middlewares/authMiddleware';
import { validateBody } from '@middlewares/platformMiddleware';
import { z } from 'zod';

export const teacherRoutes = Router();

const attachmentSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1).max(255),
  type: z.enum(['pdf', 'video', 'link', 'image', 'doc']),
  url: z.string().trim().min(1).max(4_000),
  size: z.string().trim().max(80).optional(),
});
const streamPostSchema = z.object({
  classroomId: z.string().min(1),
  content: z.string().trim().min(1).max(10_000),
  pinned: z.boolean().optional(),
  attachments: z.array(attachmentSchema).max(20).optional(),
});
const assignmentSchema = z.object({
  classroomId: z.string().min(1),
  title: z.string().trim().min(1).max(255),
  instructions: z.string().trim().min(1).max(20_000),
  dueDate: z.iso.date(),
  dueTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  totalPoints: z.number().int().positive().max(100_000),
  attachments: z.array(attachmentSchema).max(20).optional(),
  rubric: z.array(z.string().trim().min(1).max(500)).max(50).optional(),
});
const quizQuestionSchema = z
  .object({
    id: z.string().optional(),
    text: z.string().trim().min(1).max(5_000),
    type: z.enum(['MCQ', 'True/False', 'ShortAnswer']),
    options: z.array(z.string().trim().min(1).max(1_000)).max(20).optional(),
    correctAnswer: z.string().trim().min(1).max(5_000),
    explanation: z.string().trim().max(10_000),
    points: z.number().positive().max(10_000),
  })
  .superRefine((question, context) => {
    if (question.type === 'MCQ' && (!question.options || question.options.length < 2))
      context.addIssue({ code: 'custom', message: 'MCQ questions require at least two options.' });
    if (
      question.type === 'MCQ' &&
      question.options &&
      !question.options.includes(question.correctAnswer)
    )
      context.addIssue({ code: 'custom', message: 'The MCQ answer must match one option.' });
  });
const quizSchema = z.object({
  classroomId: z.string().min(1),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(10_000),
  durationMinutes: z.number().int().positive().max(1_440),
  dueDate: z.string().trim().min(1).max(100),
  questions: z.array(quizQuestionSchema).min(1).max(200),
  published: z.boolean(),
  revealMarksMode: z.enum(['immediate', 'later']).optional(),
  status: z.enum(['draft', 'published', 'live']).optional(),
  sourceResourceIds: z.array(z.string().min(1)).max(100).optional(),
});
const resourceSchema = z.object({
  classroomId: z.string().min(1),
  teacherId: z.string().min(1).optional(),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(10_000).optional(),
  type: z.enum(['pdf', 'video', 'link', 'image', 'doc', 'notes']),
  url: z.string().trim().min(1).max(4_000),
  mimeType: z.string().trim().max(255).optional(),
  sizeFormatted: z.string().trim().max(80).optional(),
  tags: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
});
const moduleSchema = z.object({
  classroomId: z.string().min(1),
  unitName: z.string().trim().min(1).max(255),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).max(20_000),
  durationMinutes: z.number().int().nonnegative().max(100_000),
  attachments: z.array(attachmentSchema).max(50).optional(),
  completedByStudentIds: z.array(z.string().min(1)).max(500).optional(),
});

teacherRoutes.post(
  '/db/classrooms',
  requireRolesWhenStrict('teacher', 'admin'),
  validateBody(
    z.object({
      name: z.string().trim().min(1).max(160),
      subject: z.string().trim().min(1).max(120),
      gradeLevel: z.number().int().min(1).max(12),
      section: z.string().trim().min(1).max(10),
      teacherId: z.string().min(1),
      teacherName: z.string().optional(),
      teacherAvatar: z.string().optional(),
      roomNumber: z.string().trim().min(1).max(50),
      colorTheme: z.string().trim().min(1).max(40),
      bannerImage: z.string().max(2_000),
      meetLink: z.string().max(2_000).optional(),
      maxCapacity: z.number().int().positive().max(500).optional(),
      enrolledStudentIds: z.array(z.string()).optional(),
    }),
  ),
  addClassroom,
);
teacherRoutes.post(
  '/db/stream-posts',
  requireRolesWhenStrict('teacher', 'admin'),
  validateBody(streamPostSchema),
  addStreamPost,
);
teacherRoutes.post(
  '/db/stream-posts/:id/comments',
  requireRolesWhenStrict('teacher', 'admin'),
  validateBody(z.object({ content: z.string().trim().min(1).max(5_000) })),
  addPostComment,
);
teacherRoutes.post(
  '/db/assignments',
  requireRolesWhenStrict('teacher', 'admin'),
  validateBody(assignmentSchema),
  addAssignment,
);
teacherRoutes.patch(
  '/db/submissions/:id/grade',
  requireRolesWhenStrict('teacher', 'admin'),
  validateBody(
    z.object({ grade: z.number().nonnegative(), feedback: z.string().max(5_000).default('') }),
  ),
  gradeSubmission,
);
teacherRoutes.post(
  '/db/quizzes',
  requireRolesWhenStrict('teacher', 'admin'),
  validateBody(quizSchema),
  addQuiz,
);
teacherRoutes.put(
  '/db/quizzes/:id',
  requireRolesWhenStrict('teacher', 'admin'),
  validateBody(quizSchema.omit({ classroomId: true }).partial()),
  updateQuiz,
);
teacherRoutes.delete('/db/quizzes/:id', requireRolesWhenStrict('teacher', 'admin'), deleteQuiz);
teacherRoutes.post(
  '/db/quizzes/:id/start',
  requireRolesWhenStrict('teacher', 'admin'),
  startQuizLive,
);
teacherRoutes.put(
  '/db/quizzes/:id/marks-mode',
  requireRolesWhenStrict('teacher', 'admin'),
  validateBody(z.object({ revealMarksMode: z.enum(['immediate', 'later']) })),
  updateQuizMarksMode,
);
teacherRoutes.post(
  '/db/attendance',
  requireRolesWhenStrict('teacher', 'admin'),
  validateBody(
    z.object({
      studentId: z.string().min(1),
      date: z.iso.date(),
      status: z.enum(['present', 'absent', 'late', 'excused']),
      remarks: z.string().trim().max(500).optional(),
    }),
  ),
  markAttendance,
);
teacherRoutes.post(
  '/db/student-locations',
  requireRolesWhenStrict('teacher', 'admin'),
  validateBody(
    z.object({
      studentId: z.string().min(1),
      location: z.string().trim().min(1).max(500),
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
      busNumber: z.string().trim().max(80).optional(),
      notes: z.string().trim().max(500).optional(),
    }),
  ),
  updateStudentLocation,
);
teacherRoutes.post(
  '/ai/quiz-generator',
  requireRolesWhenStrict('teacher', 'admin'),
  validateBody(
    z.object({
      topic: z.string().trim().min(1).max(500),
      classroomId: z.string().min(1),
      questionCount: z.number().int().min(1).max(50).optional(),
      defaultPoints: z.number().positive().max(1_000).optional(),
      questionTypes: z
        .array(z.enum(['MCQ', 'True/False', 'ShortAnswer']))
        .min(1)
        .max(3)
        .optional(),
      resourceIds: z.array(z.string().min(1)).max(100).optional(),
    }),
  ),
  generateQuizAi,
);
teacherRoutes.post(
  '/ai/teacher-assistant',
  requireRolesWhenStrict('teacher', 'admin'),
  validateBody(
    z.object({
      task: z.string().trim().min(1).max(500),
      context: z.json(),
    }),
  ),
  askTeacherAssistantAi,
);
teacherRoutes.get('/db/resources', requireRolesWhenStrict('teacher', 'admin'), getResources);
teacherRoutes.post(
  '/db/resources',
  requireRolesWhenStrict('teacher', 'admin'),
  validateBody(resourceSchema),
  addResource,
);
teacherRoutes.put(
  '/db/resources/:id',
  requireRolesWhenStrict('teacher', 'admin'),
  validateBody(resourceSchema.omit({ classroomId: true, teacherId: true }).partial()),
  updateResource,
);
teacherRoutes.delete(
  '/db/resources/:id',
  requireRolesWhenStrict('teacher', 'admin'),
  deleteResource,
);
teacherRoutes.get('/db/modules', requireRolesWhenStrict('teacher', 'admin'), getModules);
teacherRoutes.post(
  '/db/modules',
  requireRolesWhenStrict('teacher', 'admin'),
  validateBody(moduleSchema),
  addModule,
);
teacherRoutes.put(
  '/db/modules/:id',
  requireRolesWhenStrict('teacher', 'admin'),
  validateBody(moduleSchema.omit({ classroomId: true }).partial()),
  updateModule,
);
teacherRoutes.delete('/db/modules/:id', requireRolesWhenStrict('teacher', 'admin'), deleteModule);
