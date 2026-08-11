import { prisma } from './prismaClient';
import { StudyResource } from '@lms/shared';

function mapResource(r: {
  id: string;
  classroomId: string;
  teacherId: string;
  title: string;
  description: string | null;
  type: string;
  url: string;
  mimeType: string | null;
  sizeFormatted: string | null;
  tags: string[];
  createdAt: string;
}): StudyResource {
  return {
    id: r.id,
    classroomId: r.classroomId,
    teacherId: r.teacherId,
    title: r.title,
    description: r.description || undefined,
    type: r.type as StudyResource['type'],
    url: r.url,
    mimeType: r.mimeType || undefined,
    sizeFormatted: r.sizeFormatted || undefined,
    tags: r.tags,
    createdAt: r.createdAt,
  };
}

export class ResourceService {
  public async getAllResources(): Promise<StudyResource[]> {
    const resources = await prisma.studyResource.findMany({ orderBy: { createdAt: 'desc' } });
    return resources.map(mapResource);
  }

  public async getResourcesByClassroom(classroomId: string): Promise<StudyResource[]> {
    const resources = await prisma.studyResource.findMany({
      where: { classroomId },
      orderBy: { createdAt: 'desc' },
    });
    return resources.map(mapResource);
  }

  public async getResourcesByTeacher(teacherId: string): Promise<StudyResource[]> {
    const resources = await prisma.studyResource.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
    });
    return resources.map(mapResource);
  }

  public async addResource(
    data: Omit<StudyResource, 'id' | 'createdAt'>,
  ): Promise<StudyResource> {
    const created = await prisma.studyResource.create({
      data: {
        classroomId: data.classroomId,
        teacherId: data.teacherId,
        title: data.title,
        description: data.description,
        type: data.type,
        url: data.url,
        mimeType: data.mimeType,
        sizeFormatted: data.sizeFormatted,
        tags: data.tags || [],
        createdAt: new Date().toISOString(),
      },
    });
    return mapResource(created);
  }

  public async updateResource(
    id: string,
    data: Partial<Omit<StudyResource, 'id' | 'createdAt'>>,
  ): Promise<StudyResource | null> {
    const existing = await prisma.studyResource.findUnique({ where: { id } });
    if (!existing) return null;

    const updated = await prisma.studyResource.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        url: data.url,
        mimeType: data.mimeType,
        sizeFormatted: data.sizeFormatted,
        tags: data.tags,
      },
    });
    return mapResource(updated);
  }

  public async deleteResource(id: string): Promise<boolean> {
    const result = await prisma.studyResource.deleteMany({ where: { id } });
    return result.count > 0;
  }
}

export const resourceService = new ResourceService();
