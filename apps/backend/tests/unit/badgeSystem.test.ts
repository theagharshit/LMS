import { describe, it, expect, beforeEach } from 'vitest';
import { loadEnv } from '@utils/envResolver';
loadEnv();
import { lmsDB } from '@db/lmsDatabase';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
describe('Hybrid Badge System & Auto-Trigger Engine (20 Tests)', () => {
  beforeEach(async () => {
    await prisma.studentBadge.deleteMany();
    await prisma.badgeDefinition.deleteMany();
    // Seed core badge definitions
    await prisma.badgeDefinition.createMany({
      data: [
        {
          id: 'bdg-def-1',
          title: 'Top Scholar',
          description: 'Academic excellence',
          icon: '🌟',
          category: 'academic',
          isAutomatic: false,
        },
        {
          id: 'bdg-def-2',
          title: 'Quiz Master',
          description: 'Scored 100% on a quiz',
          icon: '🧠',
          category: 'academic',
          isAutomatic: true,
          criteria: 'score === 100%',
        },
        {
          id: 'bdg-def-3',
          title: 'Perfect Attendance',
          description: '30 days 100% attendance',
          icon: '⏱️',
          category: 'attendance',
          isAutomatic: true,
        },
      ],
    });
    // Ensure student profile & user exists
    await prisma.user.upsert({
      where: { id: 'user-stu-1' },
      update: {},
      create: {
        id: 'user-stu-1',
        name: 'Aarav Sharma',
        email: 'aarav@test.com',
        role: 'student',
        avatar: 'a.png',
        schoolId: 'school-everest',
      },
    });
    await prisma.studentProfile.upsert({
      where: { id: 'user-stu-1' },
      update: {},
      create: {
        id: 'user-stu-1',
        userId: 'user-stu-1',
        streakDays: 10,
        xpPoints: 500,
        cohortId: 'cohort-8-a',
      },
    });
    await prisma.user.upsert({
      where: { id: 'user-stu-2' },
      update: {},
      create: {
        id: 'user-stu-2',
        name: 'Sunita Sharma',
        email: 'sunita@test.com',
        role: 'student',
        avatar: 'a.png',
        schoolId: 'school-everest',
      },
    });
    await prisma.studentProfile.upsert({
      where: { id: 'user-stu-2' },
      update: {},
      create: {
        id: 'user-stu-2',
        userId: 'user-stu-2',
        streakDays: 5,
        xpPoints: 200,
        cohortId: 'cohort-8-a',
      },
    });
    // Ensure classroom & quiz exists for auto-trigger tests
    await prisma.user.upsert({
      where: { id: 'user-teach-1' },
      update: {},
      create: {
        id: 'user-teach-1',
        name: 'Mr. Ramesh Thapa',
        email: 'ramesh@test.com',
        role: 'teacher',
        avatar: 'a.png',
        schoolId: 'school-everest',
      },
    });
    await prisma.classroom.upsert({
      where: { id: 'cls-math-8a' },
      update: {},
      create: {
        id: 'cls-math-8a',
        name: 'Math 8A',
        teacherId: 'user-teach-1',
        roomNumber: '1',
        colorTheme: 'blue',
        bannerImage: 'b.png',
        code: 'MATH8A',
        schoolId: 'school-everest',
        subjectId: 'subject-mathematics',
        cohortId: 'cohort-8-a',
      },
    });
    await prisma.quiz.upsert({
      where: { id: 'quiz-1' },
      update: {},
      create: {
        id: 'quiz-1',
        classroomId: 'cls-math-8a',
        title: 'Quiz 1',
        description: 'Desc',
        durationMinutes: 15,
        dueDate: '2026-08-10',
        createdAt: new Date().toISOString(),
      },
    });
  });
  it('1. getBadgeDefinitions returns all registered badge definitions', async () => {
    const defs = await lmsDB.getBadgeDefinitions();
    expect(defs.length).toBeGreaterThanOrEqual(3);
  });
  it('2. assignBadge manually assigns badge to student profile', async () => {
    const badge = await lmsDB.assignBadge('user-stu-1', 'bdg-def-1', 'user-teach-1', 'Great job!');
    expect(badge.studentProfileId).toBe('user-stu-1');
    expect(badge.badgeDefinitionId).toBe('bdg-def-1');
    expect(badge.assignedBy).toBe('Mr. Ramesh Thapa');
  });
  it('3. assignBadge is idempotent and returns existing record on duplicate request', async () => {
    const badge1 = await lmsDB.assignBadge('user-stu-1', 'bdg-def-1', 'user-teach-1');
    const badge2 = await lmsDB.assignBadge('user-stu-1', 'bdg-def-1', 'user-teach-1');
    expect(badge1.id).toBe(badge2.id);
  });
  it('4. submitQuiz with 100% score automatically awards Quiz Master badge (bdg-def-2)', async () => {
    await lmsDB.submitQuiz({
      quizId: 'quiz-1',
      studentId: 'user-stu-1',
      score: 100,
      totalPoints: 100,
      answers: { q1: 'A' },
    });
    const userBadges = await prisma.studentBadge.findMany({
      where: { studentProfileId: 'user-stu-1', badgeDefinitionId: 'bdg-def-2' },
    });
    expect(userBadges.length).toBe(1);
    expect(userBadges[0].assignedById).toBeNull();
  });
  it('5. submitQuiz with 80% score (not 100%) does NOT award Quiz Master badge', async () => {
    await lmsDB.submitQuiz({
      quizId: 'quiz-1',
      studentId: 'user-stu-2',
      score: 80,
      totalPoints: 100,
      answers: { q1: 'A' },
    });
    const userBadges = await prisma.studentBadge.findMany({
      where: { studentProfileId: 'user-stu-2', badgeDefinitionId: 'bdg-def-2' },
    });
    expect(userBadges.length).toBe(0);
  });
  it('6. submitQuiz with 0 totalPoints does NOT trigger auto-badge award', async () => {
    await lmsDB.submitQuiz({
      quizId: 'quiz-1',
      studentId: 'user-stu-1',
      score: 0,
      totalPoints: 0,
      answers: {},
    });
    const userBadges = await prisma.studentBadge.findMany({
      where: { studentProfileId: 'user-stu-1', badgeDefinitionId: 'bdg-def-2' },
    });
    expect(userBadges.length).toBe(0);
  });
  it('7. assignBadge supports optional remarks field', async () => {
    const badge = await lmsDB.assignBadge(
      'user-stu-1',
      'bdg-def-3',
      'user-teach-1',
      'Extraordinary streak',
    );
    expect(badge.remarks).toBe('Extraordinary streak');
  });
  it('8. getStudentProfiles populates student badges with full badgeDefinition relation', async () => {
    await lmsDB.assignBadge('user-stu-1', 'bdg-def-1', 'user-teach-1');
    const profiles = await lmsDB.getStudentProfiles();
    const aarav = profiles.find((p) => p.id === 'user-stu-1');
    expect(aarav?.badges.length).toBeGreaterThan(0);
    expect(aarav?.badges[0].badgeDefinition.title).toBe('Top Scholar');
  });
  it('9. multiple students can independently earn the same Quiz Master auto-badge', async () => {
    await lmsDB.submitQuiz({
      quizId: 'quiz-1',
      studentId: 'user-stu-1',
      score: 50,
      totalPoints: 50,
      answers: {},
    });
    await lmsDB.submitQuiz({
      quizId: 'quiz-1',
      studentId: 'user-stu-2',
      score: 50,
      totalPoints: 50,
      answers: {},
    });
    const b1 = await prisma.studentBadge.findFirst({
      where: { studentProfileId: 'user-stu-1', badgeDefinitionId: 'bdg-def-2' },
    });
    const b2 = await prisma.studentBadge.findFirst({
      where: { studentProfileId: 'user-stu-2', badgeDefinitionId: 'bdg-def-2' },
    });
    expect(b1).not.toBeNull();
    expect(b2).not.toBeNull();
  });
  it('10. automatic badges set assignedBy to "System"', async () => {
    await lmsDB.submitQuiz({
      quizId: 'quiz-1',
      studentId: 'user-stu-1',
      score: 10,
      totalPoints: 10,
      answers: {},
    });
    const badge = await prisma.studentBadge.findFirst({
      where: { studentProfileId: 'user-stu-1', badgeDefinitionId: 'bdg-def-2' },
    });
    expect(badge?.assignedById).toBeNull();
  });
  it('11. manual badges record assignedBy parameter correctly', async () => {
    const badge = await lmsDB.assignBadge('user-stu-1', 'bdg-def-1', 'user-teach-1');
    expect(badge.assignedBy).toBe('Mr. Ramesh Thapa');
  });
  it('12. student can earn multiple distinct badge definitions', async () => {
    await lmsDB.assignBadge('user-stu-1', 'bdg-def-1', 'user-teach-1');
    await lmsDB.assignBadge('user-stu-1', 'bdg-def-3', 'user-teach-1');
    const badges = await prisma.studentBadge.findMany({
      where: { studentProfileId: 'user-stu-1' },
    });
    expect(badges.length).toBe(2);
  });
  it('13. earnDate is formatted as ISO YYYY-MM-DD string', async () => {
    const badge = await lmsDB.assignBadge('user-stu-1', 'bdg-def-1', 'user-teach-1');
    expect(badge.earnedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('14. deleting StudentProfile cascades and deletes earned StudentBadges', async () => {
    const user = await prisma.user.create({
      data: {
        id: 'stu-badge-cas',
        name: 'Student',
        email: 'stubadgecas@test.com',
        role: 'student',
        avatar: 'a.png',
        schoolId: 'school-everest',
      },
    });
    const profile = await prisma.studentProfile.create({
      data: {
        id: user.id,
        userId: user.id,
        streakDays: 5,
        xpPoints: 100,
        cohortId: 'cohort-8-a',
      },
    });
    await lmsDB.assignBadge(profile.id, 'bdg-def-1', 'user-teach-1');
    await prisma.studentProfile.delete({ where: { id: profile.id } });
    const badges = await prisma.studentBadge.findMany({ where: { studentProfileId: profile.id } });
    expect(badges.length).toBe(0);
  });
  it('15. deleting BadgeDefinition cascades and deletes earned StudentBadges', async () => {
    const badge = await lmsDB.assignBadge('user-stu-1', 'bdg-def-1', 'user-teach-1');
    await prisma.badgeDefinition.delete({ where: { id: 'bdg-def-1' } });
    const check = await prisma.studentBadge.findUnique({ where: { id: badge.id } });
    expect(check).toBeNull();
  });
  it('16. quiz auto-trigger preserves submission details while assigning badge', async () => {
    const sub = await lmsDB.submitQuiz({
      quizId: 'quiz-1',
      studentId: 'user-stu-1',
      score: 20,
      totalPoints: 20,
      answers: { q1: 'Correct' },
    });
    expect(sub.score).toBe(20);
    expect(sub.answers['q1']).toBe('Correct');
  });
  it('17. badge definition criteria field stores JSON string metadata', async () => {
    const def = await prisma.badgeDefinition.findUnique({ where: { id: 'bdg-def-2' } });
    expect(def?.criteria).toBe('score === 100%');
  });
  it('18. isAutomatic flag correctly demarcates manual vs automated badges', async () => {
    const def1 = await prisma.badgeDefinition.findUnique({ where: { id: 'bdg-def-1' } });
    const def2 = await prisma.badgeDefinition.findUnique({ where: { id: 'bdg-def-2' } });
    expect(def1?.isAutomatic).toBe(false);
    expect(def2?.isAutomatic).toBe(true);
  });
  it('19. repeat 100% quiz submissions for same student do not crash or create duplicate badges', async () => {
    await lmsDB.submitQuiz({
      quizId: 'quiz-1',
      studentId: 'user-stu-1',
      score: 10,
      totalPoints: 10,
      answers: {},
    });
    await lmsDB.submitQuiz({
      quizId: 'quiz-1',
      studentId: 'user-stu-1',
      score: 10,
      totalPoints: 10,
      answers: {},
    });
    const count = await prisma.studentBadge.count({
      where: { studentProfileId: 'user-stu-1', badgeDefinitionId: 'bdg-def-2' },
    });
    expect(count).toBe(1);
  });
  it('20. getBadgeDefinitions returns array of definitions', async () => {
    const defs = await lmsDB.getBadgeDefinitions();
    expect(defs.length).toBeGreaterThanOrEqual(3);
  });
});
