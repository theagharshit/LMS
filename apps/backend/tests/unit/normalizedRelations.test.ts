import { describe, expect, it } from 'vitest';
import { assignmentService } from '../../src/db/services/assignmentService';
import { attendanceService } from '../../src/db/services/attendanceService';
import { classroomService } from '../../src/db/services/classroomService';
import { communicationService } from '../../src/db/services/communicationService';
import { locationService } from '../../src/db/services/locationService';
import { moduleService } from '../../src/db/services/moduleService';
import { notificationService } from '../../src/db/services/notificationService';
import { prisma } from '../../src/db/services/prismaClient';
import { quizService } from '../../src/db/services/quizService';
import { teacherAssignmentService } from '../../src/db/services/teacherAssignmentService';
import { createLifecycleFixture } from '../helpers/lifecycleFixtures';

describe.sequential('normalized lifecycle relations', () => {
  it('does not retain copied identity or placement columns', async () => {
    const copiedColumns = [
      ['StudentProfile', 'grade'],
      ['StudentProfile', 'section'],
      ['StudentProfile', 'rollNumber'],
      ['StreamPost', 'authorName'],
      ['StreamPost', 'authorAvatar'],
      ['StreamPost', 'authorRole'],
      ['PostComment', 'authorName'],
      ['PostComment', 'authorAvatar'],
      ['Submission', 'studentName'],
      ['Submission', 'studentAvatar'],
      ['AttendanceRecord', 'studentName'],
      ['AttendanceRecord', 'markedBy'],
      ['DirectMessage', 'senderName'],
      ['DirectMessage', 'senderRole'],
      ['DirectMessage', 'senderAvatar'],
      ['DirectMessage', 'receiverName'],
      ['StudentLocationRecord', 'studentName'],
      ['StudentLocationRecord', 'updatedBy'],
      ['StudentLocationRecord', 'updatedByRole'],
      ['NotificationRecord', 'senderName'],
      ['NotificationRecord', 'senderRole'],
      ['TeacherAssignmentAuditLog', 'actorName'],
      ['TeacherAssignmentAuditLog', 'actorRole'],
      ['TeacherAssignmentAuditLog', 'targetTeacherName'],
    ];

    const columns = await prisma.$queryRaw<Array<{ table_name: string; column_name: string }>>`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
    `;
    const existing = new Set(
      columns.map(({ table_name, column_name }) => `${table_name}.${column_name}`),
    );

    for (const [table, column] of copiedColumns) {
      expect(existing.has(`${table}.${column}`), `${table}.${column} should not exist`).toBe(false);
    }
    const calendarTables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'CalendarEvent'
    `;
    expect(calendarTables).toEqual([]);
  });

  it('enforces foreign keys for every normalized reference', async () => {
    const expectedConstraints = [
      'Assignment_createdById_fkey',
      'Quiz_createdById_fkey',
      'ModuleItem_createdById_fkey',
      'StreamPost_authorId_fkey',
      'PostComment_authorId_fkey',
      'Submission_studentId_fkey',
      'AttendanceRecord_studentId_fkey',
      'AttendanceRecord_markedById_fkey',
      'DirectMessage_senderId_fkey',
      'DirectMessage_receiverId_fkey',
      'StudentLocationRecord_updatedById_fkey',
      'StudentLocationRecord_externalReporterId_fkey',
      'NotificationRecord_senderId_fkey',
      'TeacherAssignmentAuditLog_actorId_fkey',
      'TeacherAssignmentAuditLog_targetTeacherId_fkey',
      'RefreshToken_replacedById_fkey',
    ];
    const constraints = await prisma.$queryRaw<Array<{ constraint_name: string }>>`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND constraint_type = 'FOREIGN KEY'
    `;
    const actual = new Set(constraints.map(({ constraint_name }) => constraint_name));

    for (const constraint of expectedConstraints) {
      expect(actual.has(constraint), `${constraint} should exist`).toBe(true);
    }
  });

  it('allows only one placement per student and academic year', async () => {
    const fixture = await createLifecycleFixture();

    await expect(
      prisma.studentAcademicEnrollment.create({
        data: {
          studentId: fixture.studentId,
          cohortId: fixture.nextCohortId,
          academicYearId: fixture.currentYearId,
          rollNumber: 99,
        },
      }),
    ).rejects.toThrow();
  });

  it('allows only one roll number per cohort and academic year', async () => {
    const fixture = await createLifecycleFixture({ includeSecondStudent: true });

    await expect(
      prisma.studentAcademicEnrollment.update({
        where: {
          studentId_academicYearId: {
            studentId: fixture.secondStudentId,
            academicYearId: fixture.currentYearId,
          },
        },
        data: { rollNumber: 1 },
      }),
    ).rejects.toThrow();
  });

  it('rejects placement rows whose student, cohort, or year reference is missing', async () => {
    const fixture = await createLifecycleFixture();
    const base = {
      studentId: fixture.studentId,
      cohortId: fixture.cohortId,
      academicYearId: fixture.nextYearId,
      rollNumber: 4,
    };

    await expect(
      prisma.studentAcademicEnrollment.create({
        data: { ...base, studentId: fixture.id('missing-student') },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.studentAcademicEnrollment.create({
        data: { ...base, cohortId: fixture.id('missing-cohort') },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.studentAcademicEnrollment.create({
        data: { ...base, academicYearId: fixture.id('missing-year') },
      }),
    ).rejects.toThrow();
  });

  it('retains academic history by rejecting physical deletion of an enrolled student', async () => {
    const fixture = await createLifecycleFixture();

    await expect(prisma.user.delete({ where: { id: fixture.studentId } })).rejects.toThrow();
    expect(
      await prisma.studentAcademicEnrollment.count({ where: { studentId: fixture.studentId } }),
    ).toBe(1);
  });

  it('derives stream post and comment identity from current user records', async () => {
    const fixture = await createLifecycleFixture();
    const post = await classroomService.addStreamPost({
      classroomId: fixture.classroomId,
      authorId: fixture.teacherId,
      content: 'Identity-backed announcement',
      pinned: false,
      attachments: [],
      comments: [],
    });
    await classroomService.addCommentToPost(post.id, fixture.adminId, 'Relational comment');
    await prisma.user.update({
      where: { id: fixture.teacherId },
      data: { name: 'Renamed Teacher', avatar: 'renamed-teacher.png' },
    });
    await prisma.user.update({
      where: { id: fixture.adminId },
      data: { name: 'Renamed Admin', avatar: 'renamed-admin.png' },
    });

    const saved = (await classroomService.getStreamPosts()).find(({ id }) => id === post.id);
    expect(saved).toMatchObject({
      authorName: 'Renamed Teacher',
      authorAvatar: 'renamed-teacher.png',
      authorRole: 'teacher',
      comments: [
        expect.objectContaining({
          authorName: 'Renamed Admin',
          authorAvatar: 'renamed-admin.png',
        }),
      ],
    });
  });

  it('rejects posts by students and by unassigned teachers', async () => {
    const fixture = await createLifecycleFixture();
    const post = {
      classroomId: fixture.classroomId,
      content: 'Not authorized',
      pinned: false,
      attachments: [],
      comments: [],
    };

    await expect(
      classroomService.addStreamPost({ ...post, authorId: fixture.studentId }),
    ).rejects.toThrow('Active classroom and author must belong to the same school.');
    await expect(
      classroomService.addStreamPost({ ...post, authorId: fixture.replacementTeacherId }),
    ).rejects.toThrow('Teachers may only post in their assigned classrooms.');
  });

  it('derives submission identity from the related user after a rename', async () => {
    const fixture = await createLifecycleFixture();
    const assignment = await assignmentService.addAssignment({
      classroomId: fixture.classroomId,
      classroomName: 'ignored relational display value',
      subject: 'ignored relational display value',
      title: 'Normalization assignment',
      instructions: 'Submit a response',
      dueDate: '2099-12-31',
      dueTime: '23:59',
      totalPoints: 10,
      attachments: [],
      rubric: [],
    });
    const submission = await assignmentService.submitHomework(
      assignment.id,
      '',
      '',
      fixture.studentId,
      'My answer',
    );
    await prisma.user.update({
      where: { id: fixture.studentId },
      data: { name: 'Renamed Student', avatar: 'renamed-student.png' },
    });

    const saved = (await assignmentService.getSubmissions()).find(({ id }) => id === submission.id);
    expect(saved).toMatchObject({
      studentName: 'Renamed Student',
      studentAvatar: 'renamed-student.png',
    });
  });

  it('stores encrypted messages and derives both participant identities', async () => {
    const fixture = await createLifecycleFixture();
    const plainText = `sensitive-${fixture.suffix}`;
    const message = await communicationService.addDirectMessage({
      senderId: fixture.teacherId,
      receiverId: fixture.parentId,
      content: plainText,
      read: false,
    });
    const row = await prisma.directMessage.findUniqueOrThrow({ where: { id: message.id } });
    expect(row.content).not.toBe(plainText);
    expect(row.content).toMatch(/^enc:v1:/);

    await prisma.user.update({
      where: { id: fixture.teacherId },
      data: { name: 'Current Sender', avatar: 'current-sender.png' },
    });
    await prisma.user.update({
      where: { id: fixture.parentId },
      data: { name: 'Current Receiver' },
    });
    const saved = (await communicationService.getDirectMessages()).find(
      ({ id }) => id === message.id,
    );
    expect(saved).toMatchObject({
      senderName: 'Current Sender',
      senderAvatar: 'current-sender.png',
      senderRole: 'teacher',
      receiverName: 'Current Receiver',
      content: plainText,
    });
  });

  it('rejects messages involving archived or cross-school users', async () => {
    const fixture = await createLifecycleFixture();
    await prisma.user.update({ where: { id: fixture.parentId }, data: { isArchived: true } });

    await expect(
      communicationService.addDirectMessage({
        senderId: fixture.teacherId,
        receiverId: fixture.parentId,
        content: 'blocked',
        read: false,
      }),
    ).rejects.toThrow('Sender and receiver must be active users in the same school.');

    const other = await createLifecycleFixture();
    await expect(
      communicationService.addDirectMessage({
        senderId: fixture.teacherId,
        receiverId: other.parentId,
        content: 'cross-school',
        read: false,
      }),
    ).rejects.toThrow('Sender and receiver must be active users in the same school.');
  });

  it('derives attendance student and marker names and updates one daily row', async () => {
    const fixture = await createLifecycleFixture();
    const first = await attendanceService.markAttendance(
      fixture.studentId,
      '2024-06-05',
      'present',
      undefined,
      fixture.teacherId,
    );
    const second = await attendanceService.markAttendance(
      fixture.studentId,
      '2024-06-05',
      'late',
      'Bus delay',
      fixture.teacherId,
    );
    expect(second.id).toBe(first.id);
    expect(
      await prisma.attendanceRecord.count({
        where: { studentId: fixture.studentId, date: '2024-06-05' },
      }),
    ).toBe(1);

    await prisma.user.update({
      where: { id: fixture.studentId },
      data: { name: 'Current Attendance Student' },
    });
    await prisma.user.update({
      where: { id: fixture.teacherId },
      data: { name: 'Current Attendance Marker' },
    });
    const saved = (await attendanceService.getAttendance()).find(({ id }) => id === first.id);
    expect(saved).toMatchObject({
      studentName: 'Current Attendance Student',
      markedBy: 'Current Attendance Marker',
      status: 'late',
      remarks: 'Bus delay',
    });
  });

  it('uses a single current location row and derives its internal updater', async () => {
    const fixture = await createLifecycleFixture();
    const first = await locationService.updateStudentLocation(
      fixture.studentId,
      'Library',
      'library',
      fixture.teacherId,
    );
    await prisma.user.update({
      where: { id: fixture.teacherId },
      data: { name: 'Current Location Teacher' },
    });
    const second = await locationService.updateStudentLocation(
      fixture.studentId,
      'Science Lab',
      'laboratory',
      fixture.teacherId,
      undefined,
      'Practical class',
    );

    expect(second.id).toBe(first.id);
    expect(second).toMatchObject({
      studentId: fixture.studentId,
      updatedBy: 'Current Location Teacher',
      updatedByRole: 'teacher',
      currentLocation: 'Science Lab',
    });
    expect(
      await prisma.studentLocationRecord.count({ where: { studentId: fixture.studentId } }),
    ).toBe(1);
  });

  it('derives external location reporter identity through its foreign key', async () => {
    const fixture = await createLifecycleFixture();
    const reporter = await prisma.externalLocationReporter.create({
      data: {
        schoolId: fixture.schoolId,
        name: 'Bus GPS Gateway',
        role: 'transport',
      },
    });
    await prisma.studentLocationRecord.create({
      data: {
        studentId: fixture.studentId,
        currentLocation: 'Bus Route 2',
        category: 'en_route_bus',
        externalReporterId: reporter.id,
        updatedAt: new Date().toISOString(),
      },
    });

    const location = await locationService.getStudentLocationById(fixture.studentId);
    expect(location).toMatchObject({
      updatedBy: 'Bus GPS Gateway',
      updatedByRole: 'staff',
      currentLocation: 'Bus Route 2',
    });
  });

  it('derives notification sender identity and suppresses archived recipients', async () => {
    const fixture = await createLifecycleFixture();
    const notification = await notificationService.dispatchNotification({
      recipientId: fixture.studentId,
      senderId: fixture.teacherId,
      senderName: 'must not be stored',
      senderRole: 'admin',
      title: 'Relational notification',
      body: 'Identity comes from User',
      category: 'ACADEMIC',
    });
    expect(notification).not.toBeNull();
    await prisma.user.update({
      where: { id: fixture.teacherId },
      data: { name: 'Current Notification Sender' },
    });

    const saved = (await notificationService.getUserNotifications(fixture.studentId)).find(
      ({ id }) => id === notification?.id,
    );
    expect(saved).toMatchObject({
      senderName: 'Current Notification Sender',
      senderRole: 'teacher',
    });

    await prisma.user.update({ where: { id: fixture.studentId }, data: { isArchived: true } });
    expect(
      await notificationService.dispatchNotification({
        recipientId: fixture.studentId,
        title: 'Suppressed',
        body: 'Archived recipient',
        category: 'CRITICAL',
      }),
    ).toBeNull();
    expect(await notificationService.getUserNotifications(fixture.studentId)).toEqual([]);
  });

  it('derives audit actor and target teacher names from user relations', async () => {
    const fixture = await createLifecycleFixture();
    const log = await prisma.teacherAssignmentAuditLog.create({
      data: {
        actorId: fixture.adminId,
        targetTeacherId: fixture.teacherId,
        action: 'ASSIGN_SUBJECT',
        subjectId: fixture.subjectId,
        classroomId: fixture.classroomId,
        details: 'Relational audit fixture',
      },
    });
    await prisma.user.update({
      where: { id: fixture.adminId },
      data: { name: 'Current Audit Admin' },
    });
    await prisma.user.update({
      where: { id: fixture.teacherId },
      data: { name: 'Current Audit Teacher' },
    });

    const saved = (
      await teacherAssignmentService.getAssignmentAuditLogs(fixture.adminId, fixture.teacherId)
    ).find(({ id }) => id === log.id);
    expect(saved).toMatchObject({
      actorName: 'Current Audit Admin',
      actorRole: 'admin',
      targetTeacherName: 'Current Audit Teacher',
    });
  });

  it('defaults assignment, quiz, and module creator references to the classroom teacher', async () => {
    const fixture = await createLifecycleFixture();
    const assignment = await assignmentService.addAssignment({
      classroomId: fixture.classroomId,
      classroomName: 'ignored',
      subject: 'ignored',
      title: 'Creator assignment',
      instructions: 'Creator test',
      dueDate: '2099-12-31',
      dueTime: '23:59',
      totalPoints: 20,
      attachments: [],
      rubric: [],
    });
    const quiz = await quizService.addQuiz({
      classroomId: fixture.classroomId,
      classroomName: 'ignored',
      subject: 'ignored',
      title: 'Creator quiz',
      description: 'Creator test',
      durationMinutes: 15,
      dueDate: '2099-12-31',
      totalQuestions: 1,
      questions: [
        {
          text: '2 + 2?',
          type: 'MCQ',
          options: ['3', '4'],
          correctAnswer: '4',
          explanation: 'Arithmetic',
          points: 1,
        },
      ],
      published: false,
      status: 'draft',
      sourceResourceIds: [],
    });
    const module = await moduleService.addModule({
      classroomId: fixture.classroomId,
      unitName: 'Unit 1',
      title: 'Creator module',
      description: 'Creator test',
      durationMinutes: 30,
      attachments: [],
    });

    const [assignmentRow, quizRow, moduleRow] = await Promise.all([
      prisma.assignment.findUniqueOrThrow({ where: { id: assignment.id } }),
      prisma.quiz.findUniqueOrThrow({ where: { id: quiz.id } }),
      prisma.moduleItem.findUniqueOrThrow({ where: { id: module.id } }),
    ]);
    expect(assignmentRow.createdById).toBe(fixture.teacherId);
    expect(quizRow.createdById).toBe(fixture.teacherId);
    expect(moduleRow.createdById).toBe(fixture.teacherId);
  });

  it('rejects an invalid creator reference without leaving a partial record', async () => {
    const fixture = await createLifecycleFixture();
    const title = `Invalid creator ${fixture.suffix}`;

    await expect(
      assignmentService.addAssignment(
        {
          classroomId: fixture.classroomId,
          classroomName: 'ignored',
          subject: 'ignored',
          title,
          instructions: 'Should roll back',
          dueDate: '2099-12-31',
          dueTime: '23:59',
          totalPoints: 5,
          attachments: [],
          rubric: [],
        },
        fixture.id('missing-creator'),
      ),
    ).rejects.toThrow();
    expect(await prisma.assignment.count({ where: { title } })).toBe(0);
  });

  it('links refresh-token rotation and prevents two tokens replacing the same token', async () => {
    const fixture = await createLifecycleFixture();
    const expiresAt = new Date(Date.now() + 60_000);
    const replacement = await prisma.refreshToken.create({
      data: {
        userId: fixture.adminId,
        tokenHash: fixture.id('replacement-hash'),
        deviceFingerprint: fixture.id('device'),
        expiresAt,
      },
    });
    const original = await prisma.refreshToken.create({
      data: {
        userId: fixture.adminId,
        tokenHash: fixture.id('original-hash'),
        deviceFingerprint: fixture.id('device'),
        expiresAt,
        replacedById: replacement.id,
      },
      include: { replacedBy: true },
    });
    expect(original.replacedBy?.id).toBe(replacement.id);

    await expect(
      prisma.refreshToken.create({
        data: {
          userId: fixture.adminId,
          tokenHash: fixture.id('second-original-hash'),
          deviceFingerprint: fixture.id('device'),
          expiresAt,
          replacedById: replacement.id,
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects a refresh-token replacement that does not exist', async () => {
    const fixture = await createLifecycleFixture();

    await expect(
      prisma.refreshToken.create({
        data: {
          userId: fixture.adminId,
          tokenHash: fixture.id('broken-rotation-hash'),
          deviceFingerprint: fixture.id('device'),
          expiresAt: new Date(Date.now() + 60_000),
          replacedById: fixture.id('missing-token'),
        },
      }),
    ).rejects.toThrow();
  });
});
