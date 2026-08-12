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
  updateParent,
  bulkImportStudents,
  reseedDevelopmentDatabase,
  assignSubjectToTeacher,
  deassignSubjectFromTeacher,
  reassignSubject,
  getEligibleSubstitutes,
  createSubstituteRequest,
  updateSubstituteRequestStatus,
  getSubstituteRequests,
  submitTeacherAbsenceRequest,
  reviewTeacherAbsenceRequest,
  getTeacherAbsenceRequests,
  getAssignmentAuditLogs,
} from '@controllers/adminController';
import { requireRolesWhenStrict } from '@middlewares/authMiddleware';

export const adminRoutes = Router();

adminRoutes.post('/db/student-badges', requireRolesWhenStrict('admin'), assignStudentBadge);
adminRoutes.get('/db/student-locations', requireRolesWhenStrict('admin'), getAllStudentLocations);

// Student Admin Routes
adminRoutes.post('/db/students', requireRolesWhenStrict('admin'), createStudent);
adminRoutes.post('/db/students/import', requireRolesWhenStrict('admin'), bulkImportStudents);
adminRoutes.put('/db/students/:id', requireRolesWhenStrict('admin'), updateStudent);
adminRoutes.delete('/db/students/:id', requireRolesWhenStrict('admin'), deleteStudent);

// Teacher Admin Routes
adminRoutes.post('/db/teachers', requireRolesWhenStrict('admin'), createTeacher);
adminRoutes.put('/db/teachers/:id', requireRolesWhenStrict('admin'), updateTeacher);
adminRoutes.delete('/db/teachers/:id', requireRolesWhenStrict('admin'), deleteTeacher);

// Teacher Subject Assignments & Reassignments
adminRoutes.post(
  '/db/teachers/assign-subject',
  requireRolesWhenStrict('admin'),
  assignSubjectToTeacher,
);
adminRoutes.post(
  '/db/teachers/deassign-subject',
  requireRolesWhenStrict('admin'),
  deassignSubjectFromTeacher,
);
adminRoutes.post('/db/teachers/reassign-subject', requireRolesWhenStrict('admin'), reassignSubject);

// Substitute Request Routes & Qualification Filters
adminRoutes.get(
  '/db/teachers/substitutes/eligible',
  requireRolesWhenStrict('admin'),
  getEligibleSubstitutes,
);
adminRoutes.post(
  '/db/teachers/substitutes/request',
  requireRolesWhenStrict('admin'),
  createSubstituteRequest,
);
adminRoutes.patch(
  '/db/teachers/substitutes/:id/status',
  requireRolesWhenStrict(['admin', 'teacher']),
  updateSubstituteRequestStatus,
);
adminRoutes.get(
  '/db/teachers/substitutes',
  requireRolesWhenStrict(['admin', 'teacher']),
  getSubstituteRequests,
);

// Teacher Absence Requests
adminRoutes.post(
  '/db/teachers/absence-requests',
  requireRolesWhenStrict(['teacher', 'admin']),
  submitTeacherAbsenceRequest,
);
adminRoutes.patch(
  '/db/teachers/absence-requests/:id/review',
  requireRolesWhenStrict('admin'),
  reviewTeacherAbsenceRequest,
);
adminRoutes.get(
  '/db/teachers/absence-requests',
  requireRolesWhenStrict(['admin', 'teacher']),
  getTeacherAbsenceRequests,
);

// Assignment Audit Logs
adminRoutes.get(
  '/db/teachers/assignment-audit-logs',
  requireRolesWhenStrict('admin'),
  getAssignmentAuditLogs,
);

// Parent Admin Routes
adminRoutes.post('/db/parents', requireRolesWhenStrict('admin'), createParent);
adminRoutes.put('/db/parents/:id', requireRolesWhenStrict('admin'), updateParent);
adminRoutes.delete('/db/parents/:id', requireRolesWhenStrict('admin'), deleteParent);

// Badge Definition Routes
adminRoutes.post('/db/badge-definitions', requireRolesWhenStrict('admin'), createBadgeDefinition);
adminRoutes.delete(
  '/db/badge-definitions/:id',
  requireRolesWhenStrict('admin'),
  deleteBadgeDefinition,
);

// Classroom Admin Routes
adminRoutes.delete('/db/classrooms/:id', requireRolesWhenStrict('admin'), deleteClassroom);
adminRoutes.post('/system/reseed', requireRolesWhenStrict('admin'), reseedDevelopmentDatabase);
