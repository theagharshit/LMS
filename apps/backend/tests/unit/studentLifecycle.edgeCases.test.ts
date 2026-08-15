import { describe, expect, it } from 'vitest';
import { lifecycleService } from '../../src/db/services/lifecycleService';
import { prisma } from '../../src/db/services/prismaClient';
import { createLifecycleFixture, createReportPrerequisites } from '../helpers/lifecycleFixtures';

describe.sequential('student lifecycle edge cases', () => {
  it('requires an active actor and prevents cross-school lifecycle access', async () => {
    const fixture = await createLifecycleFixture();
    const other = await createLifecycleFixture();

    await expect(lifecycleService.getStudentLifecycle(fixture.studentId)).rejects.toMatchObject({
      status: 401,
    });
    await prisma.user.update({ where: { id: fixture.adminId }, data: { isArchived: true } });
    await expect(
      lifecycleService.getStudentLifecycle(fixture.studentId, fixture.adminId),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      lifecycleService.getStudentLifecycle(fixture.studentId, other.adminId),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      lifecycleService.registerStudentEnrollment(
        fixture.studentId,
        other.adminId,
        other.nextYearId,
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('validates academic-year dates and rejects overlaps', async () => {
    const fixture = await createLifecycleFixture();

    await expect(
      lifecycleService.createAcademicYear(fixture.adminId, {
        name: 'Invalid ordering',
        startsAt: '2027-12-31',
        endsAt: '2027-01-01',
      }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      lifecycleService.createAcademicYear(fixture.adminId, {
        name: 'Too long',
        startsAt: '2027-01-01',
        endsAt: '2028-01-03',
      }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      lifecycleService.createAcademicYear(fixture.adminId, {
        name: 'Overlapping year',
        startsAt: '2024-08-01',
        endsAt: '2025-07-31',
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('activates exactly one academic year for a school', async () => {
    const fixture = await createLifecycleFixture();

    await lifecycleService.activateAcademicYear(fixture.adminId, fixture.nextYearId);
    const years = await prisma.academicYear.findMany({ where: { schoolId: fixture.schoolId } });
    expect(years.filter(({ isActive }) => isActive)).toHaveLength(1);
    expect(years.find(({ id }) => id === fixture.nextYearId)?.isActive).toBe(true);
    expect(years.find(({ id }) => id === fixture.currentYearId)?.isActive).toBe(false);
  });

  it('returns an existing student-year enrollment idempotently', async () => {
    const fixture = await createLifecycleFixture();
    const before = await prisma.studentAcademicEnrollment.findUniqueOrThrow({
      where: {
        studentId_academicYearId: {
          studentId: fixture.studentId,
          academicYearId: fixture.currentYearId,
        },
      },
    });

    const result = await lifecycleService.registerStudentEnrollment(
      fixture.studentId,
      fixture.adminId,
      fixture.currentYearId,
    );
    expect(result.id).toBe(before.id);
    expect(
      await prisma.studentAcademicEnrollment.count({
        where: { studentId: fixture.studentId, academicYearId: fixture.currentYearId },
      }),
    ).toBe(1);
  });

  it('does not invent a placement for a student with no enrollment history', async () => {
    const fixture = await createLifecycleFixture();
    const studentId = fixture.id('new-unplaced-student');
    await prisma.user.create({
      data: {
        id: studentId,
        name: 'Unplaced Student',
        email: `${studentId}@test.local`,
        role: 'student',
        avatar: 'unplaced.png',
        schoolId: fixture.schoolId,
        studentProfile: { create: { id: studentId, streakDays: 0, xpPoints: 0 } },
      },
    });

    await expect(
      lifecycleService.registerStudentEnrollment(studentId, fixture.adminId, fixture.nextYearId),
    ).rejects.toMatchObject({
      status: 409,
      message: 'Student has no previous cohort placement to restore.',
    });
    expect(await prisma.studentAcademicEnrollment.count({ where: { studentId } })).toBe(0);
  });

  it.each([0, -1, 1.5])('rejects invalid requested roll number %s', async (rollNumber) => {
    const fixture = await createLifecycleFixture();

    await expect(
      lifecycleService.registerStudentEnrollment(
        fixture.studentId,
        fixture.adminId,
        fixture.nextYearId,
        rollNumber,
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(
      await prisma.studentAcademicEnrollment.count({
        where: { studentId: fixture.studentId, academicYearId: fixture.nextYearId },
      }),
    ).toBe(0);
  });

  it('allocates the next free roll number when the previous roll is already taken', async () => {
    const fixture = await createLifecycleFixture({ includeSecondStudent: true });
    await prisma.studentAcademicEnrollment.create({
      data: {
        studentId: fixture.secondStudentId,
        cohortId: fixture.cohortId,
        academicYearId: fixture.nextYearId,
        rollNumber: 1,
      },
    });

    const enrollment = await lifecycleService.registerStudentEnrollment(
      fixture.studentId,
      fixture.adminId,
      fixture.nextYearId,
    );
    expect(enrollment.rollNumber).toBe(2);
  });

  it('leaving archives the student, ends placements, and preserves all history', async () => {
    const fixture = await createLifecycleFixture();
    const result = await lifecycleService.leaveStudent(fixture.studentId, fixture.adminId, {
      reason: 'Transferred to another school',
      status: 'transferred',
    });
    expect(result).toMatchObject({
      studentId: fixture.studentId,
      status: 'transferred',
      archivedParentIds: [fixture.parentId],
    });

    const [student, profile, academic, classroom, guardian, parent, event] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: fixture.studentId } }),
      prisma.studentProfile.findUniqueOrThrow({ where: { userId: fixture.studentId } }),
      prisma.studentAcademicEnrollment.findFirstOrThrow({
        where: { studentId: fixture.studentId },
      }),
      prisma.classroomEnrollment.findFirstOrThrow({ where: { studentId: fixture.studentId } }),
      prisma.parentStudent.findUniqueOrThrow({
        where: {
          parentId_studentId: { parentId: fixture.parentId, studentId: fixture.studentId },
        },
      }),
      prisma.user.findUniqueOrThrow({ where: { id: fixture.parentId } }),
      prisma.studentLifecycleEvent.findFirstOrThrow({
        where: { studentId: fixture.studentId, type: 'transferred' },
      }),
    ]);
    expect(student.isArchived).toBe(true);
    expect(profile).toMatchObject({ isArchived: true });
    expect(profile.leftAt).not.toBeNull();
    expect(academic).toMatchObject({
      status: 'transferred',
      exitReason: 'Transferred to another school',
    });
    expect(academic.endedAt).not.toBeNull();
    expect(classroom.isActive).toBe(false);
    expect(classroom.endedAt).not.toBeNull();
    expect(guardian.isActive).toBe(false);
    expect(parent.isArchived).toBe(true);
    expect(event.reason).toBe('Transferred to another school');
  });

  it('keeps a parent active while another linked child remains active', async () => {
    const fixture = await createLifecycleFixture({ includeSecondStudent: true });
    await prisma.parentStudent.create({
      data: {
        parentId: fixture.parentId,
        studentId: fixture.secondStudentId,
        relationship: 'parent',
      },
    });

    const result = await lifecycleService.leaveStudent(fixture.studentId, fixture.adminId, {
      reason: 'Student moved',
    });
    expect(result.archivedParentIds).toEqual([]);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: fixture.parentId } })).isArchived,
    ).toBe(false);
  });

  it('restores student, profile, guardian, parent, academic, and classroom state together', async () => {
    const fixture = await createLifecycleFixture();
    await lifecycleService.leaveStudent(fixture.studentId, fixture.adminId, {
      reason: 'Temporary withdrawal',
    });

    const restored = await lifecycleService.restoreStudent(fixture.studentId, fixture.adminId, {
      academicYearId: fixture.currentYearId,
      reason: 'Returned',
    });
    expect(restored).toMatchObject({ status: 'active', endedAt: null, exitReason: null });
    const [student, profile, guardian, parent, classroom, event] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: fixture.studentId } }),
      prisma.studentProfile.findUniqueOrThrow({ where: { userId: fixture.studentId } }),
      prisma.parentStudent.findUniqueOrThrow({
        where: {
          parentId_studentId: { parentId: fixture.parentId, studentId: fixture.studentId },
        },
      }),
      prisma.user.findUniqueOrThrow({ where: { id: fixture.parentId } }),
      prisma.classroomEnrollment.findUniqueOrThrow({
        where: {
          classroomId_studentId: {
            classroomId: fixture.classroomId,
            studentId: fixture.studentId,
          },
        },
      }),
      prisma.studentLifecycleEvent.findFirstOrThrow({
        where: { studentId: fixture.studentId, type: 'restored' },
      }),
    ]);
    expect(student.isArchived).toBe(false);
    expect(profile.isArchived).toBe(false);
    expect(profile.leftAt).toBeNull();
    expect(guardian.isActive).toBe(true);
    expect(guardian.endedAt).toBeNull();
    expect(parent.isArchived).toBe(false);
    expect(classroom.isActive).toBe(true);
    expect(classroom.endedAt).toBeNull();
    expect(event.reason).toBe('Returned');
  });

  it('rolls back every restore mutation when classroom capacity is exhausted', async () => {
    const fixture = await createLifecycleFixture({ classroomCapacity: 1 });
    await lifecycleService.leaveStudent(fixture.studentId, fixture.adminId, {
      reason: 'Temporary withdrawal',
    });
    const occupantId = fixture.id('capacity-occupant');
    await prisma.user.create({
      data: {
        id: occupantId,
        name: 'Capacity Occupant',
        email: `${occupantId}@test.local`,
        role: 'student',
        avatar: 'occupant.png',
        schoolId: fixture.schoolId,
        studentProfile: { create: { id: occupantId, streakDays: 0, xpPoints: 0 } },
        studentAcademicEnrollments: {
          create: {
            cohortId: fixture.cohortId,
            academicYearId: fixture.currentYearId,
            rollNumber: 2,
          },
        },
        enrollments: { create: { classroomId: fixture.classroomId } },
      },
    });

    await expect(
      lifecycleService.restoreStudent(fixture.studentId, fixture.adminId, {
        academicYearId: fixture.currentYearId,
      }),
    ).rejects.toMatchObject({ status: 409 });
    const [student, enrollment, guardian] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: fixture.studentId } }),
      prisma.studentAcademicEnrollment.findUniqueOrThrow({
        where: {
          studentId_academicYearId: {
            studentId: fixture.studentId,
            academicYearId: fixture.currentYearId,
          },
        },
      }),
      prisma.parentStudent.findUniqueOrThrow({
        where: {
          parentId_studentId: { parentId: fixture.parentId, studentId: fixture.studentId },
        },
      }),
    ]);
    expect(student.isArchived).toBe(true);
    expect(enrollment.status).toBe('left');
    expect(guardian.isActive).toBe(false);
    expect(
      await prisma.studentLifecycleEvent.count({
        where: { studentId: fixture.studentId, type: 'restored' },
      }),
    ).toBe(0);
  });

  it('blocks promotion without an official report card and leaves enrollment active', async () => {
    const fixture = await createLifecycleFixture();

    await expect(
      lifecycleService.promoteStudent(fixture.studentId, fixture.adminId, {
        targetAcademicYearId: fixture.nextYearId,
      }),
    ).rejects.toMatchObject({ status: 409 });
    const current = await prisma.studentAcademicEnrollment.findUniqueOrThrow({
      where: {
        studentId_academicYearId: {
          studentId: fixture.studentId,
          academicYearId: fixture.currentYearId,
        },
      },
    });
    expect(current.status).toBe('active');
    expect(
      await prisma.studentAcademicEnrollment.count({
        where: { studentId: fixture.studentId, academicYearId: fixture.nextYearId },
      }),
    ).toBe(0);
  });

  it('blocks report-card generation when no closed exam exists or marks are incomplete', async () => {
    const fixture = await createLifecycleFixture();
    await expect(
      lifecycleService.generateReportCard(fixture.studentId, fixture.currentYearId),
    ).rejects.toMatchObject({
      status: 409,
      message: 'No closed or finalized exam subjects exist for this student.',
    });
    await createReportPrerequisites(fixture);
    await expect(
      lifecycleService.generateReportCard(fixture.studentId, fixture.currentYearId),
    ).rejects.toMatchObject({ status: 409 });
    expect(
      await prisma.studentReportCard.count({
        where: { studentId: fixture.studentId, academicYearId: fixture.currentYearId },
      }),
    ).toBe(0);
  });

  it('uses absent marks as zero and excludes holidays from attendance percentage', async () => {
    const fixture = await createLifecycleFixture();
    const { examSubjectId } = await createReportPrerequisites(fixture);
    await prisma.examMark.create({
      data: {
        examSubjectId,
        studentId: fixture.studentId,
        marksObtained: null,
        isAbsent: true,
        submittedById: fixture.teacherId,
      },
    });
    await prisma.schoolHoliday.create({
      data: {
        schoolId: fixture.schoolId,
        academicYearId: fixture.currentYearId,
        name: 'Test Holiday',
        date: new Date('2024-06-01T00:00:00.000Z'),
      },
    });
    await prisma.attendanceRecord.createMany({
      data: [
        {
          id: fixture.id('attendance-holiday'),
          studentId: fixture.studentId,
          date: '2024-06-01',
          status: 'absent',
          markedById: fixture.teacherId,
        },
        {
          id: fixture.id('attendance-present'),
          studentId: fixture.studentId,
          date: '2024-06-02',
          status: 'present',
          markedById: fixture.teacherId,
        },
      ],
    });

    const report = await lifecycleService.generateReportCard(
      fixture.studentId,
      fixture.currentYearId,
    );
    expect(report.finalPercentage).toBe(0);
    expect(report.attendancePercentage).toBe(100);
    expect(report.result).toBe('retained');
    expect(report.subjects[0]).toMatchObject({ percentage: 0, grade: 'NG' });
  });

  it('promotes according to a passing report and enrolls the target cohort classrooms', async () => {
    const fixture = await createLifecycleFixture();
    await createReportPrerequisites(fixture, { marks: 80 });
    const report = await lifecycleService.generateReportCard(
      fixture.studentId,
      fixture.currentYearId,
    );
    expect(report.result).toBe('promoted');

    const result = await lifecycleService.promoteStudent(fixture.studentId, fixture.adminId, {
      targetAcademicYearId: fixture.nextYearId,
    });
    expect(result).toMatchObject({ status: 'promoted', classroomCount: 1 });
    const [oldEnrollment, newEnrollment, oldClass, newClass, event] = await Promise.all([
      prisma.studentAcademicEnrollment.findUniqueOrThrow({
        where: {
          studentId_academicYearId: {
            studentId: fixture.studentId,
            academicYearId: fixture.currentYearId,
          },
        },
      }),
      prisma.studentAcademicEnrollment.findUniqueOrThrow({
        where: {
          studentId_academicYearId: {
            studentId: fixture.studentId,
            academicYearId: fixture.nextYearId,
          },
        },
      }),
      prisma.classroomEnrollment.findUniqueOrThrow({
        where: {
          classroomId_studentId: {
            classroomId: fixture.classroomId,
            studentId: fixture.studentId,
          },
        },
      }),
      prisma.classroomEnrollment.findUniqueOrThrow({
        where: {
          classroomId_studentId: {
            classroomId: fixture.nextClassroomId,
            studentId: fixture.studentId,
          },
        },
      }),
      prisma.studentLifecycleEvent.findFirstOrThrow({
        where: { studentId: fixture.studentId, type: 'promoted' },
      }),
    ]);
    expect(oldEnrollment.status).toBe('promoted');
    expect(newEnrollment).toMatchObject({
      status: 'active',
      cohortId: fixture.nextCohortId,
    });
    expect(oldClass.isActive).toBe(false);
    expect(newClass.isActive).toBe(true);
    expect(event.toCohortId).toBe(fixture.nextCohortId);
  });

  it('requires a documented reason when overriding the report result', async () => {
    const fixture = await createLifecycleFixture();
    await createReportPrerequisites(fixture, { marks: 80 });
    await lifecycleService.generateReportCard(fixture.studentId, fixture.currentYearId);

    await expect(
      lifecycleService.promoteStudent(fixture.studentId, fixture.adminId, {
        targetAcademicYearId: fixture.nextYearId,
        targetGradeLevel: 8,
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(
      (
        await prisma.studentAcademicEnrollment.findUniqueOrThrow({
          where: {
            studentId_academicYearId: {
              studentId: fixture.studentId,
              academicYearId: fixture.currentYearId,
            },
          },
        })
      ).status,
    ).toBe('active');
  });

  it('retains a failing student in the same grade for the next year', async () => {
    const fixture = await createLifecycleFixture();
    await createReportPrerequisites(fixture, { marks: 35 });
    const report = await lifecycleService.generateReportCard(
      fixture.studentId,
      fixture.currentYearId,
    );
    expect(report.result).toBe('retained');

    const result = await lifecycleService.promoteStudent(fixture.studentId, fixture.adminId, {
      targetAcademicYearId: fixture.nextYearId,
    });
    expect(result.status).toBe('retained');
    const next = await prisma.studentAcademicEnrollment.findUniqueOrThrow({
      where: {
        studentId_academicYearId: {
          studentId: fixture.studentId,
          academicYearId: fixture.nextYearId,
        },
      },
      include: { cohort: true },
    });
    expect(next.cohort.gradeLevel).toBe(8);
    expect(
      await prisma.studentLifecycleEvent.count({
        where: { studentId: fixture.studentId, type: 'retained' },
      }),
    ).toBe(1);
  });

  it('graduates and archives the student and sole parent when configured terminal grade passes', async () => {
    const fixture = await createLifecycleFixture();
    await createReportPrerequisites(fixture, { marks: 90 });
    const report = await lifecycleService.generateReportCard(
      fixture.studentId,
      fixture.currentYearId,
      { graduationGrade: 8 },
    );
    expect(report.result).toBe('graduated');

    const result = await lifecycleService.promoteStudent(fixture.studentId, fixture.adminId, {});
    expect(result.status).toBe('graduated');
    const [student, parent, enrollment, link] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: fixture.studentId } }),
      prisma.user.findUniqueOrThrow({ where: { id: fixture.parentId } }),
      prisma.studentAcademicEnrollment.findUniqueOrThrow({
        where: {
          studentId_academicYearId: {
            studentId: fixture.studentId,
            academicYearId: fixture.currentYearId,
          },
        },
      }),
      prisma.parentStudent.findUniqueOrThrow({
        where: {
          parentId_studentId: { parentId: fixture.parentId, studentId: fixture.studentId },
        },
      }),
    ]);
    expect(student.isArchived).toBe(true);
    expect(parent.isArchived).toBe(true);
    expect(enrollment.status).toBe('graduated');
    expect(link.isActive).toBe(false);
  });
});
