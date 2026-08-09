import { prisma } from './prismaClient';
import { Classroom, StreamPost } from '@lms/shared';

export class ClassroomService {
  public async getClassrooms(): Promise<Classroom[]> {
    const classrooms = await prisma.classroom.findMany({
      include: { enrollments: true },
    });
    return classrooms.map((c) => ({
      id: c.id,
      name: c.name,
      subject: c.subject,
      gradeLevel: c.gradeLevel,
      section: c.section,
      teacherId: c.teacherId,
      teacherName: c.teacherName,
      teacherAvatar: c.teacherAvatar,
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
    const code = `CLS${Math.floor(1000 + Math.random() * 9000)}`;
    let validTeacherId = classroom.teacherId;
    if (validTeacherId) {
      const teacher = await prisma.user.findUnique({ where: { id: validTeacherId } });
      if (!teacher) validTeacherId = 'user-teach-1';
    } else {
      validTeacherId = 'user-teach-1';
    }

    const created = await prisma.classroom.create({
      data: {
        name: classroom.name,
        subject: classroom.subject,
        gradeLevel: classroom.gradeLevel,
        section: classroom.section,
        teacherId: validTeacherId,
        teacherName: classroom.teacherName,
        teacherAvatar: classroom.teacherAvatar,
        roomNumber: classroom.roomNumber,
        colorTheme: classroom.colorTheme,
        bannerImage: classroom.bannerImage,
        meetLink: classroom.meetLink,
        code,
      },
      include: { enrollments: true },
    });
    return {
      ...created,
      studentCount: created.enrollments.length,
      meetLink: created.meetLink || undefined,
    };
  }

  public async deleteClassroom(id: string) {
    await prisma.classroomEnrollment.deleteMany({ where: { classroomId: id } });
    await prisma.assignment.deleteMany({ where: { classroomId: id } });
    return prisma.classroom.deleteMany({ where: { id } });
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
