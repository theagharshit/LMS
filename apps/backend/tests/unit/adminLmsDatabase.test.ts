import { describe, it, expect, beforeAll } from 'vitest';
import { lmsDB } from '../../src/db/lmsDatabase';

describe('Admin LMSDatabaseService Unit Test Suite', () => {
  it('1. should create a new student profile in database', async () => {
    const testStudent = {
      name: 'Test Admin Student',
      email: `test.admin.student.${Date.now()}@lms.com`,
      gradeLevel: 9,
      section: 'B',
      rollNumber: 42,
      parentName: 'Test Parent',
      parentPhone: '+977-9800000001',
    };
    const created = await lmsDB.addStudentProfile(testStudent);
    expect(created).toBeDefined();
    expect(created.name).toBe(testStudent.name);
    expect(created.gradeLevel).toBe(9);
  });

  it('2. should update an existing student profile', async () => {
    const testStudent = await lmsDB.addStudentProfile({
      name: 'To Update Student',
      email: `update.student.${Date.now()}@lms.com`,
      gradeLevel: 8,
      section: 'A',
    });

    const updated = await lmsDB.updateStudentProfile(testStudent.id, {
      name: 'Updated Name Student',
      gradeLevel: 10,
    });
    expect(updated).toBeDefined();
  });

  it('3. should create and delete a teacher profile', async () => {
    const teacher = await lmsDB.addTeacherProfile({
      name: 'Test Teacher Admin',
      email: `test.teacher.${Date.now()}@lms.com`,
      role: 'teacher',
      schoolName: 'Everest International Academy',
    });
    expect(teacher.name).toBe('Test Teacher Admin');

    const result = await lmsDB.deleteTeacherProfile(teacher.id);
    expect(result).toBeDefined();
  });

  it('4. should create and delete a custom badge definition', async () => {
    const badge = await lmsDB.createBadgeDefinition({
      title: 'Unit Test Science Badge',
      description: 'Awarded during unit testing',
      icon: '🧪',
      category: 'academic',
      isAutomatic: false,
    });
    expect(badge.title).toBe('Unit Test Science Badge');

    const result = await lmsDB.deleteBadgeDefinition(badge.id);
    expect(result).toBeDefined();
  });

  it('5. should create and delete a parent profile', async () => {
    const parent = await lmsDB.addParentProfile({
      name: 'Test Parent Unit',
      email: `test.parent.${Date.now()}@lms.com`,
      role: 'parent',
      schoolName: 'Everest International Academy',
    });
    expect(parent.name).toBe('Test Parent Unit');

    const result = await lmsDB.deleteParentProfile(parent.id);
    expect(result).toBeDefined();
  });
});
