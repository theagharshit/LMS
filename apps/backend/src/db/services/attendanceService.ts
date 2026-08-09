import { prisma } from './prismaClient';
import { AttendanceRecord } from '@lms/shared';

export class AttendanceService {
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
  ): Promise<AttendanceRecord> {
    const existing = await prisma.attendanceRecord.findFirst({
      where: { studentId, date },
    });

    if (existing) {
      const updated = await prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: { status, remarks },
      });
      return {
        ...updated,
        status: updated.status as any,
        remarks: updated.remarks || undefined,
        checkInTime: updated.checkInTime || undefined,
      };
    }

    const created = await prisma.attendanceRecord.create({
      data: { studentId, studentName, date, status, remarks, markedBy: 'System' },
    });
    return {
      ...created,
      status: created.status as any,
      remarks: created.remarks || undefined,
      checkInTime: created.checkInTime || undefined,
    };
  }
}

export const attendanceService = new AttendanceService();
