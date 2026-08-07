import { describe, it, expect, beforeAll } from 'vitest';
import { loadEnv } from '../../src/utils/envResolver';
loadEnv();
import { lmsDB } from '../../src/db/lmsDatabase';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

describe('LMS Database Service (Async)', () => {
  beforeAll(async () => {
    await prisma.user.upsert({
      where: { id: 'user-stu-1' },
      update: {},
      create: { id: 'user-stu-1', name: 'Aarav Sharma', email: 'aarav@lms.com', role: 'student', avatar: 'a.png', schoolName: 'S1', gradeLevel: 8, section: 'A' },
    });
    await prisma.studentProfile.upsert({
      where: { id: 'user-stu-1' },
      update: {},
      create: { id: 'user-stu-1', userId: 'user-stu-1', attendancePercentage: 95, streakDays: 10, xpPoints: 500, gradeLevel: 8, section: 'A', parentName: 'Bina', parentPhone: '980' },
    });
    await prisma.user.upsert({
      where: { id: 'user-teach-1' },
      update: {},
      create: { id: 'user-teach-1', name: 'Mr. Ramesh Thapa', email: 'ramesh@lms.com', role: 'teacher', avatar: 'a.png', schoolName: 'S1' },
    });
    await prisma.classroom.upsert({
      where: { id: 'cls-math-8a' },
      update: {},
      create: { id: 'cls-math-8a', name: 'Grade 8 Mathematics - Sec A', subject: 'Mathematics', gradeLevel: 8, section: 'A', teacherId: 'user-teach-1', teacherName: 'Mr. Ramesh Thapa', teacherAvatar: 'a.png', roomNumber: '204', colorTheme: 'blue', bannerImage: 'b.png', code: 'MATH8A' },
    });
  });
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
      'teacher',
    );
    expect(updated.currentLocation).toBe('Library');
    expect(updated.category).toBe('library');

    const fetched = await lmsDB.getStudentLocationById(studentId);
    expect(fetched?.currentLocation).toBe('Library');
  });
});
