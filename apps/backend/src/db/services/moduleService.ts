import { prisma } from './prismaClient';
import { ModuleItem, Attachment } from '@lms/shared';

function mapModule(m: {
  id: string;
  classroomId: string;
  unitName: string;
  title: string;
  description: string;
  durationMinutes: number;
  completions: { studentId: string }[];
  attachments: { id: string; title: string; type: string; url: string; size: string | null }[];
}): ModuleItem {
  return {
    id: m.id,
    classroomId: m.classroomId,
    unitName: m.unitName,
    title: m.title,
    description: m.description,
    durationMinutes: m.durationMinutes,
    completedByStudentIds: m.completions.map((completion) => completion.studentId),
    attachments: m.attachments.map((a): Attachment => ({
      id: a.id,
      title: a.title,
      type: a.type as Attachment['type'],
      url: a.url,
      size: a.size || undefined,
    })),
  };
}

export class ModuleService {
  public async getModules(): Promise<ModuleItem[]> {
    const modules = await prisma.moduleItem.findMany({
      include: { attachments: true, completions: { select: { studentId: true } } },
      orderBy: { unitName: 'asc' },
    });
    return modules.map(mapModule);
  }

  public async getModulesByClassroom(classroomId: string): Promise<ModuleItem[]> {
    const modules = await prisma.moduleItem.findMany({
      where: { classroomId },
      include: { attachments: true, completions: { select: { studentId: true } } },
      orderBy: { unitName: 'asc' },
    });
    return modules.map(mapModule);
  }

  public async addModule(
    data: Omit<ModuleItem, 'id' | 'completedByStudentIds'> & {
      completedByStudentIds?: string[];
    },
  ): Promise<ModuleItem> {
    const created = await prisma.moduleItem.create({
      data: {
        classroomId: data.classroomId,
        unitName: data.unitName,
        title: data.title,
        description: data.description,
        durationMinutes: data.durationMinutes,
        completions: data.completedByStudentIds?.length
          ? {
              create: [...new Set(data.completedByStudentIds)].map((studentId) => ({ studentId })),
            }
          : undefined,
        attachments: data.attachments?.length
          ? {
              create: data.attachments.map((a) => ({
                title: a.title,
                type: a.type,
                url: a.url,
                size: a.size,
              })),
            }
          : undefined,
      },
      include: { attachments: true, completions: { select: { studentId: true } } },
    });
    return mapModule(created);
  }

  public async updateModule(
    id: string,
    data: Partial<Omit<ModuleItem, 'id'>>,
  ): Promise<ModuleItem | null> {
    const existing = await prisma.moduleItem.findUnique({ where: { id } });
    if (!existing) return null;

    const updated = await prisma.$transaction(async (tx) => {
      if (data.attachments) {
        await tx.attachment.deleteMany({ where: { moduleItemId: id } });
      }
      if (data.completedByStudentIds) {
        await tx.moduleCompletion.deleteMany({ where: { moduleItemId: id } });
      }

      return tx.moduleItem.update({
        where: { id },
        data: {
          unitName: data.unitName,
          title: data.title,
          description: data.description,
          durationMinutes: data.durationMinutes,
          attachments: data.attachments?.length
            ? {
                create: data.attachments.map((a) => ({
                  title: a.title,
                  type: a.type,
                  url: a.url,
                  size: a.size,
                })),
              }
            : undefined,
          completions: data.completedByStudentIds?.length
            ? {
                create: [...new Set(data.completedByStudentIds)].map((studentId) => ({
                  studentId,
                })),
              }
            : undefined,
        },
        include: { attachments: true, completions: { select: { studentId: true } } },
      });
    });
    return mapModule(updated);
  }

  public async deleteModule(id: string): Promise<boolean> {
    const result = await prisma.moduleItem.deleteMany({ where: { id } });
    return result.count > 0;
  }
}

export const moduleService = new ModuleService();
