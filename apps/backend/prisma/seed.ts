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
import bcrypt from 'bcryptjs';

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
  await prisma.studentReportCardSubject.deleteMany();
  await prisma.studentReportCard.deleteMany();
  await prisma.examMark.deleteMany();
  await prisma.examSubject.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.timetableSlot.deleteMany();
  await prisma.bellScheduleEntry.deleteMany();
  await prisma.schoolHoliday.deleteMany();
  await prisma.teachingAssignment.deleteMany();
  await prisma.studentLifecycleEvent.deleteMany();
  await prisma.studentAcademicEnrollment.deleteMany();
  await prisma.moduleCompletion.deleteMany();
  await prisma.classroomSubstitute.deleteMany();
  await prisma.teacherAssignmentAuditLog.deleteMany();
  await prisma.teacherSubject.deleteMany();
  await prisma.parentStudent.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.tokenRevocation.deleteMany();
  await prisma.securityAudit.deleteMany();
  await prisma.auditTrail.deleteMany();
  await prisma.homeworkVersion.deleteMany();
  await prisma.quizAttemptSession.deleteMany();
  await prisma.paymentRecord.deleteMany();
  await prisma.absenceRequest.deleteMany();
  await prisma.parentVerificationToken.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.systemConfig.deleteMany();
  await prisma.classroomEnrollment.deleteMany();
  await prisma.termProgress.deleteMany();
  await prisma.studentActivity.deleteMany();
  await prisma.notificationRecord.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.subjectPerformance.deleteMany();
  await prisma.storedFileRecord.deleteMany();
  await prisma.studentLocationRecord.deleteMany();
  await prisma.externalLocationReporter.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.directMessage.deleteMany();
  await prisma.studentBadge.deleteMany();
  await prisma.badgeDefinition.deleteMany();
  await prisma.postComment.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.quizSubmission.deleteMany();
  await prisma.quizResourceLink.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.studyResource.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.streamPost.deleteMany();
  await prisma.moduleItem.deleteMany();
  await prisma.classroom.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.teacherProfile.deleteMany();
  await prisma.parentProfile.deleteMany();
  await prisma.parentControlSettings.deleteMany();
  await prisma.user.deleteMany();
  await prisma.academicTerm.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.academicCohort.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.school.deleteMany();

  const schoolId = 'school-everest';
  await prisma.school.create({
    data: {
      id: schoolId,
      name: 'Everest International Academy',
      timezone: 'Asia/Kathmandu',
    },
  });

  const academicYearId = 'academic-year-2026';
  await prisma.academicYear.create({
    data: {
      id: academicYearId,
      schoolId,
      name: '2026',
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-31T00:00:00.000Z'),
      isActive: true,
    },
  });

  const subjectNames = [
    'Mathematics',
    'Algebra',
    'Geometry',
    'Science',
    'Physics',
    'Chemistry',
    'English',
  ];
  await prisma.subject.createMany({
    data: subjectNames.map((name) => ({
      id: `subject-${name.toLowerCase()}`,
      schoolId,
      name,
    })),
  });

  await prisma.academicCohort.createMany({
    data: Array.from({ length: 10 }, (_, index) => index + 1).flatMap((gradeLevel) =>
      ['A', 'B'].map((section) => ({
        id: `cohort-${gradeLevel}-${section.toLowerCase()}`,
        schoolId,
        gradeLevel,
        section,
      })),
    ),
  });

  const termNames = ['1st Term', 'Mid Term', '2nd Term'];
  await prisma.academicTerm.createMany({
    data: termNames.map((name, index) => ({
      id: `term-${index + 1}`,
      schoolId,
      academicYearId,
      name,
      sequence: index + 1,
    })),
  });

  console.log('Seeding Users (1 Principal, 1 Admin, 2 Teachers, 2 Parents, 4 Students)...');

  const seededUserPassword = process.env.SEED_USER_PASSWORD || 'Sikshya@2026!';
  const seededUserPasswordHash = await bcrypt.hash(seededUserPassword, 12);

  const usersData = [
    // 1 Principal
    {
      id: 'user-principal-1',
      name: 'Principal K.P. Sharma',
      email: 'principal@lms.com',
      role: 'admin' as const,
      avatar:
        'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
      schoolId,
    },
    // 1 Admin Normal
    {
      id: 'user-admin-1',
      name: 'Bikram Shrestha',
      email: 'admin@lms.com',
      role: 'admin' as const,
      avatar:
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      schoolId,
    },
    // 2 Teachers
    {
      id: 'user-teach-1',
      name: 'Dr. Ramesh Thapa',
      email: 'ramesh.teacher@lms.com',
      role: 'teacher' as const,
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      schoolId,
    },
    {
      id: 'user-teach-2',
      name: 'Saraswati Gurung',
      email: 'saraswati.teacher@lms.com',
      role: 'teacher' as const,
      avatar:
        'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      schoolId,
    },
    // 2 Parents
    {
      id: 'user-parent-1',
      name: 'Bina Sharma',
      email: 'bina.parent@lms.com',
      role: 'parent' as const,
      avatar:
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      schoolId,
      phone: '+977 9841000001',
    },
    {
      id: 'user-parent-2',
      name: 'Hari Adhikari',
      email: 'hari.parent@lms.com',
      role: 'parent' as const,
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      schoolId,
      phone: '+977 9851098765',
    },
    // 4 Students
    {
      id: 'user-stu-1',
      name: 'Aarav Sharma',
      email: 'aarav.student@lms.com',
      role: 'student' as const,
      avatar:
        'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
      schoolId,
    },
    {
      id: 'user-stu-2',
      name: 'Ananya Sharma',
      email: 'ananya.student@lms.com',
      role: 'student' as const,
      avatar:
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      schoolId,
    },
    {
      id: 'user-stu-3',
      name: 'Biban Adhikari',
      email: 'biban.student@lms.com',
      role: 'student' as const,
      avatar:
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
      schoolId,
    },
    {
      id: 'user-stu-4',
      name: 'Diya Adhikari',
      email: 'diya.student@lms.com',
      role: 'student' as const,
      avatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      schoolId,
    },
  ];

  for (const u of usersData) {
    await prisma.user.create({ data: { ...u, passwordHash: seededUserPasswordHash } });
  }

  await prisma.teacherProfile.createMany({
    data: [
      { id: 'teacher-profile-1', userId: 'user-teach-1', employeeNumber: 'T-001' },
      { id: 'teacher-profile-2', userId: 'user-teach-2', employeeNumber: 'T-002' },
    ],
  });

  await prisma.parentProfile.createMany({
    data: [
      {
        id: 'parent-profile-1',
        userId: 'user-parent-1',
        verificationStatus: 'verified_enrolled',
        verifiedAt: new Date(),
      },
      {
        id: 'parent-profile-2',
        userId: 'user-parent-2',
        verificationStatus: 'verified_enrolled',
        verifiedAt: new Date(),
      },
    ],
  });

  await prisma.parentStudent.createMany({
    data: [
      { parentId: 'user-parent-1', studentId: 'user-stu-1', isPrimary: true },
      { parentId: 'user-parent-1', studentId: 'user-stu-2' },
      { parentId: 'user-parent-2', studentId: 'user-stu-3', isPrimary: true },
      { parentId: 'user-parent-2', studentId: 'user-stu-4' },
    ],
  });

  await prisma.teacherSubject.createMany({
    data: [
      ...['Mathematics', 'Algebra', 'Geometry'].map((name) => ({
        teacherId: 'user-teach-1',
        subjectId: `subject-${name.toLowerCase()}`,
      })),
      ...['Science', 'Physics', 'Chemistry'].map((name) => ({
        teacherId: 'user-teach-2',
        subjectId: `subject-${name.toLowerCase()}`,
      })),
    ],
  });

  await prisma.notificationPreference.createMany({
    data: usersData.map((user) => ({
      userId: user.id,
      enableAcademic: true,
      enableCommunication: true,
      enableReminders: true,
    })),
  });

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
      streakDays: 14,
      xpPoints: 1450,
      badges: [
        {
          id: 'badge-stu1-1',
          earnedDate: '2026-05-10',
          badgeDefinitionId: 'bdg-def-1',
          assignedById: 'user-teach-1',
          remarks: 'Outstanding geometry score',
        },
        {
          id: 'badge-stu1-2',
          earnedDate: '2026-05-15',
          badgeDefinitionId: 'bdg-def-3',
          remarks: 'Consistent 100% attendance in May',
        },
      ],
    },
    {
      id: 'user-stu-2',
      userId: 'user-stu-2',
      streakDays: 8,
      xpPoints: 1120,
      badges: [
        {
          id: 'badge-stu2-1',
          earnedDate: '2026-05-12',
          badgeDefinitionId: 'bdg-def-3',
          remarks: 'Great classroom presence',
        },
      ],
    },
    {
      id: 'user-stu-3',
      userId: 'user-stu-3',
      streakDays: 21,
      xpPoints: 1890,
      badges: [
        {
          id: 'badge-stu3-1',
          earnedDate: '2026-05-18',
          badgeDefinitionId: 'bdg-def-2',
          assignedById: 'user-teach-2',
          remarks: 'Excellent lab report on photosynthesis',
        },
        {
          id: 'badge-stu3-2',
          earnedDate: '2026-05-20',
          badgeDefinitionId: 'bdg-def-4',
          assignedById: 'user-principal-1',
          remarks: 'Leadership in Science Exhibition',
        },
      ],
    },
    {
      id: 'user-stu-4',
      userId: 'user-stu-4',
      streakDays: 5,
      xpPoints: 940,
      badges: [],
    },
  ];

  for (const sp of studentProfiles) {
    const { badges, ...profileData } = sp;
    const studentIdentity: Record<string, { cohortId: string; rollNumber: number }> = {
      'user-stu-1': { cohortId: 'cohort-8-a', rollNumber: 1 },
      'user-stu-2': { cohortId: 'cohort-8-a', rollNumber: 2 },
      'user-stu-3': { cohortId: 'cohort-9-b', rollNumber: 10 },
      'user-stu-4': { cohortId: 'cohort-9-b', rollNumber: 11 },
    };
    const identity = studentIdentity[profileData.userId];
    await prisma.studentProfile.create({
      data: {
        ...profileData,
        badges: {
          create: badges,
        },
      },
    });
    await prisma.studentAcademicEnrollment.create({
      data: {
        id: `student-enrollment-${profileData.userId}`,
        studentId: profileData.userId,
        cohortId: identity.cohortId,
        academicYearId,
        rollNumber: identity.rollNumber,
      },
    });
    await prisma.studentLifecycleEvent.create({
      data: {
        id: `student-lifecycle-${profileData.userId}`,
        studentId: profileData.userId,
        type: 'enrolled',
        toCohortId: identity.cohortId,
        academicYearId,
        createdById: 'user-admin-1',
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
      schoolId,
      subjectId: 'subject-mathematics',
      cohortId: 'cohort-8-a',
      teacherId: 'user-teach-1',
      roomNumber: 'Room 301',
      colorTheme: '#2D5A27',
      bannerImage:
        'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=80',
      meetLink: 'https://meet.google.com/lms-math-8a',
      code: 'MATH8A-2026',
      academicYearId,
    },
    {
      id: 'cls-sci-9b',
      name: 'Grade 9 General Science & Physics',
      schoolId,
      subjectId: 'subject-science',
      cohortId: 'cohort-9-b',
      teacherId: 'user-teach-2',
      roomNumber: 'Lab 102',
      colorTheme: '#1E3A8A',
      bannerImage:
        'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80',
      meetLink: 'https://meet.google.com/lms-sci-9b',
      code: 'SCI9B-2026',
      academicYearId,
    },
  ];

  for (const c of classroomsData) {
    await prisma.classroom.create({ data: c });
  }

  await prisma.teachingAssignment.createMany({
    data: classroomsData.map((classroom) => ({
      id: `teaching-assignment-${classroom.id}`,
      teacherId: classroom.teacherId,
      classroomId: classroom.id,
      subjectId: classroom.subjectId,
      academicYearId,
    })),
  });

  await prisma.timetableSlot.createMany({
    data: [
      {
        id: 'timetable-math-monday-1',
        schoolId,
        academicYearId,
        classroomId: 'cls-math-8a',
        cohortId: 'cohort-8-a',
        subjectId: 'subject-mathematics',
        teacherId: 'user-teach-1',
        dayOfWeek: 1,
        periodNumber: 1,
        startTime: '09:00',
        endTime: '09:45',
        roomNumber: 'Room 301',
      },
      {
        id: 'timetable-science-monday-2',
        schoolId,
        academicYearId,
        classroomId: 'cls-sci-9b',
        cohortId: 'cohort-9-b',
        subjectId: 'subject-science',
        teacherId: 'user-teach-2',
        dayOfWeek: 1,
        periodNumber: 2,
        startTime: '09:50',
        endTime: '10:35',
        roomNumber: 'Lab 102',
      },
    ],
  });

  await prisma.bellScheduleEntry.createMany({
    data: [
      {
        id: 'bell-period-1',
        schoolId,
        academicYearId,
        name: 'Period 1',
        type: 'period',
        sequence: 1,
        startTime: '09:00',
        endTime: '09:45',
      },
      {
        id: 'bell-period-2',
        schoolId,
        academicYearId,
        name: 'Period 2',
        type: 'period',
        sequence: 2,
        startTime: '09:50',
        endTime: '10:35',
      },
    ],
  });

  console.log('Seeding Classroom Enrollments...');
  const enrollments = [
    { classroomId: 'cls-math-8a', studentId: 'user-stu-1' },
    { classroomId: 'cls-math-8a', studentId: 'user-stu-2' },
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
      content:
        'Welcome to Grade 8 Mathematics! Please review the Pythagorean Theorem worksheet attached below before our next class on Friday.',
      pinned: true,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      comments: [
        {
          id: 'cmt-math-1',
          authorId: 'user-stu-1',
          content: 'Thank you Sir! Will we need graph paper for question 3?',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 'cmt-math-2',
          authorId: 'user-stu-2',
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
      content:
        "Important Notice: Lab safety goggles are mandatory for tomorrow's Photosynthesis experiment in Lab 102.",
      pinned: true,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      comments: [
        {
          id: 'cmt-sci-1',
          authorId: 'user-stu-3',
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
      createdById: 'user-teach-1',
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
      createdById: 'user-teach-2',
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
      status: 'graded' as const,
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
      status: 'submitted' as const,
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
      status: 'graded' as const,
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
      status: 'graded' as const,
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

  console.log('Seeding Study Resources...');
  const studyResourcesData = [
    {
      id: 'res-math-ch4',
      classroomId: 'cls-math-8a',
      teacherId: 'user-teach-1',
      title: 'Grade 8 Math - Chapter 4 Algebraic Expressions',
      description: 'CDC Nepal curriculum notes on factorization and identities',
      type: 'pdf' as const,
      url: '/uploads/Grade_8_Math_Pythagoras_Theorem.pdf',
      mimeType: 'application/pdf',
      sizeFormatted: '1.2 MB',
      tags: ['Mathematics', 'Algebra'],
      createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    },
    {
      id: 'res-math-pythagoras',
      classroomId: 'cls-math-8a',
      teacherId: 'user-teach-1',
      title: 'Pythagoras Theorem Worksheet',
      description: 'Practice problems for right-angled triangles',
      type: 'pdf' as const,
      url: '/uploads/Grade_8_Math_Pythagoras_Theorem.pdf',
      mimeType: 'application/pdf',
      sizeFormatted: '850 KB',
      tags: ['Mathematics', 'Geometry'],
      createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    },
    {
      id: 'res-sci-newton',
      classroomId: 'cls-sci-9b',
      teacherId: 'user-teach-2',
      title: "Newton's Laws Study Guide",
      description: 'Physics notes on force, mass, and acceleration',
      type: 'pdf' as const,
      url: '/uploads/Science_Lab_Experiment_Guide.pdf',
      mimeType: 'application/pdf',
      sizeFormatted: '2.1 MB',
      tags: ['Science', 'Physics'],
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    },
  ];

  for (const res of studyResourcesData) {
    await prisma.studyResource.create({ data: res });
  }

  console.log('Seeding 2 Quizzes...');
  const quizzesData = [
    // Quiz 1 (Math 8A)
    {
      id: 'quiz-math-1',
      classroomId: 'cls-math-8a',
      createdById: 'user-teach-1',
      title: 'Algebra & Geometry Speed Quiz',
      description:
        'Tests core concepts of linear equations, right-angled triangles, and exponent rules.',
      durationMinutes: 15,
      dueDate: '2026-08-18',
      published: true,
      status: 'live' as const,
      liveStartedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
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
      createdById: 'user-teach-2',
      title: "Newton's Laws & Physical Mechanics Quiz",
      description: 'Assessment on force, inertia, acceleration, and action-reaction principles.',
      durationMinutes: 20,
      dueDate: '2026-08-22',
      published: true,
      status: 'live' as const,
      liveStartedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
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

  await prisma.quizResourceLink.createMany({
    data: [
      { quizId: 'quiz-math-1', resourceId: 'res-math-ch4' },
      { quizId: 'quiz-math-1', resourceId: 'res-math-pythagoras' },
      { quizId: 'quiz-sci-1', resourceId: 'res-sci-newton' },
    ],
  });

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
      date: '2026-08-01',
      status: 'present' as const,
      markedById: 'user-teach-1',
      checkInTime: '09:00 AM',
    },
    {
      id: 'att-2',
      studentId: 'user-stu-2',
      date: '2026-08-01',
      status: 'present' as const,
      markedById: 'user-teach-1',
      checkInTime: '09:05 AM',
    },
    {
      id: 'att-3',
      studentId: 'user-stu-1',
      date: '2026-08-02',
      status: 'present' as const,
      markedById: 'user-teach-1',
      checkInTime: '08:58 AM',
    },
    {
      id: 'att-4',
      studentId: 'user-stu-2',
      date: '2026-08-02',
      status: 'absent' as const,
      markedById: 'user-teach-1',
      remarks: 'Sick leave approved',
    },

    // Science 9B attendance
    {
      id: 'att-5',
      studentId: 'user-stu-3',
      date: '2026-08-01',
      status: 'present' as const,
      markedById: 'user-teach-2',
      checkInTime: '10:00 AM',
    },
    {
      id: 'att-6',
      studentId: 'user-stu-4',
      date: '2026-08-01',
      status: 'late' as const,
      markedById: 'user-teach-2',
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
      receiverId: 'user-stu-1',
      content: 'Hello Aarav, excellent proof on homework 1! Keep up the great work.',
      read: true,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'dm-2',
      senderId: 'user-stu-1',
      receiverId: 'user-teach-1',
      content: 'Thank you Dr. Ramesh! I will work on the extra credit questions too.',
      read: true,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'dm-3',
      senderId: 'user-parent-1',
      receiverId: 'user-teach-1',
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
  await prisma.externalLocationReporter.create({
    data: {
      id: 'location-reporter-driver-ram',
      schoolId,
      name: 'Driver Ram',
      role: 'staff',
    },
  });
  const locationRecords = [
    {
      id: 'loc-1',
      studentId: 'user-stu-1',
      currentLocation: 'In Classroom - Room 301',
      category: 'in_class' as const,
      busNumber: null,
      updatedById: 'user-teach-1',
      notes: 'Attending Grade 8 Math class',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'loc-2',
      studentId: 'user-stu-2',
      currentLocation: 'School Library',
      category: 'library' as const,
      busNumber: null,
      updatedById: 'user-admin-1',
      notes: 'Studying for quiz',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'loc-3',
      studentId: 'user-stu-3',
      currentLocation: 'On School Bus #4 (Route A)',
      category: 'en_route_bus' as const,
      busNumber: 'Bus #4',
      externalReporterId: 'location-reporter-driver-ram',
      notes: 'En route home',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'loc-4',
      studentId: 'user-stu-4',
      currentLocation: 'Science Lab 102',
      category: 'laboratory' as const,
      busNumber: null,
      updatedById: 'user-teach-2',
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
    const { subject, ...performance } = perf;
    await prisma.subjectPerformance.create({
      data: {
        id: `sp-${perf.studentId}-${subject.toLowerCase()}`,
        ...performance,
        subjectId: `subject-${subject.toLowerCase()}`,
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
    const { term, ...progress } = tp;
    await prisma.termProgress.create({
      data: { ...progress, termId: `term-${termNames.indexOf(term) + 1}` },
    });
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
        uploadedById: 'user-teach-1',
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
        uploadedById: 'user-teach-2',
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

  await prisma.systemConfig.createMany({
    data: [
      {
        key: 'school_name',
        value: 'Everest International Academy',
        description: 'Public school name',
      },
      { key: 'academic_year', value: '2083/84', description: 'Current Nepali academic year' },
      {
        key: 'maintenance_mode',
        value: false,
        description: 'Blocks non-admin logins while enabled',
      },
    ],
  });

  const [userCount, studentCount, classroomCount, preferenceCount] = await Promise.all([
    prisma.user.count(),
    prisma.studentProfile.count(),
    prisma.classroom.count(),
    prisma.notificationPreference.count(),
  ]);
  if (
    userCount !== usersData.length ||
    studentCount !== 4 ||
    classroomCount !== 2 ||
    preferenceCount !== userCount
  ) {
    throw new Error(
      `Seed parity check failed (users=${userCount}, students=${studentCount}, classrooms=${classroomCount}, preferences=${preferenceCount}).`,
    );
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
  console.log(`- Local login: admin@lms.com / ${seededUserPassword}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
