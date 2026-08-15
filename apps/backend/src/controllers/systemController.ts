import { Request, Response } from 'express';
import { logger } from '@utils/logger';
import { fileStorageDB } from '@db/fileStorageDB';
import { lmsDB } from '@db/lmsDatabase';
import { prisma } from '@db/services/prismaClient';

export const getHealth = (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Sikshya LMS API Operational',
    timestamp: new Date().toISOString(),
  });
};

const getFileAccessContext = async (req: Request) => {
  if (!req.user) throw new Error('Authentication required.');
  const actor = await prisma.user.findFirst({
    where: {
      id: req.user.id,
      role: { in: ['student', 'teacher', 'admin'] },
      isArchived: false,
    },
    select: { id: true, role: true, schoolId: true },
  });
  if (!actor) throw new Error('An active student, teacher, or administrator account is required.');
  const classrooms = await prisma.classroom.findMany({
    where: {
      schoolId: actor.schoolId,
      isArchived: false,
      ...(actor.role === 'teacher'
        ? {
            OR: [
              { teacherId: actor.id },
              { teachingAssignments: { some: { teacherId: actor.id, isActive: true } } },
            ],
          }
        : actor.role === 'student'
          ? { enrollments: { some: { studentId: actor.id, isActive: true } } }
          : {}),
    },
    select: { id: true },
  });
  return { actor, classroomIds: new Set(classrooms.map(({ id }) => id)) };
};

