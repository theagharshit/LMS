import { prisma } from './prismaClient';
import { Assignment, Submission } from '@lms/shared';
import { notificationService } from './notificationService';
import { withDeadlockRetry } from '@utils/transaction';

const mapSubmission = (submission: any): Submission => ({
  ...submission,
  studentName: submission.student.name,
  studentAvatar: submission.student.avatar,
  status: submission.status as Submission['status'],
  fileUrl: submission.fileUrl || undefined,
  fileName: submission.fileName || undefined,
  responseText: submission.responseText || undefined,
  grade: submission.grade ?? undefined,
  feedback: submission.feedback || undefined,
  history: (submission.versions || []).map((version: any) => ({
    id: version.id,
    version: version.version,
    submittedAt: version.createdAt.toISOString(),
    fileUrl: version.fileUrl || undefined,
    fileName: version.fileName || undefined,
    responseText: version.responseText || undefined,
    status: 'submitted' as const,
  })),
});

export class AssignmentService {
  public async getAssignments(): Promise<Assignment[]> {
    const assignments = await prisma.assignment.findMany({
      include: {
        attachments: true,
        classroom: { include: { subjectRef: true } },
        createdBy: { select: { id: true } },
      },
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
    creatorId?: string,
  ): Promise<Assignment> {
    const classroom = await prisma.classroom.findUniqueOrThrow({
      where: { id: assignment.classroomId },
      include: { subjectRef: true },
    });
    const created = await prisma.assignment.create({
      data: {
        classroomId: assignment.classroomId,
        createdById: creatorId || classroom.teacherId,
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
        schoolId: classroom.schoolId,
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
    const subs = await prisma.submission.findMany({
      include: { student: true, versions: { orderBy: { version: 'desc' } } },
    });
    return subs.map(mapSubmission);
  }

  public async submitHomework(
    assignmentId: string,
    fileName: string,
    fileUrl: string,
    studentId: string,
    notes?: string,
  ): Promise<Submission> {
    const asg = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { classroom: true },
    });
    if (!asg || asg.classroom.isArchived) throw new Error('Active assignment not found.');
    const stu = await prisma.user.findFirst({
      where: { id: studentId, role: 'student', isArchived: false },
    });
    if (!stu) throw new Error('Active student not found.');
    const enrollment = await prisma.classroomEnrollment.findFirst({
      where: { classroomId: asg.classroomId, studentId, isActive: true },
    });
    if (!enrollment) throw new Error('Student is not enrolled in this assignment classroom.');
    const validAssignmentId = asg.id;
    const validStudentId = stu.id;
    if (!fileUrl?.trim() && !notes?.trim())
      throw new Error('Attach a file or provide a typed response.');
    const dueAt = new Date(`${asg.dueDate}T${asg.dueTime || '23:59'}:00`);
    const submissionStatus =
      !Number.isNaN(dueAt.getTime()) && new Date() > dueAt ? 'late' : 'submitted';

    const existing = await prisma.submission.findFirst({
      where: { assignmentId: validAssignmentId, studentId: validStudentId },
    });

    if (existing) {
      await withDeadlockRetry(() =>
        prisma.$transaction(async (tx) => {
          const version = await tx.homeworkVersion.count({ where: { submissionId: existing.id } });
          const updated = await tx.submission.update({
            where: { id: existing.id },
            data: {
              fileName,
              fileUrl,
              responseText: notes,
              submittedAt: new Date().toISOString(),
              status: submissionStatus,
            },
          });
          await tx.homeworkVersion.create({
            data: {
              submissionId: existing.id,
              version: version + 1,
              fileName,
              fileUrl,
              responseText: notes,
            },
          });
          return updated;
        }),
      );
      const saved = await prisma.submission.findUniqueOrThrow({
        where: { id: existing.id },
        include: { student: true, versions: { orderBy: { version: 'desc' } } },
      });
      return mapSubmission(saved);
    }

    const created = await prisma.submission.create({
      data: {
        assignmentId: validAssignmentId,
        studentId: validStudentId,
        fileName,
        fileUrl,
        responseText: notes,
        submittedAt: new Date().toISOString(),
        status: submissionStatus,
      },
    });
    await prisma.homeworkVersion.create({
      data: { submissionId: created.id, version: 1, fileName, fileUrl, responseText: notes },
    });
    const saved = await prisma.submission.findUniqueOrThrow({
      where: { id: created.id },
      include: { student: true, versions: { orderBy: { version: 'desc' } } },
    });
    return mapSubmission(saved);
  }

  public async gradeSubmission(
    submissionId: string,
    grade: number,
    feedback: string,
    markerId: string,
    markerRole: string,
  ): Promise<Submission> {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { assignment: { include: { classroom: true } } },
    });
    if (!submission) throw new Error('Submission not found.');
    if (markerRole !== 'admin' && submission.assignment.classroom.teacherId !== markerId)
      throw new Error('Only the assigned classroom teacher may grade this submission.');
    if (!Number.isFinite(grade) || grade < 0 || grade > submission.assignment.totalPoints)
      throw new Error(`Grade must be between 0 and ${submission.assignment.totalPoints}.`);
    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: { grade, feedback: feedback.trim() || null, status: 'graded', annotated: true },
      include: { student: true, versions: { orderBy: { version: 'desc' } } },
    });
    await notificationService.dispatchNotification({
      recipientId: submission.studentId,
      senderId: markerId,
      title: `${submission.assignment.title} graded`,
      body: `Your submission received ${grade}/${submission.assignment.totalPoints}.`,
      category: 'ACADEMIC',
      severity: 'normal',
      type: 'assignment',
    });
    return mapSubmission(updated);
  }
}

export const assignmentService = new AssignmentService();
