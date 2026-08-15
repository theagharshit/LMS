import { Request, Response } from 'express';
import { Type } from '@google/genai';
import { lmsDB } from '@db/lmsDatabase';
import { getAi } from '@utils/aiClient';
import { logger } from '@utils/logger';
import { prisma } from '@db/services/prismaClient';
import { getAllowedContactIds } from './chatController';
import { communicationService } from '@db/services/communicationService';
import { notificationService } from '@db/services/notificationService';
import { sendToUser } from '@utils/realtime';

export const updateParentControls = async (req: Request, res: Response) => {
  try {
    if (!req.user)
      return res.status(401).json({ status: 'error', message: 'Authentication required.' });
    const { studentId, settings } = req.body;
    const controlActor = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { schoolId: true },
    });
    if (!controlActor)
      return res.status(401).json({ status: 'error', message: 'Active account required.' });
    const student = await prisma.user.findFirst({
      where: {
        id: studentId,
        role: 'student',
        schoolId: controlActor.schoolId,
        isArchived: false,
        ...(req.user.role === 'parent'
          ? { guardianLinks: { some: { parentId: req.user.id, isActive: true } } }
          : {}),
      },
      select: { id: true },
    });
    if (!student)
      return res
        .status(403)
        .json({ status: 'error', message: 'Student is not linked to this account.' });
    const updated = await lmsDB.updateParentControls(studentId, settings);
    res.json({ status: 'success', parentControls: updated });
  } catch (err) {
    logger.error('Failed to update parent controls:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update parent controls' });
  }
};

