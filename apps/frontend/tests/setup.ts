import '@testing-library/jest-dom';
import { vi } from 'vitest';
import {
  MOCK_ADMIN_AUDIT_LOGS,
  MOCK_ANNOUNCEMENTS,
  MOCK_ASSIGNMENTS,
  MOCK_ATTENDANCE,
  MOCK_BADGE_DEFINITIONS,
  MOCK_CALENDAR_EVENTS,
  MOCK_CLASSROOMS,
  MOCK_MESSAGES,
  MOCK_MODULES,
  MOCK_PARENT_CONTROLS,
  MOCK_QUIZZES,
  MOCK_QUIZ_SUBMISSIONS,
  MOCK_SCHEDULE,
  MOCK_STREAM_POSTS,
  MOCK_STUDENTS,
  MOCK_SUBJECT_PERFORMANCE,
  MOCK_SUBMISSIONS,
  MOCK_SUBSTITUTE_REQUESTS,
  MOCK_TEACHER_ABSENCE_REQUESTS,
  MOCK_TEACHER_ASSIGNMENT_AUDIT_LOGS,
  MOCK_USERS,
  MOCK_WEEKLY_SCHEDULE,
} from '@lms/shared';

const databaseTestState = {
  users: MOCK_USERS,
  studentProfiles: MOCK_STUDENTS,
  badgeDefinitions: MOCK_BADGE_DEFINITIONS,
  classrooms: MOCK_CLASSROOMS,
  streamPosts: MOCK_STREAM_POSTS,
  assignments: MOCK_ASSIGNMENTS,
  submissions: MOCK_SUBMISSIONS,
  quizzes: MOCK_QUIZZES,
  quizSubmissions: MOCK_QUIZ_SUBMISSIONS,
  attendance: MOCK_ATTENDANCE,
  attendanceRecords: MOCK_ATTENDANCE,
  parentControls: MOCK_PARENT_CONTROLS,
  studentLocations: [
    {
      id: 'loc-db-1',
      studentId: 'user-stu-1',
      studentName: 'Aarav Sharma',
      currentLocation: 'In Class (Grade 8-A Room 204)',
      category: 'in_class' as const,
      updatedBy: 'user-teach-1',
      updatedByRole: 'teacher' as const,
      updatedAt: '2026-08-15T08:00:00.000Z',
    },
  ],
  messages: MOCK_MESSAGES,
  termProgress: [],
  studentActivities: [],
  subjectPerformances: MOCK_SUBJECT_PERFORMANCE,
  resources: [],
  modules: MOCK_MODULES,
  teacherAbsenceRequests: MOCK_TEACHER_ABSENCE_REQUESTS,
  substituteRequests: MOCK_SUBSTITUTE_REQUESTS,
  teacherAssignmentAuditLogs: MOCK_TEACHER_ASSIGNMENT_AUDIT_LOGS,
  weeklySchedule: MOCK_WEEKLY_SCHEDULE,
  schedule: MOCK_SCHEDULE,
  calendarEvents: MOCK_CALENDAR_EVENTS,
  adminAuditLogs: MOCK_ADMIN_AUDIT_LOGS,
  schoolAnnouncements: MOCK_ANNOUNCEMENTS,
};

