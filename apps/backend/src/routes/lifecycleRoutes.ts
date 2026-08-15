import { Router } from 'express';
import { z } from 'zod';
import { requireRolesWhenStrict } from '@middlewares/authMiddleware';
import { validateBody } from '@middlewares/platformMiddleware';
import {
  activateAcademicYear,
  archiveHoliday,
  archiveSubject,
  archiveTerm,
  archiveTimetableSlot,
  createAcademicYear,
  createExam,
  createHoliday,
  generateReportCard,
  getStudentLifecycle,
  getTeacherLifecycle,
  leaveStudent,
  leaveTeacher,
  listAcademicYears,
  listBellSchedule,
  listExams,
  listHolidays,
  listSubjects,
  listTerms,
  listTimetable,
  promoteStudent,
  restoreStudent,
  replaceBellSchedule,
  replaceTeacherDaySchedule,
  replaceTerms,
  rolloverAcademicYear,
  submitExamMarks,
  upsertSubject,
  upsertTerm,
  upsertTimetableSlot,
  updateExamStatus,
  validateTimetableClash,
} from '@controllers/lifecycleController';

export const lifecycleRoutes = Router();

const admin = requireRolesWhenStrict('admin');
const academicReaders = requireRolesWhenStrict('student', 'teacher', 'parent', 'admin');
const date = z.iso.date();
const optionalDate = date.optional();

lifecycleRoutes.get('/db/academic-years', academicReaders, listAcademicYears);
lifecycleRoutes.post(
  '/db/academic-years',
  admin,
  validateBody(
    z.object({
      schoolId: z.string().optional(),
      name: z.string().trim().min(1).max(80),
      startsAt: date,
      endsAt: date,
      isActive: z.boolean().optional(),
    }),
  ),
  createAcademicYear,
);
lifecycleRoutes.patch('/db/academic-years/:id/activate', admin, activateAcademicYear);

lifecycleRoutes.get('/db/students/:id/lifecycle', academicReaders, getStudentLifecycle);
lifecycleRoutes.post(
  '/db/students/:id/promote',
  admin,
  validateBody(
    z.object({
      targetAcademicYearId: z.string().optional(),
      targetGradeLevel: z.number().int().min(1).max(12).optional(),
      targetSection: z.string().trim().min(1).max(10).optional(),
      rollNumber: z.number().int().positive().optional(),
      reason: z.string().trim().max(500).optional(),
      graduate: z.boolean().optional(),
    }),
  ),
  promoteStudent,
);
lifecycleRoutes.post(
  '/db/students/:id/leave',
  admin,
  validateBody(
    z.object({
      reason: z.string().trim().min(2).max(500),
      status: z.enum(['left', 'transferred']).optional(),
    }),
  ),
  leaveStudent,
);
lifecycleRoutes.post(
  '/db/students/:id/restore',
  admin,
  validateBody(
    z.object({
      academicYearId: z.string().optional(),
      reason: z.string().trim().max(500).optional(),
      rollNumber: z.number().int().positive().optional(),
    }),
  ),
  restoreStudent,
);
lifecycleRoutes.get(
  '/db/teachers/:id/lifecycle',
  requireRolesWhenStrict('teacher', 'admin'),
  getTeacherLifecycle,
);
lifecycleRoutes.post(
  '/db/teachers/:id/leave',
  admin,
  validateBody(
    z.object({
      replacementTeacherId: z.string().optional(),
      reason: z.string().trim().min(2).max(500),
    }),
  ),
  leaveTeacher,
);

lifecycleRoutes.get('/db/subjects', academicReaders, listSubjects);
lifecycleRoutes.post(
  '/db/subjects',
  admin,
  validateBody(
    z.object({
      name: z.string().trim().min(1).max(120),
      code: z.string().trim().max(30).optional(),
    }),
  ),
  upsertSubject,
);
lifecycleRoutes.put(
  '/db/subjects/:id',
  admin,
  validateBody(
    z.object({
      name: z.string().trim().min(1).max(120),
      code: z.string().trim().max(30).optional(),
    }),
  ),
  upsertSubject,
);
lifecycleRoutes.delete('/db/subjects/:id', admin, archiveSubject);

const timetableClashSchema = z.object({
  id: z.string().optional(),
  academicYearId: z.string(),
  dayOfWeek: z.number().int().min(0).max(6),
  periodNumber: z.number().int().min(1).max(20),
  teacherId: z.string(),
  cohortId: z.string(),
  roomNumber: z.string().trim().min(1).max(50),
});
const timetableSlotSchema = z.object({
  id: z.string().optional(),
  academicYearId: z.string().optional(),
  classroomId: z.string(),
  teacherId: z.string().optional(),
  dayOfWeek: z.number().int().min(0).max(6),
  periodNumber: z.number().int().min(1).max(20),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  roomNumber: z.string().trim().min(1).max(50).optional(),
  requiredBooks: z.string().max(500).optional(),
});
lifecycleRoutes.get('/db/timetable/slots', academicReaders, listTimetable);
lifecycleRoutes.post(
  '/db/timetable/validate-clash',
  requireRolesWhenStrict('teacher', 'admin'),
  validateBody(timetableClashSchema),
  validateTimetableClash,
);
lifecycleRoutes.post(
  '/db/timetable/slots',
  admin,
  validateBody(timetableSlotSchema),
  upsertTimetableSlot,
);
lifecycleRoutes.delete('/db/timetable/slots/:id', admin, archiveTimetableSlot);
lifecycleRoutes.put(
  '/db/timetable/days/:dayOfWeek',
  requireRolesWhenStrict('teacher', 'admin'),
  validateBody(
    z.object({
      teacherId: z.string().optional(),
      periods: z
        .array(
          z.object({
            classroomId: z.string().min(1),
            periodNumber: z.number().int().min(1).max(20),
            startTime: z.string().regex(/^\d{2}:\d{2}$/),
            endTime: z.string().regex(/^\d{2}:\d{2}$/),
            roomNumber: z.string().trim().min(1).max(50).optional(),
            requiredBooks: z.string().max(500).optional(),
          }),
        )
        .max(20),
    }),
  ),
  replaceTeacherDaySchedule,
);

