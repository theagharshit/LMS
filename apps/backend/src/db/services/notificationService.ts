import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import {
  NotificationItem,
  NotificationPreference,
  NotificationCategory,
  NotificationSeverity,
  NotificationType,
} from '@lms/shared';
import { sendToUser } from '@utils/realtime';
import { logger } from '@utils/logger';
import { randomUUID } from 'node:crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const mapNotification = (record: any): NotificationItem => ({
  id: record.id,
  recipientId: record.recipientId,
  senderId: record.senderId || undefined,
  senderName: record.sender?.name,
  senderRole: record.sender?.role,
  title: record.title,
  body: record.body,
  category: record.category as NotificationCategory,
  severity: record.severity as NotificationSeverity,
  type: record.type as NotificationType,
  broadcastId: record.broadcastId || undefined,
  targetAudience: record.targetAudience || undefined,
  read: record.read,
  createdAt: record.createdAt,
});

export class NotificationService {
  /**
   * Notification records are relational data. Never create a preference or
   * notification for an ID supplied by a stale browser session or an
   * optimistic client-side record.
   */
  public async hasActiveUser(userId: string): Promise<boolean> {
    return Boolean(
      await prisma.user.findFirst({
        where: { id: userId, isArchived: false },
        select: { id: true },
      }),
    );
  }

  public async getNotificationPreferences(userId: string): Promise<NotificationPreference> {
    if (!(await this.hasActiveUser(userId))) {
      return {
        userId,
        enableAcademic: true,
        enableCommunication: true,
        enableReminders: true,
      };
    }

    let pref = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      pref = await prisma.notificationPreference.create({
        data: {
          userId,
          enableAcademic: true,
          enableCommunication: true,
          enableReminders: true,
        },
      });
    }

