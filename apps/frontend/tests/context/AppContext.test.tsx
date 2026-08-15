import type { Classroom, User } from '@lms/shared';
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider, useApp } from '../../src/context/AppContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

const student: User = {
  id: 'db-student-1',
  name: 'Database Student',
  email: 'db-student-1@test.local',
  role: 'student',
  avatar: 'student.png',
  schoolName: 'Database School',
};

const admin: User = {
  id: 'db-admin-1',
  name: 'Database Admin',
  email: 'db-admin-1@test.local',
  role: 'admin',
  avatar: 'admin.png',
  schoolName: 'Database School',
};

const classroom: Classroom = {
  id: 'db-classroom-1',
  name: 'Database Mathematics',
  subject: 'Mathematics',
  gradeLevel: 8,
  section: 'A',
  teacherId: 'db-teacher-1',
  teacherName: 'Database Teacher',
  teacherAvatar: 'teacher.png',
  roomNumber: '101',
  colorTheme: 'green',
  bannerImage: 'banner.png',
  studentCount: 1,
  enrolledStudentIds: [student.id],
  code: 'DBMATH8A',
};

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('AppContext database-backed state', () => {
  let originalFetchImplementation: ReturnType<typeof vi.fn> extends never
    ? never
    : ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) | undefined;
  let originalBootstrap: typeof window.__LMS_DATABASE_BOOTSTRAP__;

  beforeEach(() => {
    localStorage.clear();
    originalFetchImplementation = vi.mocked(window.fetch).getMockImplementation();
    originalBootstrap = window.__LMS_DATABASE_BOOTSTRAP__;
    delete window.__LMS_DATABASE_BOOTSTRAP__;
  });

  afterEach(() => {
    vi.mocked(window.fetch).mockImplementation(originalFetchImplementation!);
    window.__LMS_DATABASE_BOOTSTRAP__ = originalBootstrap;
    localStorage.clear();
  });

  it('starts empty and does not show static school records before authentication', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    expect(result.current.currentUser.id).toBe('');
    expect(result.current.allUsers).toEqual([]);
    expect(result.current.studentProfiles).toEqual([]);
    expect(result.current.classrooms).toEqual([]);
    expect(result.current.assignments).toEqual([]);
    expect(result.current.quizzes).toEqual([]);
    expect(result.current.messages).toEqual([]);
  });

  it('hydrates each collection only from the authenticated database-state response', async () => {
    const state = {
      status: 'success',
      users: [student, admin],
      studentProfiles: [
        {
          ...student,
          gradeLevel: 8,
          section: 'A',
          rollNumber: 12,
          streakDays: 2,
          xpPoints: 10,
          badges: [],
        },
      ],
      badgeDefinitions: [],
      classrooms: [classroom],
      streamPosts: [],
      assignments: [],
      submissions: [],
      quizzes: [],
      quizSubmissions: [],
      attendance: [],
      parentControls: {},
      studentLocations: [],
      messages: [],
      termProgress: [],
      studentActivities: [],
      subjectPerformances: [],
      resources: [],
      modules: [],
      teacherAbsenceRequests: [],
      substituteRequests: [],
      teacherAssignmentAuditLogs: [],
      weeklySchedule: {},
      schedule: [],
      calendarEvents: [],
      adminAuditLogs: [],
      schoolAnnouncements: [],
    };
    vi.mocked(window.fetch).mockImplementation(async (input) => {
      const url = input.toString();
      if (url.includes('/api/db/state')) return response(state);
      return response({ status: 'success' });
    });
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => result.current.establishSession(student, 'database-access-token'));
    await waitFor(() => expect(result.current.classrooms).toEqual([classroom]));
    expect(result.current.currentUser).toEqual(student);
    expect(result.current.allUsers).toEqual([student, admin]);
    expect(result.current.studentProfiles).toHaveLength(1);
    expect(result.current.assignments).toEqual([]);
    expect(result.current.calendarEvents).toEqual([]);
  });

  it('keeps collections empty when the database state request fails or omits them', async () => {
    vi.mocked(window.fetch).mockImplementation(async (input) => {
      const url = input.toString();
      if (url.includes('/api/db/state')) return response({ status: 'error' }, 503);
      return response({ status: 'success' });
    });
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => result.current.establishSession(student, 'database-access-token'));
    await waitFor(() =>
      expect(window.fetch).toHaveBeenCalledWith(
        '/api/db/state',
        expect.objectContaining({ headers: expect.any(Headers) }),
      ),
    );
    expect(result.current.classrooms).toEqual([]);
    expect(result.current.studentProfiles).toEqual([]);
    expect(result.current.badgeDefinitions).toEqual([]);
  });

  it('adds a stream post only from the API-created relational record', async () => {
    const apiPost = {
      id: 'db-post-1',
      classroomId: classroom.id,
      authorId: 'db-teacher-1',
      authorName: 'Database Teacher',
      authorAvatar: 'teacher.png',
      authorRole: 'teacher' as const,
      content: 'Database announcement',
      pinned: false,
      attachments: [],
      comments: [],
      commentsCount: 0,
      createdAt: '2026-08-15T00:00:00.000Z',
    };
    vi.mocked(window.fetch).mockImplementation(async (input) => {
      const url = input.toString();
      if (url.includes('/api/db/state'))
        return response({ status: 'success', classrooms: [classroom] });
      if (url.includes('/api/db/stream-posts'))
        return response({ status: 'success', post: apiPost }, 201);
      return response({ status: 'success' });
    });
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => result.current.establishSession(admin, 'database-access-token'));
    await waitFor(() => expect(result.current.classrooms).toEqual([classroom]));

    await act(async () => {
      await result.current.addStreamPost({
        classroomId: classroom.id,
        content: 'Database announcement',
        pinned: false,
        attachments: [],
        comments: [],
      });
    });
    expect(result.current.streamPosts).toEqual([apiPost]);
  });

  it('switches only to a user supplied by database state and establishes a new session', async () => {
    vi.mocked(window.fetch).mockImplementation(async (input) => {
      const url = input.toString();
      if (url.includes('/api/db/state'))
        return response({ status: 'success', users: [student, admin] });
      if (url.includes('/api/auth/csrf')) return response({ status: 'success', csrfToken: 'test' });
      if (url.includes('/api/auth/login'))
        return response({ status: 'success', accessToken: 'admin-token', user: admin });
      return response({ status: 'success' });
    });
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => result.current.establishSession(student, 'student-token'));
    await waitFor(() => expect(result.current.allUsers).toEqual([student, admin]));

    act(() => result.current.switchUser('missing-static-user'));
    expect(result.current.currentUser.id).toBe(student.id);
    act(() => result.current.switchUser(admin.id));
    await waitFor(() => expect(result.current.currentUser).toEqual(admin));
    expect(localStorage.getItem('lms_jwt_token')).toBe('admin-token');
  });

  it('joins a classroom only when the API returns a database classroom record', async () => {
    vi.mocked(window.fetch).mockImplementation(async (input, init) => {
      const url = input.toString();
      if (url.includes('/api/db/state')) return response({ status: 'success' });
      if (url.includes('/api/db/classrooms/join')) {
        const body = JSON.parse(String(init?.body || '{}'));
        return body.code === classroom.code
          ? response({ status: 'success', classroom })
          : response({ status: 'error' }, 404);
      }
      return response({ status: 'success' });
    });
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => result.current.establishSession(student, 'student-token'));

    await expect(result.current.joinClassroomByCode('INVALID')).resolves.toBe(false);
    await act(async () => {
      await expect(result.current.joinClassroomByCode(classroom.code)).resolves.toBe(true);
    });
    expect(result.current.classrooms).toEqual([classroom]);
    expect(result.current.selectedClassroomId).toBe(classroom.id);
  });
});
