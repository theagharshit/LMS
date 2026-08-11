import { Request, Response } from 'express';
import { lmsDB } from '@db/lmsDatabase';
import { logger } from '@utils/logger';
import { prisma } from '@db/services/prismaClient';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

export const assignStudentBadge = async (req: Request, res: Response) => {
  try {
    const { studentProfileId, badgeDefinitionId, remarks } = req.body;
    if (!studentProfileId || !badgeDefinitionId) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    }
    const badge = await lmsDB.assignBadge(
      studentProfileId,
      badgeDefinitionId,
      req.user?.id,
      remarks,
    );
    res.json({ status: 'success', badge });
  } catch (err) {
    logger.error('Failed to assign badge:', err);
    res.status(500).json({ status: 'error', message: 'Failed to assign badge' });
  }
};

export const getAllStudentLocations = async (_req: Request, res: Response) => {
  try {
    const studentLocations = await lmsDB.getStudentLocations();
    res.json({ status: 'success', studentLocations });
  } catch (err) {
    logger.error('Failed to get student locations:', err);
    res.status(500).json({ status: 'error', message: 'Failed to get student locations' });
  }
};

// Student Controllers
export const createStudent = async (req: Request, res: Response) => {
  try {
    const student = await lmsDB.addStudentProfile(req.body);
    res.json({ status: 'success', student });
  } catch (err) {
    logger.error('Failed to create student:', err);
    res.status(500).json({ status: 'error', message: 'Failed to create student' });
  }
};

export const updateStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const student = await lmsDB.updateStudentProfile(id, req.body);
    res.json({ status: 'success', student });
  } catch (err) {
    logger.error('Failed to update student:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update student' });
  }
};

export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await lmsDB.deleteStudentProfile(id);
    res.json({ status: 'success', message: 'Student archived' });
  } catch (err) {
    logger.error('Failed to delete student:', err);
    res.status(500).json({ status: 'error', message: 'Failed to delete student' });
  }
};

// Teacher Controllers
export const createTeacher = async (req: Request, res: Response) => {
  try {
    const teacher = await lmsDB.addTeacherProfile(req.body);
    res.json({ status: 'success', teacher });
  } catch (err) {
    logger.error('Failed to create teacher:', err);
    res.status(500).json({ status: 'error', message: 'Failed to create teacher' });
  }
};

export const updateTeacher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const teacher = await lmsDB.updateTeacherProfile(id, req.body);
    res.json({ status: 'success', teacher });
  } catch (err) {
    logger.error('Failed to update teacher:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update teacher' });
  }
};

export const deleteTeacher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await lmsDB.deleteTeacherProfile(id);
    res.json({ status: 'success', message: 'Teacher deactivated' });
  } catch (err) {
    logger.error('Failed to delete teacher:', err);
    res.status(500).json({ status: 'error', message: 'Failed to delete teacher' });
  }
};

// Parent Controllers
export const createParent = async (req: Request, res: Response) => {
  try {
    const parent = await lmsDB.addParentProfile(req.body);
    res.json({ status: 'success', parent });
  } catch (err) {
    logger.error('Failed to create parent:', err);
    res.status(500).json({ status: 'error', message: 'Failed to create parent' });
  }
};

export const deleteParent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await lmsDB.deleteParentProfile(id);
    res.json({ status: 'success', message: 'Parent deleted' });
  } catch (err) {
    logger.error('Failed to delete parent:', err);
    res.status(500).json({ status: 'error', message: 'Failed to delete parent' });
  }
};

export const updateParent = async (req: Request, res: Response) => {
  try {
    const childrenIds = Array.isArray(req.body.childrenIds) ? req.body.childrenIds : undefined;
    const parent = await prisma.$transaction(async (tx) => {
      if (childrenIds) {
        const childCount = await tx.user.count({
          where: { id: { in: childrenIds }, role: 'student', isArchived: false },
        });
        if (childCount !== new Set(childrenIds).size)
          throw new Error('Every linked child must be an active student.');
        await tx.parentStudent.deleteMany({ where: { parentId: req.params.id } });
        if (childrenIds.length)
          await tx.parentStudent.createMany({
            data: [...new Set<string>(childrenIds)].map((studentId, index) => ({
              parentId: req.params.id,
              studentId,
              isPrimary: index === 0,
            })),
          });
      }
      return tx.user.update({
        where: { id: req.params.id },
        data: {
          name: req.body.name,
          email: req.body.email,
          avatar: req.body.avatar,
          isArchived: req.body.isArchived,
        },
      });
    });
    res.json({ status: 'success', parent });
  } catch (err) {
    logger.error('Failed to update parent:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update parent' });
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
    const required = ['name', 'email', 'gradelevel', 'section'];
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
        const gradeLevel = Number(row.gradelevel);
        if (
          !row.name ||
          !/^\S+@\S+\.\S+$/.test(row.email) ||
          gradeLevel < 1 ||
          gradeLevel > 12 ||
          !row.section
        )
          throw new Error(`Invalid CSV row ${index + 2}.`);
        return { ...row, gradeLevel } as Record<string, string> & { gradeLevel: number };
      });
    const created = await prisma.$transaction(async (tx) => {
      const result = [];
      for (const row of rows) {
        const studentId = `user-stu-${randomUUID()}`;
        const schoolName = row.schoolname || 'Everest International Academy';
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
        const roll = row.rollnumber
          ? Number(row.rollnumber)
          : ((
              await tx.studentProfile.aggregate({
                where: { cohortId: cohort.id, isArchived: false },
                _max: { normalizedRollNumber: true },
              })
            )._max.normalizedRollNumber || 0) + 1;
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
            streakDays: 1,
            xpPoints: 0,
            cohortId: cohort.id,
            normalizedRollNumber: roll,
          },
        });
        await tx.notificationPreference.create({ data: { userId: student.id } });
        if (row.parentemail) {
          const parent = await tx.user.upsert({
            where: { email: row.parentemail.toLowerCase() },
            update: {},
            create: {
              id: `user-parent-${randomUUID()}`,
              name: row.parentname || 'Parent',
              email: row.parentemail.toLowerCase(),
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
