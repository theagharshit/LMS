import { prisma } from './prismaClient';
import { StudentLocationRecord } from '@lms/shared';

const locationInclude = {
  student: true,
  updater: true,
  externalReporter: true,
} as const;

const mapLocation = (record: any): StudentLocationRecord => ({
  id: record.id,
  studentId: record.studentId,
  studentName: record.student.name,
  currentLocation: record.currentLocation,
  category: record.category,
  busNumber: record.busNumber || undefined,
  updatedBy: record.updater?.name || record.externalReporter?.name || 'External reporter',
  updatedByRole:
    record.updater?.role === 'admin'
      ? 'admin'
      : record.updater?.role === 'teacher'
        ? 'teacher'
        : 'staff',
  notes: record.notes || undefined,
  latitude: record.latitude ?? undefined,
  longitude: record.longitude ?? undefined,
  updatedAt: record.updatedAt,
});

export class LocationService {
  public async getStudentLocations(): Promise<StudentLocationRecord[]> {
    const locations = await prisma.studentLocationRecord.findMany({ include: locationInclude });
    return locations.map(mapLocation);
  }

  public async getStudentLocationById(
    studentId: string,
  ): Promise<StudentLocationRecord | undefined> {
    const location = await prisma.studentLocationRecord.findUnique({
      where: { studentId },
      include: locationInclude,
    });
    return location ? mapLocation(location) : undefined;
  }

  public async updateStudentLocation(
    studentId: string,
    location: string,
    category: StudentLocationRecord['category'],
    updatedById: string,
    busNumber?: string,
    notes?: string,
  ): Promise<StudentLocationRecord> {
    const updated = await prisma.studentLocationRecord.upsert({
      where: { studentId },
      update: {
        currentLocation: location,
        category,
        updatedById,
        externalReporterId: null,
        busNumber,
        notes,
        updatedAt: new Date().toISOString(),
      },
      create: {
        studentId,
        currentLocation: location,
        category,
        updatedById,
        busNumber,
        notes,
        updatedAt: new Date().toISOString(),
      },
      include: locationInclude,
    });
    return mapLocation(updated);
  }
}

export const locationService = new LocationService();
