import { NextFunction, Request, Response } from 'express';
import { lifecycleService } from '@db/services/lifecycleService';
import { prisma } from '@db/services/prismaClient';
import { HttpError } from '@utils/httpError';

type Handler = (req: Request, res: Response) => Promise<unknown> | unknown;
const asyncHandler = (handler: Handler) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(handler(req, res)).catch(next);

const assertStudentAccess = async (req: Request, studentId: string) => {
  if (!req.user) throw new HttpError(401, 'Authentication required.');
  const [actor, student] = await Promise.all([
    prisma.user.findFirst({
      where: { id: req.user.id, isArchived: false },
      select: { schoolId: true },
    }),
    prisma.user.findFirst({
      where: { id: studentId, role: 'student' },
      select: { schoolId: true },
    }),
  ]);
  if (!actor || !student) throw new HttpError(404, 'Active account or student not found.');
  if (actor.schoolId !== student.schoolId)
    throw new HttpError(403, "You cannot access another school's student.");
  if (req.user.role === 'admin') return;
  if (req.user.role === 'student' && req.user.id === studentId) return;
  if (req.user.role === 'parent') {
    const link = await prisma.parentStudent.findFirst({
      where: { parentId: req.user.id, studentId, isActive: true },
    });
    if (link) return;
  }
  if (req.user.role === 'teacher') {
    const enrollment = await prisma.classroomEnrollment.findFirst({
      where: {
        studentId,
        isActive: true,
        classroom: {
          isArchived: false,
          OR: [
            { teacherId: req.user.id },
            {
              teachingAssignments: {
                some: { teacherId: req.user.id, isActive: true },
              },
            },
          ],
        },
      },
    });
    if (enrollment) return;
  }
  throw new HttpError(403, 'You do not have access to this student.');
};

export const listAcademicYears = asyncHandler(async (req, res) =>
  res.json({
    status: 'success',
    academicYears: await lifecycleService.listAcademicYears(
      req.user?.id,
      req.query.schoolId as string,
    ),
  }),
);

export const createAcademicYear = asyncHandler(async (req, res) => {
  const academicYear = await lifecycleService.createAcademicYear(req.user?.id, req.body);
  res.status(201).json({ status: 'success', academicYear });
});

export const activateAcademicYear = asyncHandler(async (req, res) =>
  res.json({
    status: 'success',
    academicYear: await lifecycleService.activateAcademicYear(req.user?.id, req.params.id),
  }),
);

export const getStudentLifecycle = asyncHandler(async (req, res) => {
  await assertStudentAccess(req, req.params.id);
  res.json({
    status: 'success',
    lifecycle: await lifecycleService.getStudentLifecycle(req.params.id, req.user?.id),
  });
});

export const promoteStudent = asyncHandler(async (req, res) => {
  await assertStudentAccess(req, req.params.id);
  res.json({
    status: 'success',
    result: await lifecycleService.promoteStudent(req.params.id, req.user?.id, req.body),
  });
});

export const restoreStudent = asyncHandler(async (req, res) => {
  await assertStudentAccess(req, req.params.id);
  res.json({
    status: 'success',
    result: await lifecycleService.restoreStudent(req.params.id, req.user?.id, req.body),
  });
});

export const leaveStudent = asyncHandler(async (req, res) => {
  await assertStudentAccess(req, req.params.id);
  res.json({
    status: 'success',
    result: await lifecycleService.leaveStudent(req.params.id, req.user?.id, req.body),
  });
});

export const getTeacherLifecycle = asyncHandler(async (req, res) => {
  if (req.user?.role === 'teacher' && req.user.id !== req.params.id)
    throw new HttpError(403, 'Teachers may only view their own lifecycle.');
  res.json({
    status: 'success',
    lifecycle: await lifecycleService.getTeacherLifecycle(req.params.id, req.user?.id),
  });
});

export const leaveTeacher = asyncHandler(async (req, res) => {
  await lifecycleService.getTeacherLifecycle(req.params.id, req.user?.id);
  res.json({
    status: 'success',
    result: await lifecycleService.archiveTeacher(req.params.id, req.user?.id, req.body),
  });
});

export const listSubjects = asyncHandler(async (req, res) =>
  res.json({
    status: 'success',
    subjects: await lifecycleService.listSubjects(
      req.user?.id,
      req.query.includeArchived === 'true',
    ),
  }),
);

export const upsertSubject = asyncHandler(async (req, res) => {
  const subject = await lifecycleService.upsertSubject(req.user?.id, {
    ...req.body,
    id: req.params.id || req.body.id,
  });
  res.status(req.params.id ? 200 : 201).json({ status: 'success', subject });
});

export const archiveSubject = asyncHandler(async (req, res) =>
  res.json({
    status: 'success',
    subject: await lifecycleService.archiveSubject(req.user?.id, req.params.id),
  }),
);

