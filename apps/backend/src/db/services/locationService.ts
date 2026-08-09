import { prisma } from './prismaClient';
import { StudentLocationRecord } from '@lms/shared';

export class LocationService {
  public async getStudentLocations(): Promise<StudentLocationRecord[]> {
    const locations = await prisma.studentLocationRecord.findMany();
    return locations.map((l) => ({
      ...l,
      category: l.category as any,
      updatedByRole: l.updatedByRole as any,
      busNumber: l.busNumber || undefined,
      notes: l.notes || undefined,
    }));
  }

  public async getStudentLocationById(
    studentId: string,
  ): Promise<StudentLocationRecord | undefined> {
    const l = await prisma.studentLocationRecord.findFirst({
      where: { studentId },
    });
    if (!l) return undefined;
    return {
      ...l,
      category: l.category as any,
      updatedByRole: l.updatedByRole as any,
      busNumber: l.busNumber || undefined,
      notes: l.notes || undefined,
    };
  }

  public async updateStudentLocation(
    studentId: string,
    studentName: string,
    location: string,
    category: StudentLocationRecord['category'],
    updatedBy: string,
    updatedByRole: 'teacher' | 'admin',
    busNumber?: string,
    notes?: string,
  ): Promise<StudentLocationRecord> {
    const existing = await prisma.studentLocationRecord.findFirst({
      where: { studentId },
    });

    if (existing) {
      const updated = await prisma.studentLocationRecord.update({
        where: { id: existing.id },
        data: {
          currentLocation: location,
          category,
          updatedBy,
          updatedByRole,
          busNumber,
          notes,
          updatedAt: new Date().toISOString(),
        },
      });
      return {
        ...updated,
        category: updated.category as any,
        updatedByRole: updated.updatedByRole as any,
        busNumber: updated.busNumber || undefined,
        notes: updated.notes || undefined,
      };
    }

    const created = await prisma.studentLocationRecord.create({
      data: {
        studentId,
        studentName,
        currentLocation: location,
        category,
        updatedBy,
        updatedByRole,
        busNumber,
        notes,
        updatedAt: new Date().toISOString(),
      },
    });
    return {
      ...created,
      category: created.category as any,
      updatedByRole: created.updatedByRole as any,
      busNumber: created.busNumber || undefined,
      notes: created.notes || undefined,
    };
  }
}

export const locationService = new LocationService();
