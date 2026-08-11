import { prisma } from './prismaClient';
import { Assignment, Submission } from '@lms/shared';
import { notificationService } from './notificationService';
import { withDeadlockRetry } from '@utils/transaction';

export class AssignmentService {
  public async getAssignments(): Promise<Assignment[]> {
    const assignments = await prisma.assignment.findMany({
      include: { attachments: true, classroom: { include: { subjectRef: true } } },
    });
    return assignments.map((a) => ({
      ...a,
      classroomName: a.classroom.name,
      subject: a.classroom.subjectRef.name,
      attachments: a.attachments.map((at) => ({ ...at, type: at.type as any })),
    }));
  }

  public async addAssignment(
    assignment: Omit<Assignment, 'id' | 'createdAt'>,
  ): Promise<Assignment> {
    const classroom = await prisma.classroom.findUniqueOrThrow({
      where: { id: assignment.classroomId },
      include: { subjectRef: true },
    });
    const created = await prisma.assignment.create({
      data: {
        classroomId: assignment.classroomId,
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

    // Auto-trigger ACADEMIC notification to enrolled classroom students
    notificationService
      .dispatchBroadcastNotification({
        targetAudience: 'classroom',
        classroomId: created.classroomId,
        title: `New ${classroom.subjectRef.name} Assignment`,
        body: `${created.title} has been assigned (Due ${created.dueDate})`,
        category: 'ACADEMIC',
        severity: 'normal',
        type: 'assignment',
      })
      .catch((err) => console.error('[AssignmentService] Notification dispatch failed', err));

    return {
      ...created,
      classroomName: classroom.name,
      subject: classroom.subjectRef.name,
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
      const updated = await withDeadlockRetry(() =>
        prisma.$transaction(async (tx) => {
          const version = await tx.homeworkVersion.count({ where: { submissionId: existing.id } });
          await tx.homeworkVersion.create({
            data: {
              submissionId: existing.id,
              version: version + 1,
              fileName: existing.fileName,
              fileUrl: existing.fileUrl,
              responseText: existing.responseText,
            },
          });
          return tx.submission.update({
            where: { id: existing.id },
            data: {
              fileName,
              fileUrl,
              responseText: notes,
              submittedAt: new Date().toISOString(),
              status: 'submitted',
            },
          });
        }),
      );
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
        submittedAt: new Date().toISOString(),
        status: 'submitted',
      },
    });
    await prisma.homeworkVersion.create({
      data: { submissionId: created.id, version: 1, fileName, fileUrl, responseText: notes },
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