export const getDbState = async (req: Request, res: Response) => {
  try {
    const actor = req.user?.id
      ? await prisma.user.findFirst({
          where: { id: req.user.id, isArchived: false },
          select: { id: true, role: true, schoolId: true },
        })
      : null;
    if (!actor)
      return res.status(401).json({ status: 'error', message: 'Active session required.' });

    const classroomRows = await prisma.classroom.findMany({
      where: { schoolId: actor.schoolId, isArchived: false },
      include: {
        enrollments: { where: { isActive: true } },
        teachingAssignments: { where: { isActive: true }, select: { teacherId: true } },
      },
    });
    const childLinks =
      actor.role === 'parent'
        ? await prisma.parentStudent.findMany({
            where: { parentId: actor.id, isActive: true, student: { isArchived: false } },
          })
        : [];
    const childIds = childLinks.map((link) => link.studentId);
    const visibleClassrooms = classroomRows.filter((classroom) => {
      if (actor.role === 'admin') return true;
      if (actor.role === 'teacher')
        return (
          classroom.teacherId === actor.id ||
          classroom.teachingAssignments.some((assignment) => assignment.teacherId === actor.id)
        );
      const studentIds = actor.role === 'student' ? [actor.id] : childIds;
      return classroom.enrollments.some((enrollment) => studentIds.includes(enrollment.studentId));
    });
    const visibleClassroomIds = new Set(visibleClassrooms.map((classroom) => classroom.id));
    const visibleStudentIds = new Set<string>(
      actor.role === 'admin'
        ? classroomRows.flatMap((classroom) => classroom.enrollments.map((item) => item.studentId))
        : actor.role === 'student'
          ? [actor.id]
          : actor.role === 'parent'
            ? childIds
            : visibleClassrooms.flatMap((classroom) =>
                classroom.enrollments.map((item) => item.studentId),
              ),
    );
    if (actor.role === 'admin') {
      const schoolStudents = await prisma.user.findMany({
        where: { schoolId: actor.schoolId, role: 'student', isArchived: false },
        select: { id: true },
      });
      schoolStudents.forEach(({ id }) => visibleStudentIds.add(id));
    }
    const relatedParentIds = await prisma.parentStudent.findMany({
      where: {
        studentId: { in: [...visibleStudentIds] },
        isActive: true,
        parent: { isArchived: false },
      },
      select: { parentId: true },
    });
    const allowedUserIds = new Set<string>([actor.id, ...visibleStudentIds]);
    if (actor.role === 'admin') {
      const schoolUsers = await prisma.user.findMany({
        where: { schoolId: actor.schoolId, isArchived: false },
        select: { id: true },
      });
      schoolUsers.forEach(({ id }) => allowedUserIds.add(id));
    } else {
      relatedParentIds.forEach(({ parentId }) => allowedUserIds.add(parentId));
      visibleClassrooms.forEach(({ teacherId }) => allowedUserIds.add(teacherId));
    }

    const [
      users,
      studentProfiles,
      badgeDefinitions,
      classrooms,
      streamPosts,
      assignments,
      submissions,
      quizzes,
      quizSubmissions,
      attendance,
      parentControls,
      studentLocations,
      messages,
      termProgress,
      studentActivities,
      subjectPerformances,
      resources,
      modules,
      teacherAbsenceRequests,
      substituteRequests,
      teacherAssignmentAuditLogs,
      timetableSlots,
      bellSchedule,
      holidays,
      exams,
      auditRows,
      announcementRows,
    ] = await Promise.all([
      lmsDB.getUsers(),
      lmsDB.getStudentProfiles(),
      lmsDB.getBadgeDefinitions(),
      lmsDB.getClassrooms(),
      lmsDB.getStreamPosts(),
      lmsDB.getAssignments(),
      lmsDB.getSubmissions(),
      lmsDB.getQuizzes(),
      lmsDB.getQuizSubmissions(),
      lmsDB.getAttendance(),
      lmsDB.getParentControls(),
      lmsDB.getStudentLocations(),
      lmsDB.getDirectMessages(),
      lmsDB.getTermProgress(),
      lmsDB.getStudentActivities(),
      lmsDB.getSubjectPerformances(),
      lmsDB.getResources(),
      lmsDB.getModules(),
      actor.role === 'teacher' || actor.role === 'admin'
        ? lmsDB.getTeacherAbsenceRequests(actor.id)
        : Promise.resolve([]),
      actor.role === 'teacher' || actor.role === 'admin'
        ? lmsDB.getSubstituteRequests(actor.id)
        : Promise.resolve([]),
      actor.role === 'admin' ? lmsDB.getAssignmentAuditLogs(actor.id) : Promise.resolve([]),
      prisma.timetableSlot.findMany({
        where: {
          schoolId: actor.schoolId,
          classroomId: { in: [...visibleClassroomIds] },
          isArchived: false,
        },
        include: { subject: true, teacher: true, classroom: true },
        orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
      }),
      prisma.bellScheduleEntry.findMany({
        where: { schoolId: actor.schoolId, isArchived: false, academicYear: { isActive: true } },
        orderBy: { sequence: 'asc' },
      }),
      prisma.schoolHoliday.findMany({
        where: { schoolId: actor.schoolId, isArchived: false },
        orderBy: { date: 'asc' },
      }),
      prisma.exam.findMany({
        where: {
          schoolId: actor.schoolId,
          status: { in: ['published', 'marks_open', 'marks_closed', 'finalized'] },
        },
        orderBy: { startsAt: 'asc' },
      }),
      actor.role === 'admin'
        ? prisma.auditTrail.findMany({
            where: { actor: { schoolId: actor.schoolId } },
            include: { actor: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 200,
          })
        : Promise.resolve([]),
      actor.role === 'admin'
        ? prisma.notificationRecord.findMany({
            where: { type: 'announcement', recipient: { schoolId: actor.schoolId } },
            include: { sender: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 1000,
          })
        : Promise.resolve([]),
    ]);
    const assignmentIds = new Set(
      assignments
        .filter((assignment) => visibleClassroomIds.has(assignment.classroomId))
        .map((assignment) => assignment.id),
    );
    const visibleQuizzes = quizzes.filter(
      (quiz) =>
        visibleClassroomIds.has(quiz.classroomId) &&
        (actor.role === 'teacher' || actor.role === 'admin' || quiz.published),
    );
    const quizIds = new Set(visibleQuizzes.map((quiz) => quiz.id));
    const visibleQuizSubmissions = quizSubmissions.filter(
      (submission) =>
        quizIds.has(submission.quizId) &&
        (actor.role === 'teacher' ||
          actor.role === 'admin' ||
          visibleStudentIds.has(submission.studentId)),
    );
    const safeQuizzes = visibleQuizzes.map((quiz) => {
      if (actor.role === 'teacher' || actor.role === 'admin') return quiz;
      const mayRevealAnswers =
        quiz.revealMarksMode === 'immediate' &&
        visibleQuizSubmissions.some((submission) => submission.quizId === quiz.id);
      if (mayRevealAnswers) return quiz;
      return {
        ...quiz,
        questions: quiz.questions.map(
          ({ correctAnswer: _answer, explanation: _explanation, ...question }) => question,
        ),
      };
    });
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ] as const;
    const weeklySchedule = Object.fromEntries(dayNames.map((day) => [day, []])) as Record<
      string,
      any[]
    >;
    for (const slot of timetableSlots) {
      weeklySchedule[dayNames[slot.dayOfWeek]].push({
        id: slot.id,
        periodNumber: slot.periodNumber,
        startTime: slot.startTime,
        endTime: slot.endTime,
        subject: slot.subject.name,
        teacherName: slot.teacher.name,
        room: slot.roomNumber,
        classroomId: slot.classroomId,
        requiredBooks: slot.requiredBooks || undefined,
      });
    }
    for (const day of dayNames) {
      for (const bell of bellSchedule) {
        weeklySchedule[day].push({
          id: `${bell.id}:${day}`,
          periodNumber: bell.sequence,
          startTime: bell.startTime,
          endTime: bell.endTime || bell.startTime,
          subject: bell.name,
          teacherName: '',
          room: bell.type,
        });
      }
      weeklySchedule[day].sort((left, right) => left.startTime.localeCompare(right.startTime));
    }
    const currentDay = dayNames[new Date().getDay()];
    const calendarEvents = [
      ...holidays.map((holiday) => ({
        id: holiday.id,
        title: holiday.name,
        type: 'holiday',
        date: holiday.date.toISOString().slice(0, 10),
        description: holiday.description || '',
      })),
      ...exams.map((exam) => ({
        id: exam.id,
        title: exam.name,
        type: 'exam',
        date: exam.startsAt.toISOString().slice(0, 10),
        description: `Ends ${exam.endsAt.toISOString().slice(0, 10)}`,
      })),
    ];
    const filteredParentControls = Object.fromEntries(
      Object.entries(parentControls).filter(([studentId]) => visibleStudentIds.has(studentId)),
    );
    res.json({
      status: 'success',
      users: users.filter((user) => allowedUserIds.has(user.id)),
      studentProfiles: studentProfiles.filter((profile) => visibleStudentIds.has(profile.id)),
      badgeDefinitions,
      classrooms: classrooms.filter((classroom) => visibleClassroomIds.has(classroom.id)),
      streamPosts: streamPosts.filter((post) => visibleClassroomIds.has(post.classroomId)),
      assignments: assignments.filter((assignment) =>
        visibleClassroomIds.has(assignment.classroomId),
      ),
      submissions: submissions.filter(
        (submission) =>
          assignmentIds.has(submission.assignmentId) &&
          (actor.role === 'teacher' ||
            actor.role === 'admin' ||
            visibleStudentIds.has(submission.studentId)),
      ),
      quizzes: safeQuizzes,
      quizSubmissions: visibleQuizSubmissions,
      attendance: attendance.filter((record) => visibleStudentIds.has(record.studentId)),
      parentControls: filteredParentControls,
      studentLocations: studentLocations.filter((record) =>
        visibleStudentIds.has(record.studentId),
      ),
      messages: messages.filter((message) =>
        actor.role === 'admin'
          ? allowedUserIds.has(message.senderId) && allowedUserIds.has(message.receiverId)
          : message.senderId === actor.id || message.receiverId === actor.id,
      ),
      termProgress: termProgress.filter((entry) => visibleStudentIds.has(entry.studentId)),
      studentActivities: studentActivities.filter((entry) =>
        visibleStudentIds.has(entry.studentId),
      ),
      subjectPerformances: subjectPerformances.filter((entry) =>
        visibleStudentIds.has(entry.studentId),
      ),
      resources: resources.filter((resource) => visibleClassroomIds.has(resource.classroomId)),
      modules: modules.filter((module) => visibleClassroomIds.has(module.classroomId)),
      teacherAbsenceRequests:
        actor.role === 'student' || actor.role === 'parent' ? [] : teacherAbsenceRequests,
      substituteRequests:
        actor.role === 'student' || actor.role === 'parent' ? [] : substituteRequests,
      teacherAssignmentAuditLogs,
      weeklySchedule,
      schedule: weeklySchedule[currentDay],
      calendarEvents,
      adminAuditLogs: auditRows.map((row) => ({
        id: row.id,
        action: row.action,
        category: row.category,
        performedBy: row.actor?.name || 'System',
        details: JSON.stringify(row.newData || row.previousData || {}),
        timestamp: row.createdAt.toISOString(),
      })),
      schoolAnnouncements: Array.from(
        new Map(announcementRows.map((row) => [row.broadcastId || row.id, row])).entries(),
      ).map(([announcementId, row]) => ({
        id: announcementId,
        title: row.title,
        content: row.body,
        targetAudience: row.targetAudience || 'all',
        priority: row.severity === 'urgent' || row.severity === 'high' ? 'high' : 'normal',
        author: row.sender?.name || 'System',
        createdAt: row.createdAt,
      })),
    });
  } catch (err) {
    logger.error('Failed to fetch DB state:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch state' });
  }
};

