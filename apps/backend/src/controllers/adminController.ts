import { Request, Response } from 'express';
import { lmsDB } from '@db/lmsDatabase';
import { logger } from '@utils/logger';
import { prisma } from '@db/services/prismaClient';
import { teacherAssignmentService } from '@db/services/teacherAssignmentService';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { normalizeCohortSelection } from '@utils/cohortValidation';
import { lifecycleService } from '@db/services/lifecycleService';

const assertTargetInActorSchool = async (
  req: Request,
  targetId: string,
  role: 'student' | 'teacher' | 'parent',
) => {
  if (!req.user) throw new Error('Authentication required.');
  const actor = await prisma.user.findFirst({
    where: { id: req.user.id, role: 'admin', isArchived: false },
    select: { schoolId: true },
  });
  if (!actor) throw new Error('An active administrator account is required.');
  const target = await prisma.user.findFirst({
    where: { id: targetId, role, schoolId: actor.schoolId },
    select: { id: true },
  });
  if (!target) throw new Error(`${role} was not found in your school.`);
};

export const assignStudentBadge = async (req: Request, res: Response) => {
  try {
    if (!req.user)
      return res.status(401).json({ status: 'error', message: 'Authentication required.' });
    const { studentProfileId, badgeDefinitionId, remarks } = req.body;
    if (!studentProfileId || !badgeDefinitionId) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    }
    const badge = await lmsDB.assignBadge(
      studentProfileId,
      badgeDefinitionId,
      req.user.id,
      remarks,
    );
    res.json({ status: 'success', badge });
  } catch (err) {
    logger.error('Failed to assign badge:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const getAllStudentLocations = async (req: Request, res: Response) => {
  try {
    if (!req.user)
      return res.status(401).json({ status: 'error', message: 'Authentication required.' });
    const actor = await prisma.user.findFirst({
      where: { id: req.user.id, role: 'admin', isArchived: false },
      select: { schoolId: true },
    });
    if (!actor) throw new Error('An active administrator account is required.');
    const schoolStudents = await prisma.user.findMany({
      where: { schoolId: actor.schoolId, role: 'student' },
      select: { id: true },
    });
    const allowedStudentIds = new Set(schoolStudents.map(({ id }) => id));
    const studentLocations = await lmsDB.getStudentLocations();
    res.json({
      status: 'success',
      studentLocations: studentLocations.filter((row) => allowedStudentIds.has(row.studentId)),
    });
  } catch (err) {
    logger.error('Failed to get student locations:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

// Student Controllers
export const createStudent = async (req: Request, res: Response) => {
  try {
    const student = await lmsDB.addStudentProfile({ ...req.body, createdById: req.user?.id });
    res.status(201).json({ status: 'success', student });
  } catch (err) {
    logger.error('Failed to create student:', err);
    const status = (err as { code?: string }).code === 'P2002' ? 409 : 400;
    res.status(status).json({ status: 'error', message: (err as Error).message });
  }
};

export const updateStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await assertTargetInActorSchool(req, id, 'student');
    const student = await lmsDB.updateStudentProfile(id, req.body);
    res.json({ status: 'success', student });
  } catch (err) {
    logger.error('Failed to update student:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await lifecycleService.leaveStudent(id, req.user?.id, {
      reason: req.body?.reason || 'Archived by school administration',
      status: req.body?.status,
    });
    res.json({ status: 'success', message: 'Student archived', result });
  } catch (err) {
    logger.error('Failed to delete student:', err);
    res
      .status((err as { statusCode?: number }).statusCode || 400)
      .json({ status: 'error', message: (err as Error).message });
  }
};

// Teacher Controllers
export const createTeacher = async (req: Request, res: Response) => {
  try {
    const teacher = await lmsDB.addTeacherProfile({ ...req.body, createdById: req.user?.id });
    res.status(201).json({ status: 'success', teacher });
  } catch (err) {
    logger.error('Failed to create teacher:', err);
    const status = (err as { code?: string }).code === 'P2002' ? 409 : 400;
    res.status(status).json({ status: 'error', message: (err as Error).message });
  }
};

export const updateTeacher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await assertTargetInActorSchool(req, id, 'teacher');
    const teacher = await lmsDB.updateTeacherProfile(id, req.body);
    res.json({ status: 'success', teacher });
  } catch (err) {
    logger.error('Failed to update teacher:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const deleteTeacher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await lifecycleService.archiveTeacher(id, req.user?.id, {
      replacementTeacherId: req.body?.replacementTeacherId,
      reason: req.body?.reason || 'Deactivated by school administration',
    });
    res.json({ status: 'success', message: 'Teacher deactivated', result });
  } catch (err) {
    logger.error('Failed to delete teacher:', err);
    res
      .status((err as { statusCode?: number }).statusCode || 400)
      .json({ status: 'error', message: (err as Error).message });
  }
};

