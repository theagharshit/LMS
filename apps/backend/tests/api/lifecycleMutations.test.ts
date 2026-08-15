import type { UserRole } from '@lms/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/db/services/prismaClient';
import { signToken } from '../../src/utils/jwtUtils';
import { createLifecycleFixture } from '../helpers/lifecycleFixtures';

const app = createApp();
const tokenFor = (id: string, role: UserRole, suffix = id) =>
  signToken({
    id,
    role,
    name: `${role} ${suffix}`,
    email: `${id}@test.local`,
  });
const authorized = (token: string) => ({ Authorization: `Bearer ${token}` });

describe.sequential('lifecycle mutation API', () => {
  it('returns 401 for every unauthenticated lifecycle operation', async () => {
    const fixture = await createLifecycleFixture();
    const responses = await Promise.all([
      request(app).get('/api/db/academic-years'),
      request(app).post('/api/db/subjects').send({ name: 'Unauthorized' }),
      request(app)
        .post(`/api/db/students/${fixture.studentId}/leave`)
        .send({ reason: 'Unauthorized' }),
      request(app).get(`/api/db/teachers/${fixture.teacherId}/lifecycle`),
    ]);

    expect(responses.map(({ status }) => status)).toEqual([401, 401, 401, 401]);
  });

  it.each([
    ['student', 'studentId'],
    ['teacher', 'teacherId'],
    ['parent', 'parentId'],
  ] as const)('returns 403 when a %s attempts an admin lifecycle write', async (role, idKey) => {
    const fixture = await createLifecycleFixture();
    const response = await request(app)
      .post('/api/db/subjects')
      .set(authorized(tokenFor(fixture[idKey], role)))
      .send({ name: `Forbidden ${role}` });

    expect(response.status).toBe(403);
    expect(await prisma.subject.count({ where: { name: `Forbidden ${role}` } })).toBe(0);
  });

  it('rejects malformed payloads before any database mutation', async () => {
    const fixture = await createLifecycleFixture();
    const adminToken = tokenFor(fixture.adminId, 'admin');
    const responses = await Promise.all([
      request(app)
        .post('/api/db/academic-years')
        .set(authorized(adminToken))
        .send({ name: '', startsAt: 'not-a-date', endsAt: '2026-12-31' }),
      request(app).post('/api/db/timetable/slots').set(authorized(adminToken)).send({
        classroomId: fixture.classroomId,
        dayOfWeek: 8,
        periodNumber: 0,
        startTime: '9am',
        endTime: '10am',
      }),
      request(app)
        .post(`/api/db/students/${fixture.studentId}/leave`)
        .set(authorized(adminToken))
        .send({ reason: '' }),
    ]);

    expect(responses.map(({ status }) => status)).toEqual([422, 422, 422]);
    expect(
      await prisma.studentLifecycleEvent.count({ where: { studentId: fixture.studentId } }),
    ).toBe(0);
  });

  it('creates and lists a school-scoped academic year through the API', async () => {
    const fixture = await createLifecycleFixture();
    const adminToken = tokenFor(fixture.adminId, 'admin');
    const create = await request(app)
      .post('/api/db/academic-years')
      .set(authorized(adminToken))
      .send({
        name: `2026 ${fixture.suffix}`,
        startsAt: '2026-01-01',
        endsAt: '2026-12-31',
        isActive: true,
      });

    expect(create.status).toBe(201);
    expect(create.body).toMatchObject({
      status: 'success',
      academicYear: { schoolId: fixture.schoolId, isActive: true },
    });
    const list = await request(app).get('/api/db/academic-years').set(authorized(adminToken));
    expect(list.status).toBe(200);
    expect(list.body.academicYears.map(({ id }: { id: string }) => id)).toContain(
      create.body.academicYear.id,
    );
    expect(
      (await prisma.academicYear.findUniqueOrThrow({ where: { id: fixture.currentYearId } }))
        .isActive,
    ).toBe(false);
  });

  it('builds application state and calendar only from school-scoped relational rows', async () => {
    const fixture = await createLifecycleFixture();
    const other = await createLifecycleFixture();
    const holiday = await prisma.schoolHoliday.create({
      data: {
        schoolId: fixture.schoolId,
        academicYearId: fixture.currentYearId,
        name: 'Database Holiday',
        date: new Date('2024-07-15T00:00:00.000Z'),
      },
    });
    const exam = await prisma.exam.create({
      data: {
        schoolId: fixture.schoolId,
        academicYearId: fixture.currentYearId,
        name: 'Database Calendar Exam',
        startsAt: new Date('2024-09-01T00:00:00.000Z'),
        endsAt: new Date('2024-09-05T00:00:00.000Z'),
        status: 'published',
      },
    });

    const state = await request(app)
      .get('/api/db/state')
      .set(authorized(tokenFor(fixture.adminId, 'admin')));
    expect(state.status).toBe(200);
    expect(state.body.status).toBe('success');
    expect(state.body.users.map(({ id }: { id: string }) => id)).toContain(fixture.studentId);
    expect(state.body.users.map(({ id }: { id: string }) => id)).not.toContain(other.studentId);
    expect(state.body.classrooms.map(({ id }: { id: string }) => id)).toEqual(
      expect.arrayContaining([fixture.classroomId, fixture.nextClassroomId]),
    );
    expect(state.body.calendarEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: holiday.id, type: 'holiday', date: '2024-07-15' }),
        expect.objectContaining({ id: exam.id, type: 'exam', date: '2024-09-01' }),
      ]),
    );
    expect(
      state.body.calendarEvents.every(({ id }: { id: string }) =>
        [holiday.id, exam.id].includes(id),
      ),
    ).toBe(true);
  });

  it('prevents an admin from selecting another school in a write payload', async () => {
    const fixture = await createLifecycleFixture();
    const other = await createLifecycleFixture();
    const response = await request(app)
      .post('/api/db/academic-years')
      .set(authorized(tokenFor(fixture.adminId, 'admin')))
      .send({
        schoolId: other.schoolId,
        name: 'Cross-school year',
        startsAt: '2026-01-01',
        endsAt: '2026-12-31',
      });

    expect(response.status).toBe(403);
    expect(
      await prisma.academicYear.count({
        where: { schoolId: other.schoolId, name: 'Cross-school year' },
      }),
    ).toBe(0);
  });

  it('enrolls a student and guardian through the admin API as one connected lifecycle', async () => {
    const fixture = await createLifecycleFixture();
    const studentEmail = `${fixture.id('api-enrolled-student')}@test.local`;
    const parentEmail = `${fixture.id('api-enrolled-parent')}@test.local`;
    const response = await request(app)
      .post('/api/db/students')
      .set(authorized(tokenFor(fixture.adminId, 'admin')))
      .send({
        name: 'API Enrolled Student',
        email: studentEmail,
        gradeLevel: 8,
        section: 'A',
        rollNumber: 9,
        parentName: 'API Enrolled Parent',
        parentEmail,
        parentPhone: '+977-9800000000',
        relationship: 'guardian',
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      status: 'success',
      student: {
        name: 'API Enrolled Student',
        gradeLevel: 8,
        section: 'A',
        rollNumber: 9,
      },
    });
    const studentId = response.body.student.id as string;
    const parent = await prisma.user.findUniqueOrThrow({ where: { email: parentEmail } });
    expect(parent).toMatchObject({ role: 'parent', schoolId: fixture.schoolId });
    expect(
      await prisma.parentStudent.findUniqueOrThrow({
        where: { parentId_studentId: { parentId: parent.id, studentId } },
      }),
    ).toMatchObject({ isActive: true, isPrimary: true });
    expect(
      await prisma.studentAcademicEnrollment.findUniqueOrThrow({
        where: {
          studentId_academicYearId: { studentId, academicYearId: fixture.currentYearId },
        },
      }),
    ).toMatchObject({ cohortId: fixture.cohortId, status: 'active' });
    expect(
      await prisma.classroomEnrollment.findUniqueOrThrow({
        where: {
          classroomId_studentId: { classroomId: fixture.classroomId, studentId },
        },
      }),
    ).toMatchObject({ isActive: true });
  });

  it('rejects API enrollment without a complete guardian before creating a student', async () => {
    const fixture = await createLifecycleFixture();
    const email = `${fixture.id('guardianless-api-student')}@test.local`;
    const response = await request(app)
      .post('/api/db/students')
      .set(authorized(tokenFor(fixture.adminId, 'admin')))
      .send({
        name: 'Guardianless API Student',
        email,
        gradeLevel: 8,
        section: 'A',
      });

    expect(response.status).toBe(422);
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  });

  it('allows students to read only their own lifecycle', async () => {
    const fixture = await createLifecycleFixture({ includeSecondStudent: true });
    const studentToken = tokenFor(fixture.studentId, 'student');
    const own = await request(app)
      .get(`/api/db/students/${fixture.studentId}/lifecycle`)
      .set(authorized(studentToken));
    const other = await request(app)
      .get(`/api/db/students/${fixture.secondStudentId}/lifecycle`)
      .set(authorized(studentToken));

    expect(own.status).toBe(200);
    expect(own.body.lifecycle.id).toBe(fixture.studentId);
    expect(other.status).toBe(403);
  });

  it('allows a linked parent and assigned teacher to read a student lifecycle', async () => {
    const fixture = await createLifecycleFixture();
    const [parentResponse, teacherResponse] = await Promise.all([
      request(app)
        .get(`/api/db/students/${fixture.studentId}/lifecycle`)
        .set(authorized(tokenFor(fixture.parentId, 'parent'))),
      request(app)
        .get(`/api/db/students/${fixture.studentId}/lifecycle`)
        .set(authorized(tokenFor(fixture.teacherId, 'teacher'))),
    ]);

    expect(parentResponse.status).toBe(200);
    expect(teacherResponse.status).toBe(200);
  });

  it('denies a parent after the guardian link becomes inactive', async () => {
    const fixture = await createLifecycleFixture();
    await prisma.parentStudent.update({
      where: {
        parentId_studentId: { parentId: fixture.parentId, studentId: fixture.studentId },
      },
      data: { isActive: false, endedAt: new Date() },
    });

    const response = await request(app)
      .get(`/api/db/students/${fixture.studentId}/lifecycle`)
      .set(authorized(tokenFor(fixture.parentId, 'parent')));
    expect(response.status).toBe(403);
  });

  it('allows teachers to view only their own teacher lifecycle', async () => {
    const fixture = await createLifecycleFixture();
    const teacherToken = tokenFor(fixture.teacherId, 'teacher');
    const own = await request(app)
      .get(`/api/db/teachers/${fixture.teacherId}/lifecycle`)
      .set(authorized(teacherToken));
    const other = await request(app)
      .get(`/api/db/teachers/${fixture.replacementTeacherId}/lifecycle`)
      .set(authorized(teacherToken));

    expect(own.status).toBe(200);
    expect(other.status).toBe(403);
  });

  it('executes leave and restore as complete lifecycle mutations', async () => {
    const fixture = await createLifecycleFixture();
    const adminToken = tokenFor(fixture.adminId, 'admin');
    const leave = await request(app)
      .post(`/api/db/students/${fixture.studentId}/leave`)
      .set(authorized(adminToken))
      .send({ reason: 'Temporary API withdrawal', status: 'left' });
    expect(leave.status).toBe(200);
    expect(leave.body.result.status).toBe('left');
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: fixture.studentId } })).isArchived,
    ).toBe(true);

    // A newly signed admin token remains valid; the archived account is the student, not the actor.
    const restore = await request(app)
      .post(`/api/db/students/${fixture.studentId}/restore`)
      .set(authorized(adminToken))
      .send({ academicYearId: fixture.currentYearId, reason: 'Returned through API' });
    expect(restore.status).toBe(200);
    expect(restore.body.result.status).toBe('active');
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: fixture.studentId } })).isArchived,
    ).toBe(false);
  });

  it('returns conflict status and leaves state unchanged for promotion without a report', async () => {
    const fixture = await createLifecycleFixture();
    const response = await request(app)
      .post(`/api/db/students/${fixture.studentId}/promote`)
      .set(authorized(tokenFor(fixture.adminId, 'admin')))
      .send({ targetAcademicYearId: fixture.nextYearId });

    expect(response.status).toBe(409);
    expect(
      await prisma.studentAcademicEnrollment.count({
        where: { studentId: fixture.studentId, academicYearId: fixture.nextYearId },
      }),
    ).toBe(0);
  });

  it('creates timetable data and reports clashes with HTTP conflict semantics', async () => {
    const fixture = await createLifecycleFixture();
    const adminToken = tokenFor(fixture.adminId, 'admin');
    const payload = {
      academicYearId: fixture.currentYearId,
      classroomId: fixture.classroomId,
      dayOfWeek: 2,
      periodNumber: 3,
      startTime: '11:00',
      endTime: '11:45',
      roomNumber: 'R-101',
    };
    const created = await request(app)
      .post('/api/db/timetable/slots')
      .set(authorized(adminToken))
      .send(payload);
    const conflict = await request(app)
      .post('/api/db/timetable/slots')
      .set(authorized(adminToken))
      .send({ ...payload, teacherId: fixture.replacementTeacherId });

    expect(created.status).toBe(201);
    expect(created.body.slot.classroomId).toBe(fixture.classroomId);
    expect(conflict.status).toBe(409);
    expect(await prisma.timetableSlot.count({ where: { schoolId: fixture.schoolId } })).toBe(1);
  });

  it('lets the assigned teacher submit valid marks and rejects out-of-range marks', async () => {
    const fixture = await createLifecycleFixture();
    const adminToken = tokenFor(fixture.adminId, 'admin');
    const teacherToken = tokenFor(fixture.teacherId, 'teacher');
    const examResponse = await request(app)
      .post('/api/db/exams')
      .set(authorized(adminToken))
      .send({
        academicYearId: fixture.currentYearId,
        name: 'API Marks Exam',
        startsAt: '2024-10-01',
        endsAt: '2024-10-10',
        status: 'marks_open',
        subjects: [
          {
            subjectId: fixture.subjectId,
            classroomId: fixture.classroomId,
            totalMarks: 50,
            passMarks: 20,
          },
        ],
      });
    expect(examResponse.status).toBe(201);
    const examSubjectId = examResponse.body.exam.subjects[0].id;

    const invalid = await request(app)
      .post(`/api/db/exam-subjects/${examSubjectId}/marks`)
      .set(authorized(teacherToken))
      .send({ marks: [{ studentId: fixture.studentId, marksObtained: 51 }] });
    expect(invalid.status).toBe(400);
    expect(await prisma.examMark.count({ where: { examSubjectId } })).toBe(0);

    const valid = await request(app)
      .post(`/api/db/exam-subjects/${examSubjectId}/marks`)
      .set(authorized(teacherToken))
      .send({ marks: [{ studentId: fixture.studentId, marksObtained: 45 }] });
    expect(valid.status).toBe(201);
    expect(valid.body).toMatchObject({ status: 'success', count: 1 });
    expect(valid.body.marks[0]).toMatchObject({
      studentId: fixture.studentId,
      marksObtained: 45,
      submittedById: fixture.teacherId,
    });
  });

  it('rejects impossible academic rollover and teacher departure requests at the API boundary', async () => {
    const fixture = await createLifecycleFixture();
    const adminToken = tokenFor(fixture.adminId, 'admin');
    const [rollover, departure] = await Promise.all([
      request(app).post('/api/db/academic-rollover').set(authorized(adminToken)).send({
        fromAcademicYearId: fixture.currentYearId,
        toAcademicYearId: fixture.currentYearId,
      }),
      request(app)
        .post(`/api/db/teachers/${fixture.teacherId}/leave`)
        .set(authorized(adminToken))
        .send({ reason: 'No replacement supplied' }),
    ]);

    expect(rollover.status).toBe(400);
    expect(departure.status).toBe(409);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: fixture.teacherId } })).isArchived,
    ).toBe(false);
  });
});
