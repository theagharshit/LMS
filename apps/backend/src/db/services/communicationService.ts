import { prisma } from './prismaClient';
import { DirectMessage } from '@lms/shared';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const encryptionKey = () =>
  createHash('sha256')
    .update(
      process.env.MESSAGE_ENCRYPTION_KEY ||
        process.env.JWT_SECRET ||
        'sikshya-development-message-key',
    )
    .digest();

const encrypt = (plainText: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  return `enc:v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${encrypted.toString('base64')}`;
};

const decrypt = (value: string) => {
  if (!value.startsWith('enc:v1:')) return value;
  try {
    const [, , iv, tag, encrypted] = value.split(':');
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return '[Encrypted message unavailable]';
  }
};

export class CommunicationService {
  private toDirectMessage(message: any): DirectMessage {
    return {
      id: message.id,
      senderId: message.senderId,
      senderName: message.sender.name,
      senderRole: message.sender.role,
      senderAvatar: message.sender.avatar,
      receiverId: message.receiverId,
      receiverName: message.receiver.name,
      content: decrypt(message.content),
      read: message.read,
      approvedByParent: message.approvedByParent ?? undefined,
      createdAt: message.createdAt,
    };
  }

  public async getDirectMessages(): Promise<DirectMessage[]> {
    const msgs = await prisma.directMessage.findMany({
      include: { sender: true, receiver: true },
      orderBy: { createdAt: 'asc' },
    });
    return msgs.map((message) => this.toDirectMessage(message));
  }

  public async getConversation(userId: string, contactId: string): Promise<DirectMessage[]> {
    const messages = await prisma.directMessage.findMany({
      where: {
        AND: [
          {
            OR: [
              { senderId: userId, receiverId: contactId },
              { senderId: contactId, receiverId: userId },
            ],
          },
          {
            OR: [{ approvedByParent: null }, { approvedByParent: true }, { senderId: userId }],
          },
        ],
      },
      include: { sender: true, receiver: true },
      orderBy: { createdAt: 'asc' },
    });
    return messages.map((message) => this.toDirectMessage(message));
  }

  public async getMessagesForUser(userId: string): Promise<DirectMessage[]> {
    const messages = await prisma.directMessage.findMany({
      where: {
        AND: [
          { OR: [{ senderId: userId }, { receiverId: userId }] },
          {
            OR: [{ approvedByParent: null }, { approvedByParent: true }, { senderId: userId }],
          },
        ],
      },
      include: { sender: true, receiver: true },
      orderBy: { createdAt: 'desc' },
    });
    return messages.map((message) => this.toDirectMessage(message));
  }

  public async getPendingApprovalMessages(studentIds: string[]): Promise<DirectMessage[]> {
    if (!studentIds.length) return [];
    const messages = await prisma.directMessage.findMany({
      where: { senderId: { in: studentIds }, approvedByParent: false },
      include: { sender: true, receiver: true },
      orderBy: { createdAt: 'asc' },
    });
    return messages.map((message) => this.toDirectMessage(message));
  }

  public async approveMessage(id: string): Promise<DirectMessage> {
    const message = await prisma.directMessage.update({
      where: { id },
      data: { approvedByParent: true },
      include: { sender: true, receiver: true },
    });
    return this.toDirectMessage(message);
  }

  public async addDirectMessage(
    msg: Omit<
      DirectMessage,
      'id' | 'createdAt' | 'senderName' | 'senderRole' | 'senderAvatar' | 'receiverName'
    >,
  ): Promise<DirectMessage> {
    const sender = await prisma.user.findFirst({ where: { id: msg.senderId, isArchived: false } });
    const receiver = await prisma.user.findFirst({
      where: { id: msg.receiverId, isArchived: false, schoolId: sender?.schoolId },
    });
    if (!sender || !receiver)
      throw new Error('Sender and receiver must be active users in the same school.');

    const created = await prisma.directMessage.create({
      data: {
        senderId: sender.id,
        receiverId: receiver.id,
        content: encrypt(msg.content),
        read: false,
        approvedByParent: msg.approvedByParent,
        createdAt: new Date().toISOString(),
      },
      include: { sender: true, receiver: true },
    });
    return this.toDirectMessage(created);
  }
}

export const communicationService = new CommunicationService();