// Parent Controllers
export const createParent = async (req: Request, res: Response) => {
  try {
    const parent = await lmsDB.addParentProfile({ ...req.body, createdById: req.user?.id });
    res.status(201).json({ status: 'success', parent });
  } catch (err) {
    logger.error('Failed to create parent:', err);
    const status = (err as { code?: string }).code === 'P2002' ? 409 : 400;
    res.status(status).json({ status: 'error', message: (err as Error).message });
  }
};

export const deleteParent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await assertTargetInActorSchool(req, id, 'parent');
    await lmsDB.deleteParentProfile(id);
    res.json({ status: 'success', message: 'Parent deleted' });
  } catch (err) {
    logger.error('Failed to delete parent:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const updateParent = async (req: Request, res: Response) => {
  try {
    await assertTargetInActorSchool(req, req.params.id, 'parent');
    const childrenIds = Array.isArray(req.body.childrenIds) ? req.body.childrenIds : undefined;
    const parent = await prisma.$transaction(async (tx) => {
      const existingParent = await tx.user.findFirst({
        where: { id: req.params.id, role: 'parent' },
      });
      if (!existingParent) throw new Error('Parent not found.');
      if (childrenIds) {
        const childCount = await tx.user.count({
          where: {
            id: { in: childrenIds },
            role: 'student',
            schoolId: existingParent.schoolId,
            isArchived: false,
          },
        });
        if (childCount !== new Set(childrenIds).size)
          throw new Error('Every linked child must be an active student.');
        const uniqueChildren = [...new Set<string>(childrenIds)];
        await tx.parentStudent.updateMany({
          where: { parentId: req.params.id, studentId: { notIn: uniqueChildren }, isActive: true },
          data: { isActive: false, endedAt: new Date() },
        });
        for (let index = 0; index < uniqueChildren.length; index += 1) {
          const studentId = uniqueChildren[index];
          await tx.parentStudent.upsert({
            where: { parentId_studentId: { parentId: req.params.id, studentId } },
            create: { parentId: req.params.id, studentId, isPrimary: index === 0 },
            update: { isActive: true, endedAt: null, isPrimary: index === 0 },
          });
        }
      }
      const updated = await tx.user.update({
        where: { id: req.params.id },
        data: {
          name: req.body.name,
          email: req.body.email ? String(req.body.email).trim().toLowerCase() : undefined,
          avatar: req.body.avatar,
          phone: req.body.phone === undefined ? undefined : req.body.phone || null,
          secondaryPhone:
            req.body.secondaryPhone === undefined ? undefined : req.body.secondaryPhone || null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true,
          phone: true,
          secondaryPhone: true,
        },
      });
      await tx.parentProfile.upsert({
        where: { userId: req.params.id },
        create: {
          userId: req.params.id,
          address: req.body.address || null,
          occupation: req.body.occupation || null,
        },
        update: {
          ...(req.body.address !== undefined && { address: req.body.address || null }),
          ...(req.body.occupation !== undefined && { occupation: req.body.occupation || null }),
        },
      });
      return { ...updated, childrenIds: childrenIds || undefined };
    });
    res.json({ status: 'success', parent });
  } catch (err) {
    logger.error('Failed to update parent:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

const parseCsvLine = (line: string) => {
  const values: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) {
      values.push(value.trim());
      value = '';
    } else value += char;
  }
  values.push(value.trim());
  return values;
};

export const bulkImportStudents = async (req: Request, res: Response) => {
  try {
    const lines = String(req.body.csv || '')
      .split(/\r?\n/)
      .filter(Boolean);
    if (lines.length < 2 || lines.length > 501)
      return res
        .status(400)
        .json({ status: 'error', message: 'CSV must contain a header and 1-500 data rows.' });
    const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
    const required = ['name', 'email', 'gradelevel', 'section', 'parentname', 'parentemail'];
    if (required.some((field) => !headers.includes(field)))
      return res
        .status(400)
        .json({ status: 'error', message: `CSV requires: ${required.join(', ')}` });
    const rows: Array<Record<string, string> & { gradeLevel: number }> = lines
      .slice(1)
      .map((line, index) => {
        const values = parseCsvLine(line);
        const row = Object.fromEntries(
          headers.map((header, column) => [header, values[column] || '']),
        );
        const { gradeLevel, section } = normalizeCohortSelection(row.gradelevel, row.section);
        if (!row.name || !/^\S+@\S+\.\S+$/.test(row.email) || !section)
          throw new Error(`Invalid CSV row ${index + 2}.`);
        return { ...row, gradeLevel, section } as unknown as Record<string, string> & {
          gradeLevel: number;
        };
      });
    const actorSchool = req.user?.id
      ? await prisma.user.findUnique({
          where: { id: req.user.id },
          include: { schoolRef: { select: { name: true } } },
        })
      : null;
    const created = await prisma.$transaction(async (tx) => {
      const result = [];
      for (const row of rows) {
        const studentId = `user-stu-${randomUUID()}`;
        const schoolName = actorSchool?.schoolRef.name || row.schoolname;
        if (!schoolName) throw new Error(`School is missing for CSV row ${result.length + 2}.`);
        const school = await tx.school.upsert({
          where: { name: schoolName },
          update: {},
          create: { name: schoolName },
        });
        const cohort = await tx.academicCohort.upsert({
          where: {
            schoolId_gradeLevel_section: {
              schoolId: school.id,
              gradeLevel: row.gradeLevel,
              section: row.section,
            },
          },
          update: {},
          create: { schoolId: school.id, gradeLevel: row.gradeLevel, section: row.section },
        });
        let academicYear = await tx.academicYear.findFirst({
          where: { schoolId: school.id, isActive: true, isArchived: false },
          orderBy: { startsAt: 'desc' },
        });
        if (!academicYear) {
          const year = new Date().getUTCFullYear();
          academicYear = await tx.academicYear.create({
            data: {
              schoolId: school.id,
              name: String(year),
              startsAt: new Date(Date.UTC(year, 0, 1)),
              endsAt: new Date(Date.UTC(year, 11, 31)),
              isActive: true,
            },
          });
        }
        const roll = row.rollnumber
          ? Number(row.rollnumber)
          : ((
              await tx.studentAcademicEnrollment.aggregate({
                where: { cohortId: cohort.id, academicYearId: academicYear.id },
                _max: { rollNumber: true },
              })
            )._max.rollNumber || 0) + 1;
        const student = await tx.user.create({
          data: {
            id: studentId,
            name: row.name,
            email: row.email.toLowerCase(),
            role: 'student',
            avatar: '',
            schoolId: school.id,
          },
        });
        await tx.studentProfile.create({
          data: {
            userId: student.id,
            streakDays: 0,
            xpPoints: 0,
          },
        });
        await tx.studentAcademicEnrollment.create({
          data: {
            studentId: student.id,
            cohortId: cohort.id,
            academicYearId: academicYear.id,
            rollNumber: roll,
          },
        });
        await tx.parentControlSettings.create({
          data: {
            studentId: student.id,
            allowTeacherDirectChat: true,
            allowPeerDiscussion: false,
            missingHomeworkAlerts: true,
            lowAttendanceAlerts: true,
            weeklyDigestEmail: true,
            screenTimeLimitMinutes: 120,
            requireApprovalForOutboundMsgs: true,
            timezone: school.timezone,
          },
        });
        const activeClassrooms = await tx.classroom.findMany({
          where: {
            cohortId: cohort.id,
            isArchived: false,
            OR: [{ academicYearId: academicYear.id }, { academicYearId: null }],
          },
          include: { _count: { select: { enrollments: true } } },
        });
        for (const classroom of activeClassrooms) {
          if (classroom._count.enrollments >= classroom.maxCapacity)
            throw new Error(`Classroom ${classroom.name} is full.`);
          await tx.classroomEnrollment.create({
            data: { classroomId: classroom.id, studentId: student.id },
          });
        }
        await tx.studentLifecycleEvent.create({
          data: {
            studentId: student.id,
            type: 'enrolled',
            toCohortId: cohort.id,
            academicYearId: academicYear.id,
            createdById: req.user?.id,
          },
        });
        await tx.notificationPreference.create({ data: { userId: student.id } });
        if (row.parentemail) {
          const parentEmail = row.parentemail.toLowerCase();
          let parent = await tx.user.findUnique({ where: { email: parentEmail } });
          if (parent && (parent.role !== 'parent' || parent.schoolId !== school.id))
            throw new Error(`Parent email on row ${result.length + 2} belongs to another account.`);
          parent = parent
            ? await tx.user.update({
                where: { id: parent.id },
                data: { isArchived: false, phone: row.parentphone || parent.phone },
              })
            : await tx.user.create({
                data: {
                  id: `user-parent-${randomUUID()}`,
                  name: row.parentname || `${row.name}'s guardian`,
                  email: parentEmail,
                  role: 'parent',
                  avatar: '',
                  schoolId: school.id,
                  phone: row.parentphone || null,
                },
              });
          await tx.parentStudent.upsert({
            where: { parentId_studentId: { parentId: parent.id, studentId: student.id } },
            update: {},
            create: { parentId: parent.id, studentId: student.id, isPrimary: true },
          });
          await tx.notificationPreference.upsert({
            where: { userId: parent.id },
            update: {},
            create: { userId: parent.id },
          });
          await tx.parentProfile.upsert({
            where: { userId: parent.id },
            update: {},
            create: { userId: parent.id },
          });
        }
        result.push(student);
      }
      return result;
    });
    res.status(201).json({ status: 'success', imported: created.length, students: created });
  } catch (err) {
    logger.error('CSV import failed:', err);
    res.status(422).json({ status: 'error', message: (err as Error).message });
  }
};

export const reseedDevelopmentDatabase = async (_req: Request, res: Response) => {
  if (process.env.NODE_ENV !== 'development')
    return res.status(404).json({ status: 'error', message: 'Not found.' });
  try {
    const exec = promisify(execFile);
    const backendRoot = path.resolve(
      process.cwd().endsWith('backend') ? process.cwd() : path.join(process.cwd(), 'apps/backend'),
    );
    await exec('npx', ['tsx', 'prisma/seed.ts'], {
      cwd: backendRoot,
      env: { ...process.env, NODE_ENV: 'development' },
      timeout: 120_000,
    });
    res.json({ status: 'success', message: 'Development database reseeded.' });
  } catch (err) {
    logger.error('Development reseed failed:', err);
    res.status(500).json({ status: 'error', message: 'Database reseed failed.' });
  }
};

// Badge Definition Controllers
export const createBadgeDefinition = async (req: Request, res: Response) => {
  try {
    const badge = await lmsDB.createBadgeDefinition(req.body);
    res.json({ status: 'success', badge });
  } catch (err) {
    logger.error('Failed to create badge definition:', err);
    res.status(500).json({ status: 'error', message: 'Failed to create badge definition' });
  }
};

export const deleteBadgeDefinition = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await lmsDB.deleteBadgeDefinition(id);
    res.json({ status: 'success', message: 'Badge definition deleted' });
  } catch (err) {
    logger.error('Failed to delete badge definition:', err);
    res.status(500).json({ status: 'error', message: 'Failed to delete badge definition' });
  }
};

