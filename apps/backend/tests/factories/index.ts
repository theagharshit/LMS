import type { Classroom, Quiz, StudentProfile, User } from '@lms/shared';

let sequence = 0;
const next = () => ++sequence;

export function createMockUser(overrides: Partial<User> = {}): User {
  const id = next();
  return {
    id: `factory-user-${id}`,
    name: `Factory User ${id}`,
    email: `factory.user.${id}@example.com`,
    role: 'student',
    avatar: '',
    schoolName: 'Everest International Academy',
    childrenIds: [],
    subjectsTaught: [],
    ...overrides,
  };
}

export function createMockStudentProfile(overrides: Partial<StudentProfile> = {}): StudentProfile {
  const user = createMockUser({ role: 'student' });
  return {
    ...user,
    gradeLevel: 8,
    section: 'A',
    rollNumber: next(),
    attendancePercentage: 100,
    streakDays: 1,
    xpPoints: 0,
    parentName: 'Factory Parent',
    parentPhone: '+977-9800000000',
    badges: [],
    ...overrides,
  };
}

export function createMockClassroom(overrides: Partial<Classroom> = {}): Classroom {
  const id = next();
  return {
    id: `factory-class-${id}`,
    name: `Grade 8-A Classroom ${id}`,
    subject: 'Mathematics',
    gradeLevel: 8,
    section: 'A',
    teacherId: 'user-teach-1',
    teacherName: 'Factory Teacher',
    teacherAvatar: '',
    roomNumber: '201',
    colorTheme: 'green',
    bannerImage: '',
    code: `F${String(id).padStart(5, '0')}`,
    studentCount: 0,
    enrolledStudentIds: [],
    ...overrides,
  };
}

export function createMockQuiz(overrides: Partial<Quiz> = {}): Quiz {
  const id = next();
  return {
    id: `factory-quiz-${id}`,
    classroomId: 'cls-math-8a',
    classroomName: 'Grade 8 Mathematics',
    subject: 'Mathematics',
    title: `Factory Quiz ${id}`,
    description: 'Generated valid quiz fixture',
    durationMinutes: 20,
    dueDate: '2026-12-31',
    totalQuestions: 1,
    published: true,
    revealMarksMode: 'immediate',
    questions: [
      {
        id: `factory-question-${id}`,
        text: '2 + 2?',
        type: 'MCQ',
        options: ['3', '4'],
        correctAnswer: '4',
        explanation: 'Addition',
        points: 1,
      },
    ],
    ...overrides,
  };
}
