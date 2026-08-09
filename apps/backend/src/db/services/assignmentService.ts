import { prisma } from './prismaClient';
import { Assignment, Submission } from '@lms/shared';

export class AssignmentService {
  public async getAssignments(): Promise<Assignment[]> {
    const assignments = await prisma.assignment.findMany({
      include: { attachments: true },
    });
    return assignments.map((a) => ({
      ...a,
      attachments: a.attachments.map((at) => ({ ...at, type: at.type as any })),
    }));
  }

  public async addAssignment(
    assignment: Omit<Assignment, 'id' | 'createdAt'>,
  ): Promise<Assignment> {
    const created = await prisma.assignment.create({
      data: {
        classroomId: assignment.classroomId,
        classroomName: assignment.classroomName,
        subject: assignment.subject,
        title: assignment.title,
        instructions: assignment.instructions,
        dueDate: assignment.dueDate,
        dueTime: assignment.dueTime,
        totalPoints: assignment.totalPoints,
        rubric: assignment.rubric || [],
        createdAt: new Date().toISOString(),
        attachments: {
          create:
            assignment.attachments?.map((a) => ({
              title: a.title,
              type: a.type,
              url: a.url,
              size: a.size,
            })) || [],
        },
      },
      include: { attachments: true },
    });
    return {
      ...created,
      attachments: created.attachments.map((at) => ({ ...at, type: at.type as any })),
    };
  }

  public async getSubmissions(): Promise<Submission[]> {
    const subs = await prisma.submission.findMany();
    return subs.map((s) => ({
      ...s,
      status: s.status as any,
      fileUrl: s.fileUrl || undefined,
      fileName: s.fileName || undefined,
      responseText: s.responseText || undefined,
      grade: s.grade || undefined,
      feedback: s.feedback || undefined,
    }));
  }

  public async submitHomework(
    assignmentId: string,
    fileName: string,
    fileUrl: string,
    studentId: string,
    notes?: string,
  ): Promise<Submission> {
    let validAssignmentId = assignmentId;
    const asg = await prisma.assignment.findUnique({ where: { id: validAssignmentId } });
    if (!asg) {
      const firstAsg = await prisma.assignment.findFirst();
      if (firstAsg) validAssignmentId = firstAsg.id;
    }

    let validStudentId = studentId;
    const stu = await prisma.user.findUnique({ where: { id: validStudentId } });
    if (!stu) {
      validStudentId = 'user-stu-1';
    }

    const existing = await prisma.submission.findFirst({
      where: { assignmentId: validAssignmentId, studentId: validStudentId },
    });

    if (existing) {
      const updated = await prisma.submission.update({
        where: { id: existing.id },
        data: {
          fileName,
          fileUrl,
          responseText: notes,
          submittedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'submitted',
        },
      });
      return {
        ...updated,
        status: updated.status as any,
        fileUrl: updated.fileUrl || undefined,
        fileName: updated.fileName || undefined,
        responseText: updated.responseText || undefined,
        grade: updated.grade || undefined,
        feedback: updated.feedback || undefined,
      };
    }

    const created = await prisma.submission.create({
      data: {
        assignmentId: validAssignmentId,
        studentId: validStudentId,
        studentName: stu?.name || 'Aarav Sharma',
        studentAvatar:
          stu?.avatar ||
          'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
        fileName,
        fileUrl,
        responseText: notes,
        submittedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'submitted',
      },
    });
    return {
      ...created,
      status: created.status as any,
      fileUrl: created.fileUrl || undefined,
      fileName: created.fileName || undefined,
      responseText: created.responseText || undefined,
      grade: created.grade || undefined,
      feedback: created.feedback || undefined,
    };
  }
}

export const assignmentService = new AssignmentService();
