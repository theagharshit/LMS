import { describe, it, expect, beforeAll } from 'vitest';
import { teacherAssignmentService } from '../../src/db/services/teacherAssignmentService';
import { prisma } from '../../src/db/services/prismaClient';

describe('TeacherAssignmentService Workflow Tests', () => {
  let testAdminId = 'user-admin-1';
  let testTeacherId = 'user-teach-1';
  let testSubTeacherId = 'user-teach-2';
  let testClassroomId = 'cls-math-8a';
  let testSubjectId = 'subject-mathematics';

  beforeAll(async () => {
    const school = await prisma.school.upsert({
      where: { name: 'Everest International Academy' },
      update: {},
      create: { name: 'Everest International Academy' },
    });

    // Ensure test records exist in test DB
    const admin = await prisma.user.upsert({
      where: { id: testAdminId },
      update: {},
      create: {
        id: testAdminId,
        name: 'Dr. Test Admin',
        email: 'testadmin@school.org',
        role: 'admin',
        avatar: '',
        schoolId: school.id,
      },
    });

    const teacher1 = await prisma.user.upsert({
      where: { id: testTeacherId },
      update: {},
      create: {
        id: testTeacherId,
        name: 'Mr. Lead Math Teacher',
        email: 'leadmath@school.org',
        role: 'teacher',
        avatar: '',
        schoolId: school.id,
      },
    });

    const teacher2 = await prisma.user.upsert({
      where: { id: testSubTeacherId },
      update: {},
      create: {
        id: testSubTeacherId,
        name: 'Mrs. Substitute Teacher',
        email: 'subteacher@school.org',
        role: 'teacher',
        avatar: '',
        schoolId: school.id,
      },
    });

    const subject = await prisma.subject.upsert({
      where: { id: testSubjectId },
      update: {},
      create: {
        id: testSubjectId,
        name: 'Mathematics',
        schoolId: school.id,
      },
    });

    const cohort = await prisma.academicCohort.upsert({
      where: {
        schoolId_gradeLevel_section: {
          schoolId: school.id,
          gradeLevel: 8,
          section: 'A',
        },
      },
      update: {},
      create: {
        schoolId: school.id,
        gradeLevel: 8,
        section: 'A',
      },
    });

    await prisma.classroom.upsert({
      where: { id: testClassroomId },
      update: { teacherId: teacher1.id, subjectId: subject.id },
      create: {
        id: testClassroomId,
        name: 'Grade 8 Mathematics - Sec A',
        code: 'MATH8A',
        roomNumber: 'Room 101',
        colorTheme: '#4A6741',
        bannerImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800',
        schoolRef: { connect: { id: school.id } },
        subjectRef: { connect: { id: subject.id } },
        cohortRef: { connect: { id: cohort.id } },
        teacher: { connect: { id: teacher1.id } },
      },
    });

    const academicYear = await prisma.academicYear.upsert({
      where: { schoolId_name: { schoolId: school.id, name: '2026' } },
      update: {},
      create: {
        schoolId: school.id,
        name: '2026',
        startsAt: new Date('2026-01-01T00:00:00.000Z'),
        endsAt: new Date('2026-12-31T00:00:00.000Z'),
        isActive: true,
      },
    });
    await prisma.timetableSlot.upsert({
      where: { id: 'test-timetable-math-wednesday-p1' },
      update: {},
      create: {
        id: 'test-timetable-math-wednesday-p1',
        schoolId: school.id,
        academicYearId: academicYear.id,
        classroomId: testClassroomId,
        cohortId: cohort.id,
        subjectId: subject.id,
        teacherId: teacher1.id,
        dayOfWeek: 3,
        periodNumber: 1,
        startTime: '10:00',
        endTime: '10:45',
        roomNumber: 'Room 101',
      },
    });

    await prisma.teacherSubject.upsert({
      where: { teacherId_subjectId: { teacherId: teacher1.id, subjectId: subject.id } },
      update: {},
      create: { teacherId: teacher1.id, subjectId: subject.id },
    });

    await prisma.teacherSubject.upsert({
      where: { teacherId_subjectId: { teacherId: teacher2.id, subjectId: subject.id } },
      update: {},
      create: { teacherId: teacher2.id, subjectId: subject.id },
    });
  });

  it('should submit and approve a teacher absence request', async () => {
    const absence = await teacherAssignmentService.submitTeacherAbsenceRequest(
      testTeacherId,
      '2026-09-01',
      '2026-09-01',
      'Attending Mathematics Seminar',
    );

    expect(absence).toBeDefined();
    expect(absence.status).toBe('pending');
    expect(absence.reason).toBe('Attending Mathematics Seminar');

    const reviewed = await teacherAssignmentService.reviewTeacherAbsenceRequest(
      absence.id,
      'approved',
      testAdminId,
    );

    expect(reviewed.status).toBe('approved');
    expect(reviewed.reviewedByAdminId).toBe(testAdminId);
  });

  it('should assign and reassign subjects between teachers', async () => {
    const reassignRes = await teacherAssignmentService.reassignSubject(
      testSubjectId,
      testClassroomId,
      testTeacherId,
      testSubTeacherId,
      testAdminId,
      'Schedule rebalancing',
    );

    expect(reassignRes.status).toBe('success');

    const classroom = await prisma.classroom.findUnique({ where: { id: testClassroomId } });
    expect(classroom?.teacherId).toBe(testSubTeacherId);

    // Reassign back
    await teacherAssignmentService.reassignSubject(
      testSubjectId,
      testClassroomId,
      testSubTeacherId,
      testTeacherId,
      testAdminId,
      'Restoring lead teacher',
    );
  });

  it('should evaluate eligible substitute candidates with workload ranking', async () => {
    const candidates = await teacherAssignmentService.getEligibleSubstitutes(
      testAdminId,
      testClassroomId,
      testSubjectId,
      '2026-09-02',
      '10:00 - 10:45',
    );

    expect(Array.isArray(candidates)).toBe(true);
    expect(candidates.length).toBeGreaterThan(0);
    const topCandidate = candidates[0];
    expect(topCandidate.isAvailable).toBe(true);
  });

  it('should create and approve substitute teacher request', async () => {
    const subReq = await teacherAssignmentService.createSubstituteRequest({
      classroomId: testClassroomId,
      subjectId: testSubjectId,
      date: '2026-09-02',
      timeSlot: '10:00 AM - 10:45 AM',
      originalTeacherId: testTeacherId,
      suggestedSubstituteId: testSubTeacherId,
      reason: 'Teacher absent for training',
      createdByAdminId: testAdminId,
    });

    expect(subReq.status).toBe('PENDING');
    expect(subReq.suggestedSubstituteId).toBe(testSubTeacherId);

    const approvedSub = await teacherAssignmentService.updateSubstituteRequestStatus(
      subReq.id,
      'APPROVED',
      testAdminId,
      'Confirmed by Principal',
      testSubTeacherId,
    );

    expect(approvedSub.status).toBe('APPROVED');
    expect(approvedSub.assignedSubstituteId).toBe(testSubTeacherId);
  });

  it('should record teacher assignment audit logs', async () => {
    const logs = await teacherAssignmentService.getAssignmentAuditLogs(testAdminId, testTeacherId);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].targetTeacherId).toBe(testTeacherId);
  });
});
