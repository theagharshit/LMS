import { prisma } from './prismaClient';
import { AttendanceRecord } from '@lms/shared';
import { notificationService } from './notificationService';
import { withDeadlockRetry } from '@utils/transaction';
import { platformService } from './platformService';
import { cacheService } from './cacheService';

export class AttendanceService {
  private async refreshPercentage(studentId: string) {
    const records = await prisma.attendanceRecord.findMany({
      where: { studentId },
      select: { status: true },
    });
    if (!records.length) return;
    const present = records.filter(
      (record) => record.status === 'present' || record.status === 'late',
    ).length;
    const attendancePercentage = Math.round((present / records.length) * 10_000) / 100;
    await prisma.studentProfile.updateMany({
      where: { userId: studentId },
      data: { attendancePercentage },
    });
    await cacheService.invalidate(`lms:performance:${studentId}`, 'lms:student-profiles');
  }

  public async markBulk(
    records: Array<{
      studentId: string;
      studentName: string;
      date: string;
      status: string;
      remarks?: string;
    }>,
    markedBy: string,
  ) {
    const result = await withDeadlockRetry(() =>
      prisma.$transaction(
        records.map((record) =>
          prisma.attendanceRecord.upsert({
            where: { id: `${record.studentId}:${record.date}` },
            update: { status: record.status, remarks: record.remarks, markedBy },
            create: {
              id: `${record.studentId}:${record.date}`,
              ...record,
              markedBy,
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
    const records = await prisma.attendanceRecord.findMany();
    return records.map((r) => ({
      ...r,
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
    markedBy: string = 'System',
  ): Promise<AttendanceRecord> {
    const existing = await prisma.attendanceRecord.findFirst({
      where: { studentId, date },
    });

    if (existing) {
      const updated = await prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: { status, remarks, markedBy },
      });
      await this.refreshPercentage(studentId);
      await platformService.evaluateBadges(studentId);
      return {
        ...updated,
        status: updated.status as any,
        remarks: updated.remarks || undefined,
        checkInTime: updated.checkInTime || undefined,
      };
    }

    const created = await prisma.attendanceRecord.create({
      data: { studentId, studentName, date, status, remarks, markedBy },
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
      status: created.status as any,
      remarks: created.remarks || undefined,
      checkInTime: created.checkInTime || undefined,
    };
  }
}

export const attendanceService = new AttendanceService();
