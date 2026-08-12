import '@testing-library/jest-dom';
import { vi } from 'vitest';

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
        record: { id: `att-${Date.now()}`, ...body },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/api/db/parent-controls')) {
    return new Response(
      JSON.stringify({
        status: 'success',
        settings: body,
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
        resources: [],
        modules: [],
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
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = vi.fn(
      (file: any) => `blob:http://localhost/${file?.name || 'mock-file'}`,
    );
  }
  if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = vi.fn();
  }
}