export const uploadFile = async (req: Request, res: Response) => {
  logger.info('Processing file upload and registering entry in PostgreSQL database...');
  if (!req.user)
    return res.status(401).json({ status: 'error', message: 'Authentication required.' });
  const fileName = String(req.body?.name || '').trim();
  const uploadedBy = req.user.name;
  const uploadedById = req.user.id;
  const classroomId = req.body?.classroomId;
  const sizeBytes = Number(req.body?.sizeBytes);
  const mimeType = String(req.body?.mimeType || '');
  const checksum = String(req.body?.checksum || '');
  if (
    !fileName ||
    !mimeType ||
    !Number.isInteger(sizeBytes) ||
    sizeBytes < 1 ||
    sizeBytes > 50 * 1024 * 1024 ||
    !/^sha256-[a-f0-9]{64}$/i.test(checksum)
  )
    return res.status(400).json({
      status: 'error',
      message: 'File name, MIME type, a 1 byte to 50 MB size, and a SHA-256 checksum are required.',
    });
  const { classroomIds } = await getFileAccessContext(req);
  if (classroomId && !classroomIds.has(classroomId))
    return res.status(403).json({
      status: 'error',
      message: 'You do not have access to upload files to that classroom.',
    });
  const sizeFormatted = `${Math.max(1, Math.ceil(sizeBytes / 1024))} KB`;

  const record = await fileStorageDB.addFile({
    originalName: fileName,
    storedName: `${Date.now()}_${fileName}`,
    mimeType,
    sizeBytes,
    sizeFormatted,
    uploadedBy,
    uploadedById,
    classroomId,
    checksum,
    integrityStatus: 'verified',
    downloadUrl: `/uploads/${encodeURIComponent(fileName)}`,
  });

  res.json({
    status: 'success',
    message: 'File verified and stored in database successfully.',
    record,
  });
};

