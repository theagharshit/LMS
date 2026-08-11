import { prisma } from './prismaClient';

export class BadgeService {
  public async getBadgeDefinitions() {
    return prisma.badgeDefinition.findMany();
  }

  public async assignBadge(
    studentProfileId: string,
    badgeDefinitionId: string,
    assignedById?: string,
    remarks?: string,
  ) {
    if (assignedById) {
      const assigner = await prisma.user.findFirst({
        where: { id: assignedById, role: { in: ['teacher', 'admin'] }, isArchived: false },
        select: { id: true },
      });
      if (!assigner) throw new Error('Badge assigner must be an active teacher or administrator.');
    }
    const existing = await prisma.studentBadge.findFirst({
      where: { studentProfileId, badgeDefinitionId },
      include: { assignedBy: true },
    });
    if (existing) {
      return { ...existing, assignedBy: existing.assignedBy?.name || 'System' };
    }

    const created = await prisma.studentBadge.create({
      data: {
        studentProfileId,
        badgeDefinitionId,
        earnedDate: new Date().toISOString().split('T')[0],
        assignedById,
        remarks,
      },
      include: { assignedBy: true },
    });
    return { ...created, assignedBy: created.assignedBy?.name || 'System' };
  }

  public async createBadgeDefinition(data: any) {
    const title = String(data.title || '').trim();
    if (title.length < 3 || title.length > 80)
      throw new Error('Badge title must contain 3 to 80 characters.');
    if (data.criteria) {
      try {
        const criteria =
          typeof data.criteria === 'string' ? JSON.parse(data.criteria) : data.criteria;
        if (
          !criteria ||
          typeof criteria !== 'object' ||
          !('metric' in criteria) ||
          !('threshold' in criteria)
        )
          throw new Error();
      } catch {
        throw new Error(
          'Automatic badge criteria must be valid JSON with metric and threshold fields.',
        );
      }
    }
    if (
      !/^([\p{Emoji_Presentation}\p{Emoji}\u200d\ufe0f]+|[a-z][a-z0-9-]{1,39})$/iu.test(
        String(data.icon || '🌟'),
      )
    ) {
      throw new Error('Badge icon must be an emoji or a valid icon identifier.');
    }
    return prisma.badgeDefinition.create({
      data: {
        id: data.id || `bdg-def-${Date.now()}`,
        title,
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
