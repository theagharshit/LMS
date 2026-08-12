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
} from '@controllers/teacherController';
import { requireRolesWhenStrict } from '@middlewares/authMiddleware';

export const teacherRoutes = Router();

teacherRoutes.post('/db/classrooms', requireRolesWhenStrict('teacher', 'admin'), addClassroom);
teacherRoutes.post('/db/stream-posts', requireRolesWhenStrict('teacher', 'admin'), addStreamPost);
teacherRoutes.post(
  '/db/stream-posts/:id/comments',
  requireRolesWhenStrict('teacher', 'admin'),
  addPostComment,
);
teacherRoutes.post('/db/assignments', requireRolesWhenStrict('teacher', 'admin'), addAssignment);
teacherRoutes.post('/db/quizzes', requireRolesWhenStrict('teacher', 'admin'), addQuiz);
teacherRoutes.put(
  '/db/quizzes/:id/marks-mode',
  requireRolesWhenStrict('teacher', 'admin'),
  updateQuizMarksMode,
);
teacherRoutes.post('/db/attendance', requireRolesWhenStrict('teacher', 'admin'), markAttendance);
teacherRoutes.post(
  '/db/student-locations',
  requireRolesWhenStrict('teacher', 'admin'),
  updateStudentLocation,
);
teacherRoutes.post(
  '/ai/quiz-generator',
  requireRolesWhenStrict('teacher', 'admin'),
  generateQuizAi,
);
teacherRoutes.post(
  '/ai/teacher-assistant',
  requireRolesWhenStrict('teacher', 'admin'),
  askTeacherAssistantAi,
);
