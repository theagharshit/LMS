import { Request, Response } from 'express';
import { prisma } from '@db/services/prismaClient';
import { sendToUser, isUserOnline } from '@utils/realtime';
import { logger } from '@utils/logger';

export const getContacts = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    let schoolId = (req.user as any)?.schoolId;

    if (!schoolId && userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      schoolId = user?.schoolId;
    }

    if (!userId || !userRole || !schoolId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    let contacts: any[] = [];

    if (userRole === 'admin') {
      contacts = await prisma.user.findMany({
        where: { schoolId, isArchived: false, id: { not: userId } },
        select: { id: true, name: true, role: true, avatar: true },
      });
    } else if (userRole === 'teacher') {
      const classrooms = await prisma.classroom.findMany({
        where: { teacherId: userId },
        include: { enrollments: true },
      });
      const studentIds = classrooms.flatMap((c) => c.enrollments.map((e) => e.studentId));

      const parents = await prisma.parentStudent.findMany({
        where: { studentId: { in: studentIds } },
        select: { parentId: true },
      });
      const parentIds = parents.map((p) => p.parentId);

      contacts = await prisma.user.findMany({
        where: {
          OR: [
            { id: { in: [...new Set([...studentIds, ...parentIds])] } },
            { role: { in: ['teacher', 'admin'] } },
          ],
          isArchived: false,
          id: { not: userId },
        },
        select: { id: true, name: true, role: true, avatar: true },
      });
    } else if (userRole === 'student') {
      const enrollments = await prisma.classroomEnrollment.findMany({
        where: { studentId: userId },
        select: { classroomId: true },
      });
      const classroomIds = enrollments.map((e) => e.classroomId);

      const classrooms = await prisma.classroom.findMany({
        where: { id: { in: classroomIds } },
      });
      const teacherIds = classrooms.map((c) => c.teacherId).filter(Boolean) as string[];

      contacts = await prisma.user.findMany({
        where: {
          id: { in: [...new Set(teacherIds)] },
          isArchived: false,
        },
        select: { id: true, name: true, role: true, avatar: true },
      });
    } else if (userRole === 'parent') {
      const children = await prisma.parentStudent.findMany({
        where: { parentId: userId },
        select: { studentId: true },
      });
      const studentIds = children.map((c) => c.studentId);

      const enrollments = await prisma.classroomEnrollment.findMany({
        where: { studentId: { in: studentIds } },
        select: { classroomId: true },
      });
      const classroomIds = enrollments.map((e) => e.classroomId);

      const classrooms = await prisma.classroom.findMany({
        where: { id: { in: classroomIds } },
      });
      const teacherIds = classrooms.map((c) => c.teacherId).filter(Boolean) as string[];

      contacts = await prisma.user.findMany({
        where: {
          id: { in: [...new Set(teacherIds)] },
          isArchived: false,
        },
        select: { id: true, name: true, role: true, avatar: true },
      });
    }

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

    const directMessages = await prisma.directMessage.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      select: {
        senderId: true,
        receiverId: true,
        content: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

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

    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: contactId },
          { senderId: contactId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    const formattedMessages = messages.map((m) => ({
      ...m,
      createdAt: m.createdAt,
    }));

    res.json({ status: 'success', messages: formattedMessages });
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
      where: { senderId: contactId, receiverId: userId, read: false },
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
    if (!content?.trim())
      return res.status(400).json({ status: 'error', message: 'Content required' });

    const sender = await prisma.user.findUnique({ where: { id: senderId } });
    const receiver = await prisma.user.findUnique({ where: { id: contactId } });

    if (!sender || !receiver) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const message = await prisma.directMessage.create({
      data: {
        senderId,
        senderName: sender.name,
        senderRole: sender.role,
        senderAvatar: sender.avatar,
        receiverId: contactId,
        receiverName: receiver.name,
        content: content.trim(),
        read: false,
        createdAt: new Date().toISOString(),
      },
    });

    const formattedMessage = { ...message, createdAt: message.createdAt };

    sendToUser(contactId, 'chatMessage', formattedMessage);

    res.status(201).json({ status: 'success', message: formattedMessage });
  } catch (error) {
    logger.error('Error sending message', error);
    res.status(500).json({ status: 'error', message: 'Failed to send message' });
  }
};
