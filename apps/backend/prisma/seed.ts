import { loadEnv } from '@utils/envResolver';
loadEnv();
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  MOCK_USERS,
  MOCK_STUDENTS,
  MOCK_CLASSROOMS,
  MOCK_STREAM_POSTS,
  MOCK_ASSIGNMENTS,
  MOCK_SUBMISSIONS,
  MOCK_QUIZZES,
  MOCK_QUIZ_SUBMISSIONS,
  MOCK_SUBJECT_PERFORMANCE,
} from '@lms/shared';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Clearing database...');
  await prisma.termProgress.deleteMany();
  await prisma.studentActivity.deleteMany();
  await prisma.subjectPerformance.deleteMany();
  await prisma.storedFileRecord.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.postComment.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.quizSubmission.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.streamPost.deleteMany();
  await prisma.classroom.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.parentControlSettings.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding Users...');
  for (const user of MOCK_USERS) {
    await prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        schoolName: user.schoolName,
        gradeLevel: user.gradeLevel,
        section: user.section,
        rollNumber: user.rollNumber,
        childrenIds: user.childrenIds || [],
        subjectsTaught: user.subjectsTaught || [],
      },
    });
  }

  console.log('Seeding Student Profiles...');
  for (const profile of MOCK_STUDENTS) {
    // Ensure user exists first
    await prisma.user.upsert({
      where: { id: profile.id },
      update: {},
      create: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        avatar: profile.avatar,
        schoolName: profile.schoolName,
        gradeLevel: profile.gradeLevel,
        section: profile.section,
        rollNumber: profile.rollNumber,
      },
    });

    await prisma.studentProfile.create({
      data: {
        id: profile.id,
        userId: profile.id, // Assuming userId is same as the student's id in mock
        attendancePercentage: profile.attendancePercentage,
        streakDays: profile.streakDays,
        xpPoints: profile.xpPoints,
        gradeLevel: profile.gradeLevel,
        section: profile.section,
        parentName: profile.parentName,
        parentPhone: profile.parentPhone,
        badges: {
          create: profile.badges.map((b) => ({
            id: b.id,
            title: b.title,
            description: b.description,
            icon: b.icon,
            earnedDate: b.earnedDate,
            category: b.category,
          })),
        },
      },
    });
  }

  console.log('Seeding Classrooms...');
  for (const room of MOCK_CLASSROOMS) {
    await prisma.classroom.create({
      data: {
        id: room.id,
        name: room.name,
        subject: room.subject,
        gradeLevel: room.gradeLevel,
        section: room.section,
        teacherId: room.teacherId,
        teacherName: room.teacherName,
        teacherAvatar: room.teacherAvatar,
        roomNumber: room.roomNumber,
        colorTheme: room.colorTheme,
        bannerImage: room.bannerImage,
        studentCount: room.studentCount,
        meetLink: room.meetLink,
        code: room.code,
      },
    });
  }

  console.log('Seeding Stream Posts...');
  for (const post of MOCK_STREAM_POSTS) {
    await prisma.streamPost.create({
      data: {
        id: post.id,
        classroomId: post.classroomId,
        authorId: post.authorId,
        authorName: post.authorName,
        authorAvatar: post.authorAvatar,
        authorRole: post.authorRole,
        content: post.content,
        pinned: post.pinned || false,
        createdAt: post.createdAt,
        comments: {
          create: (post.comments || []).map((c) => ({
            id: c.id,
            authorName: c.authorName,
            authorAvatar: c.authorAvatar,
            content: c.content,
            createdAt: c.createdAt,
          })),
        },
        attachments: {
          create: (post.attachments || []).map((a) => ({
            id: a.id,
            title: a.title,
            type: a.type,
            url: a.url,
            size: a.size,
          })),
        },
      },
    });
  }

  console.log('Seeding Assignments...');
  for (const assignment of MOCK_ASSIGNMENTS) {
    await prisma.assignment.create({
      data: {
        id: assignment.id,
        classroomId: assignment.classroomId,
        classroomName: assignment.classroomName,
        subject: assignment.subject,
        title: assignment.title,
        instructions: assignment.instructions,
        dueDate: assignment.dueDate,
        dueTime: assignment.dueTime,
        totalPoints: assignment.totalPoints,
        rubric: assignment.rubric || [],
        createdAt: assignment.createdAt,
        attachments: {
          create: (assignment.attachments || []).map((a) => ({
            id: a.id,
            title: a.title,
            type: a.type,
            url: a.url,
            size: a.size,
          })),
        },
      },
    });
  }

  console.log('Seeding Submissions...');
  for (const sub of MOCK_SUBMISSIONS) {
    await prisma.submission.create({
      data: {
        id: sub.id,
        assignmentId: sub.assignmentId,
        studentId: sub.studentId,
        studentName: sub.studentName,
        studentAvatar: sub.studentAvatar,
        status: sub.status,
        fileUrl: sub.fileUrl,
        fileName: sub.fileName,
        responseText: sub.responseText,
        grade: sub.grade,
        feedback: sub.feedback,
        annotated: sub.annotated || false,
        submittedAt: sub.submittedAt,
      },
    });
  }

  console.log('Seeding Quizzes...');
  for (const quiz of MOCK_QUIZZES) {
    await prisma.quiz.create({
      data: {
        id: quiz.id,
        classroomId: quiz.classroomId,
        classroomName: quiz.classroomName,
        subject: quiz.subject,
        title: quiz.title,
        description: quiz.description,
        durationMinutes: quiz.durationMinutes,
        dueDate: quiz.dueDate,
        totalQuestions: quiz.totalQuestions,
        published: quiz.published,
        createdAt: quiz.createdAt || new Date().toISOString(),
        questions: {
          create: quiz.questions.map((q) => ({
            id: q.id,
            text: q.text,
            type: q.type,
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            points: q.points,
          })),
        },
      },
    });
  }

  console.log('Seeding Quiz Submissions...');
  for (const qsub of MOCK_QUIZ_SUBMISSIONS) {
    await prisma.quizSubmission.create({
      data: {
        id: qsub.id,
        quizId: qsub.quizId,
        studentId: qsub.studentId,
        score: qsub.score,
        totalPoints: qsub.totalPoints,
        completedAt: qsub.completedAt,
        answers: qsub.answers || {},
      },
    });
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
        uploadedBy: 'Ramesh Thapa',
        classroomId: 'chan-1',
        checksum: 'sha256-a9f8b4c2e1d7532098471abcfe094857',
        integrityStatus: 'verified',
        uploadedAt: new Date(Date.now() - 86400000).toISOString(),
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
        classroomId: 'chan-2',
        checksum: 'sha256-b7e3f1a098c4321156890defab123456',
        integrityStatus: 'verified',
        uploadedAt: new Date(Date.now() - 43200000).toISOString(),
        downloadUrl: '/uploads/Science_Lab_Experiment_Guide.pdf',
      },
    ],
  });

  console.log('Seeding Subject Performances...');
  for (const sp of MOCK_SUBJECT_PERFORMANCE) {
    await prisma.subjectPerformance.create({
      data: {
        id: sp.id || `sp-${Date.now()}-${Math.random()}`,
        studentId: 'user-stu-1', // Assuming for Aarav
        subject: sp.subject,
        scorePercentage: sp.scorePercentage,
        grade: sp.grade,
        assignmentsCompleted: sp.assignmentsCompleted,
        totalAssignments: sp.totalAssignments,
        quizzesScoreAvg: sp.quizzesScoreAvg,
        teacherRemark: sp.teacherRemark,
      },
    });
  }

  console.log('Seeding Term Progress...');
  const termProgressData = [
    { term: '1st Term', score: 88 },
    { term: 'Mid Term', score: 91 },
    { term: '2nd Term', score: 93 },
    { term: '3rd Term', score: 96 },
  ];
  for (const tp of termProgressData) {
    await prisma.termProgress.create({
      data: {
        studentId: 'user-stu-1',
        term: tp.term,
        score: tp.score,
      },
    });
  }

  console.log('Seeding Student Activities...');
  const activities = [
    {
      id: 'act-1',
      title: 'Inter-House Science Exhibition 2026',
      category: 'Science & Tech',
      position: '1st Place 🥇',
      date: 'May 2026',
      description: 'Built automated solar drip irrigation model.',
    },
    {
      id: 'act-2',
      title: 'All-Nepal Junior Chess Championship',
      category: 'Mind Games',
      position: 'Runner-Up 🥈',
      date: 'April 2026',
      description: 'Secured 2nd rank among 64 Valley participants.',
    },
    {
      id: 'act-3',
      title: 'Intra-School Nepali Poetry Recitation',
      category: 'Literature',
      position: '2nd Place 🥈',
      date: 'Baisakh 2083',
      description: 'Recited original poem "Himal ko Chhaya".',
    },
    {
      id: 'act-4',
      title: 'Annual Inter-House Football Tournament',
      category: 'Sports',
      position: 'Semi-Finalist ⚽',
      date: 'Falgun 2082',
      description: 'Led Machhapuchhre Green House football squad.',
    },
  ];
  for (const act of activities) {
    await prisma.studentActivity.create({
      data: {
        id: act.id,
        studentId: 'user-stu-1',
        title: act.title,
        category: act.category,
        position: act.position,
        date: act.date,
        description: act.description,
      },
    });
  }

  console.log('Database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
