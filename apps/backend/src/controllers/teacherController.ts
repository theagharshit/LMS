import { Request, Response } from 'express';
import { Type } from '@google/genai';
import { lmsDB } from '@db/lmsDatabase';
import { getAi } from '@utils/aiClient';
import { logger } from '@utils/logger';
import { broadcastAnnouncement } from '@utils/realtime';
import { prisma } from '@db/services/prismaClient';

const requireClassroomManager = async (req: Request, classroomId: string) => {
  if (!req.user) throw new Error('Authentication required.');
  const actor = await prisma.user.findFirst({
    where: {
      id: req.user.id,
      role: { in: ['teacher', 'admin'] },
      isArchived: false,
    },
    select: { id: true, name: true, role: true, avatar: true, schoolId: true },
  });
  if (!actor) throw new Error('An active teacher or administrator account is required.');
  const classroom = await prisma.classroom.findFirst({
    where: {
      id: classroomId,
      schoolId: actor.schoolId,
      isArchived: false,
      ...(actor.role === 'teacher'
        ? {
            OR: [
              { teacherId: actor.id },
              { teachingAssignments: { some: { teacherId: actor.id, isActive: true } } },
            ],
          }
        : {}),
    },
  });
  if (!classroom) throw new Error('Active classroom was not found in your teaching scope.');
  return { actor, classroom };
};

const getManageableClassroomIds = async (req: Request) => {
  if (!req.user) throw new Error('Authentication required.');
  const actor = await prisma.user.findFirst({
    where: { id: req.user.id, role: { in: ['teacher', 'admin'] }, isArchived: false },
    select: { id: true, role: true, schoolId: true },
  });
  if (!actor) throw new Error('An active teacher or administrator account is required.');
  const classrooms = await prisma.classroom.findMany({
    where: {
      schoolId: actor.schoolId,
      isArchived: false,
      ...(actor.role === 'teacher'
        ? {
            OR: [
              { teacherId: actor.id },
              { teachingAssignments: { some: { teacherId: actor.id, isActive: true } } },
            ],
          }
        : {}),
    },
    select: { id: true },
  });
  return { actor, classroomIds: new Set(classrooms.map(({ id }) => id)) };
};

const requireQuizManager = async (req: Request, quizId: string) => {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { classroomId: true },
  });
  if (!quiz) throw new Error('Quiz not found.');
  await requireClassroomManager(req, quiz.classroomId);
};