export const getAllFiles = async (req: Request, res: Response) => {
  const { actor, classroomIds } = await getFileAccessContext(req);
  const classroomId = req.query.classroomId as string | undefined;
  if (classroomId && !classroomIds.has(classroomId))
    return res.status(404).json({ status: 'error', message: 'Classroom was not found.' });
  const files = await fileStorageDB.getAllFiles(classroomId);
  const visibleFiles = files.filter(
    (file) =>
      (file.classroomId ? classroomIds.has(file.classroomId) : false) ||
      (file as typeof file & { uploadedById?: string }).uploadedById === actor.id,
  );
  res.json({ status: 'success', count: visibleFiles.length, files: visibleFiles });
};

export const getFileById = async (req: Request, res: Response) => {
  const { actor, classroomIds } = await getFileAccessContext(req);
  const file = await fileStorageDB.getFileById(req.params.id);
  const uploaderId = (file as (typeof file & { uploadedById?: string }) | null)?.uploadedById;
  if (!file || (file.classroomId ? !classroomIds.has(file.classroomId) : uploaderId !== actor.id)) {
    return res
      .status(404)
      .json({ status: 'error', message: 'File record not found in storage DB' });
  }
  res.json({ status: 'success', file });
};

export const deleteFile = async (req: Request, res: Response) => {
  const { actor, classroomIds } = await getFileAccessContext(req);
  const file = await fileStorageDB.getFileById(req.params.id);
  const uploaderId = (file as (typeof file & { uploadedById?: string }) | null)?.uploadedById;
  if (
    !file ||
    (file.classroomId ? !classroomIds.has(file.classroomId) : uploaderId !== actor.id) ||
    (actor.role !== 'admin' && uploaderId !== actor.id)
  ) {
    return res
      .status(404)
      .json({ status: 'error', message: 'File record not found in storage DB' });
  }
  const deleted = await fileStorageDB.deleteFile(req.params.id);
  if (!deleted) {
    return res
      .status(404)
      .json({ status: 'error', message: 'File record not found in storage DB' });
  }
  res.json({ status: 'success', message: `File ${req.params.id} deleted from storage DB` });
};

// --- NOTIFICATION CONTROLLERS ---
export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.params.userId !== req.user.id)
      return res
        .status(403)
        .json({ status: 'error', message: 'You may only read your notifications.' });
    const notifications = await lmsDB.getUserNotifications(req.user.id);
    res.json({ status: 'success', notifications });
  } catch (err) {
    logger.error('Failed to get notifications:', err);
    res.status(500).json({ status: 'error', message: 'Failed to get notifications' });
  }
};

export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    if (!req.user)
      return res.status(401).json({ status: 'error', message: 'Authentication required.' });
    const updated = await lmsDB.markNotificationAsRead(req.params.id, req.user.id);
    if (!updated)
      return res.status(404).json({ status: 'error', message: 'Notification not found.' });
    res.json({ status: 'success' });
  } catch (err) {
    logger.error('Failed to mark notification read:', err);
    res.status(500).json({ status: 'error', message: 'Failed to mark notification read' });
  }
};

