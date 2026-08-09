import { prisma } from './prismaClient';
import { ParentControlSettings } from '@lms/shared';

export class ParentService {
  public async getParentControls(): Promise<Record<string, ParentControlSettings>> {
    const controls = await prisma.parentControlSettings.findMany();
    return controls.reduce(
      (acc, c) => {
        acc[c.studentId] = c;
        return acc;
      },
      {} as Record<string, ParentControlSettings>,
    );
  }

  public async updateParentControls(
    studentId: string,
    settings: ParentControlSettings,
  ): Promise<ParentControlSettings> {
    return prisma.parentControlSettings.upsert({
      where: { studentId },
      update: settings,
      create: { ...settings, studentId },
    });
  }
}

export const parentService = new ParentService();
