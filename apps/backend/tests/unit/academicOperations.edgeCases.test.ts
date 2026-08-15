import { describe, expect, it } from 'vitest';
import { attendanceService } from '../../src/db/services/attendanceService';
import { lifecycleService } from '../../src/db/services/lifecycleService';
import { prisma } from '../../src/db/services/prismaClient';
import { createLifecycleFixture, createReportPrerequisites } from '../helpers/lifecycleFixtures';

const timetableInput = (fixture: Awaited<ReturnType<typeof createLifecycleFixture>>) => ({
  academicYearId: fixture.currentYearId,
  classroomId: fixture.classroomId,
  dayOfWeek: 1,
  periodNumber: 1,
  startTime: '09:00',
  endTime: '09:45',
  roomNumber: 'R-101',
  requiredBooks: 'Mathematics textbook',
});

describe.sequential('academic operations edge cases', () => {
  it.each([
    [{ dayOfWeek: -1 }, 'dayOfWeek must be between 0 and 6.'],
    [{ dayOfWeek: 7 }, 'dayOfWeek must be between 0 and 6.'],
    [{ periodNumber: 0 }, 'periodNumber must be between 1 and 20.'],
    [{ periodNumber: 21 }, 'periodNumber must be between 1 and 20.'],
    [{ startTime: '9:00' }, 'Times must use HH:mm format.'],
    [{ endTime: '08:59' }, 'endTime must be after startTime.'],
  ])('validates timetable boundary %j', async (override, message) => {
    const fixture = await createLifecycleFixture();

    await expect(
      lifecycleService.upsertTimetableSlot(fixture.adminId, {
        ...timetableInput(fixture),
        ...override,
      }),
    ).rejects.toMatchObject({ status: 400, message });
    expect(await prisma.timetableSlot.count({ where: { schoolId: fixture.schoolId } })).toBe(0);
  });

  it('detects teacher, cohort, and room timetable conflicts', async () => {
    const fixture = await createLifecycleFixture();
    const slot = await lifecycleService.upsertTimetableSlot(
      fixture.adminId,
      timetableInput(fixture),
    );
    const validation = await lifecycleService.validateTimetableClash(fixture.adminId, {
      academicYearId: fixture.currentYearId,
      dayOfWeek: 1,
      periodNumber: 1,
      teacherId: fixture.teacherId,
      cohortId: fixture.cohortId,
      roomNumber: 'R-101',
    });
    expect(validation.valid).toBe(false);
    expect(validation.conflicts.map(({ id }) => id)).toContain(slot.id);

    await expect(
      lifecycleService.upsertTimetableSlot(fixture.adminId, {
        ...timetableInput(fixture),
        teacherId: fixture.replacementTeacherId,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('archives timetable slots without deleting history or returning them in active lists', async () => {
    const fixture = await createLifecycleFixture();
    const slot = await lifecycleService.upsertTimetableSlot(
      fixture.adminId,
      timetableInput(fixture),
    );

    await lifecycleService.archiveTimetableSlot(fixture.adminId, slot.id);
    expect(
      (await prisma.timetableSlot.findUniqueOrThrow({ where: { id: slot.id } })).isArchived,
    ).toBe(true);
    expect(
      (await lifecycleService.listTimetable(fixture.adminId)).some(({ id }) => id === slot.id),
    ).toBe(false);
  });

  it('rolls back day-schedule replacement if a new period is invalid', async () => {
    const fixture = await createLifecycleFixture();
    const original = await lifecycleService.upsertTimetableSlot(
      fixture.adminId,
      timetableInput(fixture),
    );

    await expect(
      lifecycleService.replaceTeacherDaySchedule(
        fixture.adminId,
        1,
        [
          {
            classroomId: fixture.classroomId,
            periodNumber: 2,
            startTime: '10:00',
            endTime: '09:00',
          },
        ],
        fixture.teacherId,
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(
      (await prisma.timetableSlot.findUniqueOrThrow({ where: { id: original.id } })).isArchived,
    ).toBe(false);
  });

  it('upserts subjects by natural school/name key and restores archived subjects', async () => {
    const fixture = await createLifecycleFixture();
    const created = await lifecycleService.upsertSubject(fixture.adminId, {
      name: `History ${fixture.suffix}`,
      code: 'HIS',
    });
    await prisma.subject.update({ where: { id: created.id }, data: { isArchived: true } });

    const restored = await lifecycleService.upsertSubject(fixture.adminId, {
      name: `History ${fixture.suffix}`,
      code: 'HST',
    });
    expect(restored).toMatchObject({ id: created.id, code: 'HST', isArchived: false });
    expect(
      (await lifecycleService.listSubjects(fixture.adminId)).filter(({ id }) => id === created.id),
    ).toHaveLength(1);
  });

  it('blocks subject archival while active classrooms reference it', async () => {
    const fixture = await createLifecycleFixture();

    await expect(
      lifecycleService.archiveSubject(fixture.adminId, fixture.subjectId),
    ).rejects.toMatchObject({ status: 409 });
    expect(
      (await prisma.subject.findUniqueOrThrow({ where: { id: fixture.subjectId } })).isArchived,
    ).toBe(false);
  });

  it('validates term dates, sequence uniqueness, and replacement uniqueness', async () => {
    const fixture = await createLifecycleFixture();
    await expect(
      lifecycleService.upsertTerm(fixture.adminId, {
        academicYearId: fixture.currentYearId,
        name: 'Outside year',
        sequence: 1,
        startsAt: '2023-12-01',
        endsAt: '2024-02-01',
      }),
    ).rejects.toMatchObject({ status: 400 });
    await lifecycleService.upsertTerm(fixture.adminId, {
      academicYearId: fixture.currentYearId,
      name: 'Term 1',
      sequence: 1,
      startsAt: '2024-01-01',
      endsAt: '2024-04-30',
    });
    await expect(
      lifecycleService.upsertTerm(fixture.adminId, {
        academicYearId: fixture.currentYearId,
        name: 'Another term',
        sequence: 1,
      }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      lifecycleService.replaceTerms(fixture.adminId, fixture.currentYearId, [
        { name: 'Duplicate', sequence: 1 },
        { name: 'duplicate', sequence: 2 },
      ]),
    ).rejects.toMatchObject({ status: 400 });
    expect(await lifecycleService.listTerms(fixture.adminId, fixture.currentYearId)).toHaveLength(
      1,
    );
  });

  it('upserts holidays by school/date and rejects dates outside the year', async () => {
    const fixture = await createLifecycleFixture();
    const first = await lifecycleService.createHoliday(fixture.adminId, {
      academicYearId: fixture.currentYearId,
      name: 'Original Holiday',
      date: '2024-08-01',
    });
    const updated = await lifecycleService.createHoliday(fixture.adminId, {
      academicYearId: fixture.currentYearId,
      name: 'Updated Holiday',
      date: '2024-08-01',
      description: 'One normalized row',
    });
    expect(updated).toMatchObject({ id: first.id, name: 'Updated Holiday' });
    expect(
      await prisma.schoolHoliday.count({
        where: { schoolId: fixture.schoolId, date: new Date('2024-08-01T00:00:00.000Z') },
      }),
    ).toBe(1);
    await expect(
      lifecycleService.createHoliday(fixture.adminId, {
        academicYearId: fixture.currentYearId,
        name: 'Outside',
        date: '2025-01-01',
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('prevents attendance on an active school holiday', async () => {
    const fixture = await createLifecycleFixture();
    await lifecycleService.createHoliday(fixture.adminId, {
      academicYearId: fixture.currentYearId,
      name: 'No Attendance Day',
      date: '2024-09-15',
    });

    await expect(
      attendanceService.markAttendance(
        fixture.studentId,
        '2024-09-15',
        'present',
        undefined,
        fixture.teacherId,
      ),
    ).rejects.toThrow('Attendance cannot be marked on the school holiday: No Attendance Day.');
    expect(
      await prisma.attendanceRecord.count({
        where: { studentId: fixture.studentId, date: '2024-09-15' },
      }),
    ).toBe(0);
  });

  it('rolls back bell-schedule replacement when any entry is invalid', async () => {
    const fixture = await createLifecycleFixture();
    const [original] = await lifecycleService.replaceBellSchedule(
      fixture.adminId,
      fixture.currentYearId,
      [{ name: 'Period 1', type: 'class', sequence: 1, startTime: '09:00', endTime: '09:45' }],
    );

    await expect(
      lifecycleService.replaceBellSchedule(fixture.adminId, fixture.currentYearId, [
        { name: 'Period 2', type: 'class', sequence: 1, startTime: 'invalid', endTime: '10:45' },
      ]),
    ).rejects.toMatchObject({ status: 400 });
    expect(
      (await prisma.bellScheduleEntry.findUniqueOrThrow({ where: { id: original.id } })).isArchived,
    ).toBe(false);
  });

  it.each([
    [{ subjects: [] }, 'At least one exam subject is required.'],
    [{ subjects: [{ totalMarks: 0, passMarks: 0 }] }, 'Exam marks and pass marks are invalid.'],
    [{ subjects: [{ totalMarks: 100, passMarks: 101 }] }, 'Exam marks and pass marks are invalid.'],
    [
      { subjects: [{ startTime: '09:00', endTime: undefined }] },
      'Both exam start and end times are required.',
    ],
    [
      { subjects: [{ startTime: '10:00', endTime: '09:00' }] },
      'Exam end time must be after its start time.',
    ],
    [
      { subjects: [{ examDate: '2024-11-01' }] },
      'Every subject exam date must be inside the exam date range.',
    ],
  ])('validates exam edge case %#', async (override, message) => {
    const fixture = await createLifecycleFixture();
    type ExamSubjectInput = {
      subjectId: string;
      classroomId?: string;
      examDate?: string;
      startTime?: string;
      endTime?: string;
      totalMarks: number;
      passMarks: number;
    };
    const baseSubject: ExamSubjectInput = {
      subjectId: fixture.subjectId,
      classroomId: fixture.classroomId,
      examDate: '2024-10-05',
      startTime: '09:00',
      endTime: '10:00',
      totalMarks: 100,
      passMarks: 40,
    };
    const overrideSubjects = override.subjects as Array<Partial<ExamSubjectInput>> | undefined;
    const subjects: ExamSubjectInput[] = overrideSubjects
      ? overrideSubjects.map((subject) => ({ ...baseSubject, ...subject }))
      : [baseSubject];

    await expect(
      lifecycleService.createExam(fixture.adminId, {
        academicYearId: fixture.currentYearId,
        name: 'Validated Exam',
        startsAt: '2024-10-01',
        endsAt: '2024-10-10',
        subjects,
      }),
    ).rejects.toMatchObject({ status: 400, message });
    expect(await prisma.exam.count({ where: { schoolId: fixture.schoolId } })).toBe(0);
  });

  it('rejects duplicate exam subject/classroom combinations atomically', async () => {
    const fixture = await createLifecycleFixture();
    const subject = {
      subjectId: fixture.subjectId,
      classroomId: fixture.classroomId,
      totalMarks: 100,
      passMarks: 40,
    };

    await expect(
      lifecycleService.createExam(fixture.adminId, {
        academicYearId: fixture.currentYearId,
        name: 'Duplicate Subject Exam',
        startsAt: '2024-10-01',
        endsAt: '2024-10-10',
        subjects: [subject, subject],
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(await prisma.exam.count({ where: { schoolId: fixture.schoolId } })).toBe(0);
  });

  it('enforces marks-open state, teacher assignment, enrolled students, uniqueness, and bounds', async () => {
    const fixture = await createLifecycleFixture({ includeSecondStudent: true });
    const exam = await lifecycleService.createExam(fixture.adminId, {
      academicYearId: fixture.currentYearId,
      name: 'Marks Validation Exam',
      startsAt: '2024-10-01',
      endsAt: '2024-10-10',
      status: 'draft',
      subjects: [
        {
          subjectId: fixture.subjectId,
          classroomId: fixture.classroomId,
          totalMarks: 100,
          passMarks: 40,
        },
      ],
    });
    const examSubjectId = exam.subjects[0].id;
    await expect(
      lifecycleService.submitExamMarks(examSubjectId, fixture.teacherId, 'teacher', [
        { studentId: fixture.studentId, marksObtained: 80 },
      ]),
    ).rejects.toMatchObject({ status: 409 });
    await lifecycleService.updateExamStatus(fixture.adminId, exam.id, 'published');
    await lifecycleService.updateExamStatus(fixture.adminId, exam.id, 'marks_open');
    await expect(
      lifecycleService.submitExamMarks(examSubjectId, fixture.replacementTeacherId, 'teacher', [
        { studentId: fixture.studentId, marksObtained: 80 },
      ]),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      lifecycleService.submitExamMarks(examSubjectId, fixture.teacherId, 'teacher', [
        { studentId: fixture.studentId, marksObtained: 80 },
        { studentId: fixture.studentId, marksObtained: 90 },
      ]),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      lifecycleService.submitExamMarks(examSubjectId, fixture.teacherId, 'teacher', [
        { studentId: fixture.studentId, marksObtained: 101 },
      ]),
    ).rejects.toMatchObject({ status: 400 });
    expect(await prisma.examMark.count({ where: { examSubjectId } })).toBe(0);
  });

  it('upserts marks, records absent students, and blocks closing incomplete marks', async () => {
    const fixture = await createLifecycleFixture({ includeSecondStudent: true });
    const exam = await lifecycleService.createExam(fixture.adminId, {
      academicYearId: fixture.currentYearId,
      name: 'Marks Completion Exam',
      startsAt: '2024-10-01',
      endsAt: '2024-10-10',
      status: 'marks_open',
      subjects: [
        {
          subjectId: fixture.subjectId,
          classroomId: fixture.classroomId,
          totalMarks: 100,
          passMarks: 40,
        },
      ],
    });
    const examSubjectId = exam.subjects[0].id;
    await lifecycleService.submitExamMarks(examSubjectId, fixture.teacherId, 'teacher', [
      { studentId: fixture.studentId, marksObtained: 70 },
    ]);
    await expect(
      lifecycleService.updateExamStatus(fixture.adminId, exam.id, 'marks_closed'),
    ).rejects.toMatchObject({ status: 409 });
    await lifecycleService.submitExamMarks(examSubjectId, fixture.teacherId, 'teacher', [
      { studentId: fixture.studentId, marksObtained: 75 },
      { studentId: fixture.secondStudentId, isAbsent: true },
    ]);
    expect(await prisma.examMark.count({ where: { examSubjectId } })).toBe(2);
    expect(
      await prisma.examMark.findUniqueOrThrow({
        where: {
          examSubjectId_studentId: { examSubjectId, studentId: fixture.studentId },
        },
      }),
    ).toMatchObject({ marksObtained: 75, isAbsent: false });
    expect(
      await prisma.examMark.findUniqueOrThrow({
        where: {
          examSubjectId_studentId: {
            examSubjectId,
            studentId: fixture.secondStudentId,
          },
        },
      }),
    ).toMatchObject({ marksObtained: null, isAbsent: true });
    expect(
      (await lifecycleService.updateExamStatus(fixture.adminId, exam.id, 'marks_closed')).status,
    ).toBe('marks_closed');
  });

  it('rejects invalid exam status transitions', async () => {
    const fixture = await createLifecycleFixture();
    const { examId } = await createReportPrerequisites(fixture, { marks: 80 });

    await expect(
      lifecycleService.updateExamStatus(fixture.adminId, examId, 'published'),
    ).rejects.toMatchObject({ status: 409 });
    await lifecycleService.updateExamStatus(fixture.adminId, examId, 'finalized');
    await expect(
      lifecycleService.updateExamStatus(fixture.adminId, examId, 'marks_open'),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('blocks rollover until every active student has complete report data', async () => {
    const fixture = await createLifecycleFixture();

    await expect(
      lifecycleService.rolloverAcademicYear(fixture.adminId, {
        fromAcademicYearId: fixture.currentYearId,
        toAcademicYearId: fixture.nextYearId,
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(
      (await prisma.academicYear.findUniqueOrThrow({ where: { id: fixture.currentYearId } }))
        .isActive,
    ).toBe(true);
    expect(
      (await prisma.classroom.findUniqueOrThrow({ where: { id: fixture.classroomId } })).isArchived,
    ).toBe(false);
  });

  it('rolls over complete students and finalizes source academic entities atomically', async () => {
    const fixture = await createLifecycleFixture();
    const { examId } = await createReportPrerequisites(fixture, { marks: 85 });

    const result = await lifecycleService.rolloverAcademicYear(fixture.adminId, {
      fromAcademicYearId: fixture.currentYearId,
      toAcademicYearId: fixture.nextYearId,
    });
    expect(result).toMatchObject({ processed: 1, succeeded: 1, failed: 0, finalized: true });
    const [sourceYear, targetYear, sourceClassroom, exam, nextEnrollment] = await Promise.all([
      prisma.academicYear.findUniqueOrThrow({ where: { id: fixture.currentYearId } }),
      prisma.academicYear.findUniqueOrThrow({ where: { id: fixture.nextYearId } }),
      prisma.classroom.findUniqueOrThrow({ where: { id: fixture.classroomId } }),
      prisma.exam.findUniqueOrThrow({ where: { id: examId } }),
      prisma.studentAcademicEnrollment.findUniqueOrThrow({
        where: {
          studentId_academicYearId: {
            studentId: fixture.studentId,
            academicYearId: fixture.nextYearId,
          },
        },
      }),
    ]);
    expect(sourceYear.isActive).toBe(false);
    expect(targetYear.isActive).toBe(true);
    expect(sourceClassroom.isArchived).toBe(true);
    expect(exam.status).toBe('archived');
    expect(nextEnrollment.status).toBe('active');
  });

  it('requires a replacement before archiving a teacher with active work', async () => {
    const fixture = await createLifecycleFixture();

    await expect(
      lifecycleService.archiveTeacher(fixture.teacherId, fixture.adminId, {
        reason: 'Teacher resigned',
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: fixture.teacherId } })).isArchived,
    ).toBe(false);
  });

  it('rejects self replacement and cross-school replacement', async () => {
    const fixture = await createLifecycleFixture();
    await expect(
      lifecycleService.archiveTeacher(fixture.teacherId, fixture.adminId, {
        replacementTeacherId: fixture.teacherId,
        reason: 'Invalid self replacement',
      }),
    ).rejects.toMatchObject({ status: 400 });

    const other = await createLifecycleFixture();
    await expect(
      lifecycleService.archiveTeacher(fixture.teacherId, fixture.adminId, {
        replacementTeacherId: other.replacementTeacherId,
        reason: 'Invalid school replacement',
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('rolls back teacher archival when the replacement has a timetable clash', async () => {
    const fixture = await createLifecycleFixture();
    await lifecycleService.upsertTimetableSlot(fixture.adminId, timetableInput(fixture));
    await prisma.timetableSlot.create({
      data: {
        schoolId: fixture.schoolId,
        academicYearId: fixture.currentYearId,
        classroomId: fixture.nextClassroomId,
        cohortId: fixture.nextCohortId,
        subjectId: fixture.subjectId,
        teacherId: fixture.replacementTeacherId,
        dayOfWeek: 1,
        periodNumber: 1,
        startTime: '09:00',
        endTime: '09:45',
        roomNumber: 'R-201',
      },
    });

    await expect(
      lifecycleService.archiveTeacher(fixture.teacherId, fixture.adminId, {
        replacementTeacherId: fixture.replacementTeacherId,
        reason: 'Would clash',
      }),
    ).rejects.toMatchObject({ status: 409 });
    const [teacher, classroom, assignment] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: fixture.teacherId } }),
      prisma.classroom.findUniqueOrThrow({ where: { id: fixture.classroomId } }),
      prisma.teachingAssignment.findFirstOrThrow({
        where: { classroomId: fixture.classroomId, teacherId: fixture.teacherId },
      }),
    ]);
    expect(teacher.isArchived).toBe(false);
    expect(classroom.teacherId).toBe(fixture.teacherId);
    expect(assignment.isActive).toBe(true);
  });

  it('archives a teacher while transferring classes, subjects, assignments, and timetable', async () => {
    const fixture = await createLifecycleFixture();
    const slot = await lifecycleService.upsertTimetableSlot(
      fixture.adminId,
      timetableInput(fixture),
    );

    const result = await lifecycleService.archiveTeacher(fixture.teacherId, fixture.adminId, {
      replacementTeacherId: fixture.replacementTeacherId,
      reason: 'Teacher resigned',
    });
    expect(result).toMatchObject({
      teacherId: fixture.teacherId,
      replacementTeacherId: fixture.replacementTeacherId,
      archived: true,
    });
    const [teacher, profile, classrooms, oldAssignments, replacementAssignments, movedSlot] =
      await Promise.all([
        prisma.user.findUniqueOrThrow({ where: { id: fixture.teacherId } }),
        prisma.teacherProfile.findUniqueOrThrow({ where: { userId: fixture.teacherId } }),
        prisma.classroom.findMany({
          where: { id: { in: [fixture.classroomId, fixture.nextClassroomId] } },
        }),
        prisma.teachingAssignment.findMany({ where: { teacherId: fixture.teacherId } }),
        prisma.teachingAssignment.findMany({
          where: { teacherId: fixture.replacementTeacherId, isActive: true },
        }),
        prisma.timetableSlot.findUniqueOrThrow({ where: { id: slot.id } }),
      ]);
    expect(teacher.isArchived).toBe(true);
    expect(profile).toMatchObject({ employmentStatus: 'left' });
    expect(profile.leftAt).not.toBeNull();
    expect(classrooms.every(({ teacherId }) => teacherId === fixture.replacementTeacherId)).toBe(
      true,
    );
    expect(oldAssignments.every(({ isActive }) => !isActive)).toBe(true);
    expect(replacementAssignments).toHaveLength(2);
    expect(movedSlot.teacherId).toBe(fixture.replacementTeacherId);
    expect(
      await prisma.auditTrail.count({
        where: { changedBy: fixture.adminId, action: 'TEACHER_LEFT' },
      }),
    ).toBe(1);
  });

  it('returns teacher contacts, assigned subjects, timetable, and submitted marks from relations', async () => {
    const fixture = await createLifecycleFixture();
    await prisma.user.update({
      where: { id: fixture.teacherId },
      data: { phone: '+977-9800000000', secondaryPhone: '+977-9811111111' },
    });
    await lifecycleService.upsertTimetableSlot(fixture.adminId, timetableInput(fixture));
    const exam = await lifecycleService.createExam(fixture.adminId, {
      academicYearId: fixture.currentYearId,
      name: 'Teacher Lifecycle Exam',
      startsAt: '2024-10-01',
      endsAt: '2024-10-10',
      status: 'marks_open',
      subjects: [
        {
          subjectId: fixture.subjectId,
          classroomId: fixture.classroomId,
          totalMarks: 100,
          passMarks: 40,
        },
      ],
    });
    await lifecycleService.submitExamMarks(exam.subjects[0].id, fixture.teacherId, 'teacher', [
      { studentId: fixture.studentId, marksObtained: 88 },
    ]);

    const lifecycle = await lifecycleService.getTeacherLifecycle(
      fixture.teacherId,
      fixture.adminId,
    );
    expect(lifecycle).toMatchObject({
      id: fixture.teacherId,
      phone: '+977-9800000000',
      secondaryPhone: '+977-9811111111',
      teacherProfile: expect.objectContaining({ employmentStatus: 'active' }),
    });
    expect(lifecycle.teacherSubjects.map(({ subjectId }) => subjectId)).toContain(
      fixture.subjectId,
    );
    expect(lifecycle.teacherTeachingAssignments).toHaveLength(2);
    expect(lifecycle.timetableSlots).toHaveLength(1);
    expect(lifecycle.submittedExamMarks).toHaveLength(1);
    expect(lifecycle.submittedExamMarks[0]).toMatchObject({
      studentId: fixture.studentId,
      marksObtained: 88,
    });
  });
});
