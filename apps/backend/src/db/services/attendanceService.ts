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
      date: string;
      status: 'present' | 'absent' | 'late' | 'excused';
      remarks?: string;
    }>,
    markedById?: string,
  ) {
    if (!markedById) throw new Error('Authenticated attendance marker is required.');
    const marker = await this.validateMarker(markedById);
    const recordDates = [...new Set(records.map((record) => record.date))];
    const holiday = await prisma.schoolHoliday.findFirst({
      where: {
        schoolId: marker.schoolId,
        isArchived: false,
        date: { in: recordDates.map((date) => new Date(`${date}T00:00:00.000Z`)) },
      },
    });
    if (holiday)
      throw new Error(`Attendance cannot be marked on the school holiday: ${holiday.name}.`);
    const uniqueStudentIds = [...new Set(records.map((record) => record.studentId))];
    if (uniqueStudentIds.length !== records.length)
      throw new Error('Each student may appear only once in a bulk attendance request.');
    const students = await prisma.user.findMany({
      where: {
        id: { in: uniqueStudentIds },
        role: 'student',
        schoolId: marker.schoolId,
        isArchived: false,
        ...(marker.role === 'teacher'
          ? {
              enrollments: {
                some: {
                  isActive: true,
                  classroom: {
                    isArchived: false,
                    OR: [
                      { teacherId: marker.id },
                      {
                        teachingAssignments: {
                          some: { teacherId: marker.id, isActive: true },
                        },
                      },
                    ],
                  },
                },
              },
            }
          : {}),
      },
      select: { id: true, name: true },
    });
    if (students.length !== uniqueStudentIds.length)
      throw new Error('Attendance may only be marked for active students in your classes.');
    const studentNames = new Map(students.map((student) => [student.id, student.name]));
    const result = await withDeadlockRetry(() =>
      prisma.$transaction(
        records.map((record) =>
          prisma.attendanceRecord.upsert({
            where: { id: `${record.studentId}:${record.date}` },
            update: { status: record.status, remarks: record.remarks, markedById },
            create: {
              id: `${record.studentId}:${record.date}`,
              studentId: record.studentId,
              date: record.date,
              status: record.status,
              remarks: record.remarks,
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
    const alerts = records.filter((record) => ['absent', 'late'].includes(record.status));
    if (alerts.length) {
      const guardianLinks = await prisma.parentStudent.findMany({
        where: {
          studentId: { in: alerts.map((record) => record.studentId) },
          isActive: true,
          parent: { isArchived: false },
        },
        select: { studentId: true, parentId: true },
      });
      await Promise.all(
        alerts.flatMap((record) => {
          const recipients = [
            record.studentId,
            ...guardianLinks
              .filter((link) => link.studentId === record.studentId)
              .map((link) => link.parentId),
          ];
          return recipients.map((recipientId) =>
            notificationService.dispatchNotification({
              recipientId,
              senderId: marker.id,
              senderName: marker.name,
              senderRole: marker.role,
              title: `Attendance Alert: ${studentNames.get(record.studentId)} marked ${record.status.toUpperCase()}`,
              body: `${studentNames.get(record.studentId)}'s attendance was recorded as ${record.status} on ${record.date}.`,
              category: 'CRITICAL',
              severity: record.status === 'absent' ? 'urgent' : 'high',
              type: 'attendance',
            }),
          );
        }),
      );
    }
    return result.map((record) => ({
      ...record,
      studentName: studentNames.get(record.studentId)!,
      markedBy: marker.name,
      status: record.status as AttendanceRecord['status'],
      remarks: record.remarks || undefined,
      checkInTime: record.checkInTime || undefined,
    }));
  }
  public async getAttendance(): Promise<AttendanceRecord[]> {
    const records = await prisma.attendanceRecord.findMany({
      include: { student: true, markedBy: true },
    });
    return records.map((r) => ({
      ...r,
      studentName: r.student.name,
      markedBy: r.markedBy.name,
      status: r.status as any,
      remarks: r.remarks || undefined,
      checkInTime: r.checkInTime || undefined,
    }));
  }

  public async markAttendance(
    studentId: string,
    date: string,
    status: 'present' | 'absent' | 'late' | 'excused',
    remarks?: string,
    markedById?: string,
  ): Promise<AttendanceRecord> {
    if (!markedById) throw new Error('Authenticated attendance marker is required.');
    const marker = await this.validateMarker(markedById);
    const holiday = await prisma.schoolHoliday.findFirst({
      where: {
        schoolId: marker.schoolId,
        isArchived: false,
        date: new Date(`${date}T00:00:00.000Z`),
      },
    });
    if (holiday)
      throw new Error(`Attendance cannot be marked on the school holiday: ${holiday.name}.`);
    const student = await prisma.user.findFirst({
      where: {
        id: studentId,
        role: 'student',
        schoolId: marker.schoolId,
        isArchived: false,
        ...(marker.role === 'teacher'
          ? {
              enrollments: {
                some: {
                  isActive: true,
                  classroom: {
                    isArchived: false,
                    OR: [
                      { teacherId: marker.id },
                      {
                        teachingAssignments: {
                          some: { teacherId: marker.id, isActive: true },
                        },
                      },
                    ],
                  },
                },
              },
            }
          : {}),
      },
      select: { name: true },
    });
    if (!student)
      throw new Error('Attendance may only be marked for active students in your classes.');
    const existing = await prisma.attendanceRecord.findFirst({
      where: { studentId, date },
    });

    if (existing) {
      const updated = await prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: { status, remarks, markedById },
        include: { student: true, markedBy: true },
      });
      await this.refreshPercentage(studentId);
      await platformService.evaluateBadges(studentId);
      return {
        ...updated,
        studentName: updated.student.name,
        markedBy: updated.markedBy.name,
        status: updated.status as any,
        remarks: updated.remarks || undefined,
        checkInTime: updated.checkInTime || undefined,
      };
    }

    const created = await prisma.attendanceRecord.create({
      data: { studentId, date, status, remarks, markedById },
      include: { student: true, markedBy: true },
    });
    await this.refreshPercentage(studentId);
    await platformService.evaluateBadges(studentId);

    if (status === 'absent' || status === 'late') {
      const guardians = await prisma.parentStudent.findMany({
        where: { studentId, isActive: true, parent: { isArchived: false } },
        select: { parentId: true },
      });
      const recipients = [studentId, ...guardians.map(({ parentId }) => parentId)];
      await Promise.all(
        recipients.map((recipientId) =>
          notificationService.dispatchNotification({
            recipientId,
            senderId: marker.id,
            senderName: marker.name,
            senderRole: marker.role,
            title: `Attendance Alert: ${student.name} marked ${status.toUpperCase()}`,
            body: `${student.name}'s attendance was recorded as ${status} on ${date}.`,
            category: 'CRITICAL',
            severity: status === 'absent' ? 'urgent' : 'high',
            type: 'attendance',
          }),
        ),
      );
    }

    return {
      ...created,
      studentName: created.student.name,
      markedBy: created.markedBy.name,
      status: created.status as any,
      remarks: created.remarks || undefined,
      checkInTime: created.checkInTime || undefined,
    };
  }

  private async validateMarker(userId: string) {
    const marker = await prisma.user.findFirst({
      where: { id: userId, role: { in: ['teacher', 'admin'] }, isArchived: false },
      select: { id: true, name: true, role: true, schoolId: true },
    });
    if (!marker) throw new Error('Attendance marker must be an active teacher or administrator.');
    return marker;
  }
}

export const attendanceService = new AttendanceService();
