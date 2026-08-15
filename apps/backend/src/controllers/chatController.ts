import { Request, Response } from 'express';
import { prisma } from '@db/services/prismaClient';
import { sendToUser, isUserOnline } from '@utils/realtime';
import { logger } from '@utils/logger';
import { communicationService } from '@db/services/communicationService';
import { notificationService } from '@db/services/notificationService';

export const getAllowedContactIds = async (userId: string) => {
  const actor = await prisma.user.findFirst({
    where: { id: userId, isArchived: false },
    select: { id: true, role: true, schoolId: true },
  });
  if (!actor) throw new Error('Active account not found.');
  if (actor.role === 'admin') {
    const users = await prisma.user.findMany({
      where: { schoolId: actor.schoolId, isArchived: false, id: { not: actor.id } },
      select: { id: true },
    });
    return { actor, contactIds: users.map(({ id }) => id) };
  }

  if (actor.role === 'teacher') {
    const classrooms = await prisma.classroom.findMany({
      where: {
        schoolId: actor.schoolId,
        isArchived: false,
        OR: [
          { teacherId: actor.id },
          { teachingAssignments: { some: { teacherId: actor.id, isActive: true } } },
        ],
      },
      include: { enrollments: { where: { isActive: true }, select: { studentId: true } } },
    });
    const studentIds = classrooms.flatMap((classroom) =>
      classroom.enrollments.map(({ studentId }) => studentId),
    );
    const parents = await prisma.parentStudent.findMany({
      where: { studentId: { in: studentIds }, isActive: true, parent: { isArchived: false } },
      select: { parentId: true },
    });
    const staff = await prisma.user.findMany({
      where: {
        schoolId: actor.schoolId,
        role: { in: ['teacher', 'admin'] },
        isArchived: false,
        id: { not: actor.id },
      },
      select: { id: true },
    });
    return {
      actor,
      contactIds: [
        ...new Set([
          ...studentIds,
          ...parents.map(({ parentId }) => parentId),
          ...staff.map(({ id }) => id),
        ]),
      ],
    };
  }

  const studentIds =
    actor.role === 'parent'
      ? (
          await prisma.parentStudent.findMany({
            where: { parentId: actor.id, isActive: true, student: { isArchived: false } },
            select: { studentId: true },
          })
        ).map(({ studentId }) => studentId)
      : [actor.id];
  const classrooms = await prisma.classroom.findMany({
    where: {
      schoolId: actor.schoolId,
      isArchived: false,
      enrollments: { some: { studentId: { in: studentIds }, isActive: true } },
    },
    include: {
      teachingAssignments: {
        where: { isActive: true, teacher: { isArchived: false } },
        select: { teacherId: true },
      },
    },
  });
  return {
    actor,
    contactIds: [
      ...new Set(
        classrooms.flatMap((classroom) => [
          classroom.teacherId,
          ...classroom.teachingAssignments.map(({ teacherId }) => teacherId),
        ]),
      ),
    ],
  };
};

export const getContacts = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }
    const { actor, contactIds } = await getAllowedContactIds(userId);
    const contacts = await prisma.user.findMany({
      where: { id: { in: contactIds }, schoolId: actor.schoolId, isArchived: false },
      select: { id: true, name: true, role: true, avatar: true },
    });

    // Map online status, unread counts, and latest message timestamps
    const unreadCounts = await prisma.directMessage.groupBy({
      by: ['senderId'],
      where: { receiverId: userId, read: false },
      _count: { id: true },
    });

    const unreadMap = new Map<string, number>();
    for (const u of unreadCounts) {
      unreadMap.set(u.senderId, u._count.id);
    }

    const directMessages = await communicationService.getMessagesForUser(userId);

    const lastMsgMap = new Map<string, { content: string; createdAt: string }>();
    for (const msg of directMessages) {
      const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!lastMsgMap.has(otherId)) {
        lastMsgMap.set(otherId, { content: msg.content, createdAt: msg.createdAt });
      }
    }

    const enhancedContacts = contacts.map((c) => {
      const lastMsg = lastMsgMap.get(c.id);
      return {
        ...c,
        online: isUserOnline(c.id),
        unreadCount: unreadMap.get(c.id) || 0,
        lastMessage: lastMsg?.content || '',
        lastMessageAt: lastMsg?.createdAt || '',
      };
    });

    // Sort contacts: newest message activity first, then unread counts, then alphabetical
    enhancedContacts.sort((a, b) => {
      const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
      return a.name.localeCompare(b.name);
    });

    res.json({ status: 'success', contacts: enhancedContacts });
  } catch (error) {
    logger.error('Error fetching chat contacts', error);
    res.status(500).json({ status: 'error', message: 'Failed to load contacts' });
  }
};

