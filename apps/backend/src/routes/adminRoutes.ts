import { Router } from 'express';
import {
  assignStudentBadge,
  getAllStudentLocations,
  createStudent,
  updateStudent,
  deleteStudent,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  createParent,
  deleteParent,
  createBadgeDefinition,
  deleteBadgeDefinition,
  deleteClassroom,
} from '@controllers/adminController';

export const adminRoutes = Router();

adminRoutes.post('/db/student-badges', assignStudentBadge);
adminRoutes.get('/db/student-locations', getAllStudentLocations);

// Student Admin Routes
adminRoutes.post('/db/students', createStudent);
adminRoutes.put('/db/students/:id', updateStudent);
adminRoutes.delete('/db/students/:id', deleteStudent);

// Teacher Admin Routes
adminRoutes.post('/db/teachers', createTeacher);
adminRoutes.put('/db/teachers/:id', updateTeacher);
adminRoutes.delete('/db/teachers/:id', deleteTeacher);

// Parent Admin Routes
adminRoutes.post('/db/parents', createParent);
adminRoutes.delete('/db/parents/:id', deleteParent);

// Badge Definition Routes
adminRoutes.post('/db/badge-definitions', createBadgeDefinition);
adminRoutes.delete('/db/badge-definitions/:id', deleteBadgeDefinition);

// Classroom Admin Routes
adminRoutes.delete('/db/classrooms/:id', deleteClassroom);
