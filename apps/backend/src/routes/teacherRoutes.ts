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

export const teacherRoutes = Router();

teacherRoutes.post('/db/classrooms', addClassroom);
teacherRoutes.post('/db/stream-posts', addStreamPost);
teacherRoutes.post('/db/stream-posts/:id/comments', addPostComment);
teacherRoutes.post('/db/assignments', addAssignment);
teacherRoutes.post('/db/quizzes', addQuiz);
teacherRoutes.put('/db/quizzes/:id', updateQuiz);
teacherRoutes.post('/db/quizzes/:id/start', startQuizLive);
teacherRoutes.delete('/db/quizzes/:id', deleteQuiz);
teacherRoutes.put('/db/quizzes/:id/marks-mode', updateQuizMarksMode);
teacherRoutes.post('/db/attendance', markAttendance);
teacherRoutes.post('/db/student-locations', updateStudentLocation);
teacherRoutes.post('/ai/quiz-generator', generateQuizAi);
teacherRoutes.post('/ai/teacher-assistant', askTeacherAssistantAi);

teacherRoutes.get('/db/resources', getResources);
teacherRoutes.post('/db/resources', addResource);
teacherRoutes.put('/db/resources/:id', updateResource);
teacherRoutes.delete('/db/resources/:id', deleteResource);

teacherRoutes.get('/db/modules', getModules);
teacherRoutes.post('/db/modules', addModule);
teacherRoutes.put('/db/modules/:id', updateModule);
teacherRoutes.delete('/db/modules/:id', deleteModule);
