import { prisma } from './prismaClient';
import { Classroom, StreamPost } from '@lms/shared';
import { withDeadlockRetry } from '@utils/transaction';
import { normalizeCohortSelection } from '@utils/cohortValidation';

export class ClassroomService {
  public async getClassrooms(): Promise<Classroom[]> {
    const classrooms = await prisma.classroom.findMany({
      where: { isArchived: false },
      include: { enrollments: true, subjectRef: true, cohortRef: true, teacher: true },
    });
    return classrooms.map((c) => ({
      id: c.id,
      name: c.name,
      subject: c.subjectRef.name,
      gradeLevel: c.cohortRef.gradeLevel,
      section: c.cohortRef.section,
      teacherId: c.teacherId,
      teacherName: c.teacher.name,
      teacherAvatar: c.teacher.avatar,
      roomNumber: c.roomNumber,
      colorTheme: c.colorTheme,
      bannerImage: c.bannerImage,
      studentCount: c.enrollments.length,
      enrolledStudentIds: c.enrollments.map((e) => e.studentId),
      meetLink: c.meetLink || undefined,
      code: c.code,
    }));
  }

  public async addClassroom(
    classroom: Omit<Classroom, 'id' | 'code' | 'studentCount'>,
  ): Promise<Classroom> {
    const { gradeLevel, section } = normalizeCohortSelection(
      classroom.gradeLevel,
      classroom.section,
    );
    const code = `CLS${Math.floor(1000 + Math.random() * 9000)}`;
    let validTeacherId = classroom.teacherId;
    if (validTeacherId) {
      const teacher = await prisma.user.findUnique({
        where: { id: validTeacherId },
        include: { teacherSubjects: { include: { subject: true } } },
      });
      if (!teacher) validTeacherId = 'user-teach-1';
      else if (
        teacher.role !== 'teacher' ||
        (teacher.teacherSubjects.length > 0 &&
          !teacher.teacherSubjects
            .map((entry) => entry.subject.name)
            .some((subject) => subject.toLowerCase() === classroom.subject.toLowerCase()))
      ) {
        throw new Error(`Teacher is not allocated to the subject ${classroom.subject}.`);
      }
    } else {
      validTeacherId = 'user-teach-1';
    }

    const created = await prisma.$transaction(async (tx) => {
      const teacher = await tx.user.findUniqueOrThrow({ where: { id: validTeacherId } });
      const school = await tx.school.findUniqueOrThrow({ where: { id: teacher.schoolId } });
      const subject = await tx.subject.upsert({
        where: { schoolId_name: { schoolId: school.id, name: classroom.subject } },
        update: {},
        create: { schoolId: school.id, name: classroom.subject },
      });
      const cohort = await tx.academicCohort.upsert({
        where: {
          schoolId_gradeLevel_section: {
            schoolId: school.id,
            gradeLevel,
            section,
          },
        },
        update: {},
        create: {
          schoolId: school.id,
          gradeLevel,
          section,
        },
      });
      return tx.classroom.create({
        data: {
          name: classroom.name,
          teacherId: validTeacherId,
          roomNumber: classroom.roomNumber,
          colorTheme: classroom.colorTheme,
          bannerImage: classroom.bannerImage,
          meetLink: classroom.meetLink,
          code,
          maxCapacity: (classroom as any).maxCapacity || 40,
          schoolId: school.id,
          subjectId: subject.id,
          cohortId: cohort.id,
        },
        include: {
          enrollments: true,
          subjectRef: true,
          cohortRef: true,
          teacher: true,
        },
      });
    });
    return {
      ...created,
      subject: created.subjectRef.name,
      gradeLevel: created.cohortRef.gradeLevel,
      section: created.cohortRef.section,
      teacherName: created.teacher.name,
      teacherAvatar: created.teacher.avatar,
      studentCount: created.enrollments.length,
      meetLink: created.meetLink || undefined,
    };
  }

  public async deleteClassroom(id: string) {
    return prisma.classroom.updateMany({ where: { id }, data: { isArchived: true } });
  }

  public async enrollStudent(classroomId: string, studentId: string) {
    return withDeadlockRetry(async () =>
      prisma.$transaction(async (tx) => {
        const classroom = await tx.classroom.findUnique({
          where: { id: classroomId },
          include: { _count: { select: { enrollments: true } } },
        });
        if (!classroom || classroom.isArchived) throw new Error('Classroom not found.');
        if (classroom._count.enrollments >= classroom.maxCapacity)
          throw new Error('Classroom capacity reached.');
        return tx.classroomEnrollment.upsert({
          where: { classroomId_studentId: { classroomId, studentId } },
          create: { classroomId, studentId },
          update: {},
        });
      }),
    );
  }

  public async getStreamPosts(): Promise<StreamPost[]> {
    const posts = await prisma.streamPost.findMany({
      include: { comments: true, attachments: true },
      orderBy: { createdAt: 'desc' },
    });
    return posts.map((p) => ({
      ...p,
      role: p.authorRole as any,
      authorRole: p.authorRole as any,
      commentsCount: p.comments.length,
      comments: p.comments.map((c) => ({ ...c })),
      attachments: p.attachments.map((a) => ({ ...a, type: a.type as any })),
    }));
  }

  public async addStreamPost(
    post: Omit<StreamPost, 'id' | 'createdAt' | 'commentsCount'>,
  ): Promise<StreamPost> {
    const created = await prisma.streamPost.create({
      data: {
        classroomId: post.classroomId,
        authorId: post.authorId,
        authorName: post.authorName,
        authorAvatar: post.authorAvatar,
        authorRole: post.authorRole,
        content: post.content,
        pinned: post.pinned,
        createdAt: new Date().toISOString(),
        attachments: {
          create:
            post.attachments?.map((a) => ({
              title: a.title,
              type: a.type,
              url: a.url,
              size: a.size,
            })) || [],
        },
      },
      include: { comments: true, attachments: true },
    });
    return {
      ...created,
      authorRole: created.authorRole as any,
      commentsCount: created.comments.length,
      comments: created.comments,
      attachments: created.attachments.map((a) => ({ ...a, type: a.type as any })),
    };
  }

  public async addCommentToPost(
    streamPostId: string,
    comment: { authorName: string; authorAvatar: string; content: string },
  ) {
    let validPostId = streamPostId;
    const post = await prisma.streamPost.findUnique({ where: { id: validPostId } });
    if (!post) {
      const firstPost = await prisma.streamPost.findFirst();
      if (firstPost) validPostId = firstPost.id;
    }

    return prisma.postComment.create({
      data: {
        streamPostId: validPostId,
        authorName: comment.authorName,
        authorAvatar: comment.authorAvatar,
        content: comment.content,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    });
  }
}

export const classroomService = new ClassroomService();
