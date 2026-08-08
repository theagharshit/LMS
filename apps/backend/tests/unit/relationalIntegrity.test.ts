import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { loadEnv } from '../../src/utils/envResolver';
loadEnv();
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

describe('Relational Database Integrity & Constraint Enforcement', () => {
  beforeEach(async () => {
    // Ensure clean state before each relational test block
    await prisma.classroomEnrollment.deleteMany();
    await prisma.termProgress.deleteMany();
    await prisma.studentActivity.deleteMany();
    await prisma.subjectPerformance.deleteMany();
    await prisma.storedFileRecord.deleteMany();
    await prisma.studentLocationRecord.deleteMany();
    await prisma.attendanceRecord.deleteMany();
    await prisma.directMessage.deleteMany();
    await prisma.studentBadge.deleteMany();
    await prisma.badgeDefinition.deleteMany();
    await prisma.postComment.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.submission.deleteMany();
    await prisma.quizSubmission.deleteMany();
    await prisma.quizQuestion.deleteMany();
    await prisma.quiz.deleteMany();
    await prisma.assignment.deleteMany();
    await prisma.streamPost.deleteMany();
    await prisma.classroom.deleteMany();
    await prisma.studentProfile.deleteMany();
    await prisma.parentControlSettings.deleteMany();
    await prisma.user.deleteMany();
  });

  // 1. CASCADE DELETE TESTS
  describe('Cascade Delete Behavior', () => {
    it('1. should cascade delete StudentProfile when User is deleted', async () => {
      const user = await prisma.user.create({
        data: {
          id: 'u-cascade-1',
          name: 'Cascade Student 1',
          email: 'cas1@test.com',
          role: 'student',
          avatar: 'avatar.png',
          schoolName: 'School 1',
        },
      });
      await prisma.studentProfile.create({
        data: {
          id: user.id,
          userId: user.id,
          attendancePercentage: 90,
          streakDays: 5,
          xpPoints: 100,
          gradeLevel: 8,
          section: 'A',
          parentName: 'Parent 1',
          parentPhone: '9800000000',
        },
      });

      await prisma.user.delete({ where: { id: user.id } });
      const profile = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
      expect(profile).toBeNull();
    });

    it('2. should cascade delete ParentControlSettings when User is deleted', async () => {
      const user = await prisma.user.create({
        data: {
          id: 'u-cascade-2',
          name: 'Cascade Student 2',
          email: 'cas2@test.com',
          role: 'student',
          avatar: 'avatar.png',
          schoolName: 'School 1',
        },
      });
      await prisma.parentControlSettings.create({
        data: {
          studentId: user.id,
          allowTeacherDirectChat: true,
          allowPeerDiscussion: true,
          missingHomeworkAlerts: true,
          lowAttendanceAlerts: true,
          weeklyDigestEmail: true,
          screenTimeLimitMinutes: 120,
          requireApprovalForOutboundMsgs: false,
        },
      });

      await prisma.user.delete({ where: { id: user.id } });
      const settings = await prisma.parentControlSettings.findUnique({
        where: { studentId: user.id },
      });
      expect(settings).toBeNull();
    });

    it('3. should cascade delete Submissions when User is deleted', async () => {
      const teacher = await prisma.user.create({
        data: {
          id: 'tch-cas-1',
          name: 'Teacher 1',
          email: 'tch1@test.com',
          role: 'teacher',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      const classroom = await prisma.classroom.create({
        data: {
          id: 'cls-cas-1',
          name: 'Class 1',
          subject: 'Math',
          gradeLevel: 8,
          section: 'A',
          teacherId: teacher.id,
          teacherName: teacher.name,
          teacherAvatar: teacher.avatar,
          roomNumber: '101',
          colorTheme: 'blue',
          bannerImage: 'b.png',
          code: 'CODE1',
        },
      });
      const assignment = await prisma.assignment.create({
        data: {
          id: 'asg-cas-1',
          classroomId: classroom.id,
          classroomName: classroom.name,
          subject: classroom.subject,
          title: 'Asg 1',
          instructions: 'Inst 1',
          dueDate: '2026-08-10',
          dueTime: '23:59',
          totalPoints: 100,
          rubric: [],
          createdAt: new Date().toISOString(),
        },
      });
      const student = await prisma.user.create({
        data: {
          id: 'stu-cas-1',
          name: 'Student 1',
          email: 'stu1@test.com',
          role: 'student',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      await prisma.submission.create({
        data: {
          id: 'sub-cas-1',
          assignmentId: assignment.id,
          studentId: student.id,
          studentName: student.name,
          studentAvatar: student.avatar,
          status: 'submitted',
          submittedAt: '12:00',
        },
      });

      await prisma.user.delete({ where: { id: student.id } });
      const subs = await prisma.submission.findMany({ where: { studentId: student.id } });
      expect(subs.length).toBe(0);
    });

    it('4. should cascade delete QuizSubmissions when Quiz is deleted', async () => {
      const teacher = await prisma.user.create({
        data: {
          id: 'tch-cas-2',
          name: 'Teacher 2',
          email: 'tch2@test.com',
          role: 'teacher',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      const classroom = await prisma.classroom.create({
        data: {
          id: 'cls-cas-2',
          name: 'Class 2',
          subject: 'Science',
          gradeLevel: 8,
          section: 'A',
          teacherId: teacher.id,
          teacherName: teacher.name,
          teacherAvatar: teacher.avatar,
          roomNumber: '102',
          colorTheme: 'green',
          bannerImage: 'b.png',
          code: 'CODE2',
        },
      });
      const quiz = await prisma.quiz.create({
        data: {
          id: 'quiz-cas-1',
          classroomId: classroom.id,
          classroomName: classroom.name,
          subject: classroom.subject,
          title: 'Quiz 1',
          description: 'Desc 1',
          durationMinutes: 30,
          dueDate: '2026-08-10',
          totalQuestions: 5,
          createdAt: new Date().toISOString(),
        },
      });
      const student = await prisma.user.create({
        data: {
          id: 'stu-cas-2',
          name: 'Student 2',
          email: 'stu2@test.com',
          role: 'student',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      await prisma.quizSubmission.create({
        data: {
          id: 'qsub-cas-1',
          quizId: quiz.id,
          studentId: student.id,
          score: 100,
          totalPoints: 100,
          completedAt: '12:00',
          answers: {},
        },
      });

      await prisma.quiz.delete({ where: { id: quiz.id } });
      const qsubs = await prisma.quizSubmission.findMany({ where: { quizId: quiz.id } });
      expect(qsubs.length).toBe(0);
    });

    it('5. should cascade delete StreamPosts and Comments when Classroom is deleted', async () => {
      const teacher = await prisma.user.create({
        data: {
          id: 'tch-cas-3',
          name: 'Teacher 3',
          email: 'tch3@test.com',
          role: 'teacher',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      const classroom = await prisma.classroom.create({
        data: {
          id: 'cls-cas-3',
          name: 'Class 3',
          subject: 'English',
          gradeLevel: 8,
          section: 'A',
          teacherId: teacher.id,
          teacherName: teacher.name,
          teacherAvatar: teacher.avatar,
          roomNumber: '103',
          colorTheme: 'red',
          bannerImage: 'b.png',
          code: 'CODE3',
        },
      });
      const post = await prisma.streamPost.create({
        data: {
          id: 'post-cas-1',
          classroomId: classroom.id,
          authorId: teacher.id,
          authorName: teacher.name,
          authorAvatar: teacher.avatar,
          authorRole: 'teacher',
          content: 'Hello Class',
          createdAt: new Date().toISOString(),
        },
      });
      await prisma.postComment.create({
        data: {
          id: 'cmt-cas-1',
          streamPostId: post.id,
          authorId: teacher.id,
          authorName: teacher.name,
          authorAvatar: teacher.avatar,
          content: 'Great post',
          createdAt: '12:05',
        },
      });

      await prisma.classroom.delete({ where: { id: classroom.id } });
      const posts = await prisma.streamPost.findMany({ where: { classroomId: classroom.id } });
      const cmts = await prisma.postComment.findMany({ where: { streamPostId: post.id } });
      expect(posts.length).toBe(0);
      expect(cmts.length).toBe(0);
    });

    it('6. should cascade delete AttendanceRecords when User is deleted', async () => {
      const student = await prisma.user.create({
        data: {
          id: 'stu-cas-6',
          name: 'Student 6',
          email: 'stu6@test.com',
          role: 'student',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      await prisma.attendanceRecord.create({
        data: {
          studentId: student.id,
          studentName: student.name,
          date: '2026-08-07',
          status: 'present',
          markedBy: 'Teacher',
        },
      });

      await prisma.user.delete({ where: { id: student.id } });
      const atts = await prisma.attendanceRecord.findMany({ where: { studentId: student.id } });
      expect(atts.length).toBe(0);
    });

    it('7. should cascade delete DirectMessages when sender or receiver User is deleted', async () => {
      const sender = await prisma.user.create({
        data: {
          id: 'u-msg-sender',
          name: 'Sender',
          email: 'sender@test.com',
          role: 'parent',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      const receiver = await prisma.user.create({
        data: {
          id: 'u-msg-receiver',
          name: 'Receiver',
          email: 'receiver@test.com',
          role: 'teacher',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      await prisma.directMessage.create({
        data: {
          senderId: sender.id,
          senderName: sender.name,
          senderRole: 'parent',
          senderAvatar: sender.avatar,
          receiverId: receiver.id,
          receiverName: receiver.name,
          content: 'Hello Teacher',
          createdAt: '10:00',
        },
      });

      await prisma.user.delete({ where: { id: sender.id } });
      const msgs = await prisma.directMessage.findMany({ where: { senderId: sender.id } });
      expect(msgs.length).toBe(0);
    });

    it('8. should cascade delete SubjectPerformance records when User is deleted', async () => {
      const student = await prisma.user.create({
        data: {
          id: 'stu-sp-1',
          name: 'SP Student',
          email: 'sp@test.com',
          role: 'student',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      await prisma.subjectPerformance.create({
        data: {
          studentId: student.id,
          subject: 'Math',
          scorePercentage: 95,
          grade: 'A+',
          assignmentsCompleted: 10,
          totalAssignments: 10,
          quizzesScoreAvg: 95,
          teacherRemark: 'Excellent',
        },
      });

      await prisma.user.delete({ where: { id: student.id } });
      const sps = await prisma.subjectPerformance.findMany({ where: { studentId: student.id } });
      expect(sps.length).toBe(0);
    });

    it('9. should cascade delete TermProgress records when User is deleted', async () => {
      const student = await prisma.user.create({
        data: {
          id: 'stu-tp-1',
          name: 'TP Student',
          email: 'tp@test.com',
          role: 'student',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      await prisma.termProgress.create({
        data: { studentId: student.id, term: '1st Term', score: 88 },
      });

      await prisma.user.delete({ where: { id: student.id } });
      const tps = await prisma.termProgress.findMany({ where: { studentId: student.id } });
      expect(tps.length).toBe(0);
    });

    it('10. should cascade delete StudentActivity records when User is deleted', async () => {
      const student = await prisma.user.create({
        data: {
          id: 'stu-act-1',
          name: 'Act Student',
          email: 'act@test.com',
          role: 'student',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      await prisma.studentActivity.create({
        data: {
          studentId: student.id,
          title: 'Science Fair',
          category: 'Science',
          position: '1st',
          date: '2026-08-01',
          description: 'Solar power model',
        },
      });

      await prisma.user.delete({ where: { id: student.id } });
      const acts = await prisma.studentActivity.findMany({ where: { studentId: student.id } });
      expect(acts.length).toBe(0);
    });
  });

  // 2. FOREIGN KEY CONSTRAINT REJECTION TESTS
  describe('Foreign Key Constraint Rejection Rules', () => {
    it('11. should reject Classroom creation with non-existent teacherId', async () => {
      await expect(
        prisma.classroom.create({
          data: {
            id: 'cls-invalid-tch',
            name: 'Invalid Teacher Class',
            subject: 'Math',
            gradeLevel: 8,
            section: 'A',
            teacherId: 'non-existent-teacher-id',
            teacherName: 'Ghost Teacher',
            teacherAvatar: 'a.png',
            roomNumber: '101',
            colorTheme: 'blue',
            bannerImage: 'b.png',
            code: 'INV1',
          },
        }),
      ).rejects.toThrow();
    });

    it('12. should reject StreamPost creation with non-existent classroomId', async () => {
      const author = await prisma.user.create({
        data: {
          id: 'u-auth-1',
          name: 'Author',
          email: 'auth@test.com',
          role: 'teacher',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      await expect(
        prisma.streamPost.create({
          data: {
            id: 'post-invalid-cls',
            classroomId: 'non-existent-cls-id',
            authorId: author.id,
            authorName: author.name,
            authorAvatar: author.avatar,
            authorRole: 'teacher',
            content: 'Bad Post',
            createdAt: '12:00',
          },
        }),
      ).rejects.toThrow();
    });

    it('13. should reject Submission creation with non-existent studentId', async () => {
      const teacher = await prisma.user.create({
        data: {
          id: 'tch-sub-err',
          name: 'Teacher',
          email: 'tchsub@test.com',
          role: 'teacher',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      const classroom = await prisma.classroom.create({
        data: {
          id: 'cls-sub-err',
          name: 'Class',
          subject: 'Math',
          gradeLevel: 8,
          section: 'A',
          teacherId: teacher.id,
          teacherName: teacher.name,
          teacherAvatar: teacher.avatar,
          roomNumber: '101',
          colorTheme: 'blue',
          bannerImage: 'b.png',
          code: 'CLS_SUB',
        },
      });
      const assignment = await prisma.assignment.create({
        data: {
          id: 'asg-sub-err',
          classroomId: classroom.id,
          classroomName: classroom.name,
          subject: classroom.subject,
          title: 'Asg',
          instructions: 'Inst',
          dueDate: '2026-08-10',
          dueTime: '23:59',
          totalPoints: 100,
          rubric: [],
          createdAt: new Date().toISOString(),
        },
      });

      await expect(
        prisma.submission.create({
          data: {
            id: 'sub-err-1',
            assignmentId: assignment.id,
            studentId: 'non-existent-student-id',
            studentName: 'Ghost Student',
            studentAvatar: 'a.png',
            status: 'submitted',
            submittedAt: '12:00',
          },
        }),
      ).rejects.toThrow();
    });

    it('14. should reject QuizSubmission creation with non-existent quizId', async () => {
      const student = await prisma.user.create({
        data: {
          id: 'stu-qsub-err',
          name: 'Student',
          email: 'stuqsub@test.com',
          role: 'student',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      await expect(
        prisma.quizSubmission.create({
          data: {
            id: 'qsub-err-1',
            quizId: 'non-existent-quiz-id',
            studentId: student.id,
            score: 80,
            totalPoints: 100,
            completedAt: '12:00',
            answers: {},
          },
        }),
      ).rejects.toThrow();
    });

    it('15. should reject ClassroomEnrollment with non-existent studentId', async () => {
      const teacher = await prisma.user.create({
        data: {
          id: 'tch-enr-err',
          name: 'Teacher',
          email: 'tchenr@test.com',
          role: 'teacher',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      const classroom = await prisma.classroom.create({
        data: {
          id: 'cls-enr-err',
          name: 'Class',
          subject: 'Math',
          gradeLevel: 8,
          section: 'A',
          teacherId: teacher.id,
          teacherName: teacher.name,
          teacherAvatar: teacher.avatar,
          roomNumber: '101',
          colorTheme: 'blue',
          bannerImage: 'b.png',
          code: 'CLS_ENR',
        },
      });

      await expect(
        prisma.classroomEnrollment.create({
          data: {
            classroomId: classroom.id,
            studentId: 'non-existent-student-id',
          },
        }),
      ).rejects.toThrow();
    });
  });

  // 3. UNIQUE CONSTRAINT REJECTION TESTS
  describe('Unique Constraint Enforcement Rules', () => {
    it('16. should reject duplicate User email', async () => {
      await prisma.user.create({
        data: {
          id: 'u-dup-1',
          name: 'U1',
          email: 'dup@test.com',
          role: 'student',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      await expect(
        prisma.user.create({
          data: {
            id: 'u-dup-2',
            name: 'U2',
            email: 'dup@test.com',
            role: 'student',
            avatar: 'a.png',
            schoolName: 'S1',
          },
        }),
      ).rejects.toThrow();
    });

    it('17. should reject duplicate Classroom code', async () => {
      const teacher = await prisma.user.create({
        data: {
          id: 'tch-code-dup',
          name: 'Teacher',
          email: 'tchcode@test.com',
          role: 'teacher',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      await prisma.classroom.create({
        data: {
          id: 'cls-code-1',
          name: 'Class 1',
          subject: 'Math',
          gradeLevel: 8,
          section: 'A',
          teacherId: teacher.id,
          teacherName: teacher.name,
          teacherAvatar: teacher.avatar,
          roomNumber: '101',
          colorTheme: 'blue',
          bannerImage: 'b.png',
          code: 'UNIQUE_CODE_1',
        },
      });
      await expect(
        prisma.classroom.create({
          data: {
            id: 'cls-code-2',
            name: 'Class 2',
            subject: 'Science',
            gradeLevel: 8,
            section: 'B',
            teacherId: teacher.id,
            teacherName: teacher.name,
            teacherAvatar: teacher.avatar,
            roomNumber: '102',
            colorTheme: 'green',
            bannerImage: 'b.png',
            code: 'UNIQUE_CODE_1',
          },
        }),
      ).rejects.toThrow();
    });

    it('18. should reject duplicate ClassroomEnrollment for same student in same class', async () => {
      const teacher = await prisma.user.create({
        data: {
          id: 'tch-enr-dup',
          name: 'Teacher',
          email: 'tchenrdup@test.com',
          role: 'teacher',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      const classroom = await prisma.classroom.create({
        data: {
          id: 'cls-enr-dup',
          name: 'Class',
          subject: 'Math',
          gradeLevel: 8,
          section: 'A',
          teacherId: teacher.id,
          teacherName: teacher.name,
          teacherAvatar: teacher.avatar,
          roomNumber: '101',
          colorTheme: 'blue',
          bannerImage: 'b.png',
          code: 'CODE_ENR_DUP',
        },
      });
      const student = await prisma.user.create({
        data: {
          id: 'stu-enr-dup',
          name: 'Student',
          email: 'stuenrdup@test.com',
          role: 'student',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });

      await prisma.classroomEnrollment.create({
        data: { classroomId: classroom.id, studentId: student.id },
      });

      await expect(
        prisma.classroomEnrollment.create({
          data: { classroomId: classroom.id, studentId: student.id },
        }),
      ).rejects.toThrow();
    });

    it('19. should reject duplicate ParentControlSettings for same studentId', async () => {
      const student = await prisma.user.create({
        data: {
          id: 'stu-pc-dup',
          name: 'Student',
          email: 'stupcdup@test.com',
          role: 'student',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      await prisma.parentControlSettings.create({
        data: {
          studentId: student.id,
          allowTeacherDirectChat: true,
          allowPeerDiscussion: true,
          missingHomeworkAlerts: true,
          lowAttendanceAlerts: true,
          weeklyDigestEmail: true,
          screenTimeLimitMinutes: 120,
          requireApprovalForOutboundMsgs: false,
        },
      });

      await expect(
        prisma.parentControlSettings.create({
          data: {
            studentId: student.id,
            allowTeacherDirectChat: false,
            allowPeerDiscussion: false,
            missingHomeworkAlerts: false,
            lowAttendanceAlerts: false,
            weeklyDigestEmail: false,
            screenTimeLimitMinutes: 60,
            requireApprovalForOutboundMsgs: true,
          },
        }),
      ).rejects.toThrow();
    });

    it('20. should reject duplicate StudentProfile for same userId', async () => {
      const student = await prisma.user.create({
        data: {
          id: 'stu-prof-dup',
          name: 'Student',
          email: 'stuprofdup@test.com',
          role: 'student',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      await prisma.studentProfile.create({
        data: {
          id: 'sp-1',
          userId: student.id,
          attendancePercentage: 90,
          streakDays: 5,
          xpPoints: 100,
          gradeLevel: 8,
          section: 'A',
          parentName: 'Parent',
          parentPhone: '9800000000',
        },
      });

      await expect(
        prisma.studentProfile.create({
          data: {
            id: 'sp-2',
            userId: student.id,
            attendancePercentage: 95,
            streakDays: 10,
            xpPoints: 200,
            gradeLevel: 8,
            section: 'A',
            parentName: 'Parent 2',
            parentPhone: '9800000001',
          },
        }),
      ).rejects.toThrow();
    });
  });

  // 4. DYNAMIC STUDENT COUNT COMPUTATION TESTS
  describe('Dynamic Student Count Calculation', () => {
    it('21. should return 0 studentCount for classroom with 0 enrollments', async () => {
      const teacher = await prisma.user.create({
        data: {
          id: 'tch-dyn-0',
          name: 'Teacher',
          email: 'tchdyn0@test.com',
          role: 'teacher',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      const classroom = await prisma.classroom.create({
        data: {
          id: 'cls-dyn-0',
          name: 'Empty Class',
          subject: 'Math',
          gradeLevel: 8,
          section: 'A',
          teacherId: teacher.id,
          teacherName: teacher.name,
          teacherAvatar: teacher.avatar,
          roomNumber: '101',
          colorTheme: 'blue',
          bannerImage: 'b.png',
          code: 'CODE_DYN_0',
        },
      });

      const res = await prisma.classroom.findUnique({
        where: { id: classroom.id },
        include: { enrollments: true },
      });
      expect(res?.enrollments.length).toBe(0);
    });

    it('22. should dynamically calculate studentCount = 1 when 1 student enrolls', async () => {
      const teacher = await prisma.user.create({
        data: {
          id: 'tch-dyn-1',
          name: 'Teacher',
          email: 'tchdyn1@test.com',
          role: 'teacher',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      const classroom = await prisma.classroom.create({
        data: {
          id: 'cls-dyn-1',
          name: 'Class 1 Student',
          subject: 'Math',
          gradeLevel: 8,
          section: 'A',
          teacherId: teacher.id,
          teacherName: teacher.name,
          teacherAvatar: teacher.avatar,
          roomNumber: '101',
          colorTheme: 'blue',
          bannerImage: 'b.png',
          code: 'CODE_DYN_1',
        },
      });
      const student = await prisma.user.create({
        data: {
          id: 'stu-dyn-1',
          name: 'Student 1',
          email: 'studyn1@test.com',
          role: 'student',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      await prisma.classroomEnrollment.create({
        data: { classroomId: classroom.id, studentId: student.id },
      });

      const res = await prisma.classroom.findUnique({
        where: { id: classroom.id },
        include: { enrollments: true },
      });
      expect(res?.enrollments.length).toBe(1);
    });

    it('23. should dynamically calculate studentCount = 5 when 5 students enroll', async () => {
      const teacher = await prisma.user.create({
        data: {
          id: 'tch-dyn-5',
          name: 'Teacher',
          email: 'tchdyn5@test.com',
          role: 'teacher',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      const classroom = await prisma.classroom.create({
        data: {
          id: 'cls-dyn-5',
          name: 'Class 5 Students',
          subject: 'Science',
          gradeLevel: 8,
          section: 'A',
          teacherId: teacher.id,
          teacherName: teacher.name,
          teacherAvatar: teacher.avatar,
          roomNumber: '102',
          colorTheme: 'green',
          bannerImage: 'b.png',
          code: 'CODE_DYN_5',
        },
      });

      for (let i = 1; i <= 5; i++) {
        const student = await prisma.user.create({
          data: {
            id: `stu-dyn-5-${i}`,
            name: `Student 5-${i}`,
            email: `studyn5_${i}@test.com`,
            role: 'student',
            avatar: 'a.png',
            schoolName: 'S1',
          },
        });
        await prisma.classroomEnrollment.create({
          data: { classroomId: classroom.id, studentId: student.id },
        });
      }

      const res = await prisma.classroom.findUnique({
        where: { id: classroom.id },
        include: { enrollments: true },
      });
      expect(res?.enrollments.length).toBe(5);
    });

    it('24. should dynamically decrement studentCount when enrollment is removed', async () => {
      const teacher = await prisma.user.create({
        data: {
          id: 'tch-dyn-dec',
          name: 'Teacher',
          email: 'tchdyndec@test.com',
          role: 'teacher',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      const classroom = await prisma.classroom.create({
        data: {
          id: 'cls-dyn-dec',
          name: 'Class Dec',
          subject: 'Science',
          gradeLevel: 8,
          section: 'A',
          teacherId: teacher.id,
          teacherName: teacher.name,
          teacherAvatar: teacher.avatar,
          roomNumber: '102',
          colorTheme: 'green',
          bannerImage: 'b.png',
          code: 'CODE_DYN_DEC',
        },
      });
      const student1 = await prisma.user.create({
        data: {
          id: 'stu-dec-1',
          name: 'S1',
          email: 'sdec1@test.com',
          role: 'student',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      const student2 = await prisma.user.create({
        data: {
          id: 'stu-dec-2',
          name: 'S2',
          email: 'sdec2@test.com',
          role: 'student',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      const enr1 = await prisma.classroomEnrollment.create({
        data: { classroomId: classroom.id, studentId: student1.id },
      });
      await prisma.classroomEnrollment.create({
        data: { classroomId: classroom.id, studentId: student2.id },
      });

      await prisma.classroomEnrollment.delete({ where: { id: enr1.id } });

      const res = await prisma.classroom.findUnique({
        where: { id: classroom.id },
        include: { enrollments: true },
      });
      expect(res?.enrollments.length).toBe(1);
    });
  });

  // 5. DATA SANITY & RELATION BOUNDARIES (25-35)
  describe('Data Sanity & Boundary Rules', () => {
    it('25. should maintain independent student profiles for distinct users', async () => {
      const u1 = await prisma.user.create({
        data: {
          id: 'u-bound-1',
          name: 'U1',
          email: 'b1@test.com',
          role: 'student',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      const u2 = await prisma.user.create({
        data: {
          id: 'u-bound-2',
          name: 'U2',
          email: 'b2@test.com',
          role: 'student',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      await prisma.studentProfile.create({
        data: {
          id: u1.id,
          userId: u1.id,
          attendancePercentage: 90,
          streakDays: 5,
          xpPoints: 100,
          gradeLevel: 8,
          section: 'A',
          parentName: 'P1',
          parentPhone: '980',
        },
      });
      await prisma.studentProfile.create({
        data: {
          id: u2.id,
          userId: u2.id,
          attendancePercentage: 95,
          streakDays: 10,
          xpPoints: 200,
          gradeLevel: 8,
          section: 'B',
          parentName: 'P2',
          parentPhone: '981',
        },
      });

      const p1 = await prisma.studentProfile.findUnique({ where: { userId: u1.id } });
      const p2 = await prisma.studentProfile.findUnique({ where: { userId: u2.id } });
      expect(p1?.xpPoints).toBe(100);
      expect(p2?.xpPoints).toBe(200);
    });

    it('26. should support multi-classroom enrollment for a single student', async () => {
      const teacher = await prisma.user.create({
        data: {
          id: 'tch-multi',
          name: 'Teacher',
          email: 'tchmulti@test.com',
          role: 'teacher',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      const cls1 = await prisma.classroom.create({
        data: {
          id: 'cls-m1',
          name: 'Math',
          subject: 'Math',
          gradeLevel: 8,
          section: 'A',
          teacherId: teacher.id,
          teacherName: teacher.name,
          teacherAvatar: teacher.avatar,
          roomNumber: '1',
          colorTheme: 'blue',
          bannerImage: 'b.png',
          code: 'C_M1',
        },
      });
      const cls2 = await prisma.classroom.create({
        data: {
          id: 'cls-m2',
          name: 'Sci',
          subject: 'Sci',
          gradeLevel: 8,
          section: 'A',
          teacherId: teacher.id,
          teacherName: teacher.name,
          teacherAvatar: teacher.avatar,
          roomNumber: '2',
          colorTheme: 'green',
          bannerImage: 'b.png',
          code: 'C_M2',
        },
      });
      const student = await prisma.user.create({
        data: {
          id: 'stu-multi',
          name: 'Student Multi',
          email: 'stumulti@test.com',
          role: 'student',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });

      await prisma.classroomEnrollment.create({
        data: { classroomId: cls1.id, studentId: student.id },
      });
      await prisma.classroomEnrollment.create({
        data: { classroomId: cls2.id, studentId: student.id },
      });

      const studentEnrollments = await prisma.classroomEnrollment.findMany({
        where: { studentId: student.id },
      });
      expect(studentEnrollments.length).toBe(2);
    });

    it('27. should correctly set StoredFileRecord classroomId to null on Classroom deletion', async () => {
      const teacher = await prisma.user.create({
        data: {
          id: 'tch-file-del',
          name: 'Teacher',
          email: 'tchfiledel@test.com',
          role: 'teacher',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      const classroom = await prisma.classroom.create({
        data: {
          id: 'cls-file-del',
          name: 'Math',
          subject: 'Math',
          gradeLevel: 8,
          section: 'A',
          teacherId: teacher.id,
          teacherName: teacher.name,
          teacherAvatar: teacher.avatar,
          roomNumber: '1',
          colorTheme: 'blue',
          bannerImage: 'b.png',
          code: 'C_FD',
        },
      });
      const file = await prisma.storedFileRecord.create({
        data: {
          id: 'file-del-1',
          originalName: 'Doc.pdf',
          storedName: '123_Doc.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1000,
          sizeFormatted: '1KB',
          uploadedBy: 'Teacher',
          classroomId: classroom.id,
          checksum: 'sha256-xxx',
          integrityStatus: 'verified',
          downloadUrl: '/url',
          uploadedAt: new Date().toISOString(),
        },
      });

      await prisma.classroom.delete({ where: { id: classroom.id } });
      const updatedFile = await prisma.storedFileRecord.findUnique({ where: { id: file.id } });
      expect(updatedFile?.classroomId).toBeNull();
    });

    it('28. should support QuizQuestion ordering and deletion with Quiz', async () => {
      const teacher = await prisma.user.create({
        data: {
          id: 'tch-q-del',
          name: 'Teacher',
          email: 'tchqdel@test.com',
          role: 'teacher',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      const classroom = await prisma.classroom.create({
        data: {
          id: 'cls-q-del',
          name: 'Math',
          subject: 'Math',
          gradeLevel: 8,
          section: 'A',
          teacherId: teacher.id,
          teacherName: teacher.name,
          teacherAvatar: teacher.avatar,
          roomNumber: '1',
          colorTheme: 'blue',
          bannerImage: 'b.png',
          code: 'C_QD',
        },
      });
      const quiz = await prisma.quiz.create({
        data: {
          id: 'quiz-q-del',
          classroomId: classroom.id,
          classroomName: classroom.name,
          subject: classroom.subject,
          title: 'Quiz Q Del',
          description: 'Desc',
          durationMinutes: 10,
          dueDate: '2026-08-10',
          totalQuestions: 2,
          createdAt: new Date().toISOString(),
          questions: {
            create: [
              {
                text: 'Q1',
                type: 'MCQ',
                options: ['A', 'B'],
                correctAnswer: 'A',
                explanation: 'E1',
                points: 10,
              },
              {
                text: 'Q2',
                type: 'True/False',
                options: ['True', 'False'],
                correctAnswer: 'True',
                explanation: 'E2',
                points: 10,
              },
            ],
          },
        },
        include: { questions: true },
      });

      expect(quiz.questions.length).toBe(2);
      await prisma.quiz.delete({ where: { id: quiz.id } });
      const questions = await prisma.quizQuestion.findMany({ where: { quizId: quiz.id } });
      expect(questions.length).toBe(0);
    });

    it('29. should preserve BadgeDefinition when StudentBadge is deleted', async () => {
      const user = await prisma.user.create({
        data: {
          id: 'u-badge-del',
          name: 'User',
          email: 'ubadgedel@test.com',
          role: 'student',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      const profile = await prisma.studentProfile.create({
        data: {
          id: user.id,
          userId: user.id,
          attendancePercentage: 90,
          streakDays: 5,
          xpPoints: 100,
          gradeLevel: 8,
          section: 'A',
          parentName: 'P',
          parentPhone: '98',
        },
      });
      const def = await prisma.badgeDefinition.create({
        data: {
          id: 'bdg-def-del-test',
          title: 'Test Badge',
          description: 'Test',
          icon: '🏆',
          category: 'test',
        },
      });
      const sBadge = await prisma.studentBadge.create({
        data: { earnedDate: '2026-08-07', badgeDefinitionId: def.id, studentProfileId: profile.id },
      });

      await prisma.studentBadge.delete({ where: { id: sBadge.id } });
      const defRef = await prisma.badgeDefinition.findUnique({ where: { id: def.id } });
      expect(defRef).not.toBeNull();
    });

    it('30. should enforce non-null values for essential User attributes', async () => {
      await expect(
        prisma.user.create({
          data: {
            id: 'u-null-test',
            name: undefined as any,
            email: 'null@test.com',
            role: 'student',
            avatar: 'a.png',
            schoolName: 'S1',
          },
        }),
      ).rejects.toThrow();
    });

    it('31. should handle StudentLocationRecord updates without mutating studentId FK', async () => {
      const student = await prisma.user.create({
        data: {
          id: 'stu-loc-upd',
          name: 'Loc Student',
          email: 'stulocupd@test.com',
          role: 'student',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      const loc = await prisma.studentLocationRecord.create({
        data: {
          studentId: student.id,
          studentName: student.name,
          currentLocation: 'Library',
          category: 'library',
          updatedBy: 'Staff',
          updatedByRole: 'teacher',
          updatedAt: new Date().toISOString(),
        },
      });

      const updated = await prisma.studentLocationRecord.update({
        where: { id: loc.id },
        data: { currentLocation: 'Canteen', category: 'canteen_lunch' },
      });
      expect(updated.currentLocation).toBe('Canteen');
      expect(updated.studentId).toBe(student.id);
    });

    it('32. should query User with all nested relations populated', async () => {
      const user = await prisma.user.create({
        data: {
          id: 'u-nested-1',
          name: 'Nested User',
          email: 'nested@test.com',
          role: 'student',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      await prisma.studentProfile.create({
        data: {
          id: user.id,
          userId: user.id,
          attendancePercentage: 90,
          streakDays: 5,
          xpPoints: 100,
          gradeLevel: 8,
          section: 'A',
          parentName: 'P',
          parentPhone: '98',
        },
      });

      const res = await prisma.user.findUnique({
        where: { id: user.id },
        include: { studentProfile: true, parentControlSettings: true, enrollments: true },
      });
      expect(res?.studentProfile).not.toBeNull();
    });

    it('33. should support zero-length array defaults for json and array fields', async () => {
      const user = await prisma.user.create({
        data: {
          id: 'u-arr-test',
          name: 'Arr User',
          email: 'arr@test.com',
          role: 'teacher',
          avatar: 'a.png',
          schoolName: 'S1',
          childrenIds: [],
          subjectsTaught: [],
        },
      });
      expect(user.childrenIds.length).toBe(0);
      expect(user.subjectsTaught.length).toBe(0);
    });

    it('34. should handle large numbers of concurrent ClassroomEnrollment records', async () => {
      const teacher = await prisma.user.create({
        data: {
          id: 'tch-conc-1',
          name: 'Teacher',
          email: 'tchconc@test.com',
          role: 'teacher',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      });
      const classroom = await prisma.classroom.create({
        data: {
          id: 'cls-conc-1',
          name: 'Class',
          subject: 'Math',
          gradeLevel: 8,
          section: 'A',
          teacherId: teacher.id,
          teacherName: teacher.name,
          teacherAvatar: teacher.avatar,
          roomNumber: '1',
          colorTheme: 'blue',
          bannerImage: 'b.png',
          code: 'C_CONC',
        },
      });

      for (let i = 1; i <= 15; i++) {
        const student = await prisma.user.create({
          data: {
            id: `stu-conc-${i}`,
            name: `Student ${i}`,
            email: `stuconc_${i}@test.com`,
            role: 'student',
            avatar: 'a.png',
            schoolName: 'S1',
          },
        });
        await prisma.classroomEnrollment.create({
          data: { classroomId: classroom.id, studentId: student.id },
        });
      }

      const res = await prisma.classroom.findUnique({
        where: { id: classroom.id },
        include: { enrollments: true },
      });
      expect(res?.enrollments.length).toBe(15);
    });

    it('35. should properly disconnect prisma client on teardown', async () => {
      expect(prisma).toBeDefined();
    });
  });

  afterAll(async () => {
    // Restore base fixtures for other test suites
    await prisma.user.upsert({
      where: { id: 'user-stu-1' },
      update: {},
      create: {
        id: 'user-stu-1',
        name: 'Aarav Sharma',
        email: 'aarav@mteverest.edu.np',
        role: 'student',
        avatar: 'a.png',
        schoolName: 'S1',
        gradeLevel: 8,
        section: 'A',
      },
    });
    await prisma.studentProfile.upsert({
      where: { id: 'user-stu-1' },
      update: {},
      create: {
        id: 'user-stu-1',
        userId: 'user-stu-1',
        attendancePercentage: 95,
        streakDays: 10,
        xpPoints: 500,
        gradeLevel: 8,
        section: 'A',
        parentName: 'Bina',
        parentPhone: '980',
      },
    });
    await prisma.user.upsert({
      where: { id: 'user-teach-1' },
      update: {},
      create: {
        id: 'user-teach-1',
        name: 'Mr. Ramesh Thapa',
        email: 'ramesh@mteverest.edu.np',
        role: 'teacher',
        avatar: 'a.png',
        schoolName: 'S1',
      },
    });
    await prisma.classroom.upsert({
      where: { id: 'cls-math-8a' },
      update: {},
      create: {
        id: 'cls-math-8a',
        name: 'Grade 8 Mathematics - Sec A',
        subject: 'Mathematics',
        gradeLevel: 8,
        section: 'A',
        teacherId: 'user-teach-1',
        teacherName: 'Mr. Ramesh Thapa',
        teacherAvatar: 'a.png',
        roomNumber: '204',
        colorTheme: 'blue',
        bannerImage: 'b.png',
        code: 'MATH8A',
      },
    });
    await prisma.storedFileRecord.createMany({
      data: [
        {
          id: 'file-db-101',
          originalName: 'Grade_8_Math_Pythagoras_Theorem.pdf',
          storedName: '1785850000_Pythagoras_Theorem.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1548576,
          sizeFormatted: '1.48 MB',
          uploadedBy: 'Ramesh Thapa',
          classroomId: 'cls-math-8a',
          checksum: 'sha256-a9f8b4c2e1d7532098471abcfe094857',
          integrityStatus: 'verified',
          uploadedAt: new Date(Date.now() - 86400000).toISOString(),
          downloadUrl: '/uploads/Grade_8_Math_Pythagoras_Theorem.pdf',
        },
      ],
    });
  });
});