export const sendDirectMessage = async (req: Request, res: Response) => {
  try {
    if (!req.user)
      return res.status(401).json({ status: 'error', message: 'Authentication required.' });
    const { actor, contactIds } = await getAllowedContactIds(req.user.id);
    const receiverId = String(req.body.receiverId || '');
    if (!contactIds.includes(receiverId))
      return res.status(403).json({
        status: 'error',
        message: 'The recipient is not an active contact for this account.',
      });
    const receiver = await prisma.user.findFirst({
      where: { id: receiverId, schoolId: actor.schoolId, isArchived: false },
    });
    if (!receiver)
      return res.status(404).json({ status: 'error', message: 'Recipient not found.' });
    const msg = await lmsDB.addDirectMessage({
      senderId: actor.id,
      receiverId: receiver.id,
      content: String(req.body.content).trim(),
      read: false,
    });
    res.status(201).json({ status: 'success', message: msg });
  } catch (err) {
    logger.error('Failed to send message:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const getPendingStudentMessages = async (req: Request, res: Response) => {
  try {
    if (!req.user)
      return res.status(401).json({ status: 'error', message: 'Authentication required.' });
    const actor = await prisma.user.findFirst({
      where: { id: req.user.id, role: { in: ['parent', 'admin'] }, isArchived: false },
      select: { id: true, role: true, schoolId: true },
    });
    if (!actor) throw new Error('Active parent or administrator account required.');
    const studentIds =
      actor.role === 'parent'
        ? (
            await prisma.parentStudent.findMany({
              where: { parentId: actor.id, isActive: true, student: { isArchived: false } },
              select: { studentId: true },
            })
          ).map(({ studentId }) => studentId)
        : (
            await prisma.user.findMany({
              where: { schoolId: actor.schoolId, role: 'student', isArchived: false },
              select: { id: true },
            })
          ).map(({ id }) => id);
    const pendingMessages = await communicationService.getPendingApprovalMessages(studentIds);
    res.json({ status: 'success', pendingMessages });
  } catch (err) {
    logger.error('Failed to load pending student messages:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const reviewStudentMessage = async (req: Request, res: Response) => {
  try {
    if (!req.user)
      return res.status(401).json({ status: 'error', message: 'Authentication required.' });
    const [actor, pending] = await Promise.all([
      prisma.user.findFirst({
        where: { id: req.user.id, role: { in: ['parent', 'admin'] }, isArchived: false },
        select: { id: true, name: true, role: true, schoolId: true },
      }),
      prisma.directMessage.findFirst({
        where: { id: req.params.id, approvedByParent: false },
        include: { sender: true, receiver: true },
      }),
    ]);
    if (!actor) throw new Error('Active parent or administrator account required.');
    if (!pending || pending.sender.role !== 'student' || pending.sender.schoolId !== actor.schoolId)
      return res.status(404).json({ status: 'error', message: 'Pending message not found.' });
    if (actor.role === 'parent') {
      const link = await prisma.parentStudent.findFirst({
        where: { parentId: actor.id, studentId: pending.senderId, isActive: true },
      });
      if (!link)
        return res
          .status(403)
          .json({ status: 'error', message: 'This student is not linked to you.' });
    }
    if (req.body.decision === 'approved') {
      const message = await communicationService.approveMessage(pending.id);
      sendToUser(message.receiverId, 'chatMessage', message);
      await notificationService.dispatchNotification({
        recipientId: message.senderId,
        senderId: actor.id,
        senderName: actor.name,
        senderRole: actor.role,
        title: 'Message approved',
        body: `Your message to ${message.receiverName} was approved and sent.`,
        category: 'COMMUNICATION',
        severity: 'normal',
        type: 'message',
      });
      return res.json({ status: 'success', decision: 'approved', message });
    }
    await prisma.directMessage.delete({ where: { id: pending.id } });
    await notificationService.dispatchNotification({
      recipientId: pending.senderId,
      senderId: actor.id,
      senderName: actor.name,
      senderRole: actor.role,
      title: 'Message not approved',
      body: `Your draft message to ${pending.receiver.name} was not sent.`,
      category: 'COMMUNICATION',
      severity: 'high',
      type: 'message',
    });
    res.json({ status: 'success', decision: 'rejected', messageId: pending.id });
  } catch (err) {
    logger.error('Failed to review student message:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const generateParentSummaryAi = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    const { studentId, language = 'English & Nepali' } = req.body;
    const actor = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { schoolId: true },
    });
    if (!actor) return res.status(401).json({ error: 'Active account not found.' });
    const student = await prisma.user.findFirst({
      where: {
        id: studentId,
        role: 'student',
        isArchived: false,
        ...(req.user.role === 'parent'
          ? { guardianLinks: { some: { parentId: req.user.id, isActive: true } } }
          : { schoolId: actor.schoolId }),
      },
      include: {
        studentProfile: true,
        studentAcademicEnrollments: {
          where: { status: 'active' },
          include: { cohort: true },
          orderBy: { enrolledAt: 'desc' },
          take: 1,
        },
        attendanceRecords: { select: { status: true } },
        submissions: {
          where: { status: 'graded' },
          include: { assignment: { include: { classroom: { include: { subjectRef: true } } } } },
          orderBy: { submittedAt: 'desc' },
          take: 20,
        },
        enrollments: {
          where: { isActive: true },
          include: {
            classroom: {
              include: { assignments: { select: { id: true } } },
            },
          },
        },
      },
    });
    if (!student?.studentProfile || !student.studentAcademicEnrollments[0])
      return res.status(404).json({ error: 'Active linked student not found.' });
    const attendanceRate = student.attendanceRecords.length
      ? (student.attendanceRecords.filter((record) => record.status !== 'absent').length /
          student.attendanceRecords.length) *
        100
      : 0;
    const submittedAssignmentIds = new Set(
      student.submissions.map((submission) => submission.assignmentId),
    );
    const assignedIds = new Set(
      student.enrollments.flatMap((enrollment) =>
        enrollment.classroom.assignments.map((assignment) => assignment.id),
      ),
    );
    const recentGrades = student.submissions.map((submission) => ({
      subject: submission.assignment.classroom.subjectRef.name,
      title: submission.assignment.title,
      grade: submission.grade,
      totalPoints: submission.assignment.totalPoints,
      feedback: submission.feedback,
    }));
    const pendingHomeworkCount = [...assignedIds].filter(
      (assignmentId) => !submittedAssignmentIds.has(assignmentId),
    ).length;
    const teacherNotes = recentGrades.flatMap((grade) => (grade.feedback ? [grade.feedback] : []));
    const ai = getAi();

    if (!ai)
      return res.status(503).json({ error: 'The parent summary assistant is not configured.' });

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Summarize student academic & attendance progress for Parent Dashboard.
    Student: ${student.name}, Grade: ${student.studentAcademicEnrollments[0].cohort.gradeLevel}
Attendance: ${attendanceRate}%
Recent Grades: ${JSON.stringify(recentGrades)}
Pending Homework: ${pendingHomeworkCount}
Teacher Notes: ${teacherNotes}
Language: ${language}`,
      config: {
        systemInstruction: `You are an AI Parent Communication Assistant for Nepalese Schools. Create a heartwarming, clear, actionable summary for parents in both English and polite Nepali (Devanagari script). Highlight achievements, note pending homework, and give 2 clear action points for parents at home.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            englishSummary: { type: Type.STRING },
            nepaliSummary: { type: Type.STRING },
            highlights: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            actionPointsForParents: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['englishSummary', 'nepaliSummary', 'highlights', 'actionPointsForParents'],
        },
      },
    });

    const summaryData = JSON.parse(response.text || '{}');
    res.json(summaryData);
  } catch (error: any) {
    logger.error('Parent Summary Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate parent summary' });
  }
};
