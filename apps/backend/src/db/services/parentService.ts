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
    settings: Partial<ParentControlSettings>,
  ): Promise<ParentControlSettings> {
    const existing = await prisma.parentControlSettings.findUnique({ where: { studentId } });
    if (!existing)
      throw new Error('Parent control settings have not been configured for this student.');
    return prisma.parentControlSettings.update({
      where: { studentId },
      data: settings,
    });
  }
}

export const parentService = new ParentService();
