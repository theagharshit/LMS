import { Request, Response } from 'express';
import { lmsDB } from '@db/lmsDatabase';
import { getAi } from '@utils/aiClient';
import { logger } from '@utils/logger';
import { prisma } from '@db/services/prismaClient';

export const submitHomework = async (req: Request, res: Response) => {
  try {
    const { assignmentId, fileName, fileUrl, studentId, notes } = req.body;
    const effectiveStudentId = req.user?.role === 'student' ? req.user.id : studentId;
    if (!effectiveStudentId)
      return res.status(400).json({ status: 'error', message: 'studentId is required.' });
    const sub = await lmsDB.submitHomework(
      assignmentId,
      fileName,
      fileUrl,
      effectiveStudentId,
      notes,
    );
    res.json({ status: 'success', submission: sub });
  } catch (err) {
    logger.error('Failed to submit homework:', err);
    res.status(500).json({ status: 'error', message: 'Failed to submit homework' });
  }
};

export const submitQuiz = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.role === 'student' ? req.user.id : req.body.studentId;
    if (!studentId)
      return res.status(400).json({ status: 'error', message: 'studentId is required.' });
    const sub = await lmsDB.submitQuiz({ ...req.body, studentId });
    res.json({ status: 'success', quizSubmission: sub });
  } catch (err: any) {
    logger.error('Failed to submit quiz:', err);
    const message = err?.message || 'Failed to submit quiz';
    const status = message.includes('already submitted') ? 409 : 500;
    res.status(status).json({ status: 'error', message });
  }
};

export const getStudentLocation = async (req: Request, res: Response) => {
  const record = await lmsDB.getStudentLocationById(req.params.studentId);
  if (!record) {
    return res.status(404).json({ status: 'error', message: 'Student location record not found' });
  }
  res.json({ status: 'success', location: record });
};

export const askAiTutor = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    const { prompt, subject, language = 'English/Nepali' } = req.body;
    const studentId = req.user.role === 'student' ? req.user.id : req.body.studentId;
    const profile = studentId
      ? await prisma.studentProfile.findFirst({
          where: { userId: studentId, isArchived: false, user: { isArchived: false } },
          include: {
            user: {
              include: {
                studentAcademicEnrollments: {
                  where: { status: 'active' },
                  include: { cohort: true },
                  orderBy: { enrolledAt: 'desc' },
                  take: 1,
                },
                enrollments: {
                  where: { isActive: true },
                  include: { classroom: { include: { subjectRef: true } } },
                },
              },
            },
          },
        })
      : null;
    if (!profile) return res.status(404).json({ error: 'Active student profile not found.' });
    const subjects = new Set(
      profile.user.enrollments.map((enrollment) => enrollment.classroom.subjectRef.name),
    );
    if (!subjects.has(subject))
      return res
        .status(400)
        .json({ error: "Select a subject from the student's active classrooms." });
    const activeEnrollment = profile.user.studentAcademicEnrollments[0];
    if (!activeEnrollment)
      return res.status(409).json({ error: 'Student has no active academic enrollment.' });
    const gradeLevel = activeEnrollment.cohort.gradeLevel;
    const ai = getAi();

    if (!ai) return res.status(503).json({ error: 'The AI tutor is not configured.' });

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        systemInstruction: `You are Sikshya AI, a friendly, encouraging, and highly knowledgeable AI Tutor for students in Nepalese schools (Grades 1 to 12). 
Subject context: ${subject}.
Grade level: Grade ${gradeLevel}.
Language preference: ${language}.
Provide step-by-step explanations, helpful hints, and encouraging feedback suitable for school students. Include Nepalese cultural/curricular context where appropriate (e.g. CDC Nepal Curriculum standard, National Examination Board concepts). Do NOT give direct final answers to graded homework questions directly without guiding steps. Use Markdown formatting with clean headings and bullet points.`,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    logger.error('AI Tutor Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate AI tutor response' });
  }
};

export const askHomeworkHelper = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    const { assignmentId, questionText } = req.body;
    const studentId = req.user.role === 'student' ? req.user.id : req.body.studentId;
    const assignment = studentId
      ? await prisma.assignment.findFirst({
          where: {
            id: assignmentId,
            classroom: {
              isArchived: false,
              enrollments: { some: { studentId, isActive: true } },
            },
          },
          include: {
            classroom: { include: { subjectRef: true } },
          },
        })
      : null;
    const student = studentId
      ? await prisma.user.findUnique({
          where: { id: studentId },
          select: {
            studentAcademicEnrollments: {
              where: { status: 'active' },
              include: { cohort: true },
              orderBy: { enrolledAt: 'desc' },
              take: 1,
            },
          },
        })
      : null;
    if (!assignment || !student?.studentAcademicEnrollments[0])
      return res.status(404).json({ error: 'Active student assignment not found.' });
    const ai = getAi();

    if (!ai) return res.status(503).json({ error: 'The homework assistant is not configured.' });

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Assignment: ${assignment.title}\nSubject: ${assignment.classroom.subjectRef.name}\nDescription: ${assignment.instructions}\nStudent's Query: ${questionText}`,
      config: {
        systemInstruction: `You are an AI Homework Helper for Grade ${student.studentAcademicEnrollments[0].cohort.gradeLevel} students in Nepal. Break down concepts into simple, understandable learning steps with helpful analogies and guidance without writing the full final essay/homework for them. Encourage critical thinking.`,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    logger.error('Homework Helper Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate homework assistance' });
  }
};
