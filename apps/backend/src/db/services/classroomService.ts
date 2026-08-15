import { prisma } from './prismaClient';
import { Classroom, StreamPost } from '@lms/shared';
import { withDeadlockRetry } from '@utils/transaction';
import { normalizeCohortSelection } from '@utils/cohortValidation';

const mapStreamPost = (post: any): StreamPost => ({
  id: post.id,
  classroomId: post.classroomId,
  authorId: post.authorId,
  authorName: post.author.name,
  authorAvatar: post.author.avatar,
  authorRole: post.author.role,
  content: post.content,
  pinned: post.pinned,
  createdAt: post.createdAt,
  commentsCount: post.comments.length,
  comments: post.comments.map((comment: any) => ({
    id: comment.id,
    streamPostId: comment.streamPostId,
    authorId: comment.authorId,
    authorName: comment.author.name,
    authorAvatar: comment.author.avatar,
    content: comment.content,
    createdAt: comment.createdAt,
  })),
  attachments: post.attachments.map((attachment: any) => ({
    ...attachment,
    type: attachment.type,
  })),
});

export class ClassroomService {
  public async getClassrooms(): Promise<Classroom[]> {
    const classrooms = await prisma.classroom.findMany({
      where: { isArchived: false },
      include: {
        enrollments: { where: { isActive: true } },
        subjectRef: true,
        cohortRef: true,
        teacher: true,
      },
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
    actorId?: string,
  ): Promise<Classroom> {
    const { gradeLevel, section } = normalizeCohortSelection(
      classroom.gradeLevel,
      classroom.section,
    );
    const code = `CLS${Math.floor(1000 + Math.random() * 9000)}`;
    let validTeacherId = classroom.teacherId;
    const actor = actorId ? await prisma.user.findUnique({ where: { id: actorId } }) : null;
    if (actorId && (!actor || actor.isArchived || !['teacher', 'admin'].includes(actor.role)))
      throw new Error('An active teacher or administrator account is required.');
    if (actor?.role === 'teacher' && validTeacherId !== actor.id)
      throw new Error('Teachers may only create classrooms assigned to themselves.');
    if (validTeacherId) {
      const teacher = await prisma.user.findUnique({
        where: { id: validTeacherId },
        include: { teacherSubjects: { include: { subject: true } } },
      });
      if (!teacher || teacher.isArchived) throw new Error('An active teacher is required.');
      else if (actor && actor.schoolId !== teacher.schoolId)
        throw new Error('The assigned teacher must belong to your school.');
      else if (
        teacher.role !== 'teacher' ||
        (teacher.teacherSubjects.length > 0 &&
          !teacher.teacherSubjects
            .map((entry) => entry.subject.name)
            .some((subject) => subject.toLowerCase() === classroom.subject.toLowerCase()))
      ) {
        throw new Error(`Teacher is not allocated to the subject ${classroom.subject}.`);
      }
    } else throw new Error('teacherId is required.');

    const created = await prisma.$transaction(async (tx) => {
      const teacher = await tx.user.findUniqueOrThrow({ where: { id: validTeacherId } });
      const school = await tx.school.findUniqueOrThrow({ where: { id: teacher.schoolId } });
      const subject = await tx.subject.upsert({
        where: { schoolId_name: { schoolId: school.id, name: classroom.subject } },
        update: { isArchived: false },
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
      let academicYear = await tx.academicYear.findFirst({
        where: { schoolId: school.id, isActive: true, isArchived: false },
        orderBy: { startsAt: 'desc' },
      });
      if (!academicYear) {
        const year = new Date().getUTCFullYear();
        academicYear = await tx.academicYear.create({
          data: {
            schoolId: school.id,
            name: String(year),
            startsAt: new Date(Date.UTC(year, 0, 1)),
            endsAt: new Date(Date.UTC(year, 11, 31)),
            isActive: true,
          },
        });
      }
      const activeStudents = await tx.studentAcademicEnrollment.findMany({
        where: { academicYearId: academicYear.id, cohortId: cohort.id, status: 'active' },
        select: { studentId: true },
      });
      const maxCapacity = (classroom as any).maxCapacity || 40;
      if (activeStudents.length > maxCapacity)
        throw new Error('Classroom capacity is lower than the active cohort size.');
      const createdClassroom = await tx.classroom.create({
        data: {
          name: classroom.name,
          teacherId: validTeacherId,
          roomNumber: classroom.roomNumber,
          colorTheme: classroom.colorTheme,
          bannerImage: classroom.bannerImage,
          meetLink: classroom.meetLink,
          code,
          maxCapacity,
          schoolId: school.id,
          subjectId: subject.id,
          cohortId: cohort.id,
          academicYearId: academicYear.id,
          enrollments: {
            create: activeStudents.map(({ studentId }) => ({ studentId })),
          },
        },
        include: {
          enrollments: true,
          subjectRef: true,
          cohortRef: true,
          teacher: true,
        },
      });
      await tx.teachingAssignment.create({
        data: {
          teacherId: validTeacherId,
          classroomId: createdClassroom.id,
          subjectId: subject.id,
          academicYearId: academicYear.id,
        },
      });
      await tx.teacherSubject.upsert({
        where: { teacherId_subjectId: { teacherId: validTeacherId, subjectId: subject.id } },
        create: { teacherId: validTeacherId, subjectId: subject.id },
        update: {},
      });
      return createdClassroom;
    });
    return {
      id: created.id,
      name: created.name,
      subject: created.subjectRef.name,
      gradeLevel: created.cohortRef.gradeLevel,
      section: created.cohortRef.section,
      teacherId: created.teacherId,
      teacherName: created.teacher.name,
      teacherAvatar: created.teacher.avatar,
      roomNumber: created.roomNumber,
      colorTheme: created.colorTheme,
      bannerImage: created.bannerImage,
      studentCount: created.enrollments.length,
      enrolledStudentIds: created.enrollments.map((enrollment) => enrollment.studentId),
      meetLink: created.meetLink || undefined,
      code: created.code,
    };
  }

  public async deleteClassroom(id: string) {
    return prisma.$transaction(async (tx) => {
      const classroom = await tx.classroom.update({ where: { id }, data: { isArchived: true } });
      await Promise.all([
        tx.classroomEnrollment.updateMany({
          where: { classroomId: id, isActive: true },
          data: { isActive: false, endedAt: new Date() },
        }),
        tx.teachingAssignment.updateMany({
          where: { classroomId: id, isActive: true },
          data: { isActive: false, endsAt: new Date() },
        }),
        tx.timetableSlot.updateMany({
          where: { classroomId: id, isArchived: false },
          data: { isArchived: true },
        }),
      ]);
      return classroom;
    });
  }

  public async enrollStudent(classroomId: string, studentId: string) {
    return withDeadlockRetry(async () =>
      prisma.$transaction(async (tx) => {
        const classroom = await tx.classroom.findUnique({
          where: { id: classroomId },
          include: { enrollments: { where: { isActive: true }, select: { id: true } } },
        });
        if (!classroom || classroom.isArchived) throw new Error('Classroom not found.');
        const enrollment = await tx.studentAcademicEnrollment.findFirst({
          where: {
            studentId,
            cohortId: classroom.cohortId,
            status: 'active',
            student: { isArchived: false, studentProfile: { isArchived: false } },
          },
        });
        if (!enrollment) throw new Error('Student must be active in the classroom cohort.');
        if (classroom.enrollments.length >= classroom.maxCapacity)
          throw new Error('Classroom capacity reached.');
        return tx.classroomEnrollment.upsert({
          where: { classroomId_studentId: { classroomId, studentId } },
          create: { classroomId, studentId },
          update: { isActive: true, endedAt: null },
        });
      }),
    );
  }

  public async joinByCode(code: string, studentId: string) {
    return withDeadlockRetry(async () =>
      prisma.$transaction(async (tx) => {
        const classroom = await tx.classroom.findFirst({
          where: { code: code.trim().toUpperCase(), isArchived: false },
          include: {
            subjectRef: true,
            cohortRef: true,
            teacher: true,
            enrollments: { where: { isActive: true } },
          },
        });
        if (!classroom) throw new Error('No classroom found with that code.');
        const studentEnrollment = await tx.studentAcademicEnrollment.findFirst({
          where: {
            studentId,
            cohortId: classroom.cohortId,
            status: 'active',
            student: { isArchived: false, studentProfile: { isArchived: false } },
          },
        });
        if (!studentEnrollment)
          throw new Error('You can only join classrooms assigned to your current cohort.');
        if (classroom.enrollments.length >= classroom.maxCapacity)
          throw new Error('This classroom is at full capacity.');
        await tx.classroomEnrollment.upsert({
          where: { classroomId_studentId: { classroomId: classroom.id, studentId } },
          create: { classroomId: classroom.id, studentId },
          update: { isActive: true, endedAt: null },
        });
        const updatedEnrollments = await tx.classroomEnrollment.findMany({
          where: { classroomId: classroom.id, isActive: true },
        });
        return {
          id: classroom.id,
          name: classroom.name,
          subject: classroom.subjectRef.name,
          gradeLevel: classroom.cohortRef.gradeLevel,
          section: classroom.cohortRef.section,
          teacherId: classroom.teacherId,
          teacherName: classroom.teacher.name,
          teacherAvatar: classroom.teacher.avatar,
          roomNumber: classroom.roomNumber,
          colorTheme: classroom.colorTheme,
          bannerImage: classroom.bannerImage,
          studentCount: updatedEnrollments.length,
          enrolledStudentIds: updatedEnrollments.map((e) => e.studentId),
          meetLink: classroom.meetLink || undefined,
          code: classroom.code,
        };
      }),
    );
  }

  public async getStreamPosts(): Promise<StreamPost[]> {
    const posts = await prisma.streamPost.findMany({
      include: {
        author: true,
        comments: { include: { author: true } },
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return posts.map(mapStreamPost);
  }

  public async addStreamPost(
    post: Omit<
      StreamPost,
      'id' | 'createdAt' | 'commentsCount' | 'authorName' | 'authorAvatar' | 'authorRole'
    >,
  ): Promise<StreamPost> {
    const [classroom, author] = await Promise.all([
      prisma.classroom.findFirst({ where: { id: post.classroomId, isArchived: false } }),
      prisma.user.findFirst({
        where: { id: post.authorId, role: { in: ['teacher', 'admin'] }, isArchived: false },
      }),
    ]);
    if (!classroom || !author || classroom.schoolId !== author.schoolId)
      throw new Error('Active classroom and author must belong to the same school.');
    if (author.role === 'teacher') {
      const mayManage =
        classroom.teacherId === author.id ||
        Boolean(
          await prisma.teachingAssignment.findFirst({
            where: { classroomId: classroom.id, teacherId: author.id, isActive: true },
            select: { id: true },
          }),
        );
      if (!mayManage) throw new Error('Teachers may only post in their assigned classrooms.');
    }
    const created = await prisma.streamPost.create({
      data: {
        classroomId: post.classroomId,
        authorId: author.id,
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
      include: {
        author: true,
        comments: { include: { author: true } },
        attachments: true,
      },
    });
    return mapStreamPost(created);
  }

  public async addCommentToPost(streamPostId: string, actorId: string, content: string) {
    const [post, actor] = await Promise.all([
      prisma.streamPost.findUnique({
        where: { id: streamPostId },
        include: { classroom: true },
      }),
      prisma.user.findFirst({ where: { id: actorId, isArchived: false } }),
    ]);
    if (!post || !actor || post.classroom.schoolId !== actor.schoolId)
      throw new Error('Active post and author must belong to the same school.');
    const mayComment =
      actor.role === 'admin' ||
      (actor.role === 'teacher' &&
        (post.classroom.teacherId === actor.id ||
          Boolean(
            await prisma.teachingAssignment.findFirst({
              where: { classroomId: post.classroomId, teacherId: actor.id, isActive: true },
              select: { id: true },
            }),
          )));
    if (!mayComment) throw new Error('You cannot comment on this classroom post.');

    const created = await prisma.postComment.create({
      data: {
        streamPostId: post.id,
        authorId: actor.id,
        content: content.trim(),
        createdAt: new Date().toISOString(),
      },
      include: { author: true },
    });
    return {
      id: created.id,
      streamPostId: created.streamPostId,
      authorId: created.authorId,
      authorName: created.author.name,
      authorAvatar: created.author.avatar,
      content: created.content,
      createdAt: created.createdAt,
    };
  }
}

export const classroomService = new ClassroomService();
