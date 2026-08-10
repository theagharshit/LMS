import { loadEnv } from '@utils/envResolver';

// Temporarily suppress logs from other modules
const _originalLog = console.log;
const _originalInfo = console.info;
console.log = () => {};
console.info = () => {};

loadEnv();

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let spinnerIndex = 0;
  const interval = setInterval(() => {
    process.stdout.write(
      `\r\x1b[36m${spinner[spinnerIndex]}\x1b[0m Cleaning and seeding database... `,
    );
    spinnerIndex = (spinnerIndex + 1) % spinner.length;
  }, 100);

  const dbUrl = process.env.DATABASE_URL || '';
  const isExplicitLocalDev =
    (process.env.NODE_ENV === 'development' ||
      process.env.NODE_ENV === 'test' ||
      !process.env.NODE_ENV) &&
    (dbUrl.includes('localhost') ||
      dbUrl.includes('127.0.0.1') ||
      dbUrl.includes('host.docker.internal'));

  // Double check: Never allow non-local database URLs without explicit override flag
  const isRemoteDatabase =
    !dbUrl.includes('localhost') &&
    !dbUrl.includes('127.0.0.1') &&
    !dbUrl.includes('host.docker.internal');

  if (
    (isRemoteDatabase || process.env.NODE_ENV === 'production') &&
    process.env.ALLOW_PRODUCTION_SEED !== 'true'
  ) {
    console.error('❌ DANGER PREVENTED: Database clearing & seeding is BLOCKED!');
    console.error('Reason: Target database is remote or NODE_ENV is set to production.');
    console.error(
      'If you REALLY intend to wipe this database, set ALLOW_PRODUCTION_SEED=true explicitly.',
    );
    process.exit(1);
  }

  console.log('Clearing database...');
  await prisma.classroomEnrollment.deleteMany();
  await prisma.termProgress.deleteMany();
  await prisma.studentActivity.deleteMany();
  await prisma.notificationRecord.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.subjectPerformance.deleteMany();
  await prisma.storedFileRecord.deleteMany();
  await prisma.studentLocationRecord.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.directMessage.deleteMany();
  await prisma.studentBadge.deleteMany();
  await prisma.badgeDefinition.deleteMany();
  await prisma.postComment.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.quizSubmission.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.streamPost.deleteMany();
  await prisma.moduleItem.deleteMany();
  await prisma.classroom.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.parentControlSettings.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding Users (1 Principal, 1 Admin, 2 Teachers, 2 Parents, 4 Students)...');

  const usersData = [
    // 1 Principal
    {
      id: 'user-principal-1',
      name: 'Principal K.P. Sharma',
      email: 'principal@lms.com',
      role: 'admin' as const,
      avatar:
        'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
      schoolName: 'Everest International Academy',
    },
    // 1 Admin Normal
    {
      id: 'user-admin-1',
      name: 'Bikram Shrestha',
      email: 'admin@lms.com',
      role: 'admin' as const,
      avatar:
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      schoolName: 'Everest International Academy',
    },
    // 2 Teachers
    {
      id: 'user-teach-1',
      name: 'Dr. Ramesh Thapa',
      email: 'ramesh.teacher@lms.com',
      role: 'teacher' as const,
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      schoolName: 'Everest International Academy',
      subjectsTaught: ['Mathematics', 'Algebra', 'Geometry'],
    },
    {
      id: 'user-teach-2',
      name: 'Saraswati Gurung',
      email: 'saraswati.teacher@lms.com',
      role: 'teacher' as const,
      avatar:
        'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      schoolName: 'Everest International Academy',
      subjectsTaught: ['Science', 'Physics', 'Chemistry'],
    },
    // 2 Parents
    {
      id: 'user-parent-1',
      name: 'Bina Sharma',
      email: 'bina.parent@lms.com',
      role: 'parent' as const,
      avatar:
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      schoolName: 'Everest International Academy',
      childrenIds: ['user-stu-1', 'user-stu-2'],
    },
    {
      id: 'user-parent-2',
      name: 'Hari Adhikari',
      email: 'hari.parent@lms.com',
      role: 'parent' as const,
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      schoolName: 'Everest International Academy',
      childrenIds: ['user-stu-3', 'user-stu-4'],
    },
    // 4 Students
    {
      id: 'user-stu-1',
      name: 'Aarav Sharma',
      email: 'aarav.student@lms.com',
      role: 'student' as const,
      avatar:
        'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
      schoolName: 'Everest International Academy',
      gradeLevel: 8,
      section: 'A',
      rollNumber: 1,
    },
    {
      id: 'user-stu-2',
      name: 'Ananya Sharma',
      email: 'ananya.student@lms.com',
      role: 'student' as const,
      avatar:
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      schoolName: 'Everest International Academy',
      gradeLevel: 8,
      section: 'A',
      rollNumber: 2,
    },
    {
      id: 'user-stu-3',
      name: 'Biban Adhikari',
      email: 'biban.student@lms.com',
      role: 'student' as const,
      avatar:
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
      schoolName: 'Everest International Academy',
      gradeLevel: 9,
      section: 'B',
      rollNumber: 10,
    },
    {
      id: 'user-stu-4',
      name: 'Diya Adhikari',
      email: 'diya.student@lms.com',
      role: 'student' as const,
      avatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      schoolName: 'Everest International Academy',
      gradeLevel: 9,
      section: 'B',
      rollNumber: 11,
    },
  ];

  for (const u of usersData) {
    await prisma.user.create({ data: u });
  }

  console.log('Seeding Badge Definitions...');
  const badgeDefs = [
    {
      id: 'bdg-def-1',
      title: 'Math Wizard',
      description: 'Scored 90%+ in advanced Mathematics homework & quizzes',
      icon: '📐',
      category: 'Academic Excellence',
      isAutomatic: true,
      criteria: 'Math score > 90%',
    },
    {
      id: 'bdg-def-2',
      title: 'Science Explorer',
      description: 'Completed top-tier physics & chemistry lab reports',
      icon: '🔬',
      category: 'Academic Excellence',
      isAutomatic: true,
      criteria: 'Science score > 90%',
    },
    {
      id: 'bdg-def-3',
      title: 'Perfect Attendance',
      description: 'Maintained 100% monthly classroom presence',
      icon: '⭐',
      category: 'Attendance',
      isAutomatic: true,
      criteria: 'Attendance == 100%',
    },
    {
      id: 'bdg-def-4',
      title: 'Super Scholar',
      description: 'Demonstrated overall academic prowess and peer mentorship',
      icon: '🏆',
      category: 'Leadership',
      isAutomatic: false,
      criteria: 'Teacher recommendation',
    },
  ];

  for (const bd of badgeDefs) {
    await prisma.badgeDefinition.create({ data: bd });
  }

  console.log('Seeding Student Profiles...');
  const studentProfiles = [
    {
      id: 'user-stu-1',
      userId: 'user-stu-1',
      attendancePercentage: 96.5,
      streakDays: 14,
      xpPoints: 1450,
      gradeLevel: 8,
      section: 'A',
      parentName: 'Bina Sharma',
      parentPhone: '+977 9841234567',
      badges: [
        {
          id: 'badge-stu1-1',
          earnedDate: '2026-05-10',
          badgeDefinitionId: 'bdg-def-1',
          assignedBy: 'Dr. Ramesh Thapa',
          remarks: 'Outstanding geometry score',
        },
        {
          id: 'badge-stu1-2',
          earnedDate: '2026-05-15',
          badgeDefinitionId: 'bdg-def-3',
          assignedBy: 'System Auto',
          remarks: 'Consistent 100% attendance in May',
        },
      ],
    },
    {
      id: 'user-stu-2',
      userId: 'user-stu-2',
      attendancePercentage: 92.0,
      streakDays: 8,
      xpPoints: 1120,
      gradeLevel: 8,
      section: 'A',
      parentName: 'Bina Sharma',
      parentPhone: '+977 9841234567',
      badges: [
        {
          id: 'badge-stu2-1',
          earnedDate: '2026-05-12',
          badgeDefinitionId: 'bdg-def-3',
          assignedBy: 'System Auto',
          remarks: 'Great classroom presence',
        },
      ],
    },
    {
      id: 'user-stu-3',
      userId: 'user-stu-3',
      attendancePercentage: 98.0,
      streakDays: 21,
      xpPoints: 1890,
      gradeLevel: 9,
      section: 'B',
      parentName: 'Hari Adhikari',
      parentPhone: '+977 9851098765',
      badges: [
        {
          id: 'badge-stu3-1',
          earnedDate: '2026-05-18',
          badgeDefinitionId: 'bdg-def-2',
          assignedBy: 'Saraswati Gurung',
          remarks: 'Excellent lab report on photosynthesis',
        },
        {
          id: 'badge-stu3-2',
          earnedDate: '2026-05-20',
          badgeDefinitionId: 'bdg-def-4',
          assignedBy: 'Principal K.P. Sharma',
          remarks: 'Leadership in Science Exhibition',
        },
      ],
    },
    {
      id: 'user-stu-4',
      userId: 'user-stu-4',
      attendancePercentage: 88.5,
      streakDays: 5,
      xpPoints: 940,
      gradeLevel: 9,
      section: 'B',
      parentName: 'Hari Adhikari',
      parentPhone: '+977 9851098765',
      badges: [],
    },
  ];

  for (const sp of studentProfiles) {
    const { badges, ...profileData } = sp;
    await prisma.studentProfile.create({
      data: {
        ...profileData,
        badges: {
          create: badges,
        },
      },
    });
  }

  console.log('Seeding Parent Control Settings...');
  const parentControls = [
    {
      id: 'pc-1',
      studentId: 'user-stu-1',
      allowTeacherDirectChat: true,
      allowPeerDiscussion: true,
      missingHomeworkAlerts: true,
      lowAttendanceAlerts: true,
      weeklyDigestEmail: true,
      screenTimeLimitMinutes: 120,
      requireApprovalForOutboundMsgs: false,
    },
    {
      id: 'pc-2',
      studentId: 'user-stu-2',
      allowTeacherDirectChat: true,
      allowPeerDiscussion: true,
      missingHomeworkAlerts: true,
      lowAttendanceAlerts: true,
      weeklyDigestEmail: true,
      screenTimeLimitMinutes: 90,
      requireApprovalForOutboundMsgs: true,
    },
    {
      id: 'pc-3',
      studentId: 'user-stu-3',
      allowTeacherDirectChat: true,
      allowPeerDiscussion: true,
      missingHomeworkAlerts: false,
      lowAttendanceAlerts: true,
      weeklyDigestEmail: true,
      screenTimeLimitMinutes: 180,
      requireApprovalForOutboundMsgs: false,
    },
    {
      id: 'pc-4',
      studentId: 'user-stu-4',
      allowTeacherDirectChat: true,
      allowPeerDiscussion: false,
      missingHomeworkAlerts: true,
      lowAttendanceAlerts: true,
      weeklyDigestEmail: true,
      screenTimeLimitMinutes: 60,
      requireApprovalForOutboundMsgs: true,
    },
  ];

  for (const pc of parentControls) {
    await prisma.parentControlSettings.create({ data: pc });
  }

  console.log('Seeding 2 Classrooms...');
  const classroomsData = [
    {
      id: 'cls-math-8a',
      name: 'Grade 8 Mathematics & Algebra',
      subject: 'Mathematics',
      gradeLevel: 8,
      section: 'A',
      teacherId: 'user-teach-1',
      teacherName: 'Dr. Ramesh Thapa',
      teacherAvatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      roomNumber: 'Room 301',
      colorTheme: '#2D5A27',
      bannerImage:
        'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=80',
      meetLink: 'https://meet.google.com/lms-math-8a',
      code: 'MATH8A-2026',
    },
    {
      id: 'cls-sci-9b',
      name: 'Grade 9 General Science & Physics',
      subject: 'Science',
      gradeLevel: 9,
      section: 'B',
      teacherId: 'user-teach-2',
      teacherName: 'Saraswati Gurung',
      teacherAvatar:
        'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      roomNumber: 'Lab 102',
      colorTheme: '#1E3A8A',
      bannerImage:
        'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80',
      meetLink: 'https://meet.google.com/lms-sci-9b',
      code: 'SCI9B-2026',
    },
  ];

  for (const c of classroomsData) {
    await prisma.classroom.create({ data: c });
  }

  console.log('Seeding Classroom Enrollments...');
  const enrollments = [
    { classroomId: 'cls-math-8a', studentId: 'user-stu-1' },
    { classroomId: 'cls-math-8a', studentId: 'user-stu-2' },
    { classroomId: 'cls-math-8a', studentId: 'user-stu-4' },
    { classroomId: 'cls-sci-9b', studentId: 'user-stu-1' },
    { classroomId: 'cls-sci-9b', studentId: 'user-stu-2' },
    { classroomId: 'cls-sci-9b', studentId: 'user-stu-3' },
    { classroomId: 'cls-sci-9b', studentId: 'user-stu-4' },
  ];

  for (const e of enrollments) {
    await prisma.classroomEnrollment.create({ data: e });
  }

  console.log('Seeding Stream Posts & Comments...');
  const streamPosts = [
    {
      id: 'post-math-1',
      classroomId: 'cls-math-8a',
      authorId: 'user-teach-1',
      authorName: 'Dr. Ramesh Thapa',
      authorAvatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      authorRole: 'teacher' as const,
      content:
        'Welcome to Grade 8 Mathematics! Please review the Pythagorean Theorem worksheet attached below before our next class on Friday.',
      pinned: true,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      comments: [
        {
          id: 'cmt-math-1',
          authorId: 'user-stu-1',
          authorName: 'Aarav Sharma',
          authorAvatar:
            'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
          content: 'Thank you Sir! Will we need graph paper for question 3?',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 'cmt-math-2',
          authorId: 'user-stu-2',
          authorName: 'Ananya Sharma',
          authorAvatar:
            'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
          content: 'Submitted my work, thank you Dr. Ramesh!',
          createdAt: new Date(Date.now() - 43200000).toISOString(),
        },
      ],
      attachments: [
        {
          id: 'att-math-1',
          title: 'Pythagoras_Theorem_Guide.pdf',
          type: 'pdf',
          url: '/uploads/Grade_8_Math_Pythagoras_Theorem.pdf',
          size: '1.48 MB',
        },
      ],
    },
    {
      id: 'post-sci-1',
      classroomId: 'cls-sci-9b',
      authorId: 'user-teach-2',
      authorName: 'Saraswati Gurung',
      authorAvatar:
        'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      authorRole: 'teacher' as const,
      content:
        "Important Notice: Lab safety goggles are mandatory for tomorrow's Photosynthesis experiment in Lab 102.",
      pinned: true,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      comments: [
        {
          id: 'cmt-sci-1',
          authorId: 'user-stu-3',
          authorName: 'Biban Adhikari',
          authorAvatar:
            'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
          content: "Understood Ma'am, lab coats ready as well!",
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
      ],
      attachments: [
        {
          id: 'att-sci-1',
          title: 'Science_Lab_Safety_Protocol.pdf',
          type: 'pdf',
          url: '/uploads/Science_Lab_Experiment_Guide.pdf',
          size: '2.30 MB',
        },
      ],
    },
  ];

  for (const post of streamPosts) {
    const { comments, attachments, ...postData } = post;
    await prisma.streamPost.create({
      data: {
        ...postData,
        comments: { create: comments },
        attachments: { create: attachments },
      },
    });
  }

  console.log('Seeding 2 Homeworks (Assignments)...');
  const assignmentsData = [
    // Homework 1 (Math 8A)
    {
      id: 'asgn-math-1',
      classroomId: 'cls-math-8a',
      classroomName: 'Grade 8 Mathematics & Algebra',
      subject: 'Mathematics',
      title: 'Pythagorean Theorem Worksheet & Proofs',
      instructions:
        'Solve problems 1 through 10 on page 45. Include step-by-step geometric proofs for questions 8 and 9.',
      dueDate: '2026-08-15',
      dueTime: '23:59',
      totalPoints: 100,
      rubric: [
        'Clarity of Proofs (40 pts)',
        'Numerical Accuracy (40 pts)',
        'Neatness & Diagrams (20 pts)',
      ],
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      attachments: [
        {
          id: 'att-asgn-math-1',
          title: 'Worksheet_Pythagoras_HW1.pdf',
          type: 'pdf',
          url: '/uploads/Grade_8_Math_Pythagoras_Theorem.pdf',
          size: '1.48 MB',
        },
      ],
    },
    // Homework 2 (Science 9B)
    {
      id: 'asgn-sci-1',
      classroomId: 'cls-sci-9b',
      classroomName: 'Grade 9 General Science & Physics',
      subject: 'Science',
      title: 'Photosynthesis & Solar Energy Experiment Report',
      instructions:
        'Write a 2-page detailed report explaining light absorption spectrum in chlorophyll during lab experiment 4.',
      dueDate: '2026-08-20',
      dueTime: '17:00',
      totalPoints: 50,
      rubric: ['Hypothesis & Method (15 pts)', 'Data Analysis (20 pts)', 'Conclusion (15 pts)'],
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      attachments: [
        {
          id: 'att-asgn-sci-1',
          title: 'Photosynthesis_Lab_Instructions.pdf',
          type: 'pdf',
          url: '/uploads/Science_Lab_Experiment_Guide.pdf',
          size: '2.30 MB',
        },
      ],
    },
  ];

  for (const asgn of assignmentsData) {
    const { attachments, ...asgnData } = asgn;
    await prisma.assignment.create({
      data: {
        ...asgnData,
        attachments: { create: attachments },
      },
    });
  }

  console.log('Seeding Assignment Submissions...');
  const submissionsData = [
    // Submissions for Homework 1 (Math 8A)
    {
      id: 'sub-math-1',
      assignmentId: 'asgn-math-1',
      studentId: 'user-stu-1',
      studentName: 'Aarav Sharma',
      studentAvatar:
        'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
      status: 'graded',
      fileUrl: '/uploads/Aarav_Math_HW1_Solved.pdf',
      fileName: 'Aarav_Math_HW1_Solved.pdf',
      responseText: 'Completed all 10 problems with diagrams attached.',
      grade: 95,
      feedback: 'Excellent work Aarav! Very neat geometric proof for Q8.',
      annotated: true,
      submittedAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'sub-math-2',
      assignmentId: 'asgn-math-1',
      studentId: 'user-stu-2',
      studentName: 'Ananya Sharma',
      studentAvatar:
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      status: 'submitted',
      fileUrl: '/uploads/Ananya_Math_HW1.pdf',
      fileName: 'Ananya_Math_HW1.pdf',
      responseText: 'All questions attempted.',
      grade: null,
      feedback: null,
      annotated: false,
      submittedAt: new Date(Date.now() - 43200000).toISOString(),
    },
    // Submissions for Homework 2 (Science 9B)
    {
      id: 'sub-sci-1',
      assignmentId: 'asgn-sci-1',
      studentId: 'user-stu-3',
      studentName: 'Biban Adhikari',
      studentAvatar:
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
      status: 'graded',
      fileUrl: '/uploads/Biban_Science_Lab_Report.pdf',
      fileName: 'Biban_Science_Lab_Report.pdf',
      responseText: 'Included solar spectrum observations in data table.',
      grade: 48,
      feedback: 'Top quality lab report! Very detailed conclusion.',
      annotated: true,
      submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'sub-sci-2',
      assignmentId: 'asgn-sci-1',
      studentId: 'user-stu-4',
      studentName: 'Diya Adhikari',
      studentAvatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      status: 'graded',
      fileUrl: '/uploads/Diya_Science_Report.pdf',
      fileName: 'Diya_Science_Report.pdf',
      responseText: 'Lab report attached.',
      grade: 42,
      feedback: 'Good overall effort, make sure to label graph axes next time.',
      annotated: false,
      submittedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
  ];

  for (const sub of submissionsData) {
    await prisma.submission.create({ data: sub });
  }

  console.log('Seeding 2 Quizzes...');
  const quizzesData = [
    // Quiz 1 (Math 8A)
    {
      id: 'quiz-math-1',
      classroomId: 'cls-math-8a',
      classroomName: 'Grade 8 Mathematics & Algebra',
      subject: 'Mathematics',
      title: 'Algebra & Geometry Speed Quiz',
      description:
        'Tests core concepts of linear equations, right-angled triangles, and exponent rules.',
      durationMinutes: 15,
      dueDate: '2026-08-18',
      totalQuestions: 3,
      published: true,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      questions: [
        {
          id: 'q-m-1',
          text: 'What is the hypotenuse length of a right triangle with legs of length 3 cm and 4 cm?',
          type: 'mcq',
          options: ['5 cm', '6 cm', '7 cm', '25 cm'],
          correctAnswer: '5 cm',
          explanation:
            'Using Pythagoras theorem: c^2 = 3^2 + 4^2 = 9 + 16 = 25, so c = sqrt(25) = 5 cm.',
          points: 10,
        },
        {
          id: 'q-m-2',
          text: 'Solve for x: 2x + 6 = 14',
          type: 'mcq',
          options: ['x = 2', 'x = 4', 'x = 6', 'x = 8'],
          correctAnswer: 'x = 4',
          explanation: 'Subtract 6 from both sides: 2x = 8. Divide by 2: x = 4.',
          points: 10,
        },
        {
          id: 'q-m-3',
          text: 'What is the value of (2^3) * (2^2)?',
          type: 'mcq',
          options: ['16', '32', '64', '128'],
          correctAnswer: '32',
          explanation: 'By exponent product rule: 2^(3+2) = 2^5 = 32.',
          points: 10,
        },
      ],
    },
    // Quiz 2 (Science 9B)
    {
      id: 'quiz-sci-1',
      classroomId: 'cls-sci-9b',
      classroomName: 'Grade 9 General Science & Physics',
      subject: 'Science',
      title: "Newton's Laws & Physical Mechanics Quiz",
      description: 'Assessment on force, inertia, acceleration, and action-reaction principles.',
      durationMinutes: 20,
      dueDate: '2026-08-22',
      totalQuestions: 3,
      published: true,
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      questions: [
        {
          id: 'q-s-1',
          text: 'Which law of motion is also known as the Law of Inertia?',
          type: 'mcq',
          options: ['First Law', 'Second Law', 'Third Law', 'Law of Gravitation'],
          correctAnswer: 'First Law',
          explanation:
            "Newton's First Law states an object remains at rest or in uniform motion unless acted upon by a net external force.",
          points: 10,
        },
        {
          id: 'q-s-2',
          text: 'What is the SI unit of Force?',
          type: 'mcq',
          options: ['Joule', 'Watt', 'Newton', 'Pascal'],
          correctAnswer: 'Newton',
          explanation: 'Force is measured in Newtons (N), defined as 1 kg·m/s².',
          points: 10,
        },
        {
          id: 'q-s-3',
          text: 'If a net force of 20 N acts on a 5 kg mass, what is its acceleration?',
          type: 'mcq',
          options: ['2 m/s²', '4 m/s²', '5 m/s²', '100 m/s²'],
          correctAnswer: '4 m/s²',
          explanation: 'Using F = m * a -> a = F / m = 20 / 5 = 4 m/s².',
          points: 10,
        },
      ],
    },
  ];

  for (const q of quizzesData) {
    const { questions, ...quizData } = q;
    await prisma.quiz.create({
      data: {
        ...quizData,
        questions: { create: questions },
      },
    });
  }

  console.log('Seeding Quiz Submissions...');
  const quizSubmissionsData = [
    {
      id: 'qsub-math-1',
      quizId: 'quiz-math-1',
      studentId: 'user-stu-1',
      score: 30,
      totalPoints: 30,
      completedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      answers: { 'q-m-1': '5 cm', 'q-m-2': 'x = 4', 'q-m-3': '32' },
    },
    {
      id: 'qsub-math-2',
      quizId: 'quiz-math-1',
      studentId: 'user-stu-2',
      score: 20,
      totalPoints: 30,
      completedAt: new Date(Date.now() - 86400000).toISOString(),
      answers: { 'q-m-1': '5 cm', 'q-m-2': 'x = 4', 'q-m-3': '16' },
    },
    {
      id: 'qsub-sci-1',
      quizId: 'quiz-sci-1',
      studentId: 'user-stu-3',
      score: 30,
      totalPoints: 30,
      completedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      answers: { 'q-s-1': 'First Law', 'q-s-2': 'Newton', 'q-s-3': '4 m/s²' },
    },
    {
      id: 'qsub-sci-2',
      quizId: 'quiz-sci-1',
      studentId: 'user-stu-4',
      score: 20,
      totalPoints: 30,
      completedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      answers: { 'q-s-1': 'First Law', 'q-s-2': 'Joule', 'q-s-3': '4 m/s²' },
    },
  ];

  for (const qsub of quizSubmissionsData) {
    await prisma.quizSubmission.create({ data: qsub });
  }

  console.log('Seeding Attendance Records...');
  const attendanceRecords = [
    // Math 8A attendance
    {
      id: 'att-1',
      studentId: 'user-stu-1',
      studentName: 'Aarav Sharma',
      date: '2026-08-01',
      status: 'present',
      markedBy: 'Dr. Ramesh Thapa',
      checkInTime: '09:00 AM',
    },
    {
      id: 'att-2',
      studentId: 'user-stu-2',
      studentName: 'Ananya Sharma',
      date: '2026-08-01',
      status: 'present',
      markedBy: 'Dr. Ramesh Thapa',
      checkInTime: '09:05 AM',
    },
    {
      id: 'att-3',
      studentId: 'user-stu-1',
      studentName: 'Aarav Sharma',
      date: '2026-08-02',
      status: 'present',
      markedBy: 'Dr. Ramesh Thapa',
      checkInTime: '08:58 AM',
    },
    {
      id: 'att-4',
      studentId: 'user-stu-2',
      studentName: 'Ananya Sharma',
      date: '2026-08-02',
      status: 'absent',
      markedBy: 'Dr. Ramesh Thapa',
      remarks: 'Sick leave approved',
    },

    // Science 9B attendance
    {
      id: 'att-5',
      studentId: 'user-stu-3',
      studentName: 'Biban Adhikari',
      date: '2026-08-01',
      status: 'present',
      markedBy: 'Saraswati Gurung',
      checkInTime: '10:00 AM',
    },
    {
      id: 'att-6',
      studentId: 'user-stu-4',
      studentName: 'Diya Adhikari',
      date: '2026-08-01',
      status: 'late',
      markedBy: 'Saraswati Gurung',
      checkInTime: '10:18 AM',
      remarks: 'Bus delay',
    },
  ];

  for (const att of attendanceRecords) {
    await prisma.attendanceRecord.create({ data: att });
  }

  console.log('Seeding Direct Messages...');
  const directMessages = [
    {
      id: 'dm-1',
      senderId: 'user-teach-1',
      senderName: 'Dr. Ramesh Thapa',
      senderRole: 'teacher' as const,
      senderAvatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      receiverId: 'user-stu-1',
      receiverName: 'Aarav Sharma',
      content: 'Hello Aarav, excellent proof on homework 1! Keep up the great work.',
      read: true,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'dm-2',
      senderId: 'user-stu-1',
      senderName: 'Aarav Sharma',
      senderRole: 'student' as const,
      senderAvatar:
        'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
      receiverId: 'user-teach-1',
      receiverName: 'Dr. Ramesh Thapa',
      content: 'Thank you Dr. Ramesh! I will work on the extra credit questions too.',
      read: true,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'dm-3',
      senderId: 'user-parent-1',
      senderName: 'Bina Sharma',
      senderRole: 'parent' as const,
      senderAvatar:
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      receiverId: 'user-teach-1',
      receiverName: 'Dr. Ramesh Thapa',
      content:
        "Good morning Dr. Thapa, I wanted to inquire about Aarav's progress for the upcoming term exams.",
      read: false,
      createdAt: new Date(Date.now() - 43200000).toISOString(),
    },
  ];

  for (const dm of directMessages) {
    await prisma.directMessage.create({ data: dm });
  }

  console.log('Seeding Student Location Records...');
  const locationRecords = [
    {
      id: 'loc-1',
      studentId: 'user-stu-1',
      studentName: 'Aarav Sharma',
      currentLocation: 'In Classroom - Room 301',
      category: 'Classroom',
      busNumber: null,
      updatedBy: 'Dr. Ramesh Thapa',
      updatedByRole: 'Teacher',
      notes: 'Attending Grade 8 Math class',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'loc-2',
      studentId: 'user-stu-2',
      studentName: 'Ananya Sharma',
      currentLocation: 'School Library',
      category: 'Library',
      busNumber: null,
      updatedBy: 'Bikram Shrestha',
      updatedByRole: 'Admin',
      notes: 'Studying for quiz',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'loc-3',
      studentId: 'user-stu-3',
      studentName: 'Biban Adhikari',
      currentLocation: 'On School Bus #4 (Route A)',
      category: 'Transit',
      busNumber: 'Bus #4',
      updatedBy: 'Driver Ram',
      updatedByRole: 'Staff',
      notes: 'En route home',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'loc-4',
      studentId: 'user-stu-4',
      studentName: 'Diya Adhikari',
      currentLocation: 'Science Lab 102',
      category: 'Lab',
      busNumber: null,
      updatedBy: 'Saraswati Gurung',
      updatedByRole: 'Teacher',
      notes: 'Performing lab experiment',
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const loc of locationRecords) {
    await prisma.studentLocationRecord.create({ data: loc });
  }

  console.log('Seeding Subject Performances...');
  const performances = [
    // Student 1 (Aarav)
    {
      studentId: 'user-stu-1',
      subject: 'Mathematics',
      scorePercentage: 95.0,
      grade: 'A+',
      assignmentsCompleted: 5,
      totalAssignments: 5,
      quizzesScoreAvg: 100.0,
      teacherRemark: 'Top performer in geometry.',
    },
    {
      studentId: 'user-stu-1',
      subject: 'Science',
      scorePercentage: 90.0,
      grade: 'A',
      assignmentsCompleted: 4,
      totalAssignments: 4,
      quizzesScoreAvg: 92.0,
      teacherRemark: 'Active participant in labs.',
    },
    {
      studentId: 'user-stu-1',
      subject: 'English',
      scorePercentage: 88.0,
      grade: 'A-',
      assignmentsCompleted: 4,
      totalAssignments: 4,
      quizzesScoreAvg: 85.0,
      teacherRemark: 'Great essay writing skills.',
    },

    // Student 2 (Ananya)
    {
      studentId: 'user-stu-2',
      subject: 'Mathematics',
      scorePercentage: 84.0,
      grade: 'B+',
      assignmentsCompleted: 4,
      totalAssignments: 5,
      quizzesScoreAvg: 66.7,
      teacherRemark: 'Needs minor practice on algebra.',
    },
    {
      studentId: 'user-stu-2',
      subject: 'Science',
      scorePercentage: 89.0,
      grade: 'A-',
      assignmentsCompleted: 4,
      totalAssignments: 4,
      quizzesScoreAvg: 88.0,
      teacherRemark: 'Very thorough reports.',
    },

    // Student 3 (Biban)
    {
      studentId: 'user-stu-3',
      subject: 'Science',
      scorePercentage: 96.0,
      grade: 'A+',
      assignmentsCompleted: 6,
      totalAssignments: 6,
      quizzesScoreAvg: 100.0,
      teacherRemark: 'Exemplary physics knowledge.',
    },
    {
      studentId: 'user-stu-3',
      subject: 'Mathematics',
      scorePercentage: 91.0,
      grade: 'A',
      assignmentsCompleted: 6,
      totalAssignments: 6,
      quizzesScoreAvg: 90.0,
      teacherRemark: 'Consistently high scores.',
    },

    // Student 4 (Diya)
    {
      studentId: 'user-stu-4',
      subject: 'Science',
      scorePercentage: 84.0,
      grade: 'B+',
      assignmentsCompleted: 5,
      totalAssignments: 6,
      quizzesScoreAvg: 66.7,
      teacherRemark: 'Good progress, label graphs clearly.',
    },
    {
      studentId: 'user-stu-4',
      subject: 'English',
      scorePercentage: 92.0,
      grade: 'A',
      assignmentsCompleted: 6,
      totalAssignments: 6,
      quizzesScoreAvg: 95.0,
      teacherRemark: 'Excellent vocabulary.',
    },
  ];

  for (const perf of performances) {
    await prisma.subjectPerformance.create({
      data: {
        id: `sp-${perf.studentId}-${perf.subject.toLowerCase()}`,
        ...perf,
      },
    });
  }

  console.log('Seeding Term Progress...');
  const termProgressData = [
    { studentId: 'user-stu-1', term: '1st Term', score: 92 },
    { studentId: 'user-stu-1', term: 'Mid Term', score: 94 },
    { studentId: 'user-stu-1', term: '2nd Term', score: 95 },

    { studentId: 'user-stu-2', term: '1st Term', score: 85 },
    { studentId: 'user-stu-2', term: 'Mid Term', score: 88 },
    { studentId: 'user-stu-2', term: '2nd Term', score: 87 },

    { studentId: 'user-stu-3', term: '1st Term', score: 95 },
    { studentId: 'user-stu-3', term: 'Mid Term', score: 96 },
    { studentId: 'user-stu-3', term: '2nd Term', score: 97 },

    { studentId: 'user-stu-4', term: '1st Term', score: 86 },
    { studentId: 'user-stu-4', term: 'Mid Term', score: 87 },
    { studentId: 'user-stu-4', term: '2nd Term', score: 89 },
  ];

  for (const tp of termProgressData) {
    await prisma.termProgress.create({ data: tp });
  }

  console.log('Seeding Student Activities...');
  const activities = [
    {
      id: 'act-1',
      studentId: 'user-stu-1',
      title: 'Inter-House Mathematics Olympiad 2026',
      category: 'Academics',
      position: '1st Place 🥇',
      date: 'May 2026',
      description: 'Solved complex algebra & geometry challenges under time constraint.',
    },
    {
      id: 'act-2',
      studentId: 'user-stu-1',
      title: 'All-Nepal Junior Chess Championship',
      category: 'Mind Games',
      position: 'Runner-Up 🥈',
      date: 'April 2026',
      description: 'Secured 2nd rank among 64 Valley participants.',
    },
    {
      id: 'act-3',
      studentId: 'user-stu-3',
      title: 'Inter-House Science Exhibition 2026',
      category: 'Science & Tech',
      position: '1st Place 🥇',
      date: 'May 2026',
      description: 'Built automated solar drip irrigation model.',
    },
    {
      id: 'act-4',
      studentId: 'user-stu-4',
      title: 'Intra-School Creative Writing Contest',
      category: 'Literature',
      position: '1st Place 🥇',
      date: 'Baisakh 2083',
      description: 'Wrote winning essay on renewable energy futures.',
    },
  ];

  for (const act of activities) {
    await prisma.studentActivity.create({ data: act });
  }

  console.log('Seeding Stored File Records...');
  await prisma.storedFileRecord.createMany({
    data: [
      {
        id: 'file-db-101',
        originalName: 'Grade_8_Math_Pythagoras_Theorem.pdf',
        storedName: '1785850000_Pythagoras_Theorem.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1548576,
        sizeFormatted: '1.48 MB',
        uploadedBy: 'Dr. Ramesh Thapa',
        classroomId: 'cls-math-8a',
        checksum: 'sha256-a9f8b4c2e1d7532098471abcfe094857',
        integrityStatus: 'verified',
        uploadedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        downloadUrl: '/uploads/Grade_8_Math_Pythagoras_Theorem.pdf',
      },
      {
        id: 'file-db-102',
        originalName: 'Science_Lab_Experiment_Guide.pdf',
        storedName: '1785850001_Science_Lab_Guide.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2411724,
        sizeFormatted: '2.30 MB',
        uploadedBy: 'Saraswati Gurung',
        classroomId: 'cls-sci-9b',
        checksum: 'sha256-b7e3f1a098c4321156890defab123456',
        integrityStatus: 'verified',
        uploadedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
        downloadUrl: '/uploads/Science_Lab_Experiment_Guide.pdf',
      },
    ],
  });

  // Seed Notifications for default demo users
  const demoUserIds = ['user-stu-1', 'user-stu-2', 'user-teach-1', 'user-parent-1', 'user-admin-1'];
  for (const uId of demoUserIds) {
    await prisma.notificationRecord.createMany({
      data: [
        {
          id: `n1-${uId}`,
          recipientId: uId,
          title: '🚨 Attendance Alert: Absence Reported',
          body: 'Attendance record updated as ABSENT for Period 1 Science.',
          category: 'CRITICAL',
          severity: 'urgent',
          type: 'attendance',
          read: false,
          createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
        },
        {
          id: `n2-${uId}`,
          recipientId: uId,
          title: '⚡ Quiz Marks Published',
          body: 'Grade 8 Algebra & Factorization Quiz scores are now live!',
          category: 'CRITICAL',
          severity: 'high',
          type: 'quiz',
          read: false,
          createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
        },
        {
          id: `n3-${uId}`,
          recipientId: uId,
          title: 'New Homework Assigned',
          body: 'Mr. Ramesh Thapa posted Exercise 4.1 in Math Grade 8',
          category: 'ACADEMIC',
          severity: 'normal',
          type: 'assignment',
          read: false,
          createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
        },
        {
          id: `n4-${uId}`,
          recipientId: uId,
          title: 'Badge Earned: Quiz Master 🎉',
          body: 'Awarded for scoring 100% on Mathematics assessment.',
          category: 'COMMUNICATION',
          severity: 'info',
          type: 'badge',
          read: true,
          createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
        },
      ],
    });
  }

  clearInterval(interval);
  process.stdout.write(
    '\r\x1b[32m✔\x1b[0m Database seeding complete!                                \n',
  );
  console.log = _originalLog;
  console.info = _originalInfo;

  console.log('✨ Database seeding complete! Summary:');
  console.log('- 1 Principal: Principal K.P. Sharma (user-principal-1)');
  console.log('- 1 Admin: Bikram Shrestha (user-admin-1)');
  console.log('- 2 Teachers: Dr. Ramesh Thapa (user-teach-1), Saraswati Gurung (user-teach-2)');
  console.log('- 2 Parents: Bina Sharma (user-parent-1), Hari Adhikari (user-parent-2)');
  console.log(
    '- 4 Students: Aarav (user-stu-1), Ananya (user-stu-2), Biban (user-stu-3), Diya (user-stu-4)',
  );
  console.log('- 2 Classrooms: Math 8A (cls-math-8a), Science 9B (cls-sci-9b)');
  console.log('- 2 Homeworks: Math HW (asgn-math-1), Science HW (asgn-sci-1)');
  console.log('- 2 Quizzes: Math Quiz (quiz-math-1), Science Quiz (quiz-sci-1)');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
