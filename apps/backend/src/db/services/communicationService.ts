import { prisma } from './prismaClient';
import { DirectMessage } from '@lms/shared';

export class CommunicationService {
  public async getDirectMessages(): Promise<DirectMessage[]> {
    const msgs = await prisma.directMessage.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return msgs.map((m) => ({
      ...m,
      senderRole: m.senderRole as any,
      approvedByParent: m.approvedByParent ?? undefined,
    }));
  }

  public async addDirectMessage(
    msg: Omit<DirectMessage, 'id' | 'createdAt'>,
  ): Promise<DirectMessage> {
    let validSenderId = msg.senderId;
    const sender = await prisma.user.findUnique({ where: { id: validSenderId } });
    if (!sender) {
      const firstUser =
        (await prisma.user.findFirst({ where: { role: 'parent' } })) ||
        (await prisma.user.findFirst());
      if (firstUser) validSenderId = firstUser.id;
    }

    let validReceiverId = msg.receiverId;
    const receiver = await prisma.user.findUnique({ where: { id: validReceiverId } });
    if (!receiver) {
      const firstTeacher =
        (await prisma.user.findFirst({ where: { role: 'teacher' } })) ||
        (await prisma.user.findFirst());
      if (firstTeacher) validReceiverId = firstTeacher.id;
    }

    const created = await prisma.directMessage.create({
      data: {
        senderId: validSenderId,
        senderName: msg.senderName,
        senderRole: msg.senderRole,
        senderAvatar: msg.senderAvatar,
        receiverId: validReceiverId,
        receiverName: msg.receiverName,
        content: msg.content,
        read: msg.read || false,
        approvedByParent: msg.approvedByParent,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    });
    return {
      ...created,
      senderRole: created.senderRole as any,
      approvedByParent: created.approvedByParent ?? undefined,
    };
  }
}

export const communicationService = new CommunicationService();