export const addClassroom = async (req: Request, res: Response) => {
  try {
    const classroom = await lmsDB.addClassroom(req.body, req.user?.id);
    res.status(201).json({ status: 'success', classroom });
  } catch (err) {
    logger.error('Failed to add classroom:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const addStreamPost = async (req: Request, res: Response) => {
  try {
    const { actor } = await requireClassroomManager(req, req.body.classroomId);
    const post = await lmsDB.addStreamPost({
      ...req.body,
      authorId: actor.id,
    });
    broadcastAnnouncement(post);
    res.status(201).json({ status: 'success', post });
  } catch (err) {
    logger.error('Failed to add stream post:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const addPostComment = async (req: Request, res: Response) => {
  try {
    if (!req.user)
      return res.status(401).json({ status: 'error', message: 'Authentication required.' });
    const comment = await lmsDB.addCommentToPost(
      req.params.id,
      req.user.id,
      String(req.body.content),
    );
    res.status(201).json({ status: 'success', comment });
  } catch (err) {
    logger.error('Failed to add comment:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const addAssignment = async (req: Request, res: Response) => {
  try {
    const { actor } = await requireClassroomManager(req, req.body.classroomId);
    const assignment = await lmsDB.addAssignment(req.body, actor.id);
    res.status(201).json({ status: 'success', assignment });
  } catch (err) {
    logger.error('Failed to create assignment:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const gradeSubmission = async (req: Request, res: Response) => {
  try {
    if (!req.user)
      return res.status(401).json({ status: 'error', message: 'Authentication required.' });
    const submission = await lmsDB.gradeSubmission(
      req.params.id,
      Number(req.body.grade),
      String(req.body.feedback || ''),
      req.user.id,
      req.user.role,
    );
    res.json({ status: 'success', submission });
  } catch (err) {
    logger.error('Failed to grade submission:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const addQuiz = async (req: Request, res: Response) => {
  try {
    const { actor } = await requireClassroomManager(req, req.body.classroomId);
    const quiz = await lmsDB.addQuiz(req.body, actor.id);
    res.status(201).json({ status: 'success', quiz });
  } catch (err) {
    logger.error('Failed to create quiz:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const updateQuiz = async (req: Request, res: Response) => {
  try {
    await requireQuizManager(req, req.params.id);
    const quiz = await lmsDB.updateQuiz(req.params.id, req.body);
    if (!quiz) {
      return res.status(404).json({ status: 'error', message: 'Quiz not found' });
    }
    res.json({ status: 'success', quiz });
  } catch (err) {
    logger.error('Failed to update quiz:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const deleteQuiz = async (req: Request, res: Response) => {
  try {
    await requireQuizManager(req, req.params.id);
    const deleted = await lmsDB.deleteQuiz(req.params.id);
    if (!deleted) {
      return res
        .status(400)
        .json({ status: 'error', message: 'Quiz not found or has student submissions' });
    }
    res.json({ status: 'success', message: 'Quiz deleted' });
  } catch (err) {
    logger.error('Failed to delete quiz:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const startQuizLive = async (req: Request, res: Response) => {
  try {
    await requireQuizManager(req, req.params.id);
    const quiz = await lmsDB.startQuizLive(req.params.id);
    if (!quiz) {
      return res.status(404).json({ status: 'error', message: 'Quiz not found' });
    }
    res.json({ status: 'success', quiz });
  } catch (err: any) {
    logger.error('Failed to start quiz:', err);
    res.status(400).json({ status: 'error', message: err?.message || 'Failed to start quiz' });
  }
};

export const getResources = async (req: Request, res: Response) => {
  try {
    const { classroomIds } = await getManageableClassroomIds(req);
    const { classroomId, teacherId } = req.query;
    let resources;
    if (classroomId && typeof classroomId === 'string') {
      resources = await lmsDB.getResourcesByClassroom(classroomId);
    } else if (teacherId && typeof teacherId === 'string') {
      resources = await lmsDB.getResourcesByTeacher(teacherId);
    } else {
      resources = await lmsDB.getResources();
    }
    resources = resources.filter((resource) => classroomIds.has(resource.classroomId));
    res.json({ status: 'success', resources });
  } catch (err) {
    logger.error('Failed to fetch resources:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const addResource = async (req: Request, res: Response) => {
  try {
    const { actor } = await requireClassroomManager(req, req.body.classroomId);
    const resource = await lmsDB.addResource({
      ...req.body,
      teacherId: actor.role === 'teacher' ? actor.id : req.body.teacherId,
    });
    res.status(201).json({ status: 'success', resource });
  } catch (err: any) {
    logger.error('Failed to add resource:', err);
    res.status(400).json({ status: 'error', message: err?.message || 'Failed to add resource' });
  }
};

export const updateResource = async (req: Request, res: Response) => {
  try {
    const existing = await prisma.studyResource.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ status: 'error', message: 'Resource not found' });
    const { actor } = await requireClassroomManager(req, existing.classroomId);
    if (actor.role === 'teacher' && existing.teacherId !== actor.id)
      return res
        .status(403)
        .json({ status: 'error', message: 'Teachers may only edit their own resources.' });
    const resource = await lmsDB.updateResource(req.params.id, req.body);
    if (!resource) {
      return res.status(404).json({ status: 'error', message: 'Resource not found' });
    }
    res.json({ status: 'success', resource });
  } catch (err) {
    logger.error('Failed to update resource:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const deleteResource = async (req: Request, res: Response) => {
  try {
    const existing = await prisma.studyResource.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ status: 'error', message: 'Resource not found' });
    const { actor } = await requireClassroomManager(req, existing.classroomId);
    if (actor.role === 'teacher' && existing.teacherId !== actor.id)
      return res
        .status(403)
        .json({ status: 'error', message: 'Teachers may only delete their own resources.' });
    const deleted = await lmsDB.deleteResource(req.params.id);
    if (!deleted) {
      return res.status(404).json({ status: 'error', message: 'Resource not found' });
    }
    res.json({ status: 'success', message: 'Resource deleted' });
  } catch (err) {
    logger.error('Failed to delete resource:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const getModules = async (req: Request, res: Response) => {
  try {
    const { classroomIds } = await getManageableClassroomIds(req);
    const modules = (await lmsDB.getModules()).filter((module) =>
      classroomIds.has(module.classroomId),
    );
    res.json({ status: 'success', modules });
  } catch (err) {
    logger.error('Failed to fetch modules:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const addModule = async (req: Request, res: Response) => {
  try {
    const { actor } = await requireClassroomManager(req, req.body.classroomId);
    const module = await lmsDB.addModule(req.body, actor.id);
    res.status(201).json({ status: 'success', module });
  } catch (err) {
    logger.error('Failed to add module:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const updateModule = async (req: Request, res: Response) => {
  try {
    const existing = await prisma.moduleItem.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ status: 'error', message: 'Module not found' });
    await requireClassroomManager(req, existing.classroomId);
    const module = await lmsDB.updateModule(req.params.id, req.body);
    if (!module) {
      return res.status(404).json({ status: 'error', message: 'Module not found' });
    }
    res.json({ status: 'success', module });
  } catch (err) {
    logger.error('Failed to update module:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const deleteModule = async (req: Request, res: Response) => {
  try {
    const existing = await prisma.moduleItem.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ status: 'error', message: 'Module not found' });
    await requireClassroomManager(req, existing.classroomId);
    const deleted = await lmsDB.deleteModule(req.params.id);
    if (!deleted) {
      return res.status(404).json({ status: 'error', message: 'Module not found' });
    }
    res.json({ status: 'success', message: 'Module deleted' });
  } catch (err) {
    logger.error('Failed to delete module:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const updateQuizMarksMode = async (req: Request, res: Response) => {
  try {
    await requireQuizManager(req, req.params.id);
    const { revealMarksMode } = req.body;
    const quiz = await lmsDB.updateQuizMarksMode(req.params.id, revealMarksMode);
    res.json({ status: 'success', quiz });
  } catch (err) {
    logger.error('Failed to update quiz marks mode:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const markAttendance = async (req: Request, res: Response) => {
  try {
    const { studentId, date, status, remarks } = req.body;
    const record = await lmsDB.markAttendance(studentId, date, status, remarks, req.user?.id);
    res.json({ status: 'success', attendance: record });
  } catch (err) {
    logger.error('Failed to mark attendance:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const updateStudentLocation = async (req: Request, res: Response) => {
  try {
    const { studentId, location, category, busNumber, notes } = req.body;

    if (!studentId || !location || !category) {
      return res
        .status(400)
        .json({ status: 'error', message: 'studentId, location, and category are required' });
    }
    if (!req.user)
      return res.status(401).json({ status: 'error', message: 'Authentication required.' });
    const actor = await prisma.user.findFirst({
      where: { id: req.user.id, isArchived: false },
    });
    if (!actor)
      return res.status(401).json({ status: 'error', message: 'Active account required.' });
    const student = await prisma.user.findFirst({
      where: {
        id: studentId,
        role: 'student',
        schoolId: actor.schoolId,
        isArchived: false,
        ...(actor.role === 'teacher'
          ? {
              enrollments: {
                some: {
                  isActive: true,
                  classroom: {
                    isArchived: false,
                    OR: [
                      { teacherId: actor.id },
                      {
                        teachingAssignments: {
                          some: { teacherId: actor.id, isActive: true },
                        },
                      },
                    ],
                  },
                },
              },
            }
          : {}),
      },
    });
    if (!student)
      return res
        .status(403)
        .json({ status: 'error', message: 'Student is not in your active classes.' });

    const updated = await lmsDB.updateStudentLocation(
      studentId,
      location,
      category,
      actor.id,
      busNumber,
      notes,
    );

    res.json({ status: 'success', location: updated });
  } catch (err) {
    logger.error('Failed to update location:', err);
    res.status(400).json({ status: 'error', message: (err as Error).message });
  }
};

export const generateQuizAi = async (req: Request, res: Response) => {
  const {
    topic,
    classroomId,
    questionCount = 5,
    defaultPoints = 5,
    questionTypes = ['MCQ', 'True/False'],
    resourceIds = [],
  } = req.body;

  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    const classroom = await prisma.classroom.findFirst({
      where: { id: classroomId, isArchived: false },
      include: { subjectRef: true, cohortRef: true },
    });
    if (!classroom) return res.status(404).json({ error: 'Active classroom not found.' });
    await requireClassroomManager(req, classroomId);
    const resources = await prisma.studyResource.findMany({
      where: { id: { in: resourceIds }, classroomId },
    });
    if (resources.length !== new Set(resourceIds).size)
      return res
        .status(400)
        .json({ error: 'Every selected resource must belong to the classroom.' });
    const subject = classroom.subjectRef.name;
    const gradeLevel = classroom.cohortRef.gradeLevel;
    const resourceTitles = resources.map((resource) => resource.title);
    const resourceDescriptions = resources.map(
      (resource) => resource.description || resource.title,
    );
    const resourceUrls = resources.map((resource) => resource.url);
    const resourceTypes = resources.map((resource) => resource.type);
    const resourceMimeTypes = resources.map((resource) => resource.mimeType || '');
    const ai = getAi();

    const resourceContext =
      resourceTitles.length > 0
        ? `\nStudy materials metadata (use this to anchor question wording):\n${resourceTitles
            .map((title: string, i: number) => {
              const desc = resourceDescriptions[i] ? `: ${resourceDescriptions[i]}` : '';
              const url = resourceUrls[i] ? ` (${resourceUrls[i]})` : '';
              const type = resourceTypes[i] ? ` [${resourceTypes[i]}]` : '';
              const mime = resourceMimeTypes[i] ? ` {${resourceMimeTypes[i]}}` : '';
              return `- ${title}${type}${url}${mime}${desc}`;
            })
            .join('\n')}`
        : '';

    if (!ai) return res.status(503).json({ error: 'The AI quiz generator is not configured.' });

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Generate a ${questionCount}-question quiz for Subject: ${subject}, Topic: "${topic}", Grade Level: ${gradeLevel}. Each question should be worth ${defaultPoints} marks. Allowed types: ${questionTypes.join(', ')}.${resourceContext}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  text: { type: Type.STRING },
                  type: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  points: { type: Type.NUMBER },
                },
                required: [
                  'id',
                  'text',
                  'type',
                  'options',
                  'correctAnswer',
                  'explanation',
                  'points',
                ],
              },
            },
          },
          required: ['title', 'questions'],
        },
        systemInstruction:
          'You are an expert Nepalese curriculum quiz designer. Generate structured, accurate quiz questions based on the CDC Nepal Curriculum standard and any provided study materials metadata. Only use the given metadata to anchor wording; do not invent specific facts that are not supported by the metadata.',
      },
    });

    let quizData: any;
    try {
      quizData = JSON.parse(response.text || '{}');
    } catch {
      return res.status(502).json({ error: 'The AI provider returned an invalid quiz.' });
    }

    if (quizData?.questions && Array.isArray(quizData.questions) && quizData.questions.length > 0) {
      quizData.questions = quizData.questions.map((q: any, i: number) => ({
        ...q,
        id: q.id || `q-${i + 1}`,
        points: q.points || defaultPoints,
      }));
    } else {
      return res.status(502).json({ error: 'The AI provider did not return quiz questions.' });
    }
    res.json({ quiz: quizData });
  } catch (error: any) {
    logger.error('Quiz Generator Error:', error);
    return res.status(502).json({ error: error.message || 'Failed to generate a quiz.' });
  }
};

export const askTeacherAssistantAi = async (req: Request, res: Response) => {
  try {
    const { task, context } = req.body;
    const ai = getAi();

    if (!ai) return res.status(503).json({ error: 'The teacher assistant is not configured.' });

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Task: ${task}\nContext: ${JSON.stringify(context)}`,
      config: {
        systemInstruction: `You are Sikshya AI Teacher Assistant for Nepalese schools. Help teachers quickly draft constructive assignment feedback, engaging classroom announcements, differentiated lesson plans, or parent notes. Keep tone professional, supportive, and clear.`,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    logger.error('Teacher Assistant Error:', error);
    res
      .status(500)
      .json({ error: error.message || 'Failed to generate teacher assistant response' });
  }
};
