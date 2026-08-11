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
  public async getDirectMessages(): Promise<DirectMessage[]> {
    const msgs = await prisma.directMessage.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return msgs.map((m) => ({
      ...m,
      content: decrypt(m.content),
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
        content: encrypt(msg.content),
        read: msg.read || false,
        approvedByParent: msg.approvedByParent,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    });
    return {
      ...created,
      content: msg.content,
      senderRole: created.senderRole as any,
      approvedByParent: created.approvedByParent ?? undefined,
    };
  }
}

export const communicationService = new CommunicationService();
