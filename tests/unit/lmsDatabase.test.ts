import { describe, it, expect } from 'vitest';
import { lmsDB } from '../../src/db/lmsDatabase';

describe('LMS Database Persistence Engine (src/db/lmsDatabase.ts)', () => {
  it('should initialize and return seeded users and student profiles', () => {
    const users = lmsDB.getUsers();
    expect(users.length).toBeGreaterThan(0);
    expect(users.some((u) => u.role === 'student')).toBe(true);

    const profiles = lmsDB.getStudentProfiles();
    expect(profiles.length).toBeGreaterThan(0);
  });

  it('should return enrolled classrooms and support adding new classroom', () => {
    const initialClassrooms = lmsDB.getClassrooms();
    expect(initialClassrooms.length).toBeGreaterThan(0);

    const newClassroom = lmsDB.addClassroom({
      name: 'Grade 9 Computer Science',
      subject: 'Computer Science',
      gradeLevel: 9,
      section: 'A',
      teacherId: 'user-teach-1',
      teacherName: 'Mr. Ramesh Thapa',
      teacherAvatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      roomNumber: 'Lab 3',
      colorTheme: 'from-blue-600 to-indigo-600',
      bannerImage:
        'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80',
    });

    expect(newClassroom.id).toBeDefined();
    expect(newClassroom.code).toBeDefined();
    expect(lmsDB.getClassrooms().some((c) => c.id === newClassroom.id)).toBe(true);
  });

  it('should store and query student real-time locations', () => {
    const updated = lmsDB.updateStudentLocation(
      'user-stu-1',
      'Aarav Sharma',
      'School Canteen (Lunch Time)',
      'canteen_lunch',
      'Admin Staff',
      'admin',
      undefined,
      'Lunch break active',
    );

    expect(updated.currentLocation).toBe('School Canteen (Lunch Time)');
    expect(updated.category).toBe('canteen_lunch');

    const retrieved = lmsDB.getStudentLocationById('user-stu-1');
    expect(retrieved?.currentLocation).toBe('School Canteen (Lunch Time)');
  });
});