// Classroom Controllers
export const deleteClassroom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await lmsDB.deleteClassroom(id);
    res.json({ status: 'success', message: 'Classroom deleted' });
  } catch (err) {
    logger.error('Failed to delete classroom:', err);
    res.status(500).json({ status: 'error', message: 'Failed to delete classroom' });
  }
};

// --- TEACHER SUBJECT ASSIGNMENTS & REASSIGNMENTS CONTROLLERS ---
export const assignSubjectToTeacher = async (req: Request, res: Response) => {
  try {
    if (!req.user)
      return res.status(401).json({ status: 'error', message: 'Authentication required.' });
    const actorId = req.user.id;
    const { teacherId, subjectId, classroomId, reason } = req.body;
    if (!teacherId || !subjectId) {
      return res
        .status(400)
        .json({ status: 'error', message: 'teacherId and subjectId are required.' });
    }
    const result = await teacherAssignmentService.assignSubjectToTeacher(
      teacherId,
      subjectId,
      classroomId,
      actorId,
      reason,
    );
    res.status(201).json({ status: 'success', result });
  } catch (err) {
    logger.error('Failed to assign subject to teacher:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const deassignSubjectFromTeacher = async (req: Request, res: Response) => {
  try {
    if (!req.user)
      return res.status(401).json({ status: 'error', message: 'Authentication required.' });
    const actorId = req.user.id;
    const { teacherId, subjectId, classroomId, reason } = req.body;
    if (!teacherId || !subjectId) {
      return res
        .status(400)
        .json({ status: 'error', message: 'teacherId and subjectId are required.' });
    }
    const result = await teacherAssignmentService.deassignSubjectFromTeacher(
      teacherId,
      subjectId,
      classroomId,
      actorId,
      reason,
    );
    res.json({ status: 'success', result });
  } catch (err) {
    logger.error('Failed to deassign subject from teacher:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const reassignSubject = async (req: Request, res: Response) => {
  try {
    if (!req.user)
      return res.status(401).json({ status: 'error', message: 'Authentication required.' });
    const actorId = req.user.id;
    const { subjectId, classroomId, fromTeacherId, toTeacherId, reason } = req.body;
    if (!classroomId || !fromTeacherId || !toTeacherId) {
      return res.status(400).json({
        status: 'error',
        message: 'classroomId, fromTeacherId, and toTeacherId are required for reassignment.',
      });
    }
    const result = await teacherAssignmentService.reassignSubject(
      subjectId,
      classroomId,
      fromTeacherId,
      toTeacherId,
      actorId,
      reason,
    );
    res.json({ status: 'success', result });
  } catch (err) {
    logger.error('Failed to reassign subject:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

// --- SUBSTITUTE REQUEST & QUALIFICATION FILTER CONTROLLERS ---
export const getEligibleSubstitutes = async (req: Request, res: Response) => {
  try {
    if (!req.user)
      return res.status(401).json({ status: 'error', message: 'Authentication required.' });
    const classroomId = String(req.query.classroomId || '');
    const subjectId = String(req.query.subjectId || '');
    const date = String(req.query.date || '');
    const timeSlot = String(req.query.timeSlot || '');
    if (!classroomId || !date || !timeSlot) {
      return res
        .status(400)
        .json({ status: 'error', message: 'classroomId, date, and timeSlot are required.' });
    }
    const candidates = await teacherAssignmentService.getEligibleSubstitutes(
      req.user.id,
      classroomId,
      subjectId,
      date,
      timeSlot,
    );
    res.json({ status: 'success', candidates });
  } catch (err) {
    logger.error('Failed to fetch eligible substitutes:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const createSubstituteRequest = async (req: Request, res: Response) => {
  try {
    if (!req.user)
      return res.status(401).json({ status: 'error', message: 'Authentication required.' });
    const actorId = req.user.id;
    const {
      classroomId,
      subjectId,
      date,
      timeSlot,
      originalTeacherId,
      suggestedSubstituteId,
      reason,
      teacherAbsenceRequestId,
    } = req.body;
    if (!classroomId || !date || !timeSlot || !originalTeacherId || !reason) {
      return res.status(400).json({
        status: 'error',
        message: 'classroomId, date, timeSlot, originalTeacherId, and reason are required.',
      });
    }
    const substituteRequest = await teacherAssignmentService.createSubstituteRequest({
      classroomId,
      subjectId,
      date,
      timeSlot,
      originalTeacherId,
      suggestedSubstituteId,
      reason,
      teacherAbsenceRequestId,
      createdByAdminId: actorId,
    });
    res.status(201).json({ status: 'success', substituteRequest });
  } catch (err) {
    logger.error('Failed to create substitute request:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const updateSubstituteRequestStatus = async (req: Request, res: Response) => {
  try {
    if (!req.user)
      return res.status(401).json({ status: 'error', message: 'Authentication required.' });
    const actorId = req.user.id;
    const { id } = req.params;
    const { status, responseNotes, assignedSubstituteId } = req.body;
    if (!status || !['APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid status (APPROVED, REJECTED, CANCELLED) is required.',
      });
    }
    const substituteRequest = await teacherAssignmentService.updateSubstituteRequestStatus(
      id,
      status,
      actorId,
      responseNotes,
      assignedSubstituteId,
    );
    res.json({ status: 'success', substituteRequest });
  } catch (err) {
    logger.error('Failed to update substitute request status:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const getSubstituteRequests = async (req: Request, res: Response) => {
  try {
    if (!req.user)
      return res.status(401).json({ status: 'error', message: 'Authentication required.' });
    const teacherId = req.query.teacherId ? String(req.query.teacherId) : undefined;
    const requests = await teacherAssignmentService.getSubstituteRequests(req.user.id, teacherId);
    res.json({ status: 'success', substituteRequests: requests });
  } catch (err) {
    logger.error('Failed to fetch substitute requests:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

// --- TEACHER ABSENCE REQUEST CONTROLLERS ---
export const submitTeacherAbsenceRequest = async (req: Request, res: Response) => {
  try {
    if (!req.user)
      return res.status(401).json({ status: 'error', message: 'Authentication required.' });
    const teacherId = req.user.role === 'teacher' ? req.user.id : req.body.teacherId;
    const { startDate, endDate, reason } = req.body;
    if (!teacherId || !startDate || !endDate || !reason) {
      return res.status(400).json({
        status: 'error',
        message: 'teacherId, startDate, endDate, and reason are required.',
      });
    }
    const absenceRequest = await teacherAssignmentService.submitTeacherAbsenceRequest(
      teacherId,
      startDate,
      endDate,
      reason,
      req.user.id,
    );
    res.status(201).json({ status: 'success', absenceRequest });
  } catch (err) {
    logger.error('Failed to submit teacher absence request:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const reviewTeacherAbsenceRequest = async (req: Request, res: Response) => {
  try {
    if (!req.user)
      return res.status(401).json({ status: 'error', message: 'Authentication required.' });
    const actorId = req.user.id;
    const { id } = req.params;
    const { status } = req.body;
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res
        .status(400)
        .json({ status: 'error', message: 'Status must be approved or rejected.' });
    }
    const absenceRequest = await teacherAssignmentService.reviewTeacherAbsenceRequest(
      id,
      status,
      actorId,
    );
    res.json({ status: 'success', absenceRequest });
  } catch (err) {
    logger.error('Failed to review teacher absence request:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const getTeacherAbsenceRequests = async (req: Request, res: Response) => {
  try {
    if (!req.user)
      return res.status(401).json({ status: 'error', message: 'Authentication required.' });
    const teacherId = req.query.teacherId ? String(req.query.teacherId) : undefined;
    const absenceRequests = await teacherAssignmentService.getTeacherAbsenceRequests(
      req.user.id,
      teacherId,
    );
    res.json({ status: 'success', absenceRequests });
  } catch (err) {
    logger.error('Failed to fetch teacher absence requests:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

// --- ASSIGNMENT AUDIT LOG CONTROLLER ---
export const getAssignmentAuditLogs = async (req: Request, res: Response) => {
  try {
    if (!req.user)
      return res.status(401).json({ status: 'error', message: 'Authentication required.' });
    const targetTeacherId = req.query.targetTeacherId
      ? String(req.query.targetTeacherId)
      : undefined;
    const logs = await teacherAssignmentService.getAssignmentAuditLogs(
      req.user.id,
      targetTeacherId,
    );
    res.json({ status: 'success', auditLogs: logs });
  } catch (err) {
    logger.error('Failed to fetch assignment audit logs:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};