    return {
      userId: pref.userId,
      enableAcademic: pref.enableAcademic,
      enableCommunication: pref.enableCommunication,
      enableReminders: pref.enableReminders,
    };
  }

  public async updateNotificationPreferences(
    userId: string,
    prefs: Partial<Omit<NotificationPreference, 'userId'>>,
  ): Promise<NotificationPreference> {
    if (!(await this.hasActiveUser(userId))) {
      throw new Error('Notification preferences require an active user account.');
    }

    const updated = await prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        ...(prefs.enableAcademic !== undefined && { enableAcademic: prefs.enableAcademic }),
        ...(prefs.enableCommunication !== undefined && {
          enableCommunication: prefs.enableCommunication,
        }),
        ...(prefs.enableReminders !== undefined && { enableReminders: prefs.enableReminders }),
      },
      create: {
        userId,
        enableAcademic: prefs.enableAcademic ?? true,
        enableCommunication: prefs.enableCommunication ?? true,
        enableReminders: prefs.enableReminders ?? true,
      },
    });

    return {
      userId: updated.userId,
      enableAcademic: updated.enableAcademic,
      enableCommunication: updated.enableCommunication,
      enableReminders: updated.enableReminders,
    };
  }

  public async dispatchNotification(data: {
    recipientId: string;
    senderId?: string;
    senderName?: string;
    senderRole?: string;
    title: string;
    body: string;
    category: NotificationCategory;
    severity?: NotificationSeverity;
    type?: NotificationType;
    broadcastId?: string;
    targetAudience?: string;
    createdAt?: string;
  }): Promise<NotificationItem | null> {
    if (!(await this.hasActiveUser(data.recipientId))) {
      logger.warn(
        `[NotificationEngine] Ignored notification for missing or archived user ${data.recipientId}`,
      );
      return null;
    }

    const category = data.category || 'COMMUNICATION';
    const severity = data.severity || 'normal';
    const type = data.type || 'general';

    // Check target user preferences (CRITICAL category bypasses preferences)
    if (category !== 'CRITICAL') {
      const prefs = await this.getNotificationPreferences(data.recipientId);
      if (category === 'ACADEMIC' && !prefs.enableAcademic) {
        logger.info(
          `[NotificationEngine] Suppressed ACADEMIC notification for user ${data.recipientId} per preferences`,
        );
        return null;
      }
      if (category === 'COMMUNICATION' && !prefs.enableCommunication) {
        logger.info(
          `[NotificationEngine] Suppressed COMMUNICATION notification for user ${data.recipientId} per preferences`,
        );
        return null;
      }
    }

    const senderId =
      data.senderId && (await this.hasActiveUser(data.senderId)) ? data.senderId : undefined;
    const created = await prisma.notificationRecord.create({
      data: {
        recipientId: data.recipientId,
        senderId,
        title: data.title,
        body: data.body,
        category,
        severity,
        type,
        broadcastId: data.broadcastId,
        targetAudience: data.targetAudience,
        createdAt: data.createdAt || new Date().toISOString(),
      },
      include: { sender: true },
    });

    logger.info(
      `[NotificationEngine] Dispatched [${category}] notification "${data.title}" to ${data.recipientId}`,
    );

    const notificationItem = mapNotification(created);

    sendToUser(data.recipientId, 'notification', notificationItem);

    return notificationItem;
  }

  public async dispatchBroadcastNotification(data: {
    targetAudience: 'all' | 'students' | 'teachers' | 'parents' | 'classroom';
    classroomId?: string;
    senderId?: string;
    senderName?: string;
    senderRole?: string;
    title: string;
    body: string;
    category: NotificationCategory;
    severity?: NotificationSeverity;
    type?: NotificationType;
    schoolId: string;
  }): Promise<{ dispatchedCount: number; broadcastId: string; createdAt: string }> {
    let targetUserIds: string[] = [];

    if (data.targetAudience === 'classroom' && data.classroomId) {
      const enrollments = await prisma.classroomEnrollment.findMany({
        where: {
          classroomId: data.classroomId,
          isActive: true,
          classroom: { schoolId: data.schoolId, isArchived: false },
          student: { schoolId: data.schoolId, isArchived: false },
        },
        select: { studentId: true },
      });
      targetUserIds = enrollments.map((e) => e.studentId);
    } else {
      const roleFilter =
        data.targetAudience === 'all'
          ? undefined
          : data.targetAudience === 'students'
            ? 'student'
            : data.targetAudience === 'teachers'
              ? 'teacher'
              : data.targetAudience === 'parents'
                ? 'parent'
                : undefined;

      const users = await prisma.user.findMany({
        where: {
          schoolId: data.schoolId,
          isArchived: false,
          ...(roleFilter ? { role: roleFilter } : {}),
        },
        select: { id: true },
      });
      targetUserIds = users.map((u) => u.id);
    }

    const broadcastId = `broadcast-${randomUUID()}`;
    const createdAt = new Date().toISOString();
    let dispatchedCount = 0;
    for (const userId of targetUserIds) {
      const result = await this.dispatchNotification({
        ...data,
        recipientId: userId,
        broadcastId,
        targetAudience: data.targetAudience,
        createdAt,
      });
      if (result) dispatchedCount++;
    }

    return { dispatchedCount, broadcastId, createdAt };
  }

  public async getUserNotifications(userId: string): Promise<NotificationItem[]> {
    if (!(await this.hasActiveUser(userId))) {
      logger.warn(`[NotificationEngine] Ignored notification read for missing user ${userId}`);
      return [];
    }

    const records = await prisma.notificationRecord.findMany({
      where: { recipientId: userId },
      include: { sender: true },
      orderBy: { createdAt: 'desc' },
    });

    return records.map(mapNotification);
  }

  public async markAsRead(id: string, userId: string): Promise<boolean> {
    const result = await prisma.notificationRecord.updateMany({
      where: {
        id,
        recipientId: userId,
      },
      data: { read: true },
    });
    return result.count > 0;
  }

  public async markAllAsRead(userId: string): Promise<boolean> {
    await prisma.notificationRecord.updateMany({
      where: { recipientId: userId },
      data: { read: true },
    });
    return true;
  }

  public async deleteNotification(id: string, actorId: string): Promise<boolean> {
    const actor = await prisma.user.findFirst({
      where: { id: actorId, isArchived: false },
      select: { id: true, role: true, schoolId: true },
    });
    if (!actor) return false;
    const record = await prisma.notificationRecord.findFirst({
      where: { OR: [{ id }, { broadcastId: id }] },
      select: {
        id: true,
        recipientId: true,
        broadcastId: true,
        recipient: { select: { schoolId: true } },
      },
    });
    if (!record) return false;
    if (actor.role === 'admin' && record.recipient.schoolId === actor.schoolId) {
      const result = await prisma.notificationRecord.deleteMany({
        where: {
          recipient: { schoolId: actor.schoolId },
          ...(record.broadcastId ? { broadcastId: record.broadcastId } : { id: record.id }),
        },
      });
      return result.count > 0;
    }
    if (record.recipientId !== actor.id) return false;
    const result = await prisma.notificationRecord.deleteMany({ where: { id: record.id } });
    return result.count > 0;
  }

  public async clearReadNotifications(userId: string): Promise<boolean> {
    await prisma.notificationRecord.deleteMany({
      where: {
        recipientId: userId,
        read: true,
      },
    });
    return true;
  }
}

export const notificationService = new NotificationService();
