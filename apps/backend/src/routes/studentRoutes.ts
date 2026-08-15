import { Router } from 'express';
import {
  submitHomework,
  submitQuiz,
  getStudentLocation,
  askAiTutor,
  askHomeworkHelper,
} from '@controllers/studentController';
import { requireRolesWhenStrict } from '@middlewares/authMiddleware';
import { validateBody } from '@middlewares/platformMiddleware';
import { z } from 'zod';

export const studentRoutes = Router();

studentRoutes.post('/db/submissions', requireRolesWhenStrict('student', 'admin'), submitHomework);
studentRoutes.post('/db/quiz-submissions', requireRolesWhenStrict('student', 'admin'), submitQuiz);
studentRoutes.get(
  '/db/student-locations/:studentId',
  requireRolesWhenStrict('student', 'admin'),
  getStudentLocation,
);
studentRoutes.post(
  '/ai/tutor',
  requireRolesWhenStrict('student', 'admin'),
  validateBody(
    z.object({
      prompt: z.string().trim().min(1).max(10_000),
      subject: z.string().trim().min(1).max(120),
      language: z.string().trim().min(1).max(80).optional(),
      studentId: z.string().optional(),
    }),
  ),
  askAiTutor,
);
studentRoutes.post(
  '/ai/homework-helper',
  requireRolesWhenStrict('student', 'admin'),
  validateBody(
    z.object({
      assignmentId: z.string().min(1),
      questionText: z.string().trim().min(1).max(10_000),
      studentId: z.string().optional(),
    }),
  ),
  askHomeworkHelper,
);
