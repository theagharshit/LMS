import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/db/services/prismaClient';
import { signToken } from '../../src/utils/jwtUtils';

const app = createApp();

describe('DB-backed academic lifecycle API', () => {
  let adminToken = '';

  beforeAll(async () => {
    await prisma.user.upsert({
      where: { id: 'user-admin-1' },
      update: { isArchived: false },
      create: {
        id: 'user-admin-1',
        name: 'Lifecycle Test Admin',
        email: 'lifecycle.admin@lms.com',
        role: 'admin',
        avatar: '',
        schoolId: 'school-everest',
      },
    });
    await prisma.user.upsert({
      where: { id: 'user-stu-1' },
      update: { isArchived: false },
      create: {
        id: 'user-stu-1',
        name: 'Lifecycle Test Student',
        email: 'lifecycle.student@lms.com',
        role: 'student',
        avatar: '',
        schoolId: 'school-everest',
      },
    });
    await prisma.studentProfile.upsert({
      where: { userId: 'user-stu-1' },
      update: { isArchived: false },
      create: { id: 'user-stu-1', userId: 'user-stu-1', streakDays: 0, xpPoints: 0 },
    });
    await prisma.studentAcademicEnrollment.upsert({
      where: {
        studentId_academicYearId: {
          studentId: 'user-stu-1',
          academicYearId: 'academic-year-2026',
        },
      },
      update: { cohortId: 'cohort-8-a', status: 'active', endedAt: null },
      create: {
        studentId: 'user-stu-1',
        cohortId: 'cohort-8-a',
        academicYearId: 'academic-year-2026',
        rollNumber: 801,
      },
    });
    await prisma.user.upsert({
      where: { id: 'user-parent-1' },
      update: { isArchived: false },
      create: {
        id: 'user-parent-1',
        name: 'Lifecycle Test Parent',
        email: 'lifecycle.parent@lms.com',
        role: 'parent',
        avatar: '',
        schoolId: 'school-everest',
      },
    });
    await prisma.parentProfile.upsert({
      where: { userId: 'user-parent-1' },
      update: {},
      create: { userId: 'user-parent-1' },
    });
    await prisma.parentStudent.upsert({
      where: {
        parentId_studentId: { parentId: 'user-parent-1', studentId: 'user-stu-1' },
      },
      update: { isActive: true, endedAt: null, isPrimary: true },
      create: {
        parentId: 'user-parent-1',
        studentId: 'user-stu-1',
        relationship: 'guardian',
        isPrimary: true,
      },
    });
    await prisma.user.upsert({
      where: { id: 'user-teach-1' },
      update: { isArchived: false },
      create: {
        id: 'user-teach-1',
        name: 'Lifecycle Test Teacher',
        email: 'lifecycle.teacher@lms.com',
        role: 'teacher',
        avatar: '',
        schoolId: 'school-everest',
      },
    });
    await prisma.teacherProfile.upsert({
      where: { userId: 'user-teach-1' },
      update: { employmentStatus: 'active', leftAt: null },
      create: { userId: 'user-teach-1', employeeNumber: 'LIFE-T-1' },
    });
    await prisma.teacherSubject.upsert({
      where: {
        teacherId_subjectId: {
          teacherId: 'user-teach-1',
          subjectId: 'subject-mathematics',
        },
      },
      update: {},
      create: { teacherId: 'user-teach-1', subjectId: 'subject-mathematics' },
    });
    await prisma.classroom.upsert({
      where: { id: 'cls-math-8a' },
      update: { teacherId: 'user-teach-1', isArchived: false },
      create: {
        id: 'cls-math-8a',
        name: 'Lifecycle Mathematics 8A',
        schoolId: 'school-everest',
        subjectId: 'subject-mathematics',
        cohortId: 'cohort-8-a',
        academicYearId: 'academic-year-2026',
        teacherId: 'user-teach-1',
        roomNumber: '204',
        colorTheme: 'blue',
        bannerImage: '',
        code: 'LIFE8A',
      },
    });
    await prisma.teachingAssignment.upsert({
      where: {
        teacherId_classroomId_academicYearId: {
          teacherId: 'user-teach-1',
          classroomId: 'cls-math-8a',
          academicYearId: 'academic-year-2026',
        },
      },
      update: { isActive: true, endsAt: null },
      create: {
        teacherId: 'user-teach-1',
        classroomId: 'cls-math-8a',
        subjectId: 'subject-mathematics',
        academicYearId: 'academic-year-2026',
      },
    });
    adminToken = signToken({
      id: 'user-admin-1',
      name: 'Lifecycle Test Admin',
      email: 'lifecycle.admin@lms.com',
      role: 'admin',
    });
  });

  it('rejects lifecycle reads without an authenticated school account', async () => {
    const response = await request(app).get('/api/db/academic-years');
    expect(response.status).toBe(401);
  });

  it.each([
    ['/api/db/academic-years', 'academicYears'],
    ['/api/db/subjects', 'subjects'],
    ['/api/db/timetable/slots', 'slots'],
    ['/api/db/terms', 'terms'],
    ['/api/db/holidays', 'holidays'],
    ['/api/db/bell-schedule', 'entries'],
    ['/api/db/exams', 'exams'],
  ])('serves %s from the authenticated school database', async (path, collectionKey) => {
    const response = await request(app).get(path).set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(Array.isArray(response.body[collectionKey])).toBe(true);
  });

  it('returns retained student and teacher lifecycle history', async () => {
    const [student, teacher] = await Promise.all([
      request(app)
        .get('/api/db/students/user-stu-1/lifecycle')
        .set('Authorization', `Bearer ${adminToken}`),
      request(app)
        .get('/api/db/teachers/user-teach-1/lifecycle')
        .set('Authorization', `Bearer ${adminToken}`),
    ]);

    expect(student.status).toBe(200);
    expect(student.body.lifecycle.id).toBe('user-stu-1');
    expect(student.body.lifecycle.studentAcademicEnrollments.length).toBeGreaterThan(0);
    expect(student.body.lifecycle.guardianLinks.length).toBeGreaterThan(0);

    expect(teacher.status).toBe(200);
    expect(teacher.body.lifecycle.id).toBe('user-teach-1');
    expect(teacher.body.lifecycle.teacherTeachingAssignments.length).toBeGreaterThan(0);
  });
});
