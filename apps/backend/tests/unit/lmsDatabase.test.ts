import { describe, it, expect } from 'vitest';
import { lmsDB } from '../../src/db/lmsDatabase';

describe('LMS Database Service (Async)', () => {
  it('should get users', async () => {
    const users = await lmsDB.getUsers();
    expect(users.length).toBeGreaterThan(0);
    expect(users.some((u) => u.id === 'user-stu-1')).toBe(true);
  });

  it('should get student profiles', async () => {
    const profiles = await lmsDB.getStudentProfiles();
    expect(profiles.length).toBeGreaterThan(0);
  });

  it('should get classrooms', async () => {
    const classrooms = await lmsDB.getClassrooms();
    expect(classrooms.length).toBeGreaterThan(0);
  });

  it('should add a new classroom', async () => {
    const newClassroom = {
      name: 'Test Class',
      subject: 'Test Subject',
      gradeLevel: 10,
      section: 'A',
      teacherId: 't1',
      teacherName: 'Teacher 1',
      teacherAvatar: 'avatar.png',
      roomNumber: '101',
      colorTheme: 'blue',
      bannerImage: 'banner.png',
      meetLink: 'link',
    };
    const created = await lmsDB.addClassroom(newClassroom);
    expect(created.id).toBeDefined();
    expect(created.code).toBeDefined();
    
    const classrooms = await lmsDB.getClassrooms();
    expect(classrooms.some((c) => c.id === created.id)).toBe(true);
  });

  it('should update student location', async () => {
    const studentId = 'user-stu-1';
    const updated = await lmsDB.updateStudentLocation(
      studentId,
      'Aarav Sharma',
      'Library',
      'library',
      'Mr. Ramesh',
      'teacher'
    );
    expect(updated.currentLocation).toBe('Library');
    expect(updated.category).toBe('library');

    const fetched = await lmsDB.getStudentLocationById(studentId);
    expect(fetched?.currentLocation).toBe('Library');
  });
});
