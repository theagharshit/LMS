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
import { validateBody } from '@middlewares/platformMiddleware';
import { z } from 'zod';

export const adminRoutes = Router();

const optionalText = (max = 255) => z.string().trim().max(max).optional();
const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9 -]{6,19}$/);
const studentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  role: z.literal('student').optional(),
  schoolName: optionalText(160),
  avatar: optionalText(2_000),
  gradeLevel: z.number().int().min(1).max(12),
  section: z.string().trim().min(1).max(10),
  rollNumber: z.number().int().positive().optional(),
  academicYearId: optionalText(100),
  admissionNumber: optionalText(100),
  admittedAt: z.iso.date().optional(),
  dob: z.iso.date().optional(),
  gender: optionalText(50),
  bloodGroup: optionalText(20),
  medicalNotes: optionalText(2_000),
  parentName: z.string().trim().min(2).max(120).optional(),
  parentEmail: z.string().trim().email().max(254).optional(),
  parentPhone: phone.optional(),
  parentSecondaryPhone: phone.optional(),
  parentAddress: optionalText(500),
  parentOccupation: optionalText(160),
  relationship: optionalText(60),
  verificationStatus: z.enum(['pending_verification', 'verified_enrolled']).optional(),
  guardians: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(120),
        email: z.string().trim().email().max(254),
        phone,
        secondaryPhone: phone.optional(),
        relationship: optionalText(60),
        address: optionalText(500),
        occupation: optionalText(160),
        isPrimary: z.boolean().optional(),
      }),
    )
    .max(10)
    .optional(),
});
const studentCreateSchema = studentSchema.refine(
  (value) =>
    Boolean(value.guardians?.length) ||
    Boolean(value.parentName && value.parentEmail && value.parentPhone),
  { message: 'At least one guardian with name, email, and phone is required.' },
);
const teacherSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  role: z.literal('teacher').optional(),
  schoolName: optionalText(160),
  avatar: optionalText(2_000),
  phone: phone.optional(),
  secondaryPhone: phone.optional(),
  employeeNumber: optionalText(100),
  joinedAt: z.iso.date().optional(),
  address: optionalText(500),
  emergencyContactName: optionalText(120),
  emergencyContactPhone: phone.optional(),
  qualification: optionalText(500),
  specialization: optionalText(500),
  subjectsTaught: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
});
const teacherCreateSchema = teacherSchema.refine(
  (value) =>
    Boolean(
      value.phone &&
      value.employeeNumber &&
      value.emergencyContactName &&
      value.emergencyContactPhone,
    ),
  {
    message:
      'Teacher phone, employee number, emergency contact name, and emergency contact phone are required.',
  },
);
const parentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  role: z.literal('parent').optional(),
  schoolName: optionalText(160),
  avatar: optionalText(2_000),
  phone,
  secondaryPhone: phone.optional(),
  address: optionalText(500),
  occupation: optionalText(160),
  relationship: optionalText(60),
  verificationStatus: z.enum(['pending_verification', 'verified_enrolled']).optional(),
  childrenIds: z.array(z.string().min(1)).max(30).optional(),
});

adminRoutes.post('/db/student-badges', requireRolesWhenStrict('admin'), assignStudentBadge);
adminRoutes.get('/db/student-locations', requireRolesWhenStrict('admin'), getAllStudentLocations);

// Student Admin Routes
adminRoutes.post(
  '/db/students',
  requireRolesWhenStrict('admin'),
  validateBody(studentCreateSchema),
  createStudent,
);
adminRoutes.post('/db/students/import', requireRolesWhenStrict('admin'), bulkImportStudents);
adminRoutes.put(
  '/db/students/:id',
  requireRolesWhenStrict('admin'),
  validateBody(studentSchema.partial()),
  updateStudent,
);
adminRoutes.delete('/db/students/:id', requireRolesWhenStrict('admin'), deleteStudent);

// Teacher Admin Routes
adminRoutes.post(
  '/db/teachers',
  requireRolesWhenStrict('admin'),
  validateBody(teacherCreateSchema),
  createTeacher,
);
adminRoutes.put(
  '/db/teachers/:id',
  requireRolesWhenStrict('admin'),
  validateBody(teacherSchema.partial()),
  updateTeacher,
);
adminRoutes.delete('/db/teachers/:id', requireRolesWhenStrict('admin'), deleteTeacher);

adminRoutes.post(
  '/db/parents',
  requireRolesWhenStrict('admin'),
  validateBody(parentSchema),
  createParent,
);
adminRoutes.put(
  '/db/parents/:id',
  requireRolesWhenStrict('admin'),
  validateBody(parentSchema.partial()),
  updateParent,
);
adminRoutes.delete('/db/parents/:id', requireRolesWhenStrict('admin'), deleteParent);

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
  requireRolesWhenStrict('admin', 'teacher'),
  updateSubstituteRequestStatus,
);
adminRoutes.get(
  '/db/teachers/substitutes',
  requireRolesWhenStrict('admin', 'teacher'),
  getSubstituteRequests,
);

// Teacher Absence Requests
adminRoutes.post(
  '/db/teachers/absence-requests',
  requireRolesWhenStrict('teacher', 'admin'),
  submitTeacherAbsenceRequest,
);
adminRoutes.patch(
  '/db/teachers/absence-requests/:id/review',
  requireRolesWhenStrict('admin'),
  reviewTeacherAbsenceRequest,
);
adminRoutes.get(
  '/db/teachers/absence-requests',
  requireRolesWhenStrict('admin', 'teacher'),
  getTeacherAbsenceRequests,
);

// Assignment Audit Logs
adminRoutes.get(
  '/db/teachers/assignment-audit-logs',
  requireRolesWhenStrict('admin'),
  getAssignmentAuditLogs,
);

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
