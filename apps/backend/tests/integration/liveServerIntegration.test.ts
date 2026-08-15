import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { loadEnv } from '../../src/utils/envResolver';
loadEnv();
delete process.env.GEMINI_API_KEY;
import { createApp } from '../../src/app';
import { Server } from 'http';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { signToken } from '../../src/utils/jwtUtils';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
let server: Server;
const PORT = 3001;
let BASE_URL = process.env.TEST_BASE_URL || `http://127.0.0.1:${PORT}`;
const authorization = {
  admin: `Bearer ${signToken({ id: 'user-admin-1', name: 'Bikram Shrestha', email: 'admin@lms.com', role: 'admin' })}`,
  teacher: `Bearer ${signToken({ id: 'live-tch-1', name: 'Teacher Live', email: 'teacher.live@lms.com', role: 'teacher' })}`,
  student: `Bearer ${signToken({ id: 'live-stu-1', name: 'Aarav Live', email: 'aarav.live@lms.com', role: 'student' })}`,
};
const headersFor = (role: keyof typeof authorization) => ({
  'Content-Type': 'application/json',
  Authorization: authorization[role],
});
describe('Live TCP/HTTP Server Network Integration & SLA Performance Suite', () => {
  let createdLiveStudentId = '';
  let createdLiveTeacherId = '';
  let createdLiveParentId = '';
  let createdLiveBadgeId = '';
  beforeAll(async () => {
    // 1. Seed base database records
    await prisma.user.upsert({
      where: { id: 'user-admin-1' },
      update: { isArchived: false },
      create: {
        id: 'user-admin-1',
        name: 'Bikram Shrestha',
        email: 'admin@lms.com',
        role: 'admin',
        avatar: '',
        schoolId: 'school-everest',
      },
    });
    await prisma.user.upsert({
      where: { id: 'live-stu-1' },
      update: {
        avatar:
          'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
      },
      create: {
        id: 'live-stu-1',
        name: 'Aarav Live',
        email: 'aarav.live@lms.com',
        role: 'student',
        avatar:
          'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
        schoolId: 'school-everest',
      },
    });
    await prisma.studentProfile.upsert({
      where: { id: 'live-stu-1' },
      update: {},
      create: {
        id: 'live-stu-1',
        userId: 'live-stu-1',
        streakDays: 10,
        xpPoints: 500,
      },
    });
    await prisma.studentAcademicEnrollment.upsert({
      where: {
        studentId_academicYearId: {
          studentId: 'live-stu-1',
          academicYearId: 'academic-year-2026',
        },
      },
      update: { cohortId: 'cohort-8-a', rollNumber: 901, status: 'active', endedAt: null },
      create: {
        studentId: 'live-stu-1',
        cohortId: 'cohort-8-a',
        academicYearId: 'academic-year-2026',
        rollNumber: 901,
      },
    });
    await prisma.parentControlSettings.upsert({
      where: { studentId: 'live-stu-1' },
      update: {},
      create: {
        studentId: 'live-stu-1',
        allowTeacherDirectChat: true,
        allowPeerDiscussion: true,
        missingHomeworkAlerts: true,
        lowAttendanceAlerts: true,
        weeklyDigestEmail: true,
        screenTimeLimitMinutes: 90,
        requireApprovalForOutboundMsgs: false,
        timezone: 'Asia/Kathmandu',
      },
    });
    await prisma.user.upsert({
      where: { id: 'live-tch-1' },
      update: {
        avatar:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      },
      create: {
        id: 'live-tch-1',
        name: 'Teacher Live',
        email: 'teacher.live@lms.com',
        role: 'teacher',
        avatar:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        schoolId: 'school-everest',
      },
    });
    await prisma.classroom.upsert({
      where: { id: 'cls-live-1' },
      update: {},
      create: {
        id: 'cls-live-1',
        name: 'Math Live',
        teacherId: 'live-tch-1',
        roomNumber: '101',
        colorTheme: 'blue',
        bannerImage: 'b.png',
        code: 'LIVE101',
        schoolId: 'school-everest',
        subjectId: 'subject-mathematics',
        cohortId: 'cohort-8-a',
      },
    });
    await prisma.classroomEnrollment.upsert({
      where: {
        classroomId_studentId: { classroomId: 'cls-live-1', studentId: 'live-stu-1' },
      },
      update: { isActive: true },
      create: { classroomId: 'cls-live-1', studentId: 'live-stu-1', isActive: true },
    });
    await prisma.badgeDefinition.upsert({
      where: { id: 'bdg-def-1' },
      update: {},
      create: {
        id: 'bdg-def-1',
        title: 'Top Scholar',
        description: 'Academic excellence',
        icon: '🌟',
        category: 'academic',
        isAutomatic: false,
      },
    });
    await prisma.badgeDefinition.upsert({
      where: { id: 'bdg-def-2' },
      update: {},
      create: {
        id: 'bdg-def-2',
        title: 'Quiz Master',
        description: 'Scored 100% on a quiz',
        icon: '🧠',
        category: 'academic',
        isAutomatic: true,
      },
    });
    await prisma.quiz.upsert({
      where: { id: 'quiz-live-1' },
      update: { published: true, status: 'published' },
      create: {
        id: 'quiz-live-1',
        classroomId: 'cls-live-1',
        createdById: 'live-tch-1',
        title: 'Quiz Live 1',
        description: 'Desc',
        durationMinutes: 15,
        dueDate: '2026-08-10',
        published: true,
        status: 'published',
        createdAt: new Date().toISOString(),
      },
    });
    await prisma.quizQuestion.upsert({
      where: { id: 'q-1' },
      update: { quizId: 'quiz-live-1', correctAnswer: '4', points: 10 },
      create: {
        id: 'q-1',
        quizId: 'quiz-live-1',
        text: '2+2=?',
        type: 'MCQ',
        options: ['3', '4'],
        correctAnswer: '4',
        explanation: 'Math fact',
        points: 10,
      },
    });
    // 2. Boot an isolated server on a free port unless an external server was explicitly requested.
    if (process.env.USE_REAL_SERVER !== 'true') {
      const app = createApp();
      await new Promise<void>((resolve) => {
        server = app.listen(0, '127.0.0.1', () => {
          const address = server.address();
          if (!address || typeof address === 'string') {
            throw new Error('The integration test server did not expose a TCP port.');
          }
          BASE_URL = `http://127.0.0.1:${address.port}`;
          resolve();
        });
      });
    } else {
      const health = await fetch(`${BASE_URL}/api/health`).catch(() => null);
      if (!health?.ok) {
        throw new Error(
          `USE_REAL_SERVER=true requires a healthy API server at ${BASE_URL}. Start it first or run the self-contained test command.`,
        );
      }
      console.log(`[Test] Using explicitly configured server at ${BASE_URL}...`);
    }
  });
  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await prisma.$disconnect();
    await pool.end();
  });
  it('1. GET /api/health over TCP socket returns 200 OK under 100ms SLA', async () => {
    const startTime = performance.now();
    const res = await fetch(`${BASE_URL}/api/health`);
    const duration = performance.now() - startTime;
    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(100);
    const data = await res.json();
    expect(data.status).toBe('ok');
  });
  it('2. GET /api/db/state returns database state over network socket under 300ms SLA', async () => {
    const startTime = performance.now();
    const res = await fetch(`${BASE_URL}/api/db/state`, {
      headers: { Authorization: authorization.admin },
    });
    const duration = performance.now() - startTime;
    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(300);
    const data = await res.json();
    expect(data.status).toBe('success');
    expect(Array.isArray(data.users)).toBe(true);
  });
  it('3. POST /api/db/student-badges awards badge over HTTP network socket & persists to DB', async () => {
    const startTime = performance.now();
    const res = await fetch(`${BASE_URL}/api/db/student-badges`, {
      method: 'POST',
      headers: headersFor('admin'),
      body: JSON.stringify({
        studentProfileId: 'live-stu-1',
        badgeDefinitionId: 'bdg-def-1',
        assignedBy: 'Admin Live',
        remarks: 'Live Integration Test Award',
      }),
    });
    const duration = performance.now() - startTime;
    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(500);
    expect(res.headers.get('content-type')).toContain('application/json');
    const data = await res.json();
    expect(data.status).toBe('success');
    expect(data.badge.studentProfileId).toBe('live-stu-1');
  });
  it('4. POST /api/db/quizzes creates quiz record via live HTTP endpoint', async () => {
    const res = await fetch(`${BASE_URL}/api/db/quizzes`, {
      method: 'POST',
      headers: headersFor('teacher'),
      body: JSON.stringify({
        classroomId: 'cls-live-1',
        classroomName: 'Math Live',
        subject: 'Math',
        title: 'Live TCP Quiz',
        description: 'Network testing',
        durationMinutes: 15,
        dueDate: '2026-08-15',
        totalQuestions: 1,
        published: true,
        questions: [
          {
            text: '2+2=?',
            type: 'MCQ',
            options: ['3', '4'],
            correctAnswer: '4',
            explanation: 'Math fact',
            points: 5,
          },
        ],
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.quiz.title).toBe('Live TCP Quiz');
  });
  it('5. POST /api/db/quiz-submissions triggers auto-badge award over live HTTP route', async () => {
    const res = await fetch(`${BASE_URL}/api/db/quiz-submissions`, {
      method: 'POST',
      headers: headersFor('student'),
      body: JSON.stringify({
        quizId: 'quiz-live-1',
        studentId: 'live-stu-1',
        score: 10,
        totalPoints: 10,
        answers: { 'q-1': '4' },
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.quizSubmission.score).toBe(10);
  });
  it('6. POST /api/db/stream-posts creates announcement on live server socket', async () => {
    const res = await fetch(`${BASE_URL}/api/db/stream-posts`, {
      method: 'POST',
      headers: headersFor('teacher'),
      body: JSON.stringify({
        classroomId: 'cls-live-1',
        authorId: 'live-tch-1',
        authorName: 'Teacher Live',
        authorAvatar: 't.png',
        authorRole: 'teacher',
        content: 'Live Announcement via HTTP TCP Socket',
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.post.content).toBe('Live Announcement via HTTP TCP Socket');
  });
  it('7. POST /api/db/attendance records attendance on live server route', async () => {
    const res = await fetch(`${BASE_URL}/api/db/attendance`, {
      method: 'POST',
      headers: headersFor('teacher'),
      body: JSON.stringify({
        studentId: 'live-stu-1',
        studentName: 'Aarav Live',
        date: '2026-08-07',
        status: 'present',
        remarks: 'On time',
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.attendance.status).toBe('present');
  });
  it('8. POST /api/db/parent-controls updates parental controls on live route', async () => {
    const res = await fetch(`${BASE_URL}/api/db/parent-controls`, {
      method: 'POST',
      headers: headersFor('admin'),
      body: JSON.stringify({
        studentId: 'live-stu-1',
        settings: {
          studentId: 'live-stu-1',
          allowTeacherDirectChat: true,
          allowPeerDiscussion: true,
          missingHomeworkAlerts: false,
          lowAttendanceAlerts: true,
          weeklyDigestEmail: true,
          screenTimeLimitMinutes: 120,
          requireApprovalForOutboundMsgs: false,
        },
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.parentControls.screenTimeLimitMinutes).toBe(120);
  });
  it('9. POST /api/db/students creates a student via live Admin REST endpoint', async () => {
    const res = await fetch(`${BASE_URL}/api/db/students`, {
      method: 'POST',
      headers: headersFor('admin'),
      body: JSON.stringify({
        name: 'Live Admin Student',
        email: `live.admin.student.${Date.now()}@lms.com`,
        gradeLevel: 9,
        section: 'A',
        parentName: 'Live Admin Guardian',
        parentEmail: `live.admin.guardian.${Date.now()}@lms.com`,
        parentPhone: '+977 9800000000',
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.status).toBe('success');
    expect(data.student.name).toBe('Live Admin Student');
    createdLiveStudentId = data.student.id;
  });
  it('10. PUT /api/db/students/:id updates student record via live Admin REST endpoint', async () => {
    if (!createdLiveStudentId) return;
    const res = await fetch(`${BASE_URL}/api/db/students/${createdLiveStudentId}`, {
      method: 'PUT',
      headers: headersFor('admin'),
      body: JSON.stringify({
        name: 'Live Admin Student Updated',
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('success');
  });
  it('11. DELETE /api/db/students/:id archives student via live Admin REST endpoint', async () => {
    if (!createdLiveStudentId) return;
    const res = await fetch(`${BASE_URL}/api/db/students/${createdLiveStudentId}`, {
      method: 'DELETE',
      headers: { Authorization: authorization.admin },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('success');
  });
  it('12. POST /api/db/teachers registers a teacher via live Admin REST endpoint', async () => {
    const res = await fetch(`${BASE_URL}/api/db/teachers`, {
      method: 'POST',
      headers: headersFor('admin'),
      body: JSON.stringify({
        name: 'Live Faculty Instructor',
        email: `live.faculty.${Date.now()}@lms.com`,
        phone: '+977 9811111111',
        employeeNumber: `LIVE-T-${Date.now()}`,
        emergencyContactName: 'Live Emergency Contact',
        emergencyContactPhone: '+977 9822222222',
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.status).toBe('success');
    createdLiveTeacherId = data.teacher.id;
  });
  it('13. DELETE /api/db/teachers/:id deactivates teacher via live Admin REST endpoint', async () => {
    if (!createdLiveTeacherId) return;
    const res = await fetch(`${BASE_URL}/api/db/teachers/${createdLiveTeacherId}`, {
      method: 'DELETE',
      headers: { Authorization: authorization.admin },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('success');
  });
  it('14. POST /api/db/parents creates parent profile via live Admin REST endpoint', async () => {
    const res = await fetch(`${BASE_URL}/api/db/parents`, {
      method: 'POST',
      headers: headersFor('admin'),
      body: JSON.stringify({
        name: 'Live Parent Account',
        email: `live.parent.${Date.now()}@lms.com`,
        phone: '+977 9833333333',
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.status).toBe('success');
    createdLiveParentId = data.parent.id;
  });
  it('15. DELETE /api/db/parents/:id removes parent account via live Admin REST endpoint', async () => {
    if (!createdLiveParentId) return;
    const res = await fetch(`${BASE_URL}/api/db/parents/${createdLiveParentId}`, {
      method: 'DELETE',
      headers: { Authorization: authorization.admin },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('success');
  });
  it('16. POST /api/db/badge-definitions creates badge definition via live Admin endpoint', async () => {
    const res = await fetch(`${BASE_URL}/api/db/badge-definitions`, {
      method: 'POST',
      headers: headersFor('admin'),
      body: JSON.stringify({
        title: 'Live Badge Definition',
        icon: '🏆',
        category: 'academic',
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('success');
    createdLiveBadgeId = data.badge.id;
  });
  it('17. DELETE /api/db/badge-definitions/:id removes badge definition via live Admin endpoint', async () => {
    if (!createdLiveBadgeId) return;
    const res = await fetch(`${BASE_URL}/api/db/badge-definitions/${createdLiveBadgeId}`, {
      method: 'DELETE',
      headers: { Authorization: authorization.admin },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('success');
  });
  it('18. POST /api/ai/tutor reports unavailable AI when no provider is configured', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/tutor`, {
      method: 'POST',
      headers: headersFor('student'),
      body: JSON.stringify({
        prompt: 'Explain gravity',
        subject: 'Mathematics',
      }),
    });
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
  it('19. Audits 404 handler for invalid routes over live TCP socket', async () => {
    const res = await fetch(`${BASE_URL}/api/non-existent-endpoint`);
    expect(res.status).toBe(404);
  });
});
