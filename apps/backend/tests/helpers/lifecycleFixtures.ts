import { prisma } from '../../src/db/services/prismaClient';

let fixtureSequence = 0;

export type LifecycleFixture = Awaited<ReturnType<typeof createLifecycleFixture>>;

export async function createLifecycleFixture(
  options: {
    classroomCapacity?: number;
    includeSecondStudent?: boolean;
  } = {},
) {
  const suffix = `${process.pid}-${Date.now()}-${++fixtureSequence}`;
  const id = (name: string) => `spec-${name}-${suffix}`;
  const schoolId = id('school');
  const currentYearId = id('year-current');
  const nextYearId = id('year-next');
  const cohortId = id('cohort-8a');
  const nextCohortId = id('cohort-9a');
  const subjectId = id('subject-math');
  const secondSubjectId = id('subject-science');
  const adminId = id('admin');
  const teacherId = id('teacher');
  const replacementTeacherId = id('replacement');
  const studentId = id('student');
  const secondStudentId = id('student-two');
  const parentId = id('parent');
  const classroomId = id('classroom-8a');
  const nextClassroomId = id('classroom-9a');

  await prisma.$transaction(async (tx) => {
    await tx.school.create({
      data: { id: schoolId, name: `Lifecycle Test School ${suffix}` },
    });
    await tx.academicYear.createMany({
      data: [
        {
          id: currentYearId,
          schoolId,
          name: `2024-${suffix}`,
          startsAt: new Date('2024-01-01T00:00:00.000Z'),
          endsAt: new Date('2024-12-31T00:00:00.000Z'),
          isActive: true,
        },
        {
          id: nextYearId,
          schoolId,
          name: `2025-${suffix}`,
          startsAt: new Date('2025-01-01T00:00:00.000Z'),
          endsAt: new Date('2025-12-31T00:00:00.000Z'),
        },
      ],
    });
    await tx.academicCohort.createMany({
      data: [
        { id: cohortId, schoolId, gradeLevel: 8, section: 'A' },
        { id: nextCohortId, schoolId, gradeLevel: 9, section: 'A' },
      ],
    });
    await tx.subject.createMany({
      data: [
        { id: subjectId, schoolId, name: `Mathematics ${suffix}`, code: `M-${suffix}` },
        { id: secondSubjectId, schoolId, name: `Science ${suffix}`, code: `S-${suffix}` },
      ],
    });
    await tx.user.createMany({
      data: [
        {
          id: adminId,
          name: 'Lifecycle Admin',
          email: `${adminId}@test.local`,
          role: 'admin',
          avatar: 'admin.png',
          schoolId,
        },
        {
          id: teacherId,
          name: 'Lifecycle Teacher',
          email: `${teacherId}@test.local`,
          role: 'teacher',
          avatar: 'teacher.png',
          schoolId,
        },
        {
          id: replacementTeacherId,
          name: 'Replacement Teacher',
          email: `${replacementTeacherId}@test.local`,
          role: 'teacher',
          avatar: 'replacement.png',
          schoolId,
        },
        {
          id: studentId,
          name: 'Lifecycle Student',
          email: `${studentId}@test.local`,
          role: 'student',
          avatar: 'student.png',
          schoolId,
        },
        {
          id: parentId,
          name: 'Lifecycle Parent',
          email: `${parentId}@test.local`,
          role: 'parent',
          avatar: 'parent.png',
          schoolId,
        },
        ...(options.includeSecondStudent
          ? [
              {
                id: secondStudentId,
                name: 'Second Lifecycle Student',
                email: `${secondStudentId}@test.local`,
                role: 'student' as const,
                avatar: 'student-two.png',
                schoolId,
              },
            ]
          : []),
      ],
    });
    await tx.studentProfile.create({
      data: {
        id: studentId,
        userId: studentId,
        streakDays: 0,
        xpPoints: 0,
        admissionNumber: `ADM-${suffix}`,
      },
    });
    if (options.includeSecondStudent) {
      await tx.studentProfile.create({
        data: { id: secondStudentId, userId: secondStudentId, streakDays: 0, xpPoints: 0 },
      });
    }
    await tx.parentProfile.create({ data: { id: parentId, userId: parentId } });
    await tx.teacherProfile.createMany({
      data: [
        { id: teacherId, userId: teacherId, employeeNumber: `EMP-${suffix}` },
        {
          id: replacementTeacherId,
          userId: replacementTeacherId,
          employeeNumber: `REP-${suffix}`,
        },
      ],
    });
    await tx.parentStudent.create({
      data: { parentId, studentId, relationship: 'parent', isPrimary: true },
    });
    await tx.teacherSubject.createMany({
      data: [
        { teacherId, subjectId },
        { teacherId: replacementTeacherId, subjectId },
      ],
    });
    await tx.classroom.createMany({
      data: [
        {
          id: classroomId,
          name: `Grade 8 Mathematics ${suffix}`,
          schoolId,
          subjectId,
          cohortId,
          teacherId,
          academicYearId: currentYearId,
          roomNumber: 'R-101',
          colorTheme: 'blue',
          bannerImage: 'banner.png',
          code: `C8-${suffix}`,
          maxCapacity: options.classroomCapacity ?? 40,
        },
        {
          id: nextClassroomId,
          name: `Grade 9 Mathematics ${suffix}`,
          schoolId,
          subjectId,
          cohortId: nextCohortId,
          teacherId,
          academicYearId: nextYearId,
          roomNumber: 'R-201',
          colorTheme: 'green',
          bannerImage: 'banner-next.png',
          code: `C9-${suffix}`,
          maxCapacity: options.classroomCapacity ?? 40,
        },
      ],
    });
    await tx.teachingAssignment.createMany({
      data: [
        { teacherId, classroomId, subjectId, academicYearId: currentYearId },
        { teacherId, classroomId: nextClassroomId, subjectId, academicYearId: nextYearId },
      ],
    });
    await tx.studentAcademicEnrollment.create({
      data: { studentId, cohortId, academicYearId: currentYearId, rollNumber: 1 },
    });
    if (options.includeSecondStudent) {
      await tx.studentAcademicEnrollment.create({
        data: {
          studentId: secondStudentId,
          cohortId,
          academicYearId: currentYearId,
          rollNumber: 2,
        },
      });
    }
    await tx.classroomEnrollment.create({ data: { classroomId, studentId } });
    if (options.includeSecondStudent) {
      await tx.classroomEnrollment.create({ data: { classroomId, studentId: secondStudentId } });
    }
  });

  return {
    suffix,
    id,
    schoolId,
    currentYearId,
    nextYearId,
    cohortId,
    nextCohortId,
    subjectId,
    secondSubjectId,
    adminId,
    teacherId,
    replacementTeacherId,
    studentId,
    secondStudentId,
    parentId,
    classroomId,
    nextClassroomId,
  };
}

export async function createReportPrerequisites(
  fixture: LifecycleFixture,
  options: { marks?: number; totalMarks?: number; examStatus?: 'marks_closed' | 'finalized' } = {},
) {
  const totalMarks = options.totalMarks ?? 100;
  const examId = fixture.id('exam');
  const examSubjectId = fixture.id('exam-subject');
  await prisma.exam.create({
    data: {
      id: examId,
      schoolId: fixture.schoolId,
      academicYearId: fixture.currentYearId,
      name: `Final Exam ${fixture.suffix}`,
      startsAt: new Date('2024-10-01T00:00:00.000Z'),
      endsAt: new Date('2024-10-10T00:00:00.000Z'),
      status: options.examStatus ?? 'marks_closed',
      subjects: {
        create: {
          id: examSubjectId,
          subjectId: fixture.subjectId,
          classroomId: fixture.classroomId,
          totalMarks,
          passMarks: totalMarks * 0.4,
        },
      },
    },
  });
  if (options.marks !== undefined) {
    await prisma.examMark.create({
      data: {
        examSubjectId,
        studentId: fixture.studentId,
        marksObtained: options.marks,
        submittedById: fixture.teacherId,
      },
    });
  }
  return { examId, examSubjectId };
}
