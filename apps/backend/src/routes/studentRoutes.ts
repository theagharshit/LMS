import { Router } from 'express';
import {
  submitHomework,
  submitQuiz,
  getStudentLocation,
  askAiTutor,
  askHomeworkHelper,
} from '@controllers/studentController';
import { requireRolesWhenStrict } from '@middlewares/authMiddleware';

export const studentRoutes = Router();

studentRoutes.post('/db/submissions', requireRolesWhenStrict('student', 'admin'), submitHomework);
studentRoutes.post('/db/quiz-submissions', requireRolesWhenStrict('student', 'admin'), submitQuiz);
studentRoutes.get(
  '/db/student-locations/:studentId',
  requireRolesWhenStrict('student', 'admin'),
  getStudentLocation,
);
studentRoutes.post('/ai/tutor', requireRolesWhenStrict('student', 'admin'), askAiTutor);
studentRoutes.post(
  '/ai/homework-helper',
  requireRolesWhenStrict('student', 'admin'),
  askHomeworkHelper,
);
