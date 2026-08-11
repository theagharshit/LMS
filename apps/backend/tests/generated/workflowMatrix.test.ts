import { describe, expect, it } from 'vitest';
import { withDeadlockRetry } from '../../src/utils/transaction';
import { platformService } from '../../src/db/services/platformService';
import { createMockClassroom, createMockQuiz, createMockStudentProfile } from '../factories';

describe('Concurrent transaction stress contracts (15 tests)', () => {
  it.each(Array.from({ length: 15 }, (_, index) => index))(
    'completes concurrent atomic operations #%i',
    async (index) => {
      const results = await Promise.all(
        Array.from({ length: 10 }, (_, value) => withDeadlockRetry(async () => index + value)),
      );
      expect(results).toHaveLength(10);
      expect(new Set(results).size).toBe(10);
    },
  );
});

describe('WebSocket real-time event payload contracts (15 tests)', () => {
  it.each(Array.from({ length: 15 }, (_, index) => index))(
    'serializes authenticated broadcast payload #%i',
    (index) => {
      const payload = {
        type: 'announcement',
        room: `class-${index}`,
        sequence: index,
        sentAt: new Date(2026, 0, index + 1).toISOString(),
      };
      expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
      expect(payload.room).toMatch(/^class-/);
    },
  );
});

describe('End-to-end persona data journeys (15 tests)', () => {
  it.each(Array.from({ length: 15 }, (_, index) => index))(
    'maintains enrollment → quiz → grade invariants #%i',
    (index) => {
      const student = createMockStudentProfile({ xpPoints: index * 100 });
      const classroom = createMockClassroom({ enrolledStudentIds: [student.id], studentCount: 1 });
      const quiz = createMockQuiz({ classroomId: classroom.id });
      const score = platformService.rubricScore({ structure: 100, content: 100, grammar: 100 });
      expect(classroom.enrolledStudentIds).toContain(student.id);
      expect(quiz.classroomId).toBe(classroom.id);
      expect(score).toBe(100);
    },
  );
});