const termSchema = z.object({
  academicYearId: z.string().optional(),
  name: z.string().trim().min(1).max(80),
  sequence: z.number().int().min(1).max(20),
  startsAt: optionalDate,
  endsAt: optionalDate,
});
lifecycleRoutes.get('/db/terms', academicReaders, listTerms);
lifecycleRoutes.post('/db/terms', admin, validateBody(termSchema), upsertTerm);
lifecycleRoutes.put('/db/terms/:id', admin, validateBody(termSchema), upsertTerm);
lifecycleRoutes.post(
  '/db/terms/batch',
  admin,
  validateBody(
    z.object({
      academicYearId: z.string(),
      terms: z
        .array(termSchema.omit({ academicYearId: true }))
        .min(1)
        .max(20),
    }),
  ),
  replaceTerms,
);
lifecycleRoutes.delete('/db/terms/:id', admin, archiveTerm);

lifecycleRoutes.get('/db/holidays', academicReaders, listHolidays);
lifecycleRoutes.post(
  '/db/holidays',
  admin,
  validateBody(
    z.object({
      academicYearId: z.string().optional(),
      name: z.string().trim().min(1).max(120),
      date,
      description: z.string().max(500).optional(),
    }),
  ),
  createHoliday,
);
lifecycleRoutes.delete('/db/holidays/:id', admin, archiveHoliday);

lifecycleRoutes.get('/db/bell-schedule', academicReaders, listBellSchedule);
lifecycleRoutes.put(
  '/db/bell-schedule',
  admin,
  validateBody(
    z.object({
      academicYearId: z.string().optional(),
      entries: z
        .array(
          z.object({
            name: z.string().trim().min(1).max(120),
            type: z.string().trim().min(1).max(40),
            sequence: z.number().int().min(1).max(50),
            startTime: z.string().regex(/^\d{2}:\d{2}$/),
            endTime: z
              .string()
              .regex(/^\d{2}:\d{2}$/)
              .optional(),
          }),
        )
        .min(1)
        .max(50),
    }),
  ),
  replaceBellSchedule,
);

const examSubjectSchema = z.object({
  subjectId: z.string(),
  classroomId: z.string().optional(),
  examDate: optionalDate,
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  totalMarks: z.number().positive(),
  passMarks: z.number().nonnegative(),
  marksDueAt: z.iso.datetime().optional(),
});
lifecycleRoutes.get('/db/exams', academicReaders, listExams);
lifecycleRoutes.post(
  '/db/exams',
  admin,
  validateBody(
    z.object({
      schoolId: z.string().optional(),
      academicYearId: z.string().optional(),
      termId: z.string().optional(),
      name: z.string().trim().min(1).max(120),
      startsAt: date,
      endsAt: date,
      status: z.enum(['draft', 'published', 'marks_open']).optional(),
      subjects: z.array(examSubjectSchema).min(1).max(100),
    }),
  ),
  createExam,
);
lifecycleRoutes.patch(
  '/db/exams/:id/status',
  admin,
  validateBody(
    z.object({
      status: z.enum(['draft', 'published', 'marks_open', 'marks_closed', 'finalized']),
    }),
  ),
  updateExamStatus,
);
lifecycleRoutes.post(
  '/db/exam-subjects/:examSubjectId/marks',
  requireRolesWhenStrict('teacher', 'admin'),
  validateBody(
    z.object({
      marks: z
        .array(
          z.object({
            studentId: z.string(),
            marksObtained: z.number().nonnegative().nullable().optional(),
            isAbsent: z.boolean().optional(),
            remarks: z.string().max(500).optional(),
          }),
        )
        .min(1)
        .max(200),
    }),
  ),
  submitExamMarks,
);
lifecycleRoutes.post(
  '/db/students/:studentId/report-cards',
  requireRolesWhenStrict('teacher', 'admin'),
  validateBody(
    z.object({
      academicYearId: z.string(),
      passPercentage: z.number().min(0).max(100).optional(),
      graduationGrade: z.number().int().min(1).max(12).optional(),
    }),
  ),
  generateReportCard,
);
lifecycleRoutes.post(
  '/db/academic-rollover',
  admin,
  validateBody(
    z.object({
      fromAcademicYearId: z.string(),
      toAcademicYearId: z.string(),
      passPercentage: z.number().min(0).max(100).optional(),
      graduationGrade: z.number().int().min(1).max(12).optional(),
    }),
  ),
  rolloverAcademicYear,
);