export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { contactId } = req.params;

    if (!userId) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

    const messages = await communicationService.getConversation(userId, contactId);
    res.json({ status: 'success', messages });
  } catch (error) {
    logger.error('Error fetching chat history', error);
    res.status(500).json({ status: 'error', message: 'Failed to load chat history' });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { contactId } = req.params;

    if (!userId || !contactId) {
      return res.status(400).json({ status: 'error', message: 'Missing parameters' });
    }

    await prisma.directMessage.updateMany({
      where: {
        senderId: contactId,
        receiverId: userId,
        read: false,
        OR: [{ approvedByParent: null }, { approvedByParent: true }],
      },
      data: { read: true },
    });

    res.json({ status: 'success', message: 'Messages marked as read' });
  } catch (error) {
    logger.error('Error marking messages as read', error);
    res.status(500).json({ status: 'error', message: 'Failed to mark messages as read' });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const senderId = req.user?.id;
    const { contactId } = req.params;
    const { content } = req.body;

    if (!senderId) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    if (!content?.trim() || content.trim().length > 10_000)
      return res.status(400).json({ status: 'error', message: 'Content required' });

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      include: {
        studentProfile: true,
        studentAcademicEnrollments: {
          where: { status: 'active' },
          include: { cohort: true },
          orderBy: { enrolledAt: 'desc' },
          take: 1,
        },
        parentControlSettings: true,
      },
    });
    const { actor, contactIds } = await getAllowedContactIds(senderId);
    const receiver = await prisma.user.findFirst({
      where: { id: contactId, schoolId: actor.schoolId, isArchived: false },
    });

    if (!sender || !receiver || !contactIds.includes(contactId)) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const requiresParentApproval = Boolean(
      sender.role === 'student' &&
      sender.studentProfile &&
      sender.studentAcademicEnrollments[0]?.cohort.gradeLevel < 7 &&
      sender.parentControlSettings?.requireApprovalForOutboundMsgs,
    );
    const guardians = requiresParentApproval
      ? await prisma.parentStudent.findMany({
          where: { studentId: sender.id, isActive: true, parent: { isArchived: false } },
          select: { parentId: true },
        })
      : [];
    if (requiresParentApproval && !guardians.length)
      return res.status(409).json({
        status: 'error',
        message: 'An active guardian is required before this student can send messages.',
      });
    const message = await communicationService.addDirectMessage({
      senderId,
      receiverId: contactId,
      content: content.trim(),
      read: false,
      approvedByParent: requiresParentApproval ? false : undefined,
    });
    if (requiresParentApproval) {
      await Promise.all(
        guardians.map(({ parentId }) =>
          notificationService.dispatchNotification({
            recipientId: parentId,
            senderId: sender.id,
            senderName: sender.name,
            senderRole: sender.role,
            title: 'Student message awaiting approval',
            body: `${sender.name} drafted a message to ${receiver.name}. Review it in the parent dashboard.`,
            category: 'COMMUNICATION',
            severity: 'high',
            type: 'message',
          }),
        ),
      );
    } else {
      sendToUser(contactId, 'chatMessage', message);
    }
    res.status(requiresParentApproval ? 202 : 201).json({
      status: 'success',
      message,
      pendingParentApproval: requiresParentApproval,
    });
  } catch (error) {
    logger.error('Error sending message', error);
    res.status(400).json({ status: 'error', message: (error as Error).message });
  }
};