export const listTimetable = asyncHandler(async (req, res) => {
  let studentId = req.query.studentId as string | undefined;
  let teacherId = req.query.teacherId as string | undefined;
  if (req.user?.role === 'student') studentId = req.user.id;
  if (req.user?.role === 'teacher') teacherId = req.user.id;
  if (req.user?.role === 'parent') {
    if (!studentId)
      throw new HttpError(400, 'studentId is required for a parent timetable request.');
    await assertStudentAccess(req, studentId);
  }
  res.json({
    status: 'success',
    slots: await lifecycleService.listTimetable(req.user?.id, {
      academicYearId: req.query.academicYearId as string | undefined,
      studentId,
      teacherId,
    }),
  });
});

export const validateTimetableClash = asyncHandler(async (req, res) =>
  res.json({
    status: 'success',
    ...(await lifecycleService.validateTimetableClash(req.user?.id, req.body)),
  }),
);

export const upsertTimetableSlot = asyncHandler(async (req, res) => {
  const slot = await lifecycleService.upsertTimetableSlot(req.user?.id, req.body);
  res.status(req.body.id ? 200 : 201).json({ status: 'success', slot });
});

export const archiveTimetableSlot = asyncHandler(async (req, res) =>
  res.json({
    status: 'success',
    slot: await lifecycleService.archiveTimetableSlot(req.user?.id, req.params.id),
  }),
);

export const replaceTeacherDaySchedule = asyncHandler(async (req, res) => {
  if (!req.user) throw new HttpError(401, 'Authentication required.');
  const slots = await lifecycleService.replaceTeacherDaySchedule(
    req.user.id,
    Number(req.params.dayOfWeek),
    req.body.periods,
    req.body.teacherId,
  );
  res.json({ status: 'success', slots });
});

export const listTerms = asyncHandler(async (req, res) =>
  res.json({
    status: 'success',
    terms: await lifecycleService.listTerms(req.user?.id, req.query.academicYearId as string),
  }),
);

export const upsertTerm = asyncHandler(async (req, res) => {
  const term = await lifecycleService.upsertTerm(req.user?.id, {
    ...req.body,
    id: req.params.id || req.body.id,
  });
  res.status(req.params.id ? 200 : 201).json({ status: 'success', term });
});

export const replaceTerms = asyncHandler(async (req, res) =>
  res.json({
    status: 'success',
    terms: await lifecycleService.replaceTerms(
      req.user?.id,
      req.body.academicYearId,
      req.body.terms,
    ),
  }),
);

export const archiveTerm = asyncHandler(async (req, res) =>
  res.json({
    status: 'success',
    term: await lifecycleService.archiveTerm(req.user?.id, req.params.id),
  }),
);

export const listHolidays = asyncHandler(async (req, res) =>
  res.json({
    status: 'success',
    holidays: await lifecycleService.listHolidays(req.user?.id, req.query.academicYearId as string),
  }),
);

export const createHoliday = asyncHandler(async (req, res) => {
  const holiday = await lifecycleService.createHoliday(req.user?.id, req.body);
  res.status(201).json({ status: 'success', holiday });
});

export const archiveHoliday = asyncHandler(async (req, res) => {
  const holiday = await lifecycleService.archiveHoliday(req.user?.id, req.params.id);
  res.json({ status: 'success', holiday });
});

export const listBellSchedule = asyncHandler(async (req, res) =>
  res.json({
    status: 'success',
    entries: await lifecycleService.listBellSchedule(
      req.user?.id,
      req.query.academicYearId as string,
    ),
  }),
);

export const replaceBellSchedule = asyncHandler(async (req, res) =>
  res.json({
    status: 'success',
    entries: await lifecycleService.replaceBellSchedule(
      req.user?.id,
      req.body.academicYearId,
      req.body.entries,
    ),
  }),
);

export const listExams = asyncHandler(async (req, res) =>
  res.json({
    status: 'success',
    exams: await lifecycleService.listExams(req.user?.id, req.query.academicYearId as string),
  }),
);

export const createExam = asyncHandler(async (req, res) => {
  const exam = await lifecycleService.createExam(req.user?.id, req.body);
  res.status(201).json({ status: 'success', exam });
});

export const updateExamStatus = asyncHandler(async (req, res) =>
  res.json({
    status: 'success',
    exam: await lifecycleService.updateExamStatus(req.user?.id, req.params.id, req.body.status),
  }),
);

export const submitExamMarks = asyncHandler(async (req, res) => {
  if (!req.user) throw new HttpError(401, 'Authentication required.');
  const marks = await lifecycleService.submitExamMarks(
    req.params.examSubjectId,
    req.user.id,
    req.user.role,
    req.body.marks,
  );
  res.status(201).json({ status: 'success', count: marks.length, marks });
});

export const generateReportCard = asyncHandler(async (req, res) => {
  await assertStudentAccess(req, req.params.studentId);
  const reportCard = await lifecycleService.generateReportCard(
    req.params.studentId,
    req.body.academicYearId,
    req.body,
  );
  res.status(201).json({ status: 'success', reportCard });
});

export const rolloverAcademicYear = asyncHandler(async (req, res) =>
  res.json({
    status: 'success',
    rollover: await lifecycleService.rolloverAcademicYear(req.user?.id, req.body),
  }),
);
