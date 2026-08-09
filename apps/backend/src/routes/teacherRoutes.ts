import { Router } from 'express';
import {
  addClassroom,
  addStreamPost,
  addPostComment,
  addAssignment,
  addQuiz,
  updateQuizMarksMode,
  markAttendance,
  updateStudentLocation,
  generateQuizAi,
  askTeacherAssistantAi,
} from '@controllers/teacherController';

export const teacherRoutes = Router();

teacherRoutes.post('/db/classrooms', addClassroom);
teacherRoutes.post('/db/stream-posts', addStreamPost);
teacherRoutes.post('/db/stream-posts/:id/comments', addPostComment);
teacherRoutes.post('/db/assignments', addAssignment);
teacherRoutes.post('/db/quizzes', addQuiz);
teacherRoutes.put('/db/quizzes/:id/marks-mode', updateQuizMarksMode);
teacherRoutes.post('/db/attendance', markAttendance);
teacherRoutes.post('/db/student-locations', updateStudentLocation);
teacherRoutes.post('/ai/quiz-generator', generateQuizAi);
teacherRoutes.post('/ai/teacher-assistant', askTeacherAssistantAi);
