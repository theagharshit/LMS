import { prisma } from './prismaClient';

export class BadgeService {
  public async getBadgeDefinitions() {
    return prisma.badgeDefinition.findMany();
  }

  public async assignBadge(
    studentProfileId: string,
    badgeDefinitionId: string,
    assignedBy: string,
    remarks?: string,
  ) {
    const existing = await prisma.studentBadge.findFirst({
      where: { studentProfileId, badgeDefinitionId },
    });
    if (existing) {
      return existing;
    }

    return prisma.studentBadge.create({
      data: {
        studentProfileId,
        badgeDefinitionId,
        earnedDate: new Date().toISOString().split('T')[0],
        assignedBy,
        remarks,
      },
    });
  }

  public async createBadgeDefinition(data: any) {
    return prisma.badgeDefinition.create({
      data: {
        id: data.id || `bdg-def-${Date.now()}`,
        title: data.title,
        description: data.description || '',
        icon: data.icon || '🌟',
        category: data.category || 'academic',
        isAutomatic: data.isAutomatic || false,
        criteria: data.criteria,
      },
    });
  }

  public async deleteBadgeDefinition(id: string) {
    await prisma.studentBadge.deleteMany({ where: { badgeDefinitionId: id } });
    return prisma.badgeDefinition.deleteMany({ where: { id } });
  }
}

export const badgeService = new BadgeService();
