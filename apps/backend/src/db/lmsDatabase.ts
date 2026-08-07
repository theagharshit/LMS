import { loadEnv } from '@utils/envResolver';

// Automatically finds and loads the root .env file
loadEnv();
import { PrismaClient } from '@prisma/client';
import { logger } from '@utils/logger';
import {
  User,
  StudentProfile,
  Classroom,
  StreamPost,
  Assignment,
  Submission,
  Quiz,
  QuizSubmission,
  AttendanceRecord,
  ParentControlSettings,
  StudentLocationRecord,
  CalendarEvent,
  DirectMessage,
  SubjectPerformance,
} from '@lms/shared';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

class LMSDatabaseService {
  public async getUsers(): Promise<User[]> {
    const users = await prisma.user.findMany();
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role as any,
      avatar: u.avatar,
      schoolName: u.schoolName,
      gradeLevel: u.gradeLevel ?? undefined,
      section: u.section ?? undefined,
      rollNumber: u.rollNumber ?? undefined,
      childrenIds: u.childrenIds,
      subjectsTaught: u.subjectsTaught,
    }));
  }

  public async getStudentProfiles(): Promise<StudentProfile[]> {
    const profiles = await prisma.studentProfile.findMany({
      include: { user: true, badges: { include: { badgeDefinition: true } } },
    });
    return profiles.map((p) => ({
      id: p.user.id,
      name: p.user.name,
      email: p.user.email,
      role: p.user.role as any,
      avatar: p.user.avatar,
      schoolName: p.user.schoolName,
      gradeLevel: p.gradeLevel,
      section: p.section,
      rollNumber: p.user.rollNumber ?? undefined,
      attendancePercentage: p.attendancePercentage,
      streakDays: p.streakDays,
      xpPoints: p.xpPoints,
      parentName: p.parentName,
      parentPhone: p.parentPhone,
      badges: p.badges.map((b) => ({
        id: b.id,
        earnedDate: b.earnedDate,
        badgeDefinitionId: b.badgeDefinitionId,
        badgeDefinition: b.badgeDefinition,
        studentProfileId: b.studentProfileId,
        assignedBy: b.assignedBy || undefined,
        remarks: b.remarks || undefined,
      })),
    }));
  }

  public async getBadgeDefinitions() {
    return prisma.badgeDefinition.findMany();
  }

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

  public async getAssignments(): Promise<Assignment[]> {
    const assignments = await prisma.assignment.findMany({
      include: { attachments: true },
    });
    return assignments.map((a) => ({
      ...a,
      attachments: a.attachments.map((at) => ({ ...at, type: at.type as any })),
    }));
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
    const existing = await prisma.submission.findFirst({
      where: { assignmentId, studentId },
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
        assignmentId,
        studentId,
        studentName: 'Aarav Sharma', // Mock logic preservation
        studentAvatar:
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

  public async getQuizzes(): Promise<Quiz[]> {
    const quizzes = await prisma.quiz.findMany({
      include: { questions: true },
    });
    return quizzes.map((q) => ({
      ...q,
      questions: q.questions.map((qt) => ({ ...qt, type: qt.type as any })),
    }));
  }

  public async addQuiz(quiz: Omit<Quiz, 'id' | 'createdAt'>): Promise<Quiz> {
    const created = await prisma.quiz.create({
      data: {
        ...quiz,
        createdAt: new Date().toISOString(),
        questions: {
          create: quiz.questions.map((q) => ({
            text: q.text,
            type: q.type,
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            points: q.points,
          })),
        },
      },
      include: { questions: true },
    });
    return {
      ...created,
      questions: created.questions.map((qt) => ({ ...qt, type: qt.type as any })),
    };
  }

  public async getAttendance(): Promise<AttendanceRecord[]> {
    const records = await prisma.attendanceRecord.findMany();
    return records.map((r) => ({
      ...r,
      status: r.status as any,
      remarks: r.remarks || undefined,
      checkInTime: r.checkInTime || undefined,
    }));
  }

  public async markAttendance(
    studentId: string,
    studentName: string,
    date: string,
    status: 'present' | 'absent' | 'late' | 'excused',
    remarks?: string,
  ): Promise<AttendanceRecord> {
    const existing = await prisma.attendanceRecord.findFirst({
      where: { studentId, date },
    });

    if (existing) {
      const updated = await prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: { status, remarks },
      });
      return {
        ...updated,
        status: updated.status as any,
        remarks: updated.remarks || undefined,
        checkInTime: updated.checkInTime || undefined,
      };
    }

    const created = await prisma.attendanceRecord.create({
      data: { studentId, studentName, date, status, remarks, markedBy: 'System' },
    });
    return {
      ...created,
      status: created.status as any,
      remarks: created.remarks || undefined,
      checkInTime: created.checkInTime || undefined,
    };
  }

  public async getParentControls(): Promise<Record<string, ParentControlSettings>> {
    const controls = await prisma.parentControlSettings.findMany();
    return controls.reduce(
      (acc, c) => {
        acc[c.studentId] = c;
        return acc;
      },
      {} as Record<string, ParentControlSettings>,
    );
  }

  public async updateParentControls(
    studentId: string,
    settings: ParentControlSettings,
  ): Promise<ParentControlSettings> {
    return prisma.parentControlSettings.upsert({
      where: { studentId },
      update: settings,
      create: { ...settings, studentId }, // assuming settings contains everything needed except id
    });
  }

  public async getStudentLocations(): Promise<StudentLocationRecord[]> {
    const locations = await prisma.studentLocationRecord.findMany();
    return locations.map((l) => ({
      ...l,
      category: l.category as any,
      updatedByRole: l.updatedByRole as any,
      busNumber: l.busNumber || undefined,
      notes: l.notes || undefined,
    }));
  }

  public async getStudentLocationById(
    studentId: string,
  ): Promise<StudentLocationRecord | undefined> {
    const l = await prisma.studentLocationRecord.findFirst({
      where: { studentId },
    });
    if (!l) return undefined;
    return {
      ...l,
      category: l.category as any,
      updatedByRole: l.updatedByRole as any,
      busNumber: l.busNumber || undefined,
      notes: l.notes || undefined,
    };
  }

  public async updateStudentLocation(
    studentId: string,
    studentName: string,
    location: string,
    category: StudentLocationRecord['category'],
    updatedBy: string,
    updatedByRole: 'teacher' | 'admin',
    busNumber?: string,
    notes?: string,
  ): Promise<StudentLocationRecord> {
    const existing = await prisma.studentLocationRecord.findFirst({
      where: { studentId },
    });

    if (existing) {
      const updated = await prisma.studentLocationRecord.update({
        where: { id: existing.id },
        data: {
          currentLocation: location,
          category,
          updatedBy,
          updatedByRole,
          busNumber,
          notes,
          updatedAt: new Date().toISOString(),
        },
      });
      return {
        ...updated,
        category: updated.category as any,
        updatedByRole: updated.updatedByRole as any,
        busNumber: updated.busNumber || undefined,
        notes: updated.notes || undefined,
      };
    }

    const created = await prisma.studentLocationRecord.create({
      data: {
        studentId,
        studentName,
        currentLocation: location,
        category,
        updatedBy,
        updatedByRole,
        busNumber,
        notes,
        updatedAt: new Date().toISOString(),
      },
    });
    return {
      ...created,
      category: created.category as any,
      updatedByRole: created.updatedByRole as any,
      busNumber: created.busNumber || undefined,
      notes: created.notes || undefined,
    };
  }

  public async addCommentToPost(
    streamPostId: string,
    comment: { authorName: string; authorAvatar: string; content: string },
  ) {
    return prisma.postComment.create({
      data: {
        streamPostId,
        authorName: comment.authorName,
        authorAvatar: comment.authorAvatar,
        content: comment.content,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    });
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

  public async getQuizSubmissions(): Promise<QuizSubmission[]> {
    const subs = await prisma.quizSubmission.findMany();
    return subs.map((s) => ({
      ...s,
      answers: (s.answers as Record<string, string>) || {},
    }));
  }

  public async submitQuiz(
    submission: Omit<QuizSubmission, 'id' | 'completedAt'>,
  ): Promise<QuizSubmission> {
    const created = await prisma.quizSubmission.create({
      data: {
        quizId: submission.quizId,
        studentId: submission.studentId,
        score: submission.score,
        totalPoints: submission.totalPoints,
        completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        answers: (submission.answers as any) || {},
      },
    });

    // Auto-trigger: Quiz Master badge if score is 100%
    if (submission.score === submission.totalPoints && submission.totalPoints > 0) {
      await this.assignBadge(submission.studentId, 'bdg-def-2', 'System', 'Scored 100% on a quiz');
    }

    return {
      ...created,
      answers: (created.answers as Record<string, string>) || {},
    };
  }

  public async getDirectMessages(): Promise<DirectMessage[]> {
    const msgs = await prisma.directMessage.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return msgs.map((m) => ({
      ...m,
      senderRole: m.senderRole as any,
      approvedByParent: m.approvedByParent ?? undefined,
    }));
  }

  public async addDirectMessage(
    msg: Omit<DirectMessage, 'id' | 'createdAt'>,
  ): Promise<DirectMessage> {
    const created = await prisma.directMessage.create({
      data: {
        senderId: msg.senderId,
        senderName: msg.senderName,
        senderRole: msg.senderRole,
        senderAvatar: msg.senderAvatar,
        receiverId: msg.receiverId,
        receiverName: msg.receiverName,
        content: msg.content,
        read: msg.read || false,
        approvedByParent: msg.approvedByParent,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    });
    return {
      ...created,
      senderRole: created.senderRole as any,
      approvedByParent: created.approvedByParent ?? undefined,
    };
  }

  public async getSubjectPerformances() {
    return prisma.subjectPerformance.findMany();
  }

  public async getTermProgress() {
    return prisma.termProgress.findMany();
  }

  public async getStudentActivities() {
    return prisma.studentActivity.findMany();
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
}

export const lmsDB = new LMSDatabaseService();
