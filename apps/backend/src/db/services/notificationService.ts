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
import { logger } from '@utils/logger';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export class NotificationService {
  public async getNotificationPreferences(userId: string): Promise<NotificationPreference> {
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
  }): Promise<NotificationItem | null> {
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

    const created = await prisma.notificationRecord.create({
      data: {
        recipientId: data.recipientId,
        senderId: data.senderId,
        senderName: data.senderName,
        senderRole: data.senderRole,
        title: data.title,
        body: data.body,
        category,
        severity,
        type,
        createdAt: new Date().toISOString(),
      },
    });

    logger.info(
      `[NotificationEngine] Dispatched [${category}] notification "${data.title}" to ${data.recipientId}`,
    );

    return {
      ...created,
      category: created.category as NotificationCategory,
      severity: created.severity as NotificationSeverity,
      type: created.type as NotificationType,
    };
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
  }): Promise<number> {
    let targetUserIds: string[] = [];

    if (data.targetAudience === 'classroom' && data.classroomId) {
      const enrollments = await prisma.classroomEnrollment.findMany({
        where: { classroomId: data.classroomId },
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
        where: roleFilter ? { role: roleFilter } : undefined,
        select: { id: true },
      });
      targetUserIds = users.map((u) => u.id);
    }

    let dispatchedCount = 0;
    for (const userId of targetUserIds) {
      const result = await this.dispatchNotification({
        ...data,
        recipientId: userId,
      });
      if (result) dispatchedCount++;
    }

    return dispatchedCount;
  }

  public async getUserNotifications(userId: string): Promise<NotificationItem[]> {
    const records = await prisma.notificationRecord.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => ({
      ...r,
      category: r.category as NotificationCategory,
      severity: r.severity as NotificationSeverity,
      type: r.type as NotificationType,
    }));
  }

  public async markAsRead(id: string): Promise<boolean> {
    await prisma.notificationRecord.update({
      where: { id },
      data: { read: true },
    });
    return true;
  }

  public async markAllAsRead(userId: string): Promise<boolean> {
    await prisma.notificationRecord.updateMany({
      where: { recipientId: userId },
      data: { read: true },
    });
    return true;
  }
}

export const notificationService = new NotificationService();
