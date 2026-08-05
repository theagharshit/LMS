import { describe, it, expect } from 'vitest';
import {
  MOCK_USERS,
  MOCK_CLASSROOMS,
  MOCK_STREAM_POSTS,
  MOCK_ASSIGNMENTS,
  MOCK_STUDENTS,
  MOCK_WEEKLY_SCHEDULE,
} from '@lms/shared';

describe('Seed Mock Data (src/data/mockData.ts)', () => {
  it('should contain valid initial users for Student, Teacher, and Parent roles', () => {
    expect(MOCK_USERS.length).toBeGreaterThan(0);
    const roles = MOCK_USERS.map((u) => u.role);
    expect(roles).toContain('student');
    expect(roles).toContain('teacher');
    expect(roles).toContain('parent');
  });

  it('should contain Nepal CDC curriculum Grade 8 classrooms', () => {
    expect(MOCK_CLASSROOMS.length).toBeGreaterThan(0);
    const classroomSubjects = MOCK_CLASSROOMS.map((c) => c.subject);
    expect(classroomSubjects.some((s) => s.toLowerCase().includes('math'))).toBe(true);
    expect(classroomSubjects.some((s) => s.toLowerCase().includes('science'))).toBe(true);
  });

  it('should contain initial stream posts and assignments', () => {
    expect(MOCK_STREAM_POSTS.length).toBeGreaterThan(0);
    expect(MOCK_ASSIGNMENTS.length).toBeGreaterThan(0);
  });

  it('should contain student profiles with attendance percentages', () => {
    expect(MOCK_STUDENTS.length).toBeGreaterThan(0);
    MOCK_STUDENTS.forEach((student) => {
      expect(student.attendancePercentage).toBeGreaterThanOrEqual(0);
      expect(student.attendancePercentage).toBeLessThanOrEqual(100);
    });
  });

  it('should contain valid weekly schedule for school days', () => {
    expect(MOCK_WEEKLY_SCHEDULE).toHaveProperty('Sunday');
    expect(MOCK_WEEKLY_SCHEDULE).toHaveProperty('Monday');
  });
});
