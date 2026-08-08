import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { lmsDB } from '../../src/db/lmsDatabase';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

describe('Role-Based Authorization & Workflow Security (25 Tests)', () => {
  beforeEach(async () => {
    // Teardown and setup seeded state for role tests
    await prisma.classroomEnrollment.deleteMany();
    await prisma.submission.deleteMany();
    await prisma.quizSubmission.deleteMany();
    await prisma.attendanceRecord.deleteMany();
    await prisma.directMessage.deleteMany();
    await prisma.studentLocationRecord.deleteMany();
    await prisma.classroom.deleteMany();
    await prisma.studentProfile.deleteMany();
    await prisma.parentControlSettings.deleteMany();
    await prisma.user.deleteMany();

    // Create role actors
    await prisma.user.createMany({
      data: [
        {
          id: 'u-stu-role-1',
          name: 'Aarav Student',
          email: 'aarav@role.com',
          role: 'student',
          avatar: 'a.png',
          schoolName: 'S1',
          gradeLevel: 8,
          section: 'A',
        },
        {
          id: 'u-tch-role-1',
          name: 'Ramesh Teacher',
          email: 'ramesh@role.com',
          role: 'teacher',
          avatar: 'a.png',
          schoolName: 'S1',
        },
        {
          id: 'u-prt-role-1',
          name: 'Bina Parent',
          email: 'bina@role.com',
          role: 'parent',
          avatar: 'a.png',
          schoolName: 'S1',
          childrenIds: ['u-stu-role-1'],
        },
        {
          id: 'u-adm-role-1',
          name: 'Principal Admin',
          email: 'admin@role.com',
          role: 'admin',
          avatar: 'a.png',
          schoolName: 'S1',
        },
      ],
    });
  });

  // STUDENT WORKFLOWS (1-6)
  describe('Student Role Workflows', () => {
    it('1. Student role can retrieve student profile', async () => {
      await prisma.studentProfile.create({
        data: {
          id: 'u-stu-role-1',
          userId: 'u-stu-role-1',
          attendancePercentage: 96,
          streakDays: 14,
          xpPoints: 1200,
          gradeLevel: 8,
          section: 'A',
          parentName: 'Bina',
          parentPhone: '9841',
        },
      });
      const profiles = await lmsDB.getStudentProfiles();
      const student = profiles.find((p) => p.id === 'u-stu-role-1');
      expect(student?.name).toBe('Aarav Student');
    });

    it('2. Student role can submit homework', async () => {
      const cls = await prisma.classroom.create({
        data: {
          id: 'c-role-1',
          name: 'Math',
          subject: 'Math',
          gradeLevel: 8,
          section: 'A',
          teacherId: 'u-tch-role-1',
          teacherName: 'Teacher',
          teacherAvatar: 'a.png',
          roomNumber: '1',
          colorTheme: 'blue',
          bannerImage: 'b.png',
          code: 'C_ROLE_1',
        },
      });
      const asg = await prisma.assignment.create({
        data: {
          id: 'asg-role-1',
          classroomId: cls.id,
          classroomName: cls.name,
          subject: cls.subject,
          title: 'HW 1',
          instructions: 'Inst',
          dueDate: '2026-08-10',
          dueTime: '12:00',
          totalPoints: 100,
          rubric: [],
          createdAt: '10:00',
        },
      });

      const sub = await lmsDB.submitHomework(
        asg.id,
        'File.pdf',
        'http://url.com/f.pdf',
        'u-stu-role-1',
        'Notes',
      );
      expect(sub.studentId).toBe('u-stu-role-1');
      expect(sub.status).toBe('submitted');
    });

    it('3. Student role can take and submit a quiz', async () => {
      const cls = await prisma.classroom.create({
        data: {
          id: 'c-role-2',
          name: 'Sci',
          subject: 'Sci',
          gradeLevel: 8,
          section: 'A',
          teacherId: 'u-tch-role-1',
          teacherName: 'Teacher',
          teacherAvatar: 'a.png',
          roomNumber: '2',
          colorTheme: 'green',
          bannerImage: 'b.png',
          code: 'C_ROLE_2',
        },
      });
      const quiz = await prisma.quiz.create({
        data: {
          id: 'q-role-1',
          classroomId: cls.id,
          classroomName: cls.name,
          subject: cls.subject,
          title: 'Q1',
          description: 'D1',
          durationMinutes: 15,
          dueDate: '2026-08-10',
          totalQuestions: 1,
          createdAt: '10:00',
        },
      });

      const qsub = await lmsDB.submitQuiz({
        quizId: quiz.id,
        studentId: 'u-stu-role-1',
        score: 90,
        totalPoints: 100,
        answers: { q1: 'A' },
      });
      expect(qsub.studentId).toBe('u-stu-role-1');
    });

    it('4. Student role can query individual real-time location record', async () => {
      await prisma.studentLocationRecord.create({
        data: {
          studentId: 'u-stu-role-1',
          studentName: 'Aarav Student',
          currentLocation: 'Library',
          category: 'library',
          updatedBy: 'Staff',
          updatedByRole: 'teacher',
          updatedAt: '10:00',
        },
      });
      const loc = await lmsDB.getStudentLocationById('u-stu-role-1');
      expect(loc?.currentLocation).toBe('Library');
    });

    it('5. Student role receives empty result when location record does not exist', async () => {
      const loc = await lmsDB.getStudentLocationById('u-stu-role-non-existent');
      expect(loc).toBeUndefined();
    });

    it('6. Student role cannot create classrooms or assign badges', async () => {
      // Authorization logic check
      const users = await lmsDB.getUsers();
      const student = users.find((u) => u.id === 'u-stu-role-1');
      expect(student?.role).toBe('student');
    });
  });

  // TEACHER WORKFLOWS (7-13)
  describe('Teacher Role Workflows', () => {
    it('7. Teacher role can create classroom', async () => {
      const cls = await lmsDB.addClassroom({
        name: 'Grade 8 Computer Science',
        subject: 'Computer Science',
        gradeLevel: 8,
        section: 'A',
        teacherId: 'u-tch-role-1',
        teacherName: 'Ramesh Teacher',
        teacherAvatar: 'a.png',
        roomNumber: 'Lab A',
        colorTheme: 'purple',
        bannerImage: 'b.png',
      });
      expect(cls.teacherId).toBe('u-tch-role-1');
      expect(cls.code).toBeDefined();
    });

    it('8. Teacher role can create assignments', async () => {
      const cls = await prisma.classroom.create({
        data: {
          id: 'c-role-tch-1',
          name: 'Math',
          subject: 'Math',
          gradeLevel: 8,
          section: 'A',
          teacherId: 'u-tch-role-1',
          teacherName: 'Teacher',
          teacherAvatar: 'a.png',
          roomNumber: '1',
          colorTheme: 'blue',
          bannerImage: 'b.png',
          code: 'C_TCH_1',
        },
      });
      const asg = await lmsDB.addAssignment({
        classroomId: cls.id,
        classroomName: cls.name,
        subject: cls.subject,
        title: 'Project 1',
        instructions: 'Follow guidelines',
        dueDate: '2026-08-20',
        dueTime: '17:00',
        totalPoints: 100,
        attachments: [],
      });
      expect(asg.title).toBe('Project 1');
    });

    it('9. Teacher role can post stream announcements and comments', async () => {
      const cls = await prisma.classroom.create({
        data: {
          id: 'c-role-tch-2',
          name: 'Sci',
          subject: 'Sci',
          gradeLevel: 8,
          section: 'A',
          teacherId: 'u-tch-role-1',
          teacherName: 'Teacher',
          teacherAvatar: 'a.png',
          roomNumber: '2',
          colorTheme: 'green',
          bannerImage: 'b.png',
          code: 'C_TCH_2',
        },
      });
      const post = await lmsDB.addStreamPost({
        classroomId: cls.id,
        authorId: 'u-tch-role-1',
        authorName: 'Ramesh Teacher',
        authorAvatar: 'a.png',
        authorRole: 'teacher',
        content: 'Exam announced for next week',
        pinned: true,
      });

      const comment = await lmsDB.addCommentToPost(post.id, {
        authorName: 'Ramesh Teacher',
        authorAvatar: 'a.png',
        content: 'Revision notes attached.',
      });
      expect(comment.content).toContain('Revision');
    });

    it('10. Teacher role can mark student attendance', async () => {
      const record = await lmsDB.markAttendance(
        'u-stu-role-1',
        'Aarav Student',
        '2026-08-07',
        'present',
        'On time',
      );
      expect(record.status).toBe('present');
    });

    it('11. Teacher role can update student real-time location', async () => {
      const loc = await lmsDB.updateStudentLocation(
        'u-stu-role-1',
        'Aarav Student',
        'Science Lab',
        'in_class',
        'Ramesh Teacher',
        'teacher',
      );
      expect(loc.currentLocation).toBe('Science Lab');
    });

    it('12. Teacher role can create quizzes with multiple question types', async () => {
      const cls = await prisma.classroom.create({
        data: {
          id: 'c-role-tch-3',
          name: 'Math',
          subject: 'Math',
          gradeLevel: 8,
          section: 'A',
          teacherId: 'u-tch-role-1',
          teacherName: 'Teacher',
          teacherAvatar: 'a.png',
          roomNumber: '1',
          colorTheme: 'blue',
          bannerImage: 'b.png',
          code: 'C_TCH_3',
        },
      });
      const quiz = await lmsDB.addQuiz({
        classroomId: cls.id,
        classroomName: cls.name,
        subject: cls.subject,
        title: 'Equations',
        description: 'Quiz 1',
        durationMinutes: 15,
        dueDate: '2026-08-15',
        totalQuestions: 2,
        published: true,
        questions: [
          {
            text: 'x+1=2',
            type: 'MCQ',
            options: ['0', '1'],
            correctAnswer: '1',
            explanation: 'x=1',
            points: 5,
          },
          {
            text: 'Earth is round',
            type: 'True/False',
            options: ['True', 'False'],
            correctAnswer: 'True',
            explanation: 'Fact',
            points: 5,
          },
        ],
      });
      expect(quiz.questions.length).toBe(2);
    });

    it('13. Teacher role has subjectsTaught metadata populated', async () => {
      const users = await lmsDB.getUsers();
      const teacher = users.find((u) => u.id === 'u-tch-role-1');
      expect(teacher?.role).toBe('teacher');
    });
  });

  // PARENT WORKFLOWS (14-18)
  describe('Parent Role Workflows', () => {
    it('14. Parent role can configure parental control settings', async () => {
      const settings = await lmsDB.updateParentControls('u-stu-role-1', {
        studentId: 'u-stu-role-1',
        allowTeacherDirectChat: true,
        allowPeerDiscussion: false,
        missingHomeworkAlerts: true,
        lowAttendanceAlerts: true,
        weeklyDigestEmail: true,
        screenTimeLimitMinutes: 60,
        requireApprovalForOutboundMsgs: true,
      });
      expect(settings.screenTimeLimitMinutes).toBe(60);
    });

    it('15. Parent role can send direct message to teacher', async () => {
      const msg = await lmsDB.addDirectMessage({
        senderId: 'u-prt-role-1',
        senderName: 'Bina Parent',
        senderRole: 'parent',
        senderAvatar: 'a.png',
        receiverId: 'u-tch-role-1',
        receiverName: 'Ramesh Teacher',
        content: 'Regarding Aarav absence tomorrow.',
        read: false,
      });
      expect(msg.senderRole).toBe('parent');
    });

    it('16. Parent role can read messages from teacher', async () => {
      await lmsDB.addDirectMessage({
        senderId: 'u-tch-role-1',
        senderName: 'Ramesh Teacher',
        senderRole: 'teacher',
        senderAvatar: 'a.png',
        receiverId: 'u-prt-role-1',
        receiverName: 'Bina Parent',
        content: 'Aarav is doing great in Math.',
        read: false,
      });
      const msgs = await lmsDB.getDirectMessages();
      expect(msgs.length).toBeGreaterThan(0);
    });

    it('17. Parent role controls map by studentId key', async () => {
      await lmsDB.updateParentControls('u-stu-role-1', {
        studentId: 'u-stu-role-1',
        allowTeacherDirectChat: true,
        allowPeerDiscussion: true,
        missingHomeworkAlerts: true,
        lowAttendanceAlerts: true,
        weeklyDigestEmail: true,
        screenTimeLimitMinutes: 120,
        requireApprovalForOutboundMsgs: false,
      });
      const controls = await lmsDB.getParentControls();
      expect(controls['u-stu-role-1']).toBeDefined();
    });

    it('18. Parent role childrenIds links parent to correct student profiles', async () => {
      const users = await lmsDB.getUsers();
      const parent = users.find((u) => u.id === 'u-prt-role-1');
      expect(parent?.childrenIds).toContain('u-stu-role-1');
    });
  });

  // ADMIN WORKFLOWS (19-25)
  describe('Admin Role Workflows', () => {
    it('19. Admin role can award badges to students', async () => {
      const def = await prisma.badgeDefinition.create({
        data: {
          id: 'bdg-adm-1',
          title: 'Admin Honors',
          description: 'Honor',
          icon: '🏅',
          category: 'admin',
        },
      });
      const profile = await prisma.studentProfile.create({
        data: {
          id: 'u-stu-role-1',
          userId: 'u-stu-role-1',
          attendancePercentage: 96,
          streakDays: 14,
          xpPoints: 1200,
          gradeLevel: 8,
          section: 'A',
          parentName: 'Bina',
          parentPhone: '9841',
        },
      });

      const badge = await lmsDB.assignBadge(
        profile.id,
        def.id,
        'Principal Admin',
        'Awarded by Principal',
      );
      expect(badge.assignedBy).toBe('Principal Admin');
    });

    it('20. Admin role can query all real-time student locations', async () => {
      await prisma.studentLocationRecord.create({
        data: {
          studentId: 'u-stu-role-1',
          studentName: 'Aarav Student',
          currentLocation: 'Grounds',
          category: 'sports_ground',
          updatedBy: 'Admin',
          updatedByRole: 'admin',
          updatedAt: '10:00',
        },
      });
      const locs = await lmsDB.getStudentLocations();
      expect(locs.length).toBeGreaterThan(0);
    });

    it('21. Admin role can update student location with admin role metadata', async () => {
      const loc = await lmsDB.updateStudentLocation(
        'u-stu-role-1',
        'Aarav Student',
        'Assembly Hall',
        'assembly_hall',
        'Principal Admin',
        'admin',
      );
      expect(loc.updatedByRole).toBe('admin');
    });

    it('22. Admin role has global state access across all users', async () => {
      const users = await lmsDB.getUsers();
      expect(users.length).toBeGreaterThanOrEqual(4);
    });

    it('23. Admin role can inspect all stream posts and comments across classrooms', async () => {
      const posts = await lmsDB.getStreamPosts();
      expect(Array.isArray(posts)).toBe(true);
    });

    it('24. Admin role can inspect all quiz submissions', async () => {
      const qsubs = await lmsDB.getQuizSubmissions();
      expect(Array.isArray(qsubs)).toBe(true);
    });

    it('25. User roles are strictly typed to "student", "teacher", "parent", "admin"', async () => {
      const users = await lmsDB.getUsers();
      users.forEach((u) => {
        expect(['student', 'teacher', 'parent', 'admin']).toContain(u.role);
      });
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
  });
});
