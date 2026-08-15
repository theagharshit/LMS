import { describe, expect, it } from 'vitest';
import { lmsDB } from '../../src/db/lmsDatabase';
import { prisma } from '../../src/db/services/prismaClient';
import { createLifecycleFixture } from '../helpers/lifecycleFixtures';

describe.sequential('student and guardian enrollment workflow', () => {
  it('creates the student, new parent, placement, controls, preferences, classrooms, and event atomically', async () => {
    const fixture = await createLifecycleFixture();
    const secondClassroomId = fixture.id('classroom-science-8a');
    await prisma.classroom.create({
      data: {
        id: secondClassroomId,
        name: `Grade 8 Science ${fixture.suffix}`,
        schoolId: fixture.schoolId,
        subjectId: fixture.secondSubjectId,
        cohortId: fixture.cohortId,
        teacherId: fixture.teacherId,
        academicYearId: fixture.currentYearId,
        roomNumber: 'R-102',
        colorTheme: 'purple',
        bannerImage: 'science.png',
        code: `SCI-${fixture.suffix}`,
      },
    });
    const email = `${fixture.id('enrolled-student')}@test.local`;
    const parentEmail = `${fixture.id('new-parent')}@test.local`;

    const created = await lmsDB.addStudentProfile({
      createdById: fixture.adminId,
      name: 'Fully Enrolled Student',
      email,
      gradeLevel: 8,
      section: 'a',
      rollNumber: 7,
      parentName: 'New Enrollment Parent',
      parentEmail,
      parentPhone: '+977-9800000000',
      relationship: 'mother',
      admissionNumber: `ADM-NEW-${fixture.suffix}`,
    });

    const [student, profile, placement, classrooms, controls, preference, guardian, event] =
      await Promise.all([
        prisma.user.findUniqueOrThrow({ where: { id: created.id } }),
        prisma.studentProfile.findUniqueOrThrow({ where: { userId: created.id } }),
        prisma.studentAcademicEnrollment.findUniqueOrThrow({
          where: {
            studentId_academicYearId: {
              studentId: created.id,
              academicYearId: fixture.currentYearId,
            },
          },
        }),
        prisma.classroomEnrollment.findMany({ where: { studentId: created.id, isActive: true } }),
        prisma.parentControlSettings.findUniqueOrThrow({ where: { studentId: created.id } }),
        prisma.notificationPreference.findUniqueOrThrow({ where: { userId: created.id } }),
        prisma.parentStudent.findFirstOrThrow({
          where: { studentId: created.id },
          include: { parent: { include: { parentProfile: true } } },
        }),
        prisma.studentLifecycleEvent.findFirstOrThrow({
          where: { studentId: created.id, type: 'enrolled' },
        }),
      ]);
    expect(student).toMatchObject({
      role: 'student',
      schoolId: fixture.schoolId,
      isArchived: false,
    });
    expect(profile.admissionNumber).toBe(`ADM-NEW-${fixture.suffix}`);
    expect(placement).toMatchObject({
      cohortId: fixture.cohortId,
      academicYearId: fixture.currentYearId,
      rollNumber: 7,
      status: 'active',
    });
    expect(classrooms.map(({ classroomId }) => classroomId).sort()).toEqual(
      [fixture.classroomId, secondClassroomId].sort(),
    );
    expect(controls).toMatchObject({
      allowPeerDiscussion: false,
      requireApprovalForOutboundMsgs: true,
    });
    expect(preference).toMatchObject({
      enableAcademic: true,
      enableCommunication: true,
      enableReminders: true,
    });
    expect(guardian).toMatchObject({
      relationship: 'mother',
      isPrimary: true,
      parent: {
        email: parentEmail,
        role: 'parent',
        parentProfile: expect.objectContaining({ verificationStatus: 'pending' }),
      },
    });
    expect(event).toMatchObject({
      toCohortId: fixture.cohortId,
      academicYearId: fixture.currentYearId,
      createdById: fixture.adminId,
    });
  });

  it('reuses an existing parent identity for a sibling instead of duplicating it', async () => {
    const fixture = await createLifecycleFixture();
    const parent = await prisma.user.findUniqueOrThrow({ where: { id: fixture.parentId } });
    const parentCountBefore = await prisma.user.count({
      where: { schoolId: fixture.schoolId, role: 'parent' },
    });

    const created = await lmsDB.addStudentProfile({
      createdById: fixture.adminId,
      name: 'Sibling Student',
      email: `${fixture.id('sibling')}@test.local`,
      gradeLevel: 8,
      section: 'A',
      parentName: 'Updated Existing Parent',
      parentEmail: parent.email.toUpperCase(),
      parentPhone: '+977-9811111111',
    });
    expect(await prisma.user.count({ where: { schoolId: fixture.schoolId, role: 'parent' } })).toBe(
      parentCountBefore,
    );
    expect(
      await prisma.parentStudent.findUniqueOrThrow({
        where: { parentId_studentId: { parentId: fixture.parentId, studentId: created.id } },
      }),
    ).toMatchObject({ isActive: true, isPrimary: true });
    expect(await prisma.parentStudent.count({ where: { parentId: fixture.parentId } })).toBe(2);
    expect(await prisma.user.findUniqueOrThrow({ where: { id: fixture.parentId } })).toMatchObject({
      name: 'Updated Existing Parent',
      phone: '+977-9811111111',
    });
  });

  it('restores an archived existing parent when a new active child enrolls', async () => {
    const fixture = await createLifecycleFixture();
    const parent = await prisma.user.update({
      where: { id: fixture.parentId },
      data: { isArchived: true },
    });

    const created = await lmsDB.addStudentProfile({
      createdById: fixture.adminId,
      name: 'Returning Family Student',
      email: `${fixture.id('returning-family')}@test.local`,
      gradeLevel: 8,
      section: 'A',
      parentName: parent.name,
      parentEmail: parent.email,
    });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: parent.id } })).isArchived).toBe(
      false,
    );
    expect(
      await prisma.parentStudent.findUniqueOrThrow({
        where: { parentId_studentId: { parentId: parent.id, studentId: created.id } },
      }),
    ).toMatchObject({ isActive: true });
  });

  it('supports multiple normalized guardians with exactly the requested primary guardian', async () => {
    const fixture = await createLifecycleFixture();
    const primaryEmail = `${fixture.id('guardian-primary')}@test.local`;
    const secondaryEmail = `${fixture.id('guardian-secondary')}@test.local`;

    const created = await lmsDB.addStudentProfile({
      createdById: fixture.adminId,
      name: 'Multi Guardian Student',
      email: `${fixture.id('multi-guardian-student')}@test.local`,
      gradeLevel: 8,
      section: 'A',
      guardians: [
        {
          name: 'Primary Guardian',
          email: primaryEmail,
          relationship: 'mother',
          isPrimary: true,
        },
        {
          name: 'Secondary Guardian',
          email: secondaryEmail,
          relationship: 'father',
          isPrimary: false,
        },
      ],
    });
    const links = await prisma.parentStudent.findMany({
      where: { studentId: created.id },
      include: { parent: true },
      orderBy: { isPrimary: 'desc' },
    });
    expect(links).toHaveLength(2);
    expect(links.filter(({ isPrimary }) => isPrimary)).toHaveLength(1);
    expect(links[0]).toMatchObject({
      isPrimary: true,
      relationship: 'mother',
      parent: expect.objectContaining({ email: primaryEmail }),
    });
    expect(links[1]).toMatchObject({
      isPrimary: false,
      relationship: 'father',
      parent: expect.objectContaining({ email: secondaryEmail }),
    });
  });

  it.each([
    ['missing guardian', { guardians: [] }, 'At least one parent or guardian is required'],
    ['zero roll', { rollNumber: 0 }, 'Roll number must be a positive integer'],
    ['negative roll', { rollNumber: -1 }, 'Roll number must be a positive integer'],
    ['decimal roll', { rollNumber: 1.5 }, 'Roll number must be a positive integer'],
    ['taken roll', { rollNumber: 1 }, 'already exists in this cohort'],
  ])('rolls back the entire enrollment for %s', async (_label, override, message) => {
    const fixture = await createLifecycleFixture();
    const email = `${fixture.id(`invalid-${_label}`)}@test.local`;
    const parentEmail = `${fixture.id(`invalid-parent-${_label}`)}@test.local`;

    await expect(
      lmsDB.addStudentProfile({
        createdById: fixture.adminId,
        name: 'Invalid Enrollment Student',
        email,
        gradeLevel: 8,
        section: 'A',
        parentName: 'Rollback Parent',
        parentEmail,
        ...override,
      }),
    ).rejects.toThrow(message);
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
    expect(await prisma.user.findUnique({ where: { email: parentEmail } })).toBeNull();
  });

  it('rejects a guardian email owned by another role and rolls back the student', async () => {
    const fixture = await createLifecycleFixture();
    const teacher = await prisma.user.findUniqueOrThrow({ where: { id: fixture.teacherId } });
    const email = `${fixture.id('bad-guardian-student')}@test.local`;

    await expect(
      lmsDB.addStudentProfile({
        createdById: fixture.adminId,
        name: 'Bad Guardian Student',
        email,
        gradeLevel: 8,
        section: 'A',
        parentName: teacher.name,
        parentEmail: teacher.email,
      }),
    ).rejects.toThrow('Guardian email belongs to an incompatible account.');
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  });

  it('rejects a duplicate student identity without changing the existing account', async () => {
    const fixture = await createLifecycleFixture();
    const before = await prisma.user.findUniqueOrThrow({ where: { id: fixture.studentId } });

    await expect(
      lmsDB.addStudentProfile({
        createdById: fixture.adminId,
        name: 'Duplicate Student',
        email: before.email.toUpperCase(),
        gradeLevel: 8,
        section: 'A',
        parentName: 'Duplicate Parent',
        parentEmail: `${fixture.id('duplicate-parent')}@test.local`,
      }),
    ).rejects.toThrow('Student email is already registered.');
    expect(await prisma.user.findUniqueOrThrow({ where: { id: fixture.studentId } })).toEqual(
      before,
    );
  });

  it('rejects an academic year from another school instead of silently choosing a default', async () => {
    const fixture = await createLifecycleFixture();
    const other = await createLifecycleFixture();
    const email = `${fixture.id('wrong-year-student')}@test.local`;

    await expect(
      lmsDB.addStudentProfile({
        createdById: fixture.adminId,
        academicYearId: other.currentYearId,
        name: 'Wrong Year Student',
        email,
        gradeLevel: 8,
        section: 'A',
        parentName: 'Wrong Year Parent',
        parentEmail: `${fixture.id('wrong-year-parent')}@test.local`,
      }),
    ).rejects.toThrow('Academic year not found for this school.');
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  });

  it('rolls back student and newly created guardian when any cohort classroom is full', async () => {
    const fixture = await createLifecycleFixture({ classroomCapacity: 1 });
    const email = `${fixture.id('capacity-student')}@test.local`;
    const parentEmail = `${fixture.id('capacity-parent')}@test.local`;

    await expect(
      lmsDB.addStudentProfile({
        createdById: fixture.adminId,
        name: 'Capacity Student',
        email,
        gradeLevel: 8,
        section: 'A',
        parentName: 'Capacity Parent',
        parentEmail,
      }),
    ).rejects.toThrow('has reached capacity');
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
    expect(await prisma.user.findUnique({ where: { email: parentEmail } })).toBeNull();
    expect(
      await prisma.studentAcademicEnrollment.count({
        where: { academicYearId: fixture.currentYearId, cohortId: fixture.cohortId },
      }),
    ).toBe(1);
  });
});
