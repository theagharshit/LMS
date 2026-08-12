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
teacherRoutes.put('/db/quizzes/:id', requireRolesWhenStrict('teacher', 'admin'), updateQuiz);
teacherRoutes.delete('/db/quizzes/:id', requireRolesWhenStrict('teacher', 'admin'), deleteQuiz);
teacherRoutes.post(
  '/db/quizzes/:id/start',
  requireRolesWhenStrict('teacher', 'admin'),
  startQuizLive,
);
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
teacherRoutes.get('/db/resources', requireRolesWhenStrict('teacher', 'admin'), getResources);
teacherRoutes.post('/db/resources', requireRolesWhenStrict('teacher', 'admin'), addResource);
teacherRoutes.put('/db/resources/:id', requireRolesWhenStrict('teacher', 'admin'), updateResource);
teacherRoutes.delete(
  '/db/resources/:id',
  requireRolesWhenStrict('teacher', 'admin'),
  deleteResource,
);
teacherRoutes.get('/db/modules', requireRolesWhenStrict('teacher', 'admin'), getModules);
teacherRoutes.post('/db/modules', requireRolesWhenStrict('teacher', 'admin'), addModule);
teacherRoutes.put('/db/modules/:id', requireRolesWhenStrict('teacher', 'admin'), updateModule);
teacherRoutes.delete('/db/modules/:id', requireRolesWhenStrict('teacher', 'admin'), deleteModule);
