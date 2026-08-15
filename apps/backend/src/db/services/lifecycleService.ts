import { Prisma, ReportCardResult } from '@prisma/client';
import { prisma } from './prismaClient';
import { cacheService } from './cacheService';
import { HttpError } from '@utils/httpError';

type Transaction = Prisma.TransactionClient;

const DAY_MS = 86_400_000;

const asDate = (value: string | Date, label: string) => {
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new HttpError(400, `${label} must be a valid date.`);
  return date;
};

const dateOnly = (date: Date) => date.toISOString().slice(0, 10);

const gradeFromPercentage = (percentage: number) => {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C+';
  if (percentage >= 40) return 'C';
  return 'NG';
};

const ensureDateRange = (startsAt: Date, endsAt: Date, label: string) => {
  const days = Math.floor((endsAt.getTime() - startsAt.getTime()) / DAY_MS);
  if (days < 0 || days > 366)
    throw new HttpError(400, `${label} must be between 1 and 366 calendar days.`);
};

export class LifecycleService {
  private async resolveSchoolId(actorId?: string, requestedSchoolId?: string) {
    if (actorId) {
      const actor = await prisma.user.findUnique({
        where: { id: actorId },
        select: { schoolId: true, role: true, isArchived: true },
      });
      if (actor && !actor.isArchived) {
        if (requestedSchoolId && requestedSchoolId !== actor.schoolId)
          throw new HttpError(403, 'You cannot access another school.');
        return requestedSchoolId || actor.schoolId;
      }
      throw new HttpError(401, 'The requesting account is not active.');
    }
    if (requestedSchoolId) return requestedSchoolId;
    throw new HttpError(401, 'An active school account is required.');
  }

  private async ensureAcademicYear(tx: Transaction, schoolId: string, academicYearId?: string) {
    if (academicYearId) {
      const year = await tx.academicYear.findFirst({
        where: { id: academicYearId, schoolId, isArchived: false },
      });
      if (!year) throw new HttpError(404, 'Academic year not found for this school.');
      return year;
    }
    const current = await tx.academicYear.findFirst({
      where: { schoolId, isActive: true, isArchived: false },
      orderBy: { startsAt: 'desc' },
    });
    if (current) return current;
    const now = new Date();
    const calendarYear = now.getUTCFullYear();
    return tx.academicYear.create({
      data: {
        schoolId,
        name: String(calendarYear),
        startsAt: new Date(Date.UTC(calendarYear, 0, 1)),
        endsAt: new Date(Date.UTC(calendarYear, 11, 31)),
        isActive: true,
      },
    });
  }

  private async nextRollNumber(
    tx: Transaction,
    academicYearId: string,
    cohortId: string,
    requested?: number,
  ) {
    if (requested !== undefined) {
      if (!Number.isInteger(requested) || requested < 1)
        throw new HttpError(400, 'Roll number must be a positive integer.');
      const taken = await tx.studentAcademicEnrollment.findFirst({
        where: { academicYearId, cohortId, rollNumber: requested },
      });
      if (taken) throw new HttpError(409, 'That roll number is already used in this cohort.');
      return requested;
    }
    const aggregate = await tx.studentAcademicEnrollment.aggregate({
      where: { academicYearId, cohortId },
      _max: { rollNumber: true },
    });
    return (aggregate._max.rollNumber || 0) + 1;
  }

  private async enrollInCohortClassrooms(
    tx: Transaction,
    studentId: string,
    cohortId: string,
    academicYearId: string,
  ) {
    const classrooms = await tx.classroom.findMany({
      where: {
        cohortId,
        isArchived: false,
        OR: [{ academicYearId }, { academicYearId: null }],
      },
      select: {
        id: true,
        maxCapacity: true,
        _count: { select: { enrollments: { where: { isActive: true } } } },
      },
    });
    for (const classroom of classrooms) {
      if (classroom._count.enrollments >= classroom.maxCapacity)
        throw new HttpError(409, `Classroom ${classroom.id} has reached its capacity.`);
      await tx.classroomEnrollment.upsert({
        where: { classroomId_studentId: { classroomId: classroom.id, studentId } },
        create: { classroomId: classroom.id, studentId, isActive: true },
        update: { isActive: true, endedAt: null },
      });
    }
    return classrooms.length;
  }

  async createAcademicYear(
    actorId: string | undefined,
    input: {
      schoolId?: string;
      name: string;
      startsAt: string;
      endsAt: string;
      isActive?: boolean;
    },
  ) {
    const schoolId = await this.resolveSchoolId(actorId, input.schoolId);
    const startsAt = asDate(input.startsAt, 'startsAt');
    const endsAt = asDate(input.endsAt, 'endsAt');
    ensureDateRange(startsAt, endsAt, 'Academic year');
    return prisma.$transaction(async (tx) => {
      const overlap = await tx.academicYear.findFirst({
        where: {
          schoolId,
          isArchived: false,
          startsAt: { lte: endsAt },
          endsAt: { gte: startsAt },
        },
        select: { name: true },
      });
      if (overlap) throw new HttpError(409, `Academic year dates overlap with ${overlap.name}.`);
      if (input.isActive)
        await tx.academicYear.updateMany({
          where: { schoolId, isActive: true },
          data: { isActive: false },
        });
      return tx.academicYear.create({
        data: {
          schoolId,
          name: input.name.trim(),
          startsAt,
          endsAt,
          isActive: input.isActive ?? false,
        },
      });
    });
  }

  async listAcademicYears(actorId?: string, schoolId?: string) {
    const resolvedSchoolId = await this.resolveSchoolId(actorId, schoolId);
    return prisma.academicYear.findMany({
      where: { schoolId: resolvedSchoolId, isArchived: false },
      include: { _count: { select: { studentEnrollments: true, exams: true } } },
      orderBy: { startsAt: 'desc' },
    });
  }

  async activateAcademicYear(actorId: string | undefined, academicYearId: string) {
    const schoolId = await this.resolveSchoolId(actorId);
    return prisma.$transaction(async (tx) => {
      const year = await tx.academicYear.findFirst({
        where: { id: academicYearId, schoolId, isArchived: false },
      });
      if (!year) throw new HttpError(404, 'Academic year not found.');
      await tx.academicYear.updateMany({ where: { schoolId }, data: { isActive: false } });
      return tx.academicYear.update({ where: { id: year.id }, data: { isActive: true } });
    });
  }

  async registerStudentEnrollment(
    studentId: string,
    actorId?: string,
    academicYearId?: string,
    requestedRollNumber?: number,
  ) {
    const actorSchoolId = await this.resolveSchoolId(actorId);
    const result = await prisma.$transaction(async (tx) => {
      const profile = await tx.studentProfile.findUnique({
        where: { userId: studentId },
        include: { user: true },
      });
      if (!profile || profile.user.role !== 'student')
        throw new HttpError(404, 'Student profile not found.');
      if (profile.user.schoolId !== actorSchoolId)
        throw new HttpError(403, 'You cannot enroll a student from another school.');
      const year = await this.ensureAcademicYear(tx, profile.user.schoolId, academicYearId);
      const existing = await tx.studentAcademicEnrollment.findUnique({
        where: { studentId_academicYearId: { studentId, academicYearId: year.id } },
      });
      if (existing) return existing;
      const previousEnrollment = await tx.studentAcademicEnrollment.findFirst({
        where: { studentId },
        orderBy: { enrolledAt: 'desc' },
      });
      if (!previousEnrollment)
        throw new HttpError(409, 'Student has no previous cohort placement to restore.');
      const rollNumber = await this.nextRollNumber(
        tx,
        year.id,
        previousEnrollment.cohortId,
        requestedRollNumber ?? previousEnrollment.rollNumber,
      ).catch(async (error) => {
        if (requestedRollNumber !== undefined) throw error;
        return this.nextRollNumber(tx, year.id, previousEnrollment.cohortId);
      });
      const enrollment = await tx.studentAcademicEnrollment.create({
        data: {
          studentId,
          cohortId: previousEnrollment.cohortId,
          academicYearId: year.id,
          rollNumber,
        },
      });
      await tx.studentProfile.update({
        where: { userId: studentId },
        data: { isArchived: false },
      });
      await tx.user.update({ where: { id: studentId }, data: { isArchived: false } });
      await this.enrollInCohortClassrooms(tx, studentId, previousEnrollment.cohortId, year.id);
      await tx.studentLifecycleEvent.create({
        data: {
          studentId,
          type: 'enrolled',
          toCohortId: previousEnrollment.cohortId,
          academicYearId: year.id,
          createdById: actorId,
        },
      });
      return enrollment;
    });
    await cacheService.invalidate('lms:users', 'lms:student-profiles');
    return result;
  }