window.__LMS_DATABASE_BOOTSTRAP__ = {
  currentUser: MOCK_USERS[0],
  ...databaseTestState,
};

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock API fetch handler for frontend tests
const mockApiRouter = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input.toString();
  let body: any = {};
  try {
    if (init?.body) {
      body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
    }
  } catch {
    body = {};
  }

  if (url.includes('/api/auth/csrf')) {
    return new Response(JSON.stringify({ status: 'success', csrfToken: 'test-csrf-token' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/api/auth/login')) {
    const user = MOCK_USERS.find(
      (candidate) => candidate.id === body.userId || candidate.email === body.email,
    );
    return new Response(
      JSON.stringify(
        user
          ? { status: 'success', user, accessToken: `database-test-token-${user.id}` }
          : { status: 'error', message: 'User not found' },
      ),
      { status: user ? 200 : 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/api/auth/me')) {
    return new Response(JSON.stringify({ status: 'success', user: MOCK_USERS[0] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('/api/db/student-badges')) {
    return new Response(
      JSON.stringify({
        status: 'success',
        badge: {
          id: `bdg-${Date.now()}`,
          earnedDate: new Date().toISOString().split('T')[0],
          badgeDefinitionId: body.badgeDefinitionId || 'bdg-def-1',
          studentProfileId: body.studentProfileId || 'user-stu-1',
          assignedBy: body.assignedBy || 'Admin',
          remarks: body.remarks || '',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/api/db/quizzes')) {
    return new Response(
      JSON.stringify({
        status: 'success',
        quiz: { id: `quiz-${Date.now()}`, createdAt: new Date().toISOString(), ...body },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/api/db/stream-posts')) {
    return new Response(
      JSON.stringify({
        status: 'success',
        post: { id: `post-${Date.now()}`, createdAt: new Date().toISOString(), ...body },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/api/db/assignments')) {
    return new Response(
      JSON.stringify({
        status: 'success',
        assignment: { id: `asg-${Date.now()}`, createdAt: new Date().toISOString(), ...body },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/api/db/submissions')) {
    return new Response(
      JSON.stringify({
        status: 'success',
        submission: {
          id: `sub-${Date.now()}`,
          submittedAt: new Date().toISOString(),
          status: 'submitted',
          ...body,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/api/db/quiz-submissions')) {
    return new Response(
      JSON.stringify({
        status: 'success',
        submission: { id: `qs-${Date.now()}`, completedAt: new Date().toISOString(), ...body },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/api/db/attendance')) {
    return new Response(
      JSON.stringify({
        status: 'success',
        attendance: { id: `att-${Date.now()}`, ...body },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/api/db/parent-controls')) {
    return new Response(
      JSON.stringify({
        status: 'success',
        parentControls: { ...(MOCK_PARENT_CONTROLS[body.studentId] || {}), ...body.settings },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/api/db/messages')) {
    return new Response(
      JSON.stringify({
        status: 'success',
        message: {
          id: `msg-${Date.now()}`,
          createdAt: new Date().toISOString(),
          read: false,
          ...body,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Specific route for student self-join by code (must be before general classrooms match)
  if (url.includes('/api/db/classrooms/join')) {
    const requestedCode = (body?.code || '').toUpperCase();
    // Only succeed for known test classroom codes (MATH8A, SCI8A, CLS1001 etc.)
    const knownTestCodes = [
      'MATH8A',
      'SCI8A',
      'NEP8A',
      'COMP8A',
      'CLS1001',
      'CLS1002',
      'CLS1003',
      'CLS1004',
    ];
    if (knownTestCodes.includes(requestedCode)) {
      return new Response(
        JSON.stringify({
          status: 'success',
          classroom: {
            id: `cls-mock-${requestedCode.toLowerCase()}`,
            name: `Mock Classroom ${requestedCode}`,
            subject: 'Mathematics',
            gradeLevel: 8,
            section: 'A',
            teacherId: 'user-teach-1',
            teacherName: 'Dr. Ramesh Thapa',
            teacherAvatar: '',
            roomNumber: '101',
            colorTheme: '#4A6741',
            bannerImage: '',
            studentCount: 1,
            enrolledStudentIds: ['user-stu-1'],
            code: requestedCode,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    // Unknown code — 404
    return new Response(
      JSON.stringify({ status: 'error', message: 'No classroom found with that code.' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/api/db/classrooms')) {
    return new Response(
      JSON.stringify({
        status: 'success',
        classroom: { id: `cls-${Date.now()}`, code: 'CLS123', studentCount: 1, ...body },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/api/db/student-locations')) {
    return new Response(
      JSON.stringify({
        status: 'success',
        location: { id: `loc-${Date.now()}`, timestamp: new Date().toISOString(), ...body },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/api/ai/quiz-generator')) {
    return new Response(
      JSON.stringify({
        quiz: {
          title: 'Test Quiz',
          questions: [
            {
              id: 'q-1',
              text: 'Sample question?',
              type: 'MCQ',
              options: ['A', 'B', 'C', 'D'],
              correctAnswer: 'A',
              explanation: 'Test explanation',
              points: 5,
            },
          ],
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/api/db/state')) {
    return new Response(
      JSON.stringify({
        status: 'success',
        ...databaseTestState,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/api/ai/')) {
    return new Response(
      JSON.stringify({
        status: 'success',
        text: 'AI response summary content',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return new Response(JSON.stringify({ status: 'success' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// Global mocks for browser APIs not available in jsdom
if (typeof window !== 'undefined') {
  window.fetch = vi.fn(mockApiRouter);
  class TestWebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;

    readonly CONNECTING = TestWebSocket.CONNECTING;
    readonly OPEN = TestWebSocket.OPEN;
    readonly CLOSING = TestWebSocket.CLOSING;
    readonly CLOSED = TestWebSocket.CLOSED;
    readyState = TestWebSocket.OPEN;
    onopen: ((event: Event) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    onclose: ((event: CloseEvent) => void) | null = null;

    constructor(public readonly url: string | URL) {}

    close() {
      this.readyState = TestWebSocket.CLOSED;
    }

    send() {}
  }
  vi.stubGlobal('WebSocket', TestWebSocket);
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = vi.fn(
      (file: any) => `blob:http://localhost/${file?.name || 'mock-file'}`,
    );
  }
  if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = vi.fn();
  }
}
