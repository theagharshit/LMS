import { Router } from 'express';
import {
  submitHomework,
  submitQuiz,
  getStudentLocation,
  askAiTutor,
  askHomeworkHelper,
} from '@controllers/studentController';

export const studentRoutes = Router();

studentRoutes.post('/db/submissions', submitHomework);
studentRoutes.post('/db/quiz-submissions', submitQuiz);
studentRoutes.get('/db/student-locations/:studentId', getStudentLocation);
studentRoutes.post('/ai/tutor', askAiTutor);
studentRoutes.post('/ai/homework-helper', askHomeworkHelper);