  async getStudentLifecycle(studentId: string, actorId?: string) {
    const schoolId = await this.resolveSchoolId(actorId);
    const student = await prisma.user.findFirst({
      where: { id: studentId, role: 'student', schoolId },
      omit: { passwordHash: true },
      include: {
        studentProfile: true,
        guardianLinks: {
          include: {
            parent: {
              omit: { passwordHash: true },
              include: { parentProfile: true },
            },
          },
          orderBy: { isPrimary: 'desc' },
        },
        studentAcademicEnrollments: {
          include: { academicYear: true, cohort: true },
          orderBy: { enrolledAt: 'desc' },
        },
        enrollments: {
          include: {
            classroom: {
              include: {
                subjectRef: true,
                teacher: { omit: { passwordHash: true }, include: { teacherProfile: true } },
                timetableSlots: { where: { isArchived: false } },
              },
            },
          },
          orderBy: { enrolledAt: 'desc' },
        },
        studentExamMarks: {
          include: {
            examSubject: { include: { subject: true, exam: true, classroom: true } },
            submittedBy: { select: { id: true, name: true } },
          },
          orderBy: { submittedAt: 'desc' },
        },
        studentReportCards: {
          include: { academicYear: true, cohort: true, subjects: { include: { subject: true } } },
          orderBy: { generatedAt: 'desc' },
        },
        lifecycleEvents: {
          include: {
            academicYear: true,
            fromCohort: true,
            toCohort: true,
            createdBy: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!student) throw new HttpError(404, 'Student not found.');
    return student;
  }

  async restoreStudent(
    studentId: string,
    actorId: string | undefined,
    input: { academicYearId?: string; reason?: string; rollNumber?: number },
  ) {
    const actorSchoolId = await this.resolveSchoolId(actorId);
    const result = await prisma.$transaction(async (tx) => {
      const profile = await tx.studentProfile.findUnique({
        where: { userId: studentId },
        include: { user: true },
      });
      if (!profile) throw new HttpError(404, 'Student not found.');
      if (profile.user.schoolId !== actorSchoolId)
        throw new HttpError(403, 'You cannot restore a student from another school.');
      const year = await this.ensureAcademicYear(tx, profile.user.schoolId, input.academicYearId);
      const existing = await tx.studentAcademicEnrollment.findUnique({
        where: { studentId_academicYearId: { studentId, academicYearId: year.id } },
      });
      const previousEnrollment =
        existing ||
        (await tx.studentAcademicEnrollment.findFirst({
          where: { studentId },
          orderBy: { enrolledAt: 'desc' },
        }));
      if (!previousEnrollment)
        throw new HttpError(409, 'Student has no previous cohort placement to restore.');
      const cohortId = previousEnrollment.cohortId;
      const rollNumber =
        existing?.rollNumber ||
        (await this.nextRollNumber(tx, year.id, cohortId, input.rollNumber));
      const enrollment = existing
        ? await tx.studentAcademicEnrollment.update({
            where: { id: existing.id },
            data: { status: 'active', endedAt: null, exitReason: null },
          })
        : await tx.studentAcademicEnrollment.create({
            data: {
              studentId,
              academicYearId: year.id,
              cohortId,
              rollNumber,
            },
          });
      await tx.user.update({ where: { id: studentId }, data: { isArchived: false } });
      await tx.studentProfile.update({
        where: { userId: studentId },
        data: { isArchived: false, leftAt: null },
      });
      const guardianLinks = await tx.parentStudent.findMany({ where: { studentId } });
      await tx.parentStudent.updateMany({
        where: { studentId },
        data: { isActive: true, endedAt: null },
      });
      await tx.user.updateMany({
        where: { id: { in: guardianLinks.map((link) => link.parentId) }, role: 'parent' },
        data: { isArchived: false },
      });
      await this.enrollInCohortClassrooms(tx, studentId, cohortId, year.id);
      await tx.studentLifecycleEvent.create({
        data: {
          studentId,
          type: 'restored',
          toCohortId: cohortId,
          academicYearId: year.id,
          reason: input.reason,
          createdById: actorId,
        },
      });
      return enrollment;
    });
    await cacheService.invalidate('lms:users', 'lms:student-profiles');
    return result;
  }

  private async promoteStudentInTransaction(
    tx: Transaction,
    studentId: string,
    actorSchoolId: string,
    actorId: string | undefined,
    input: {
      targetAcademicYearId?: string;
      targetGradeLevel?: number;
      targetSection?: string;
      rollNumber?: number;
      reason?: string;
      graduate?: boolean;
    },
  ) {
    const profile = await tx.studentProfile.findUnique({
      where: { userId: studentId },
      include: { user: true },
    });
    if (!profile || profile.user.isArchived) throw new HttpError(404, 'Active student not found.');
    if (profile.user.schoolId !== actorSchoolId)
      throw new HttpError(403, 'You cannot promote a student from another school.');
    const current = await tx.studentAcademicEnrollment.findFirst({
      where: { studentId, status: 'active' },
      include: { cohort: true },
      orderBy: { enrolledAt: 'desc' },
    });
    if (!current) throw new HttpError(409, 'Student has no active academic enrollment.');
    const reportCard = await tx.studentReportCard.findUnique({
      where: {
        studentId_academicYearId: {
          studentId,
          academicYearId: current.academicYearId,
        },
      },
    });
    if (!reportCard)
      throw new HttpError(
        409,
        'Generate the official report card before promoting, retaining, or graduating this student.',
      );
    const recommendedGraduate = reportCard.result === 'graduated';
    const recommendedGrade =
      reportCard.result === 'retained' ? current.cohort.gradeLevel : current.cohort.gradeLevel + 1;
    const graduate = input.graduate ?? recommendedGraduate;
    const targetGrade = input.targetGradeLevel ?? recommendedGrade;
    const overridesReport =
      graduate !== recommendedGraduate || (!graduate && targetGrade !== recommendedGrade);
    if (overridesReport && !input.reason?.trim())
      throw new HttpError(409, 'A documented reason is required to override the report result.');
    const retained = !graduate && targetGrade === current.cohort.gradeLevel;
    await tx.studentAcademicEnrollment.update({
      where: { id: current.id },
      data: {
        status: graduate ? 'graduated' : retained ? 'retained' : 'promoted',
        endedAt: new Date(),
        exitReason: input.reason,
      },
    });
    await tx.classroomEnrollment.updateMany({
      where: { studentId, isActive: true },
      data: { isActive: false, endedAt: new Date() },
    });

    if (graduate) {
      await tx.studentProfile.update({
        where: { userId: studentId },
        data: { isArchived: true, leftAt: new Date() },
      });
      await tx.user.update({ where: { id: studentId }, data: { isArchived: true } });
      await tx.parentStudent.updateMany({
        where: { studentId, isActive: true },
        data: { isActive: false, endedAt: new Date() },
      });
      const guardianIds = (
        await tx.parentStudent.findMany({ where: { studentId }, select: { parentId: true } })
      ).map((link) => link.parentId);
      for (const parentId of guardianIds) {
        const activeChildren = await tx.parentStudent.count({
          where: { parentId, isActive: true, student: { isArchived: false } },
        });
        if (!activeChildren)
          await tx.user.update({ where: { id: parentId }, data: { isArchived: true } });
      }
      await tx.studentLifecycleEvent.create({
        data: {
          studentId,
          type: 'graduated',
          fromCohortId: current.cohortId,
          academicYearId: current.academicYearId,
          reason: input.reason,
          createdById: actorId,
        },
      });
      return { status: 'graduated' as const, studentId };
    }

    const sourceYear = await tx.academicYear.findUniqueOrThrow({
      where: { id: current.academicYearId },
    });
    let targetYear = input.targetAcademicYearId
      ? await this.ensureAcademicYear(tx, profile.user.schoolId, input.targetAcademicYearId)
      : await tx.academicYear.findFirst({
          where: {
            schoolId: profile.user.schoolId,
            id: { not: current.academicYearId },
            startsAt: { gt: sourceYear.startsAt },
            isArchived: false,
          },
          orderBy: { startsAt: 'asc' },
        });
    if (!targetYear) {
      const nextStart = new Date(sourceYear.startsAt);
      const nextEnd = new Date(sourceYear.endsAt);
      nextStart.setUTCFullYear(nextStart.getUTCFullYear() + 1);
      nextEnd.setUTCFullYear(nextEnd.getUTCFullYear() + 1);
      targetYear = await tx.academicYear.create({
        data: {
          schoolId: profile.user.schoolId,
          name: String(nextStart.getUTCFullYear()),
          startsAt: nextStart,
          endsAt: nextEnd,
        },
      });
    }
    if (targetYear.id === current.academicYearId)
      throw new HttpError(409, 'Promotion must target a different academic year.');
    const gradeLevel = targetGrade;
    if (!Number.isInteger(gradeLevel) || gradeLevel < 1 || gradeLevel > 12)
      throw new HttpError(400, 'Target grade must be between 1 and 12.');
    const section = (input.targetSection || current.cohort.section).trim().toUpperCase();
    const cohort = await tx.academicCohort.upsert({
      where: {
        schoolId_gradeLevel_section: { schoolId: profile.user.schoolId, gradeLevel, section },
      },
      create: { schoolId: profile.user.schoolId, gradeLevel, section },
      update: {},
    });
    const rollNumber = await this.nextRollNumber(tx, targetYear.id, cohort.id, input.rollNumber);
    const enrollment = await tx.studentAcademicEnrollment.create({
      data: {
        studentId,
        cohortId: cohort.id,
        academicYearId: targetYear.id,
        rollNumber,
      },
    });
    const classroomCount = await this.enrollInCohortClassrooms(
      tx,
      studentId,
      cohort.id,
      targetYear.id,
    );
    await tx.studentLifecycleEvent.create({
      data: {
        studentId,
        type: retained ? 'retained' : 'promoted',
        fromCohortId: current.cohortId,
        toCohortId: cohort.id,
        academicYearId: targetYear.id,
        reason: input.reason,
        metadata: {
          fromGrade: current.cohort.gradeLevel,
          toGrade: gradeLevel,
          classroomCount,
        },
        createdById: actorId,
      },
    });
    return {
      status: retained ? ('retained' as const) : ('promoted' as const),
      enrollment,
      classroomCount,
    };
  }

  async promoteStudent(
    studentId: string,
    actorId: string | undefined,
    input: {
      targetAcademicYearId?: string;
      targetGradeLevel?: number;
      targetSection?: string;
      rollNumber?: number;
      reason?: string;
      graduate?: boolean;
    },
  ) {
    const actorSchoolId = await this.resolveSchoolId(actorId);
    const result = await prisma.$transaction((tx) =>
      this.promoteStudentInTransaction(tx, studentId, actorSchoolId, actorId, input),
    );
    await cacheService.invalidate('lms:users', 'lms:student-profiles');
    return result;
  }

  async leaveStudent(
    studentId: string,
    actorId: string | undefined,
    input: { reason: string; status?: 'left' | 'transferred' },
  ) {
    const actorSchoolId = await this.resolveSchoolId(actorId);
    const result = await prisma.$transaction(async (tx) => {
      const student = await tx.user.findFirst({
        where: { id: studentId, role: 'student', schoolId: actorSchoolId },
        include: {
          studentProfile: true,
          guardianLinks: true,
          studentAcademicEnrollments: {
            where: { status: 'active' },
            orderBy: { enrolledAt: 'desc' },
            take: 1,
          },
        },
      });
      if (!student?.studentProfile) throw new HttpError(404, 'Student not found.');
      const currentEnrollment = student.studentAcademicEnrollments[0];
      if (!currentEnrollment)
        throw new HttpError(409, 'Student has no active academic enrollment.');
      const status = input.status || 'left';
      await tx.studentAcademicEnrollment.updateMany({
        where: { studentId, status: 'active' },
        data: { status, endedAt: new Date(), exitReason: input.reason },
      });
      await tx.classroomEnrollment.updateMany({
        where: { studentId, isActive: true },
        data: { isActive: false, endedAt: new Date() },
      });
      await tx.parentStudent.updateMany({
        where: { studentId, isActive: true },
        data: { isActive: false, endedAt: new Date() },
      });
      await tx.studentProfile.update({
        where: { userId: studentId },
        data: { isArchived: true, leftAt: new Date() },
      });
      await tx.user.update({ where: { id: studentId }, data: { isArchived: true } });
      await tx.studentLifecycleEvent.create({
        data: {
          studentId,
          type: status,
          fromCohortId: currentEnrollment.cohortId,
          academicYearId: currentEnrollment.academicYearId,
          reason: input.reason,
          createdById: actorId,
        },
      });

      const parentIds = student.guardianLinks.map((link) => link.parentId);
      const archivedParentIds: string[] = [];
      for (const parentId of parentIds) {
        const activeChildren = await tx.parentStudent.count({
          where: { parentId, isActive: true, student: { isArchived: false } },
        });
        if (activeChildren === 0) {
          await tx.user.update({ where: { id: parentId }, data: { isArchived: true } });
          archivedParentIds.push(parentId);
        }
      }
      return { studentId, status, archivedParentIds };
    });
    await cacheService.invalidate('lms:users', 'lms:student-profiles');
    return result;
  }

  async upsertTimetableSlot(
    actorId: string | undefined,
    input: {
      id?: string;
      academicYearId?: string;
      classroomId: string;
      teacherId?: string;
      dayOfWeek: number;
      periodNumber: number;
      startTime: string;
      endTime: string;
      roomNumber?: string;
      requiredBooks?: string;
    },
  ) {
    if (!Number.isInteger(input.dayOfWeek) || input.dayOfWeek < 0 || input.dayOfWeek > 6)
      throw new HttpError(400, 'dayOfWeek must be between 0 and 6.');
    if (!Number.isInteger(input.periodNumber) || input.periodNumber < 1 || input.periodNumber > 20)
      throw new HttpError(400, 'periodNumber must be between 1 and 20.');
    if (!/^\d{2}:\d{2}$/.test(input.startTime) || !/^\d{2}:\d{2}$/.test(input.endTime))
      throw new HttpError(400, 'Times must use HH:mm format.');
    if (input.startTime >= input.endTime)
      throw new HttpError(400, 'endTime must be after startTime.');
    const actorSchoolId = await this.resolveSchoolId(actorId);
    return prisma.$transaction(async (tx) => {
      const classroom = await tx.classroom.findFirst({
        where: { id: input.classroomId, isArchived: false },
        include: { teacher: true, subjectRef: true },
      });
      if (!classroom) throw new HttpError(404, 'Classroom not found.');
      if (actorSchoolId !== classroom.schoolId)
        throw new HttpError(403, "You cannot update another school's timetable.");
      const year = await this.ensureAcademicYear(tx, classroom.schoolId, input.academicYearId);
      const teacherId = input.teacherId || classroom.teacherId;
      const teacher = await tx.user.findFirst({
        where: { id: teacherId, schoolId: classroom.schoolId, role: 'teacher', isArchived: false },
      });
      if (!teacher) throw new HttpError(409, 'An active teacher from this school is required.');
      const roomNumber = (input.roomNumber || classroom.roomNumber).trim();
      const conflict = await tx.timetableSlot.findFirst({
        where: {
          academicYearId: year.id,
          dayOfWeek: input.dayOfWeek,
          periodNumber: input.periodNumber,
          isArchived: false,
          ...(input.id ? { id: { not: input.id } } : {}),
          OR: [{ teacherId }, { cohortId: classroom.cohortId }, { roomNumber }],
        },
        include: { teacher: { select: { name: true } }, cohort: true },
      });
      if (conflict)
        throw new HttpError(
          409,
          `Timetable clash: teacher, cohort, or room is already booked in slot ${input.periodNumber}.`,
        );
      const data = {
        schoolId: classroom.schoolId,
        academicYearId: year.id,
        classroomId: classroom.id,
        cohortId: classroom.cohortId,
        subjectId: classroom.subjectId,
        teacherId,
        dayOfWeek: input.dayOfWeek,
        periodNumber: input.periodNumber,
        startTime: input.startTime,
        endTime: input.endTime,
        roomNumber,
        requiredBooks: input.requiredBooks,
        isArchived: false,
      };
      return input.id
        ? tx.timetableSlot.update({ where: { id: input.id }, data })
        : tx.timetableSlot.create({ data });
    });
  }

  async validateTimetableClash(
    actorId: string | undefined,
    input: {
      id?: string;
      academicYearId: string;
      dayOfWeek: number;
      periodNumber: number;
      teacherId: string;
      cohortId: string;
      roomNumber: string;
    },
  ) {
    const schoolId = await this.resolveSchoolId(actorId);
    const [year, teacher, cohort] = await Promise.all([
      prisma.academicYear.findFirst({
        where: { id: input.academicYearId, schoolId, isArchived: false },
      }),
      prisma.user.findFirst({
        where: { id: input.teacherId, schoolId, role: 'teacher', isArchived: false },
      }),
      prisma.academicCohort.findFirst({ where: { id: input.cohortId, schoolId } }),
    ]);
    if (!year || !teacher || !cohort)
      throw new HttpError(404, 'Academic year, teacher, or cohort was not found in your school.');
    const conflicts = await prisma.timetableSlot.findMany({
      where: {
        schoolId,
        academicYearId: input.academicYearId,
        dayOfWeek: input.dayOfWeek,
        periodNumber: input.periodNumber,
        isArchived: false,
        ...(input.id ? { id: { not: input.id } } : {}),
        OR: [
          { teacherId: input.teacherId },
          { cohortId: input.cohortId },
          { roomNumber: input.roomNumber },
        ],
      },
      include: {
        teacher: { select: { id: true, name: true } },
        cohort: true,
        classroom: { select: { id: true, name: true } },
      },
    });
    return { valid: conflicts.length === 0, conflicts };
  }

  async listTimetable(
    actorId?: string,
    filters: { academicYearId?: string; studentId?: string; teacherId?: string } = {},
  ) {
    let cohortId: string | undefined;
    let schoolId = await this.resolveSchoolId(actorId);
    if (filters.studentId) {
      const student = await prisma.user.findUnique({
        where: { id: filters.studentId },
        select: {
          schoolId: true,
          studentAcademicEnrollments: {
            where: { status: 'active' },
            select: { cohortId: true },
            orderBy: { enrolledAt: 'desc' },
            take: 1,
          },
        },
      });
      if (!student) throw new HttpError(404, 'Student not found.');
      if (student.schoolId !== schoolId)
        throw new HttpError(403, "You cannot access another school's timetable.");
      cohortId = student.studentAcademicEnrollments[0]?.cohortId;
      if (!cohortId) throw new HttpError(409, 'Student has no active academic enrollment.');
    }
    return prisma.timetableSlot.findMany({
      where: {
        schoolId,
        isArchived: false,
        ...(filters.academicYearId ? { academicYearId: filters.academicYearId } : {}),
        ...(filters.teacherId ? { teacherId: filters.teacherId } : {}),
        ...(cohortId ? { cohortId } : {}),
      },
      include: { subject: true, teacher: true, classroom: true, cohort: true, academicYear: true },
      orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
    });
  }

  async archiveTimetableSlot(actorId: string | undefined, id: string) {
    const schoolId = await this.resolveSchoolId(actorId);
    const slot = await prisma.timetableSlot.findFirst({ where: { id, schoolId } });
    if (!slot) throw new HttpError(404, 'Timetable slot not found in your school.');
    return prisma.timetableSlot.update({ where: { id }, data: { isArchived: true } });
  }

  async replaceTeacherDaySchedule(
    actorId: string,
    dayOfWeek: number,
    periods: Array<{
      classroomId: string;
      periodNumber: number;
      startTime: string;
      endTime: string;
      roomNumber?: string;
      requiredBooks?: string;
    }>,
    requestedTeacherId?: string,
  ) {
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6)
      throw new HttpError(400, 'dayOfWeek must be between 0 and 6.');
    const actor = await prisma.user.findFirst({
      where: { id: actorId, isArchived: false },
      select: { id: true, role: true, schoolId: true },
    });
    if (!actor || !['teacher', 'admin'].includes(actor.role))
      throw new HttpError(403, 'An active teacher or administrator account is required.');
    return prisma.$transaction(async (tx) => {
      const classroomIds = [...new Set(periods.map((period) => period.classroomId))];
      const classrooms = await tx.classroom.findMany({
        where: { id: { in: classroomIds }, schoolId: actor.schoolId, isArchived: false },
        include: { subjectRef: true, cohortRef: true, teacher: true },
      });
      if (classrooms.length !== classroomIds.length)
        throw new HttpError(400, 'Every timetable classroom must be active in your school.');
      const classroomById = new Map(classrooms.map((classroom) => [classroom.id, classroom]));
      const teacherIds = new Set(classrooms.map((classroom) => classroom.teacherId));
      if (teacherIds.size > 1)
        throw new HttpError(400, "A day schedule can only replace one teacher's timetable.");
      const teacherId =
        classrooms[0]?.teacherId || (actor.role === 'teacher' ? actor.id : requestedTeacherId);
      if (!teacherId)
        throw new HttpError(
          400,
          'teacherId is required when clearing an administrator-managed day.',
        );
      if (actor.role === 'teacher' && teacherId !== actor.id)
        throw new HttpError(403, 'Teachers may only update their own timetable.');
      const teacher = await tx.user.findFirst({
        where: {
          id: teacherId,
          role: 'teacher',
          schoolId: actor.schoolId,
          isArchived: false,
        },
      });
      if (!teacher) throw new HttpError(400, 'The timetable teacher is not active in your school.');
      const year = await this.ensureAcademicYear(tx, actor.schoolId);
      const periodNumbers = new Set<number>();
      const cohortSlots = new Set<string>();
      const roomSlots = new Set<string>();
      for (const period of periods) {
        if (
          !Number.isInteger(period.periodNumber) ||
          period.periodNumber < 1 ||
          period.periodNumber > 20
        )
          throw new HttpError(400, 'periodNumber must be between 1 and 20.');
        if (periodNumbers.has(period.periodNumber))
          throw new HttpError(400, 'A teacher can only have one class in each period.');
        periodNumbers.add(period.periodNumber);
        if (!/^\d{2}:\d{2}$/.test(period.startTime) || !/^\d{2}:\d{2}$/.test(period.endTime))
          throw new HttpError(400, 'Times must use HH:mm format.');
        if (period.startTime >= period.endTime)
          throw new HttpError(400, 'Every period end time must be after its start time.');
        const classroom = classroomById.get(period.classroomId)!;
        const roomNumber = (period.roomNumber || classroom.roomNumber).trim();
        const cohortKey = `${period.periodNumber}:${classroom.cohortId}`;
        const roomKey = `${period.periodNumber}:${roomNumber}`;
        if (cohortSlots.has(cohortKey) || roomSlots.has(roomKey))
          throw new HttpError(400, 'A cohort or room cannot be booked twice in one period.');
        cohortSlots.add(cohortKey);
        roomSlots.add(roomKey);
      }
      await tx.timetableSlot.updateMany({
        where: { academicYearId: year.id, teacherId, dayOfWeek, isArchived: false },
        data: { isArchived: true },
      });
      const externalConflicts = await tx.timetableSlot.findMany({
        where: {
          academicYearId: year.id,
          dayOfWeek,
          isArchived: false,
          OR: periods.flatMap((period) => {
            const classroom = classroomById.get(period.classroomId)!;
            return [
              { periodNumber: period.periodNumber, cohortId: classroom.cohortId },
              {
                periodNumber: period.periodNumber,
                roomNumber: (period.roomNumber || classroom.roomNumber).trim(),
              },
            ];
          }),
        },
      });
      if (externalConflicts.length)
        throw new HttpError(409, 'A cohort or room has a timetable clash.');
      for (const period of periods) {
        const classroom = classroomById.get(period.classroomId)!;
        await tx.timetableSlot.create({
          data: {
            schoolId: actor.schoolId,
            academicYearId: year.id,
            classroomId: classroom.id,
            cohortId: classroom.cohortId,
            subjectId: classroom.subjectId,
            teacherId,
            dayOfWeek,
            periodNumber: period.periodNumber,
            startTime: period.startTime,
            endTime: period.endTime,
            roomNumber: (period.roomNumber || classroom.roomNumber).trim(),
            requiredBooks: period.requiredBooks,
          },
        });
      }
      return tx.timetableSlot.findMany({
        where: { academicYearId: year.id, teacherId, dayOfWeek, isArchived: false },
        include: { subject: true, teacher: true, classroom: true },
        orderBy: { periodNumber: 'asc' },
      });
    });
  }

  async listSubjects(actorId?: string, includeArchived = false) {
    const schoolId = await this.resolveSchoolId(actorId);
    return prisma.subject.findMany({
      where: { schoolId, ...(includeArchived ? {} : { isArchived: false }) },
      include: {
        _count: { select: { classrooms: true, teacherAssignments: true, examSubjects: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async upsertSubject(
    actorId: string | undefined,
    input: { id?: string; name: string; code?: string },
  ) {
    const schoolId = await this.resolveSchoolId(actorId);
    const name = input.name.trim();
    if (!name) throw new HttpError(400, 'Subject name is required.');
    if (input.id) {
      const subject = await prisma.subject.findFirst({ where: { id: input.id, schoolId } });
      if (!subject) throw new HttpError(404, 'Subject not found.');
      return prisma.subject.update({
        where: { id: subject.id },
        data: { name, code: input.code?.trim() || null, isArchived: false },
      });
    }
    return prisma.subject.upsert({
      where: { schoolId_name: { schoolId, name } },
      update: { code: input.code?.trim() || null, isArchived: false },
      create: { schoolId, name, code: input.code?.trim() || null },
    });
  }

  async archiveSubject(actorId: string | undefined, id: string) {
    const schoolId = await this.resolveSchoolId(actorId);
    const subject = await prisma.subject.findFirst({ where: { id, schoolId } });
    if (!subject) throw new HttpError(404, 'Subject not found.');
    const activeClasses = await prisma.classroom.count({
      where: { subjectId: id, isArchived: false },
    });
    if (activeClasses)
      throw new HttpError(
        409,
        'Archive or reassign active classrooms before archiving this subject.',
      );
    return prisma.subject.update({ where: { id }, data: { isArchived: true } });
  }

  async listTerms(actorId?: string, academicYearId?: string) {
    const schoolId = await this.resolveSchoolId(actorId);
    return prisma.academicTerm.findMany({
      where: { schoolId, isArchived: false, ...(academicYearId ? { academicYearId } : {}) },
      include: { academicYear: true },
      orderBy: [{ academicYear: { startsAt: 'desc' } }, { sequence: 'asc' }],
    });
  }

  private validateTermRange(startsAt?: string, endsAt?: string) {
    if (!startsAt && !endsAt) return { startsAt: undefined, endsAt: undefined };
    if (!startsAt || !endsAt)
      throw new HttpError(400, 'Both term start and end dates are required.');
    const start = asDate(startsAt, 'startsAt');
    const end = asDate(endsAt, 'endsAt');
    ensureDateRange(start, end, 'Academic term');
    return { startsAt: start, endsAt: end };
  }

  async upsertTerm(
    actorId: string | undefined,
    input: {
      id?: string;
      academicYearId?: string;
      name: string;
      sequence: number;
      startsAt?: string;
      endsAt?: string;
    },
  ) {
    const schoolId = await this.resolveSchoolId(actorId);
    if (!Number.isInteger(input.sequence) || input.sequence < 1 || input.sequence > 20)
      throw new HttpError(400, 'Term sequence must be between 1 and 20.');
    const dates = this.validateTermRange(input.startsAt, input.endsAt);
    return prisma.$transaction(async (tx) => {
      const year = await this.ensureAcademicYear(tx, schoolId, input.academicYearId);
      if (dates.startsAt && (dates.startsAt < year.startsAt || dates.endsAt! > year.endsAt))
        throw new HttpError(400, 'Term dates must be inside the academic year.');
      const conflict = await tx.academicTerm.findFirst({
        where: {
          schoolId,
          academicYearId: year.id,
          isArchived: false,
          ...(input.id ? { id: { not: input.id } } : {}),
          OR: [{ name: input.name.trim() }, { sequence: input.sequence }],
        },
      });
      if (conflict) throw new HttpError(409, 'Term name or sequence already exists.');
      const data = {
        schoolId,
        academicYearId: year.id,
        name: input.name.trim(),
        sequence: input.sequence,
        ...dates,
        isArchived: false,
      };
      return input.id
        ? tx.academicTerm.update({ where: { id: input.id }, data })
        : tx.academicTerm.create({ data });
    });
  }

  async replaceTerms(
    actorId: string | undefined,
    academicYearId: string,
    terms: Array<{ name: string; sequence: number; startsAt?: string; endsAt?: string }>,
  ) {
    const schoolId = await this.resolveSchoolId(actorId);
    if (!terms.length) throw new HttpError(400, 'At least one academic term is required.');
    const names = new Set(terms.map((term) => term.name.trim().toLowerCase()));
    const sequences = new Set(terms.map((term) => term.sequence));
    if (names.size !== terms.length || sequences.size !== terms.length)
      throw new HttpError(400, 'Term names and sequences must be unique.');
    return prisma.$transaction(async (tx) => {
      const year = await this.ensureAcademicYear(tx, schoolId, academicYearId);
      const prepared = terms.map((term) => {
        const dates = this.validateTermRange(term.startsAt, term.endsAt);
        if (dates.startsAt && (dates.startsAt < year.startsAt || dates.endsAt! > year.endsAt))
          throw new HttpError(400, 'All term dates must be inside the academic year.');
        return { ...term, name: term.name.trim(), ...dates };
      });
      await tx.academicTerm.updateMany({
        where: { schoolId, academicYearId, isArchived: false },
        data: { isArchived: true },
      });
      const created = [];
      for (const term of prepared) {
        created.push(
          await tx.academicTerm.create({
            data: {
              schoolId,
              academicYearId,
              name: term.name,
              sequence: term.sequence,
              startsAt: term.startsAt,
              endsAt: term.endsAt,
            },
          }),
        );
      }
      return created;
    });
  }

  async archiveTerm(actorId: string | undefined, id: string) {
    const schoolId = await this.resolveSchoolId(actorId);
    const term = await prisma.academicTerm.findFirst({ where: { id, schoolId } });
    if (!term) throw new HttpError(404, 'Academic term not found.');
    return prisma.academicTerm.update({ where: { id }, data: { isArchived: true } });
  }

  async listHolidays(actorId?: string, academicYearId?: string) {
    const schoolId = await this.resolveSchoolId(actorId);
    return prisma.schoolHoliday.findMany({
      where: { schoolId, isArchived: false, ...(academicYearId ? { academicYearId } : {}) },
      orderBy: { date: 'asc' },
    });
  }

  async createHoliday(
    actorId: string | undefined,
    input: { academicYearId?: string; name: string; date: string; description?: string },
  ) {
    const schoolId = await this.resolveSchoolId(actorId);
    return prisma.$transaction(async (tx) => {
      const year = await this.ensureAcademicYear(tx, schoolId, input.academicYearId);
      const date = asDate(input.date, 'date');
      if (date < year.startsAt || date > year.endsAt)
        throw new HttpError(400, 'Holiday must fall inside the academic year.');
      return tx.schoolHoliday.upsert({
        where: { schoolId_date: { schoolId, date } },
        update: {
          name: input.name.trim(),
          description: input.description,
          academicYearId: year.id,
          isArchived: false,
        },
        create: {
          schoolId,
          academicYearId: year.id,
          name: input.name.trim(),
          date,
          description: input.description,
        },
      });
    });
  }

  async archiveHoliday(actorId: string | undefined, id: string) {
    const schoolId = await this.resolveSchoolId(actorId);
    const holiday = await prisma.schoolHoliday.findFirst({ where: { id, schoolId } });
    if (!holiday) throw new HttpError(404, 'School holiday not found.');
    return prisma.schoolHoliday.update({ where: { id }, data: { isArchived: true } });
  }

  async listBellSchedule(actorId?: string, academicYearId?: string) {
    const schoolId = await this.resolveSchoolId(actorId);
    return prisma.bellScheduleEntry.findMany({
      where: { schoolId, isArchived: false, ...(academicYearId ? { academicYearId } : {}) },
      orderBy: { sequence: 'asc' },
    });
  }

  async replaceBellSchedule(
    actorId: string | undefined,
    academicYearId: string | undefined,
    entries: Array<{
      name: string;
      type: string;
      sequence: number;
      startTime: string;
      endTime?: string;
    }>,
  ) {
    const schoolId = await this.resolveSchoolId(actorId);
    if (!entries.length) throw new HttpError(400, 'At least one bell schedule entry is required.');
    return prisma.$transaction(async (tx) => {
      const year = await this.ensureAcademicYear(tx, schoolId, academicYearId);
      await tx.bellScheduleEntry.updateMany({
        where: { schoolId, academicYearId: year.id, isArchived: false },
        data: { isArchived: true },
      });
      const created = [];
      for (const entry of entries) {
        if (
          !/^\d{2}:\d{2}$/.test(entry.startTime) ||
          (entry.endTime && !/^\d{2}:\d{2}$/.test(entry.endTime))
        )
          throw new HttpError(400, 'Bell schedule times must use HH:mm format.');
        created.push(
          await tx.bellScheduleEntry.create({
            data: { schoolId, academicYearId: year.id, ...entry },
          }),
        );
      }
      return created;
    });
  }

  async getTeacherLifecycle(teacherId: string, actorId?: string) {
    const schoolId = await this.resolveSchoolId(actorId);
    const teacher = await prisma.user.findFirst({
      where: { id: teacherId, role: 'teacher', schoolId },
      omit: { passwordHash: true },
      include: {
        teacherProfile: true,
        teacherSubjects: { include: { subject: true } },
        teacherTeachingAssignments: {
          include: { classroom: true, subject: true, academicYear: true },
          orderBy: { startsAt: 'desc' },
        },
        timetableSlots: {
          where: { isArchived: false },
          include: { classroom: true, cohort: true, subject: true, academicYear: true },
          orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
        },
        submittedExamMarks: {
          include: {
            student: { select: { id: true, name: true } },
            examSubject: { include: { subject: true, exam: true, classroom: true } },
          },
          orderBy: { submittedAt: 'desc' },
        },
      },
    });
    if (!teacher) throw new HttpError(404, 'Teacher not found.');
    return teacher;
  }

  async createExam(
    actorId: string | undefined,
    input: {
      schoolId?: string;
      academicYearId?: string;
      termId?: string;
      name: string;
      startsAt: string;
      endsAt: string;
      status?: 'draft' | 'published' | 'marks_open';
      subjects: Array<{
        subjectId: string;
        classroomId?: string;
        examDate?: string;
        startTime?: string;
        endTime?: string;
        totalMarks: number;
        passMarks: number;
        marksDueAt?: string;
      }>;
    },
  ) {
    const schoolId = await this.resolveSchoolId(actorId, input.schoolId);
    const startsAt = asDate(input.startsAt, 'startsAt');
    const endsAt = asDate(input.endsAt, 'endsAt');
    ensureDateRange(startsAt, endsAt, 'Exam');
    if (!input.subjects.length) throw new HttpError(400, 'At least one exam subject is required.');
    return prisma.$transaction(async (tx) => {
      const year = await this.ensureAcademicYear(tx, schoolId, input.academicYearId);
      if (startsAt < year.startsAt || endsAt > year.endsAt)
        throw new HttpError(400, 'Exam dates must be inside the academic year.');
      if (input.termId) {
        const term = await tx.academicTerm.findFirst({
          where: {
            id: input.termId,
            schoolId,
            academicYearId: year.id,
            isArchived: false,
          },
        });
        if (!term)
          throw new HttpError(400, 'The selected academic term is not active in this year.');
      }
      const subjectIds = [...new Set(input.subjects.map((item) => item.subjectId))];
      const validSubjects = await tx.subject.count({
        where: { id: { in: subjectIds }, schoolId, isArchived: false },
      });
      if (validSubjects !== subjectIds.length)
        throw new HttpError(400, 'Every exam subject must be active and belong to this school.');
      const uniqueExamSubjects = new Set(
        input.subjects.map((item) => `${item.subjectId}:${item.classroomId || 'school'}`),
      );
      if (uniqueExamSubjects.size !== input.subjects.length)
        throw new HttpError(400, 'An exam subject and classroom combination may appear only once.');
      const classroomIds = [
        ...new Set(input.subjects.flatMap((item) => (item.classroomId ? [item.classroomId] : []))),
      ];
      const classrooms = classroomIds.length
        ? await tx.classroom.findMany({
            where: {
              id: { in: classroomIds },
              schoolId,
              isArchived: false,
              OR: [{ academicYearId: year.id }, { academicYearId: null }],
            },
            select: { id: true, subjectId: true },
          })
        : [];
      const classroomById = new Map(classrooms.map((classroom) => [classroom.id, classroom]));
      if (classrooms.length !== classroomIds.length)
        throw new HttpError(400, 'Every exam classroom must be active in this academic year.');
      for (const item of input.subjects) {
        if (item.totalMarks <= 0 || item.passMarks < 0 || item.passMarks > item.totalMarks)
          throw new HttpError(400, 'Exam marks and pass marks are invalid.');
        if (item.classroomId && classroomById.get(item.classroomId)?.subjectId !== item.subjectId)
          throw new HttpError(400, 'Each exam classroom must teach its selected subject.');
        if ((item.startTime && !item.endTime) || (!item.startTime && item.endTime))
          throw new HttpError(400, 'Both exam start and end times are required.');
        if (item.startTime && item.endTime && item.startTime >= item.endTime)
          throw new HttpError(400, 'Exam end time must be after its start time.');
        if (item.examDate) {
          const examDate = asDate(item.examDate, 'examDate');
          if (examDate < startsAt || examDate > endsAt)
            throw new HttpError(400, 'Every subject exam date must be inside the exam date range.');
        }
      }
      return tx.exam.create({
        data: {
          schoolId,
          academicYearId: year.id,
          termId: input.termId,
          name: input.name.trim(),
          startsAt,
          endsAt,
          status: input.status || 'draft',
          publishedAt: ['published', 'marks_open'].includes(input.status || '')
            ? new Date()
            : undefined,
          subjects: {
            create: input.subjects.map((item) => ({
              subjectId: item.subjectId,
              classroomId: item.classroomId,
              examDate: item.examDate ? asDate(item.examDate, 'examDate') : undefined,
              startTime: item.startTime,
              endTime: item.endTime,
              totalMarks: item.totalMarks,
              passMarks: item.passMarks,
              marksDueAt: item.marksDueAt ? new Date(item.marksDueAt) : undefined,
            })),
          },
        },
        include: { subjects: { include: { subject: true, classroom: true } } },
      });
    });
  }

  async listExams(actorId?: string, academicYearId?: string) {
    const schoolId = await this.resolveSchoolId(actorId);
    const actor = actorId
      ? await prisma.user.findUnique({
          where: { id: actorId },
          select: {
            role: true,
            parentLinks: { where: { isActive: true }, select: { studentId: true } },
          },
        })
      : null;
    const childIds = actor?.parentLinks.map((link) => link.studentId) || [];
    const subjectWhere: Prisma.ExamSubjectWhereInput =
      actor?.role === 'teacher'
        ? {
            classroom: {
              OR: [
                { teacherId: actorId },
                { substitutes: { some: { teacherId: actorId } } },
                { teachingAssignments: { some: { teacherId: actorId, isActive: true } } },
              ],
            },
          }
        : actor?.role === 'student'
          ? {
              OR: [
                { classroomId: null },
                { classroom: { enrollments: { some: { studentId: actorId, isActive: true } } } },
              ],
            }
          : actor?.role === 'parent'
            ? {
                OR: [
                  { classroomId: null },
                  {
                    classroom: {
                      enrollments: {
                        some: { studentId: { in: childIds }, isActive: true },
                      },
                    },
                  },
                ],
              }
            : {};
    const markWhere: Prisma.ExamMarkWhereInput =
      actor?.role === 'student'
        ? { studentId: actorId }
        : actor?.role === 'parent'
          ? { studentId: { in: childIds } }
          : {};
    return prisma.exam.findMany({
      where: { schoolId, ...(academicYearId ? { academicYearId } : {}) },
      include: {
        academicYear: true,
        term: true,
        subjects: {
          where: subjectWhere,
          include: { subject: true, classroom: true, marks: { where: markWhere } },
        },
      },
      orderBy: [{ startsAt: 'desc' }, { name: 'asc' }],
    });
  }

  async updateExamStatus(
    actorId: string | undefined,
    examId: string,
    status: 'draft' | 'published' | 'marks_open' | 'marks_closed' | 'finalized',
  ) {
    const schoolId = await this.resolveSchoolId(actorId);
    return prisma.$transaction(async (tx) => {
      const exam = await tx.exam.findFirst({
        where: { id: examId, schoolId },
        include: { subjects: true },
      });
      if (!exam) throw new HttpError(404, 'Exam not found in your school.');
      const transitions: Record<string, string[]> = {
        draft: ['published'],
        published: ['draft', 'marks_open'],
        marks_open: ['marks_closed'],
        marks_closed: ['marks_open', 'finalized'],
        finalized: [],
      };
      if (!transitions[exam.status]?.includes(status))
        throw new HttpError(409, `Exam status cannot change from ${exam.status} to ${status}.`);
      if (status === 'marks_closed') {
        for (const examSubject of exam.subjects) {
          const eligible = examSubject.classroomId
            ? await tx.classroomEnrollment.count({
                where: { classroomId: examSubject.classroomId, isActive: true },
              })
            : await tx.studentAcademicEnrollment.count({
                where: { academicYearId: exam.academicYearId, status: 'active' },
              });
          const recorded = await tx.examMark.count({ where: { examSubjectId: examSubject.id } });
          if (recorded !== eligible)
            throw new HttpError(
              409,
              `Marks are incomplete for an exam subject (${recorded} of ${eligible} students recorded).`,
            );
        }
      }
      return tx.exam.update({
        where: { id: exam.id },
        data: {
          status,
          ...(status === 'published' && !exam.publishedAt ? { publishedAt: new Date() } : {}),
        },
        include: {
          academicYear: true,
          term: true,
          subjects: { include: { subject: true, classroom: true } },
        },
      });
    });
  }

  async submitExamMarks(
    examSubjectId: string,
    submittedById: string,
    submitterRole: string,
    marks: Array<{
      studentId: string;
      marksObtained?: number | null;
      isAbsent?: boolean;
      remarks?: string;
    }>,
  ) {
    if (!marks.length) throw new HttpError(400, 'At least one mark is required.');
    return prisma.$transaction(async (tx) => {
      const examSubject = await tx.examSubject.findUnique({
        where: { id: examSubjectId },
        include: { exam: true, classroom: true },
      });
      if (!examSubject) throw new HttpError(404, 'Exam subject not found.');
      const submitter = await tx.user.findFirst({
        where: {
          id: submittedById,
          role: submitterRole === 'admin' ? 'admin' : 'teacher',
          schoolId: examSubject.exam.schoolId,
          isArchived: false,
        },
        select: { id: true },
      });
      if (!submitter) throw new HttpError(403, 'An active teacher or administrator is required.');
      if (examSubject.exam.status !== 'marks_open')
        throw new HttpError(409, 'Marks submission is not open for this exam.');
      if (
        submitterRole !== 'admin' &&
        (!examSubject.classroomId ||
          (examSubject.classroom?.teacherId !== submittedById &&
            !(await tx.teachingAssignment.findFirst({
              where: {
                classroomId: examSubject.classroomId,
                teacherId: submittedById,
                isActive: true,
              },
              select: { id: true },
            }))))
      )
        throw new HttpError(403, 'Only the assigned teacher or an administrator may submit marks.');
      const uniqueStudentIds = [...new Set(marks.map((mark) => mark.studentId))];
      if (uniqueStudentIds.length !== marks.length)
        throw new HttpError(400, 'A student can appear only once in a marks submission.');
      const eligible = examSubject.classroomId
        ? await tx.classroomEnrollment.count({
            where: {
              classroomId: examSubject.classroomId,
              studentId: { in: uniqueStudentIds },
              isActive: true,
            },
          })
        : await tx.studentAcademicEnrollment.count({
            where: {
              academicYearId: examSubject.exam.academicYearId,
              studentId: { in: uniqueStudentIds },
              status: 'active',
            },
          });
      if (eligible !== uniqueStudentIds.length)
        throw new HttpError(
          400,
          'Marks may only be submitted for students enrolled in this class.',
        );
      const rows = [];
      for (const mark of marks) {
        const isAbsent = mark.isAbsent ?? false;
        const value = mark.marksObtained ?? null;
        if (
          (!isAbsent && value === null) ||
          (value !== null && (value < 0 || value > examSubject.totalMarks))
        )
          throw new HttpError(400, `Marks must be between 0 and ${examSubject.totalMarks}.`);
        rows.push(
          await tx.examMark.upsert({
            where: { examSubjectId_studentId: { examSubjectId, studentId: mark.studentId } },
            create: {
              examSubjectId,
              studentId: mark.studentId,
              marksObtained: isAbsent ? null : value,
              isAbsent,
              remarks: mark.remarks,
              submittedById,
            },
            update: {
              marksObtained: isAbsent ? null : value,
              isAbsent,
              remarks: mark.remarks,
              submittedById,
              submittedAt: new Date(),
            },
          }),
        );
      }
      return rows;
    });
  }

  async generateReportCard(
    studentId: string,
    academicYearId: string,
    options: { passPercentage?: number; graduationGrade?: number } = {},
  ) {
    const passPercentage = options.passPercentage ?? 40;
    return prisma.$transaction(async (tx) => {
      const enrollment = await tx.studentAcademicEnrollment.findUnique({
        where: { studentId_academicYearId: { studentId, academicYearId } },
        include: { cohort: true, academicYear: true, student: true },
      });
      if (!enrollment) throw new HttpError(404, 'Academic enrollment not found.');
      const classroomIds = (
        await tx.classroomEnrollment.findMany({
          where: {
            studentId,
            classroom: { academicYearId, isArchived: false },
          },
          select: { classroomId: true },
        })
      ).map((item) => item.classroomId);
      const requiredExamSubjects = await tx.examSubject.findMany({
        where: {
          exam: { academicYearId, status: { in: ['marks_closed', 'finalized'] } },
          OR: [{ classroomId: null }, { classroomId: { in: classroomIds } }],
        },
        select: { id: true, subject: { select: { name: true } }, exam: { select: { name: true } } },
      });
      if (!requiredExamSubjects.length)
        throw new HttpError(409, 'No closed or finalized exam subjects exist for this student.');
      const marks = await tx.examMark.findMany({
        where: { studentId, examSubjectId: { in: requiredExamSubjects.map((item) => item.id) } },
        include: { examSubject: { include: { subject: true, exam: true } } },
      });
      if (marks.length !== requiredExamSubjects.length) {
        const recorded = new Set(marks.map((mark) => mark.examSubjectId));
        const missing = requiredExamSubjects
          .filter((item) => !recorded.has(item.id))
          .map((item) => `${item.subject.name} (${item.exam.name})`);
        throw new HttpError(409, `Report card is missing marks for: ${missing.join(', ')}.`);
      }
      const [gradedAssignments, quizAttempts, termScores] = await Promise.all([
        tx.submission.findMany({
          where: {
            studentId,
            status: 'graded',
            grade: { not: null },
            assignment: { classroomId: { in: classroomIds }, totalPoints: { gt: 0 } },
          },
          include: {
            assignment: {
              include: { classroom: { include: { subjectRef: true } } },
            },
          },
        }),
        tx.quizSubmission.findMany({
          where: {
            studentId,
            totalPoints: { gt: 0 },
            quiz: { classroomId: { in: classroomIds } },
          },
          include: { quiz: { include: { classroom: { include: { subjectRef: true } } } } },
          orderBy: [{ quizId: 'asc' }, { attemptNumber: 'asc' }],
        }),
        tx.termProgress.findMany({
          where: { studentId, termRef: { academicYearId, isArchived: false } },
          include: { termRef: true },
          orderBy: { termRef: { sequence: 'asc' } },
        }),
      ]);
      const latestQuizAttempts = [
        ...new Map(quizAttempts.map((attempt) => [attempt.quizId, attempt])).values(),
      ];
      const grouped = new Map<
        string,
        {
          subjectId: string;
          name: string;
          earned: number;
          possible: number;
          components: Array<{
            source: 'exam' | 'assignment' | 'quiz';
            title: string;
            earned: number;
            possible: number;
          }>;
        }
      >();
      const addComponent = (
        subjectId: string,
        name: string,
        component: {
          source: 'exam' | 'assignment' | 'quiz';
          title: string;
          earned: number;
          possible: number;
        },
      ) => {
        const item = grouped.get(subjectId) || {
          subjectId,
          name,
          earned: 0,
          possible: 0,
          components: [],
        };
        item.earned += component.earned;
        item.possible += component.possible;
        item.components.push(component);
        grouped.set(subjectId, item);
      };
      for (const mark of marks) {
        addComponent(mark.examSubject.subjectId, mark.examSubject.subject.name, {
          source: 'exam',
          title: mark.examSubject.exam.name,
          earned: mark.isAbsent || mark.marksObtained === null ? 0 : mark.marksObtained,
          possible: mark.examSubject.totalMarks,
        });
      }
      for (const submission of gradedAssignments) {
        addComponent(
          submission.assignment.classroom.subjectId,
          submission.assignment.classroom.subjectRef.name,
          {
            source: 'assignment',
            title: submission.assignment.title,
            earned: submission.grade!,
            possible: submission.assignment.totalPoints,
          },
        );
      }
      for (const attempt of latestQuizAttempts) {
        addComponent(attempt.quiz.classroom.subjectId, attempt.quiz.classroom.subjectRef.name, {
          source: 'quiz',
          title: attempt.quiz.title,
          earned: attempt.score,
          possible: attempt.totalPoints,
        });
      }
      const subjects = [...grouped.values()].map((item) => {
        const percentage = item.possible > 0 ? (item.earned / item.possible) * 100 : 0;
        return { ...item, percentage, grade: gradeFromPercentage(percentage) };
      });
      const assessmentEarned = subjects.reduce((sum, item) => sum + item.earned, 0);
      const assessmentPossible = subjects.reduce((sum, item) => sum + item.possible, 0);
      const normalizedTermScores = termScores.map((item) => ({
        termId: item.termId,
        term: item.termRef.name,
        score: Math.max(0, Math.min(100, item.score)),
      }));
      const totalEarned =
        assessmentEarned + normalizedTermScores.reduce((sum, item) => sum + item.score, 0);
      const totalPossible = assessmentPossible + normalizedTermScores.length * 100;
      const finalPercentage = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0;
      const [attendance, holidays] = await Promise.all([
        tx.attendanceRecord.findMany({
          where: {
            studentId,
            date: {
              gte: dateOnly(enrollment.academicYear.startsAt),
              lte: dateOnly(enrollment.academicYear.endsAt),
            },
          },
          select: { date: true, status: true },
        }),
        tx.schoolHoliday.findMany({
          where: { academicYearId, isArchived: false },
          select: { date: true },
        }),
      ]);
      const holidayDates = new Set(holidays.map((holiday) => dateOnly(holiday.date)));
      const eligibleAttendance = attendance.filter((record) => !holidayDates.has(record.date));
      const attendancePercentage = eligibleAttendance.length
        ? (eligibleAttendance.filter((record) => record.status !== 'absent').length /
            eligibleAttendance.length) *
          100
        : 0;
      const result: ReportCardResult =
        enrollment.cohort.gradeLevel >= (options.graduationGrade ?? 12) &&
        finalPercentage >= passPercentage
          ? 'graduated'
          : finalPercentage >= passPercentage
            ? 'promoted'
            : 'retained';
      return tx.studentReportCard.upsert({
        where: { studentId_academicYearId: { studentId, academicYearId } },
        create: {
          studentId,
          academicYearId,
          cohortId: enrollment.cohortId,
          finalPercentage,
          finalGrade: gradeFromPercentage(finalPercentage),
          attendancePercentage,
          result,
          snapshot: {
            studentName: enrollment.student.name,
            calculationMethod:
              'Point-weighted closed exams, graded assignments, latest quiz attempts, and term progress',
            subjectComponents: subjects.map((item) => ({
              subjectId: item.subjectId,
              subject: item.name,
              earned: item.earned,
              possible: item.possible,
              components: item.components,
            })),
            termProgress: normalizedTermScores,
            generatedAt: new Date().toISOString(),
          },
          subjects: {
            create: subjects.map((item) => ({
              subjectId: item.subjectId,
              percentage: item.percentage,
              grade: item.grade,
            })),
          },
        },
        update: {
          finalPercentage,
          finalGrade: gradeFromPercentage(finalPercentage),
          attendancePercentage,
          result,
          snapshot: {
            studentName: enrollment.student.name,
            calculationMethod:
              'Point-weighted closed exams, graded assignments, latest quiz attempts, and term progress',
            subjectComponents: subjects.map((item) => ({
              subjectId: item.subjectId,
              subject: item.name,
              earned: item.earned,
              possible: item.possible,
              components: item.components,
            })),
            termProgress: normalizedTermScores,
            generatedAt: new Date().toISOString(),
          },
          subjects: {
            deleteMany: {},
            create: subjects.map((item) => ({
              subjectId: item.subjectId,
              percentage: item.percentage,
              grade: item.grade,
            })),
          },
        },
        include: { subjects: { include: { subject: true } } },
      });
    });
  }

  async rolloverAcademicYear(
    actorId: string | undefined,
    input: {
      fromAcademicYearId: string;
      toAcademicYearId: string;
      passPercentage?: number;
      graduationGrade?: number;
    },
  ) {
    if (input.fromAcademicYearId === input.toAcademicYearId)
      throw new HttpError(400, 'Source and target academic years must be different.');
    const schoolId = await this.resolveSchoolId(actorId);
    const [source, target] = await Promise.all([
      prisma.academicYear.findFirst({
        where: { id: input.fromAcademicYearId, schoolId, isArchived: false },
      }),
      prisma.academicYear.findFirst({
        where: { id: input.toAcademicYearId, schoolId, isArchived: false },
      }),
    ]);
    if (!source || !target) throw new HttpError(404, 'Source or target academic year not found.');
    if (target.startsAt <= source.startsAt)
      throw new HttpError(400, 'Target academic year must begin after the source academic year.');
    const activeEnrollments = await prisma.studentAcademicEnrollment.findMany({
      where: { academicYearId: source.id, status: 'active', student: { isArchived: false } },
      include: { cohort: true },
      orderBy: [{ cohort: { gradeLevel: 'asc' } }, { rollNumber: 'asc' }],
    });
    const reports = new Map<string, Awaited<ReturnType<LifecycleService['generateReportCard']>>>();
    const reportErrors: Array<{ studentId: string; error: string }> = [];
    for (const enrollment of activeEnrollments) {
      try {
        const report = await this.generateReportCard(enrollment.studentId, source.id, {
          passPercentage: input.passPercentage,
          graduationGrade: input.graduationGrade,
        });
        reports.set(enrollment.studentId, report);
      } catch (error) {
        reportErrors.push({ studentId: enrollment.studentId, error: (error as Error).message });
      }
    }
    if (reportErrors.length)
      throw new HttpError(
        409,
        `Academic rollover blocked: ${reportErrors.length} student report card(s) are incomplete. ${reportErrors
          .slice(0, 5)
          .map((item) => `${item.studentId}: ${item.error}`)
          .join(' | ')}`,
      );

    const incomingByCohort = new Map<string, number>();
    for (const enrollment of activeEnrollments) {
      const report = reports.get(enrollment.studentId)!;
      if (report.result === 'graduated') continue;
      const targetGrade =
        report.result === 'retained'
          ? enrollment.cohort.gradeLevel
          : enrollment.cohort.gradeLevel + 1;
      const key = `${targetGrade}:${enrollment.cohort.section}`;
      incomingByCohort.set(key, (incomingByCohort.get(key) || 0) + 1);
    }
    for (const [key, incoming] of incomingByCohort) {
      const [gradeText, section] = key.split(':');
      const cohort = await prisma.academicCohort.findUnique({
        where: {
          schoolId_gradeLevel_section: {
            schoolId,
            gradeLevel: Number(gradeText),
            section,
          },
        },
      });
      if (!cohort) continue;
      const classrooms = await prisma.classroom.findMany({
        where: {
          schoolId,
          cohortId: cohort.id,
          isArchived: false,
          OR: [{ academicYearId: target.id }, { academicYearId: null }],
        },
        select: {
          name: true,
          maxCapacity: true,
          _count: { select: { enrollments: { where: { isActive: true } } } },
        },
      });
      const fullClassroom = classrooms.find(
        (classroom) => classroom._count.enrollments + incoming > classroom.maxCapacity,
      );
      if (fullClassroom)
        throw new HttpError(
          409,
          `Academic rollover blocked: ${fullClassroom.name} lacks capacity.`,
        );
    }

    const outcomes = await prisma.$transaction(async (tx) => {
      const rows: Array<{ studentId: string; result: string }> = [];
      for (const enrollment of activeEnrollments) {
        const report = reports.get(enrollment.studentId)!;
        const result = await this.promoteStudentInTransaction(
          tx,
          enrollment.studentId,
          schoolId,
          actorId,
          {
            targetAcademicYearId: target.id,
            targetGradeLevel:
              report.result === 'retained'
                ? enrollment.cohort.gradeLevel
                : enrollment.cohort.gradeLevel + 1,
            targetSection: enrollment.cohort.section,
            graduate: report.result === 'graduated',
            reason: `Academic rollover from ${source.name} to ${target.name}`,
          },
        );
        rows.push({ studentId: enrollment.studentId, result: result.status });
      }
      await tx.academicYear.updateMany({ where: { schoolId }, data: { isActive: false } });
      await tx.academicYear.update({ where: { id: target.id }, data: { isActive: true } });
      await tx.classroom.updateMany({
        where: { schoolId, academicYearId: source.id, isArchived: false },
        data: { isArchived: true },
      });
      await tx.exam.updateMany({
        where: { schoolId, academicYearId: source.id },
        data: { status: 'archived' },
      });
      return rows;
    });
    await cacheService.invalidate('lms:users', 'lms:student-profiles');
    return {
      sourceAcademicYearId: source.id,
      targetAcademicYearId: target.id,
      processed: outcomes.length,
      succeeded: outcomes.length,
      failed: 0,
      finalized: true,
      outcomes,
    };
  }

  async archiveTeacher(
    teacherId: string,
    actorId: string | undefined,
    input: { replacementTeacherId?: string; reason: string },
  ) {
    const actorSchoolId = await this.resolveSchoolId(actorId);
    const result = await prisma.$transaction(async (tx) => {
      const teacher = await tx.user.findFirst({
        where: { id: teacherId, role: 'teacher', schoolId: actorSchoolId },
        include: {
          taughtClassrooms: { where: { isArchived: false } },
          teacherTeachingAssignments: {
            where: { isActive: true, classroom: { isArchived: false } },
          },
        },
      });
      if (!teacher) throw new HttpError(404, 'Teacher not found.');
      let replacementId = input.replacementTeacherId;
      const oldSlots = await tx.timetableSlot.findMany({
        where: { teacherId, isArchived: false },
      });
      const hasActiveWork =
        teacher.taughtClassrooms.length > 0 ||
        teacher.teacherTeachingAssignments.length > 0 ||
        oldSlots.length > 0;
      if (hasActiveWork && !replacementId)
        throw new HttpError(
          409,
          'A replacement teacher is required while active classes or timetable slots remain assigned.',
        );
      if (replacementId) {
        if (replacementId === teacherId)
          throw new HttpError(400, 'A teacher cannot replace themselves.');
        const replacement = await tx.user.findFirst({
          where: {
            id: replacementId,
            role: 'teacher',
            schoolId: teacher.schoolId,
            isArchived: false,
          },
        });
        if (!replacement)
          throw new HttpError(400, 'Replacement teacher is not active in this school.');
        const transferredSlotKeys = new Set<string>();
        for (const slot of oldSlots) {
          const slotKey = `${slot.academicYearId}:${slot.dayOfWeek}:${slot.periodNumber}`;
          if (transferredSlotKeys.has(slotKey))
            throw new HttpError(409, 'The departing teacher has overlapping timetable slots.');
          transferredSlotKeys.add(slotKey);
          const clash = await tx.timetableSlot.findFirst({
            where: {
              id: { not: slot.id },
              teacherId: replacementId,
              academicYearId: slot.academicYearId,
              dayOfWeek: slot.dayOfWeek,
              periodNumber: slot.periodNumber,
              isArchived: false,
            },
          });
          if (clash) throw new HttpError(409, 'Replacement teacher has a timetable clash.');
        }
        const assignmentTargets = new Map<
          string,
          { classroomId: string; subjectId: string; academicYearId: string }
        >();
        for (const assignment of teacher.teacherTeachingAssignments) {
          assignmentTargets.set(`${assignment.classroomId}:${assignment.academicYearId}`, {
            classroomId: assignment.classroomId,
            subjectId: assignment.subjectId,
            academicYearId: assignment.academicYearId,
          });
        }
        for (const classroom of teacher.taughtClassrooms) {
          const academicYearId =
            classroom.academicYearId || (await this.ensureAcademicYear(tx, teacher.schoolId)).id;
          assignmentTargets.set(`${classroom.id}:${academicYearId}`, {
            classroomId: classroom.id,
            subjectId: classroom.subjectId,
            academicYearId,
          });
          await tx.classroom.update({
            where: { id: classroom.id },
            data: { teacherId: replacementId, academicYearId },
          });
        }
        for (const target of assignmentTargets.values()) {
          await tx.teachingAssignment.updateMany({
            where: {
              teacherId,
              classroomId: target.classroomId,
              academicYearId: target.academicYearId,
              isActive: true,
            },
            data: { isActive: false, endsAt: new Date() },
          });
          await tx.teachingAssignment.upsert({
            where: {
              teacherId_classroomId_academicYearId: {
                teacherId: replacementId,
                classroomId: target.classroomId,
                academicYearId: target.academicYearId,
              },
            },
            create: {
              teacherId: replacementId,
              classroomId: target.classroomId,
              subjectId: target.subjectId,
              academicYearId: target.academicYearId,
            },
            update: {
              subjectId: target.subjectId,
              isActive: true,
              startsAt: new Date(),
              endsAt: null,
            },
          });
          await tx.teacherSubject.upsert({
            where: {
              teacherId_subjectId: {
                teacherId: replacementId,
                subjectId: target.subjectId,
              },
            },
            create: { teacherId: replacementId, subjectId: target.subjectId },
            update: {},
          });
        }
        await tx.timetableSlot.updateMany({
          where: { teacherId, isArchived: false },
          data: { teacherId: replacementId },
        });
      } else {
        await tx.timetableSlot.updateMany({
          where: { teacherId, isArchived: false },
          data: { isArchived: true },
        });
      }
      await tx.teachingAssignment.updateMany({
        where: { teacherId, isActive: true },
        data: { isActive: false, endsAt: new Date() },
      });
      await tx.teacherProfile.upsert({
        where: { userId: teacherId },
        create: { userId: teacherId, employmentStatus: 'left', leftAt: new Date() },
        update: { employmentStatus: 'left', leftAt: new Date() },
      });
      await tx.user.update({ where: { id: teacherId }, data: { isArchived: true } });
      await tx.auditTrail.create({
        data: {
          tableName: 'User',
          action: 'TEACHER_LEFT',
          changedBy: actorId,
          category: 'teacher',
          newData: { teacherId, replacementTeacherId: replacementId, reason: input.reason },
        },
      });
      return { teacherId, replacementTeacherId: replacementId, archived: true };
    });
    await cacheService.invalidate('lms:users');
    return result;
  }
}

export const lifecycleService = new LifecycleService();
