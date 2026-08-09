import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('Admin REST API Integration Test Suite', () => {
  let createdStudentId = '';
  let createdTeacherId = '';
  let createdParentId = '';
  let createdBadgeId = '';

  it('1. POST /api/db/students creates a new student record', async () => {
    const res = await request(app)
      .post('/api/db/students')
      .send({
        name: 'API Integration Student',
        email: `api.student.${Date.now()}@lms.com`,
        gradeLevel: 10,
        section: 'A',
        rollNumber: 15,
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.student).toBeDefined();
    createdStudentId = res.body.student.id;
  });

  it('2. PUT /api/db/students/:id updates student record', async () => {
    if (!createdStudentId) return;
    const res = await request(app)
      .put(`/api/db/students/${createdStudentId}`)
      .send({
        name: 'API Updated Student Name',
        section: 'B',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });

  it('3. DELETE /api/db/students/:id archives student record', async () => {
    if (!createdStudentId) return;
    const res = await request(app).delete(`/api/db/students/${createdStudentId}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });

  it('4. POST /api/db/teachers registers a new teacher', async () => {
    const res = await request(app)
      .post('/api/db/teachers')
      .send({
        name: 'API Test Faculty',
        email: `api.teacher.${Date.now()}@lms.com`,
        subjectsTaught: ['Mathematics', 'Computer Science'],
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.teacher).toBeDefined();
    createdTeacherId = res.body.teacher.id;
  });

  it('5. DELETE /api/db/teachers/:id deactivates teacher profile', async () => {
    if (!createdTeacherId) return;
    const res = await request(app).delete(`/api/db/teachers/${createdTeacherId}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });

  it('6. POST /api/db/parents creates parent account', async () => {
    const res = await request(app)
      .post('/api/db/parents')
      .send({
        name: 'API Test Parent',
        email: `api.parent.${Date.now()}@lms.com`,
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.parent).toBeDefined();
    createdParentId = res.body.parent.id;
  });

  it('7. DELETE /api/db/parents/:id removes parent account', async () => {
    if (!createdParentId) return;
    const res = await request(app).delete(`/api/db/parents/${createdParentId}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });

  it('8. POST /api/db/badge-definitions creates new badge definition', async () => {
    const res = await request(app)
      .post('/api/db/badge-definitions')
      .send({
        title: 'API Test Badge',
        description: 'Testing REST API endpoint',
        icon: '🏆',
        category: 'academic',
        isAutomatic: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.badge).toBeDefined();
    createdBadgeId = res.body.badge.id;
  });

  it('9. DELETE /api/db/badge-definitions/:id removes badge definition', async () => {
    if (!createdBadgeId) return;
    const res = await request(app).delete(`/api/db/badge-definitions/${createdBadgeId}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });
});
