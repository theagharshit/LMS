import { prisma } from './prismaClient';
import { AttendanceRecord } from '@lms/shared';
import { notificationService } from './notificationService';
import { withDeadlockRetry } from '@utils/transaction';
import { platformService } from './platformService';
import { cacheService } from './cacheService';

export class AttendanceService {
  private async refreshPercentage(studentId: string) {
    await cacheService.invalidate(`lms:performance:${studentId}`, 'lms:student-profiles');
  }

  public async markBulk(
    records: Array<{
      studentId: string;
      studentName: string;
      date: string;
      status: 'present' | 'absent' | 'late' | 'excused';
      remarks?: string;
    }>,
    markedById?: string,
  ) {
    if (markedById) await this.validateMarker(markedById);
    const result = await withDeadlockRetry(() =>
      prisma.$transaction(
        records.map((record) =>
          prisma.attendanceRecord.upsert({
            where: { id: `${record.studentId}:${record.date}` },
            update: { status: record.status, remarks: record.remarks, markedById },
            create: {
              id: `${record.studentId}:${record.date}`,
              ...record,
              markedById,
            },
          }),
        ),
      ),
    );
    await Promise.all(
      [...new Set(records.map((record) => record.studentId))].map((id) =>
        this.refreshPercentage(id),
      ),
    );
    await Promise.all(
      [...new Set(records.map((record) => record.studentId))].map((id) =>
        platformService.evaluateBadges(id),
      ),
    );
    return result;
  }
  public async getAttendance(): Promise<AttendanceRecord[]> {
    const records = await prisma.attendanceRecord.findMany({ include: { markedBy: true } });
    return records.map((r) => ({
      ...r,
      markedBy: r.markedBy?.name || 'System',
      status: r.status as any,
      remarks: r.remarks || undefined,
      checkInTime: r.checkInTime || undefined,
    }));
  }

  public async markAttendance(
    studentId: string,
    studentName: string,
    date: string,
    status: 'present' | 'absent' | 'late' | 'excused',
    remarks?: string,
    markedById?: string,
  ): Promise<AttendanceRecord> {
    if (markedById) await this.validateMarker(markedById);
    const existing = await prisma.attendanceRecord.findFirst({
      where: { studentId, date },
    });

    if (existing) {
      const updated = await prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: { status, remarks, markedById },
        include: { markedBy: true },
      });
      await this.refreshPercentage(studentId);
      await platformService.evaluateBadges(studentId);
      return {
        ...updated,
        markedBy: updated.markedBy?.name || 'System',
        status: updated.status as any,
        remarks: updated.remarks || undefined,
        checkInTime: updated.checkInTime || undefined,
      };
    }

    const created = await prisma.attendanceRecord.create({
      data: { studentId, studentName, date, status, remarks, markedById },
      include: { markedBy: true },
    });
    await this.refreshPercentage(studentId);
    await platformService.evaluateBadges(studentId);

    if (status === 'absent' || status === 'late') {
      notificationService
        .dispatchNotification({
          recipientId: studentId,
          title: `🚨 Attendance Alert: Marked ${status.toUpperCase()}`,
          body: `Attendance status recorded as ${status} on ${date}.`,
          category: 'CRITICAL',
          severity: 'urgent',
          type: 'attendance',
        })
        .catch((err) => console.error('[AttendanceService] Notification dispatch failed', err));
    }

    return {
      ...created,
      markedBy: created.markedBy?.name || 'System',
      status: created.status as any,
      remarks: created.remarks || undefined,
      checkInTime: created.checkInTime || undefined,
    };
  }

  private async validateMarker(userId: string) {
    const marker = await prisma.user.findFirst({
      where: { id: userId, role: { in: ['teacher', 'admin'] }, isArchived: false },
      select: { id: true },
    });
    if (!marker) throw new Error('Attendance marker must be an active teacher or administrator.');
  }
}

export const attendanceService = new AttendanceService();
