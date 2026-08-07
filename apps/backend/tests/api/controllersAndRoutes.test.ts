import { describe, it, expect, beforeAll } from 'vitest';
import { loadEnv } from '../../src/utils/envResolver';
loadEnv();
import request from 'supertest';
import express from 'express';
import { systemRoutes } from '../../src/routes/systemRoutes';
import { studentRoutes } from '../../src/routes/studentRoutes';
import { teacherRoutes } from '../../src/routes/teacherRoutes';
import { parentRoutes } from '../../src/routes/parentRoutes';
import { adminRoutes } from '../../src/routes/adminRoutes';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = express();
app.use(express.json());
app.use('/api', systemRoutes);
app.use('/api', studentRoutes);
app.use('/api', teacherRoutes);
app.use('/api', parentRoutes);
app.use('/api', adminRoutes);

app.get('/', (_req, res) => {
  res.json({ message: 'LMS API Backend is running' });
});

describe('Controller & Route API Suite (45 Comprehensive Tests)', () => {
  beforeAll(async () => {
    // Populate base users
    await prisma.user.upsert({
      where: { id: 'user-stu-1' },
      update: {},
      create: { id: 'user-stu-1', name: 'Aarav Sharma', email: 'aarav@ctrl.com', role: 'student', avatar: 'a.png', schoolName: 'S1', gradeLevel: 8, section: 'A' },
    });
    await prisma.studentProfile.upsert({
      where: { id: 'user-stu-1' },
      update: {},
      create: { id: 'user-stu-1', userId: 'user-stu-1', attendancePercentage: 95, streakDays: 10, xpPoints: 500, gradeLevel: 8, section: 'A', parentName: 'Bina', parentPhone: '980' },
    });
    await prisma.user.upsert({
      where: { id: 'user-teach-1' },
      update: {},
      create: { id: 'user-teach-1', name: 'Mr. Ramesh Thapa', email: 'ramesh@ctrl.com', role: 'teacher', avatar: 'a.png', schoolName: 'S1' },
    });
    await prisma.user.upsert({
      where: { id: 'user-parent-1' },
      update: {},
      create: { id: 'user-parent-1', name: 'Bina Sharma', email: 'bina@ctrl.com', role: 'parent', avatar: 'a.png', schoolName: 'S1', childrenIds: ['user-stu-1'] },
    });
    await prisma.user.upsert({
      where: { id: 'user-admin-1' },
      update: {},
      create: { id: 'user-admin-1', name: 'Dr. K.P. Bhattarai', email: 'admin@ctrl.com', role: 'admin', avatar: 'a.png', schoolName: 'S1' },
    });

    // Populate base classroom, assignment, quiz, badge definition
    await prisma.classroom.upsert({
      where: { id: 'cls-math-8a' },
      update: {},
      create: { id: 'cls-math-8a', name: 'Grade 8 Mathematics - Sec A', subject: 'Mathematics', gradeLevel: 8, section: 'A', teacherId: 'user-teach-1', teacherName: 'Mr. Ramesh Thapa', teacherAvatar: 'a.png', roomNumber: '204', colorTheme: 'blue', bannerImage: 'b.png', code: 'MATH8A' },
    });
    await prisma.assignment.upsert({
      where: { id: 'asg-1' },
      update: {},
      create: { id: 'asg-1', classroomId: 'cls-math-8a', classroomName: 'Math 8A', subject: 'Math', title: 'Algebra Homework', instructions: 'Inst', dueDate: '2026-08-15', dueTime: '17:00', totalPoints: 100, rubric: [], createdAt: new Date().toISOString() },
    });
    await prisma.quiz.upsert({
      where: { id: 'quiz-1' },
      update: {},
      create: { id: 'quiz-1', classroomId: 'cls-math-8a', classroomName: 'Math 8A', subject: 'Math', title: 'Quiz 1', description: 'Desc', durationMinutes: 15, dueDate: '2026-08-10', totalQuestions: 1, createdAt: new Date().toISOString() },
    });
    await prisma.badgeDefinition.upsert({
      where: { id: 'bdg-def-1' },
      update: {},
      create: { id: 'bdg-def-1', title: 'Top Scholar', description: 'Academic excellence', icon: '🌟', category: 'academic', isAutomatic: false },
    });
    await prisma.streamPost.upsert({
      where: { id: 'post-1' },
      update: {},
      create: { id: 'post-1', classroomId: 'cls-math-8a', authorId: 'user-teach-1', authorName: 'Mr. Ramesh Thapa', authorAvatar: 'a.png', authorRole: 'teacher', content: 'Post 1', createdAt: new Date().toISOString() },
    });
  });
  // 1. SYSTEM ROUTES
  describe('System Routes', () => {
    it('1. GET /api/health returns 200 OK', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('2. GET /api/db/state returns full state payload', async () => {
      const res = await request(app).get('/api/db/state');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(Array.isArray(res.body.classrooms)).toBe(true);
    });

    it('3. POST /api/upload stores file record', async () => {
      const res = await request(app).post('/api/upload').send({
        name: 'Test_Doc.pdf',
        uploadedBy: 'Teacher Test',
        sizeBytes: 1024,
        mimeType: 'application/pdf',
      });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.record).toBeDefined();
    });

    it('4. GET /api/files returns list of stored files', async () => {
      const res = await request(app).get('/api/files');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.files)).toBe(true);
    });

    it('5. GET /api/files/:id returns 404 for non-existent file', async () => {
      const res = await request(app).get('/api/files/non-existent-id-999');
      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
    });

    it('6. DELETE /api/files/:id returns 404 for non-existent file', async () => {
      const res = await request(app).delete('/api/files/non-existent-id-999');
      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
    });
  });

  // 2. STUDENT ROUTES
  describe('Student Routes', () => {
    it('7. POST /api/db/submissions handles student homework submission', async () => {
      const res = await request(app).post('/api/db/submissions').send({
        assignmentId: 'asg-1',
        fileName: 'Homework.pdf',
        fileUrl: 'http://test.com/hw.pdf',
        studentId: 'user-stu-1',
        notes: 'Done',
      });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('8. POST /api/db/quiz-submissions handles student quiz submission', async () => {
      const res = await request(app).post('/api/db/quiz-submissions').send({
        quizId: 'quiz-1',
        studentId: 'user-stu-1',
        score: 80,
        totalPoints: 100,
        answers: { 'q-1': 'Option A' },
      });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('9. GET /api/db/student-locations/:studentId returns location record', async () => {
      const res = await request(app).get('/api/db/student-locations/user-stu-1');
      expect([200, 404]).toContain(res.status);
    });

    it('10. POST /api/ai/tutor responds to student prompt', async () => {
      const res = await request(app).post('/api/ai/tutor').send({
        prompt: 'Explain Newton laws',
        subject: 'Science',
        gradeLevel: 8,
      });
      expect(res.status).toBe(200);
      expect(res.body.text).toBeDefined();
    });

    it('11. POST /api/ai/homework-helper responds to student query', async () => {
      const res = await request(app).post('/api/ai/homework-helper').send({
        assignmentTitle: 'Pythagoras Theorem',
        assignmentDescription: 'Solve right triangle',
        questionText: 'How to find hypotenuse?',
        gradeLevel: 8,
      });
      expect(res.status).toBe(200);
      expect(res.body.text).toBeDefined();
    });
  });

  // 3. TEACHER ROUTES
  describe('Teacher Routes', () => {
    it('12. POST /api/db/classrooms creates new classroom', async () => {
      const res = await request(app).post('/api/db/classrooms').send({
        name: 'Grade 9 Computer Science',
        subject: 'Computer Science',
        gradeLevel: 9,
        section: 'A',
        teacherId: 'user-teach-1',
        teacherName: 'Mr. Ramesh Thapa',
        teacherAvatar: 'avatar.png',
        roomNumber: 'Lab C',
        colorTheme: 'purple',
        bannerImage: 'banner.png',
      });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.classroom.code).toBeDefined();
    });

    it('13. POST /api/db/stream-posts creates classroom announcement', async () => {
      const res = await request(app).post('/api/db/stream-posts').send({
        classroomId: 'cls-math-8a',
        authorId: 'user-teach-1',
        authorName: 'Mr. Ramesh Thapa',
        authorAvatar: 'avatar.png',
        authorRole: 'teacher',
        content: 'Welcome to Class!',
        pinned: true,
      });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('14. POST /api/db/stream-posts/:id/comments adds post comment', async () => {
      const res = await request(app).post('/api/db/stream-posts/post-1/comments').send({
        authorName: 'Mr. Ramesh Thapa',
        authorAvatar: 'avatar.png',
        content: 'Don’t forget textbook tomorrow!',
      });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('15. POST /api/db/assignments creates new assignment', async () => {
      const res = await request(app).post('/api/db/assignments').send({
        classroomId: 'cls-math-8a',
        classroomName: 'Grade 8 Math',
        subject: 'Mathematics',
        title: 'Algebra Quiz Preparation',
        instructions: 'Solve exercises 1-10',
        dueDate: '2026-08-15',
        dueTime: '17:00',
        totalPoints: 50,
      });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('16. POST /api/db/quizzes creates new quiz', async () => {
      const res = await request(app).post('/api/db/quizzes').send({
        classroomId: 'cls-math-8a',
        classroomName: 'Grade 8 Math',
        subject: 'Mathematics',
        title: 'Equations Quiz',
        description: 'Linear equations assessment',
        durationMinutes: 20,
        dueDate: '2026-08-12',
        totalQuestions: 2,
        published: true,
        questions: [
          { text: 'Solve x+2=5', type: 'MCQ', options: ['1', '2', '3', '4'], correctAnswer: '3', explanation: 'x=3', points: 5 },
        ],
      });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('17. POST /api/db/attendance marks attendance record', async () => {
      const res = await request(app).post('/api/db/attendance').send({
        studentId: 'user-stu-1',
        studentName: 'Aarav Sharma',
        date: '2026-08-07',
        status: 'present',
        remarks: 'On time',
      });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('18. POST /api/db/student-locations updates student real-time location', async () => {
      const res = await request(app).post('/api/db/student-locations').send({
        studentId: 'user-stu-1',
        studentName: 'Aarav Sharma',
        location: 'Science Lab 1',
        category: 'in_class',
        updatedBy: 'Mrs. Sabina Karki',
        updatedByRole: 'teacher',
      });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('19. POST /api/db/student-locations rejects missing required fields (400 Bad Request)', async () => {
      const res = await request(app).post('/api/db/student-locations').send({
        studentId: 'user-stu-1',
      });
      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('20. POST /api/ai/quiz-generator generates AI quiz JSON', async () => {
      const res = await request(app).post('/api/ai/quiz-generator').send({
        topic: 'Photosynthesis',
        subject: 'Science',
        gradeLevel: 8,
        questionCount: 3,
      });
      expect(res.status).toBe(200);
      expect(res.body.quiz).toBeDefined();
    });

    it('21. POST /api/ai/teacher-assistant drafts lesson feedback', async () => {
      const res = await request(app).post('/api/ai/teacher-assistant').send({
        task: 'lesson_plan',
        context: { topic: 'Quadratic Equations', gradeLevel: 9 },
      });
      expect(res.status).toBe(200);
      expect(res.body.text).toBeDefined();
    });
  });

  // 4. PARENT ROUTES
  describe('Parent Routes', () => {
    it('22. POST /api/db/parent-controls updates parent settings', async () => {
      const res = await request(app).post('/api/db/parent-controls').send({
        studentId: 'user-stu-1',
        settings: {
          allowTeacherDirectChat: true,
          allowPeerDiscussion: false,
          missingHomeworkAlerts: true,
          lowAttendanceAlerts: true,
          weeklyDigestEmail: true,
          screenTimeLimitMinutes: 90,
          requireApprovalForOutboundMsgs: true,
        },
      });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('23. POST /api/db/messages sends direct message', async () => {
      const res = await request(app).post('/api/db/messages').send({
        senderId: 'user-parent-1',
        senderName: 'Bina Sharma',
        senderRole: 'parent',
        senderAvatar: 'avatar.png',
        receiverId: 'user-teach-1',
        receiverName: 'Mr. Ramesh Thapa',
        content: 'Inquiring about Aarav homework progress.',
      });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('24. POST /api/ai/parent-summary generates weekly digest summary', async () => {
      const res = await request(app).post('/api/ai/parent-summary').send({
        studentName: 'Aarav Sharma',
        gradeLevel: 8,
        attendanceRate: 96.5,
        recentGrades: 'GPA 3.88',
        pendingHomeworkCount: 1,
        teacherNotes: 'Very attentive',
      });
      expect(res.status).toBe(200);
    });
  });

  // 5. ADMIN ROUTES & BADGE ASSIGNMENT
  describe('Admin Routes & Badges', () => {
    it('25. POST /api/db/student-badges manually awards badge to student', async () => {
      const res = await request(app).post('/api/db/student-badges').send({
        studentProfileId: 'user-stu-1',
        badgeDefinitionId: 'bdg-def-1',
        assignedBy: 'Dr. K.P. Bhattarai',
        remarks: 'Outstanding performance',
      });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.badge).toBeDefined();
    });

    it('26. POST /api/db/student-badges returns 400 Bad Request when missing fields', async () => {
      const res = await request(app).post('/api/db/student-badges').send({
        studentProfileId: 'user-stu-1',
      });
      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('27. GET /api/db/student-locations lists all student real-time locations', async () => {
      const res = await request(app).get('/api/db/student-locations');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.studentLocations)).toBe(true);
    });
  });

  // 6. ADDITIONAL CONTROLLER EDGE & BOUNDARY TESTS (28-45)
  describe('Additional Controller Edge & Boundary Assertions', () => {
    it('28. POST /api/upload handles default file sizes and PDF fallback mime types', async () => {
      const res = await request(app).post('/api/upload').send({});
      expect(res.status).toBe(200);
      expect(res.body.record.originalName).toBe('Uploaded_Attachment.pdf');
    });

    it('29. GET /api/files handles classroomId filtering query string', async () => {
      const res = await request(app).get('/api/files?classroomId=cls-math-8a');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.files)).toBe(true);
    });

    it('30. POST /api/db/classrooms handles custom meeting links', async () => {
      const res = await request(app).post('/api/db/classrooms').send({
        name: 'Grade 10 Physics',
        subject: 'Physics',
        gradeLevel: 10,
        section: 'A',
        teacherId: 'user-teach-1',
        teacherName: 'Mr. Ramesh Thapa',
        teacherAvatar: 'a.png',
        roomNumber: '301',
        colorTheme: 'orange',
        bannerImage: 'b.png',
        meetLink: 'https://meet.google.com/phy-10a',
      });
      expect(res.status).toBe(200);
      expect(res.body.classroom.meetLink).toBe('https://meet.google.com/phy-10a');
    });

    it('31. POST /api/db/submissions updates existing submission on re-submit', async () => {
      await request(app).post('/api/db/submissions').send({
        assignmentId: 'asg-repeat-1',
        fileName: 'V1.pdf',
        fileUrl: 'http://t.com/v1.pdf',
        studentId: 'user-stu-1',
        notes: 'First draft',
      });

      const res = await request(app).post('/api/db/submissions').send({
        assignmentId: 'asg-repeat-1',
        fileName: 'V2.pdf',
        fileUrl: 'http://t.com/v2.pdf',
        studentId: 'user-stu-1',
        notes: 'Second draft',
      });
      expect(res.status).toBe(200);
      expect(res.body.submission.fileName).toBe('V2.pdf');
    });

    it('32. POST /api/db/attendance updates status when attendance for date exists', async () => {
      await request(app).post('/api/db/attendance').send({
        studentId: 'user-stu-1',
        studentName: 'Aarav Sharma',
        date: '2026-09-01',
        status: 'absent',
        remarks: 'Sick',
      });

      const res = await request(app).post('/api/db/attendance').send({
        studentId: 'user-stu-1',
        studentName: 'Aarav Sharma',
        date: '2026-09-01',
        status: 'excused',
        remarks: 'Doctor Note Provided',
      });
      expect(res.status).toBe(200);
      expect(res.body.attendance.status).toBe('excused');
    });

    it('33. POST /api/ai/tutor supports custom language preferences', async () => {
      const res = await request(app).post('/api/ai/tutor').send({
        prompt: 'गणितका नियमहरू बुझाउनुहोस्',
        subject: 'Mathematics',
        gradeLevel: 8,
        language: 'Nepali',
      });
      expect(res.status).toBe(200);
    });

    it('34. POST /api/ai/quiz-generator handles custom question types', async () => {
      const res = await request(app).post('/api/ai/quiz-generator').send({
        topic: 'Nepal History',
        subject: 'Social Studies',
        gradeLevel: 8,
        questionCount: 4,
        questionTypes: ['MCQ'],
      });
      expect(res.status).toBe(200);
    });

    it('35. POST /api/ai/teacher-assistant handles announcement drafting task', async () => {
      const res = await request(app).post('/api/ai/teacher-assistant').send({
        task: 'write_announcement',
        context: { event: 'Sports Day', date: '2026-09-10' },
      });
      expect(res.status).toBe(200);
    });

    it('36. POST /api/db/messages supports approvedByParent boolean flag', async () => {
      const res = await request(app).post('/api/db/messages').send({
        senderId: 'user-stu-1',
        senderName: 'Aarav Sharma',
        senderRole: 'student',
        senderAvatar: 'a.png',
        receiverId: 'user-teach-1',
        receiverName: 'Mr. Ramesh Thapa',
        content: 'Asking about homework',
        approvedByParent: true,
      });
      expect(res.status).toBe(200);
      expect(res.body.message.approvedByParent).toBe(true);
    });

    it('37. POST /api/db/student-locations handles bus number metadata', async () => {
      const res = await request(app).post('/api/db/student-locations').send({
        studentId: 'user-stu-1',
        studentName: 'Aarav Sharma',
        location: 'Bus Route 4',
        category: 'en_route_bus',
        busNumber: 'BA 3 KHA 4589',
        updatedBy: 'Driver Ram',
        updatedByRole: 'admin',
      });
      expect(res.status).toBe(200);
      expect(res.body.location.busNumber).toBe('BA 3 KHA 4589');
    });

    it('38. POST /api/db/stream-posts handles post attachments', async () => {
      const res = await request(app).post('/api/db/stream-posts').send({
        classroomId: 'cls-math-8a',
        authorId: 'user-teach-1',
        authorName: 'Mr. Ramesh Thapa',
        authorAvatar: 'a.png',
        authorRole: 'teacher',
        content: 'Check attachment',
        attachments: [{ title: 'Notes.pdf', type: 'pdf', url: 'http://test.com/notes.pdf' }],
      });
      expect(res.status).toBe(200);
      expect(res.body.post.attachments.length).toBe(1);
    });

    it('39. POST /api/db/assignments supports rubric items array', async () => {
      const res = await request(app).post('/api/db/assignments').send({
        classroomId: 'cls-math-8a',
        classroomName: 'Math 8A',
        subject: 'Math',
        title: 'Project Rubric',
        instructions: 'Follow rubric',
        dueDate: '2026-09-01',
        dueTime: '12:00',
        totalPoints: 100,
        rubric: ['Clarity (20pts)', 'Accuracy (80pts)'],
      });
      expect(res.status).toBe(200);
      expect(res.body.assignment.rubric.length).toBe(2);
    });

    it('40. GET /api/db/state includes termProgress and studentActivities arrays', async () => {
      const res = await request(app).get('/api/db/state');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.termProgress)).toBe(true);
      expect(Array.isArray(res.body.studentActivities)).toBe(true);
    });

    it('41. POST /api/db/student-badges rejects assignment when missing assignedBy', async () => {
      const res = await request(app).post('/api/db/student-badges').send({
        studentProfileId: 'user-stu-1',
        badgeDefinitionId: 'bdg-def-1',
      });
      expect(res.status).toBe(400);
    });

    it('42. POST /api/db/quiz-submissions returns answers Record object correctly', async () => {
      const res = await request(app).post('/api/db/quiz-submissions').send({
        quizId: 'quiz-1',
        studentId: 'user-stu-1',
        score: 100,
        totalPoints: 100,
        answers: { 'q-1': 'Option A', 'q-2': 'Option B' },
      });
      expect(res.status).toBe(200);
      expect(res.body.quizSubmission.answers['q-1']).toBe('Option A');
    });

    it('43. GET /api/files/:id returns file object when valid file ID exists', async () => {
      const uploadRes = await request(app).post('/api/upload').send({ name: 'Lookup_File.pdf' });
      const fileId = uploadRes.body.record.id;

      const res = await request(app).get(`/api/files/${fileId}`);
      expect(res.status).toBe(200);
      expect(res.body.file.id).toBe(fileId);
    });

    it('44. DELETE /api/files/:id removes file object when valid file ID exists', async () => {
      const uploadRes = await request(app).post('/api/upload').send({ name: 'Delete_File.pdf' });
      const fileId = uploadRes.body.record.id;

      const res = await request(app).delete(`/api/files/${fileId}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('45. GET / matches fallback backend status response', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('LMS API Backend is running');
    });
  });
});