export const markAllNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    if (!req.user)
      return res.status(401).json({ status: 'error', message: 'Authentication required.' });
    await lmsDB.markAllNotificationsAsRead(req.user.id);
    res.json({ status: 'success' });
  } catch (err) {
    logger.error('Failed to mark all notifications read:', err);
    res.status(500).json({ status: 'error', message: 'Failed to mark all notifications read' });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    if (!req.user)
      return res.status(401).json({ status: 'error', message: 'Authentication required.' });
    const deleted = await lmsDB.deleteNotification(req.params.id, req.user.id);
    if (!deleted)
      return res.status(404).json({ status: 'error', message: 'Notification not found.' });
    res.json({ status: 'success' });
  } catch (err) {
    logger.error('Failed to delete notification:', err);
    res.status(500).json({ status: 'error', message: 'Failed to delete notification' });
  }
};

export const clearReadNotifications = async (req: Request, res: Response) => {
  try {
    if (!req.user)
      return res.status(401).json({ status: 'error', message: 'Authentication required.' });
    await lmsDB.clearReadNotifications(req.user.id);
    res.json({ status: 'success' });
  } catch (err) {
    logger.error('Failed to clear read notifications:', err);
    res.status(500).json({ status: 'error', message: 'Failed to clear read notifications' });
  }
};

export const getNotificationPreferences = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.params.userId !== req.user.id)
      return res
        .status(403)
        .json({ status: 'error', message: 'You may only read your preferences.' });
    const preferences = await lmsDB.getNotificationPreferences(req.user.id);
    res.json({ status: 'success', preferences });
  } catch (err) {
    logger.error('Failed to get notification preferences:', err);
    res.status(500).json({ status: 'error', message: 'Failed to get notification preferences' });
  }
};

export const updateNotificationPreferences = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.params.userId !== req.user.id)
      return res
        .status(403)
        .json({ status: 'error', message: 'You may only update your preferences.' });
    const preferences = await lmsDB.updateNotificationPreferences(req.user.id, req.body);
    res.json({ status: 'success', preferences });
  } catch (err) {
    logger.error('Failed to update notification preferences:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update notification preferences' });
  }
};

export const dispatchCustomNotification = async (req: Request, res: Response) => {
  try {
    if (!req.user)
      return res.status(401).json({ status: 'error', message: 'Authentication required.' });
    const actor = await prisma.user.findFirst({
      where: { id: req.user.id, isArchived: false },
      select: { id: true, name: true, role: true, schoolId: true },
    });
    if (!actor)
      return res.status(401).json({ status: 'error', message: 'Active account required.' });
    const { recipientId, targetAudience, classroomId, title, body, category, severity, type } =
      req.body;

    if (targetAudience) {
      if (!['all', 'students', 'teachers', 'parents', 'classroom'].includes(targetAudience))
        return res.status(400).json({ status: 'error', message: 'Invalid target audience.' });
      const result = await lmsDB.dispatchBroadcastNotification({
        targetAudience,
        classroomId,
        schoolId: actor.schoolId,
        senderId: actor.id,
        senderName: actor.name,
        senderRole: actor.role,
        title,
        body,
        category: category || 'COMMUNICATION',
        severity: severity || 'normal',
        type: type || 'announcement',
      });
      return res.json({
        status: 'success',
        dispatchedCount: result.dispatchedCount,
        ...(type === 'announcement'
          ? {
              announcement: {
                id: result.broadcastId,
                title,
                content: body,
                targetAudience,
                priority: severity === 'urgent' || severity === 'high' ? 'high' : 'normal',
                author: actor.name,
                createdAt: result.createdAt,
              },
            }
          : {}),
      });
    }

    const recipient = await prisma.user.findFirst({
      where: { id: recipientId, schoolId: actor.schoolId, isArchived: false },
      select: { id: true },
    });
    if (!recipient)
      return res.status(404).json({ status: 'error', message: 'Active recipient not found.' });
    const notification = await lmsDB.dispatchNotification({
      recipientId,
      senderId: actor.id,
      senderName: actor.name,
      senderRole: actor.role,
      title,
      body,
      category: category || 'COMMUNICATION',
      severity: severity || 'normal',
      type: type || 'general',
    });

    res.json({ status: 'success', notification });
  } catch (err) {
    logger.error('Failed to dispatch custom notification:', err);
    res.status(500).json({ status: 'error', message: 'Failed to dispatch notification' });
  }
};
