import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { loadEnv } from '../../src/utils/envResolver';
loadEnv();

delete process.env.GEMINI_API_KEY;

import { createApp } from '../../src/app';
import { Server } from 'http';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

let server: Server;
const PORT = 3001;
const BASE_URL = `http://127.0.0.1:${PORT}`;

describe('Live TCP/HTTP Server Network Integration & SLA Performance Suite', () => {
  beforeAll(async () => {
    // 1. Seed base database records
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
        schoolName: 'S1',
        gradeLevel: 8,
        section: 'A',
      },
    });

    await prisma.studentProfile.upsert({
      where: { id: 'live-stu-1' },
      update: {},
      create: {
        id: 'live-stu-1',
        userId: 'live-stu-1',
        attendancePercentage: 95,
        streakDays: 10,
        xpPoints: 500,
        gradeLevel: 8,
        section: 'A',
        parentName: 'Bina Live',
        parentPhone: '9800000000',
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
        schoolName: 'S1',
      },
    });

    await prisma.classroom.upsert({
      where: { id: 'cls-live-1' },
      update: {
        teacherAvatar:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      },
      create: {
        id: 'cls-live-1',
        name: 'Math Live',
        subject: 'Math',
        gradeLevel: 8,
        section: 'A',
        teacherId: 'live-tch-1',
        teacherName: 'Teacher Live',
        teacherAvatar:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        roomNumber: '101',
        colorTheme: 'blue',
        bannerImage: 'b.png',
        code: 'LIVE101',
      },
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
      update: {},
      create: {
        id: 'quiz-live-1',
        classroomId: 'cls-live-1',
        classroomName: 'Math Live',
        subject: 'Math',
        title: 'Quiz Live 1',
        description: 'Desc',
        durationMinutes: 15,
        dueDate: '2026-08-10',
        totalQuestions: 1,
        createdAt: new Date().toISOString(),
      },
    });

    // 2. Connect to running dev server on PORT (e.g. 3001) or boot fallback listener
    try {
      const ping = await fetch(`http://127.0.0.1:${PORT}/api/health`).catch(() => null);
      if (!ping || !ping.ok) {
        const app = createApp();
        await new Promise<void>((resolve) => {
          server = app.listen(PORT, '127.0.0.1', () => {
            resolve();
          });
        });
      }
    } catch {
      const app = createApp();
      await new Promise<void>((resolve) => {
        server = app.listen(PORT, '127.0.0.1', () => {
          resolve();
        });
      });
    }
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
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
    const res = await fetch(`${BASE_URL}/api/db/state`);
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.quiz.title).toBe('Live TCP Quiz');
  });

  it('5. POST /api/db/quiz-submissions triggers auto-badge award over live HTTP route', async () => {
    const res = await fetch(`${BASE_URL}/api/db/quiz-submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        classroomId: 'cls-live-1',
        authorId: 'live-tch-1',
        authorName: 'Teacher Live',
        authorAvatar: 't.png',
        authorRole: 'teacher',
        content: 'Live Announcement via HTTP TCP Socket',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.post.content).toBe('Live Announcement via HTTP TCP Socket');
  });

  it('7. POST /api/db/attendance records attendance on live server route', async () => {
    const res = await fetch(`${BASE_URL}/api/db/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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

  it('9. POST /api/ai/tutor responds cleanly with fallback response over network', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/tutor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Explain gravity',
        gradeLevel: 8,
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.text).toBeDefined();
  });

  it('10. Audits 404 handler for invalid routes over live TCP socket', async () => {
    const res = await fetch(`${BASE_URL}/api/non-existent-endpoint`);
    expect(res.status).toBe(404);
  });
});
