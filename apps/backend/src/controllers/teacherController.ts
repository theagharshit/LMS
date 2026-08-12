import { Request, Response } from 'express';
import { Type } from '@google/genai';
import { lmsDB } from '@db/lmsDatabase';
import { getAi } from '@utils/aiClient';
import { logger } from '@utils/logger';
import { broadcastAnnouncement } from '@utils/realtime';

export const addClassroom = async (req: Request, res: Response) => {
  try {
    const classroom = await lmsDB.addClassroom(req.body);
    res.json({ status: 'success', classroom });
  } catch (err) {
    logger.error('Failed to add classroom:', err);
    res.status(500).json({ status: 'error', message: 'Failed to add classroom' });
  }
};

export const addStreamPost = async (req: Request, res: Response) => {
  try {
    const post = await lmsDB.addStreamPost(req.body);
    broadcastAnnouncement(post);
    res.json({ status: 'success', post });
  } catch (err) {
    logger.error('Failed to add stream post:', err);
    res.status(500).json({ status: 'error', message: 'Failed to add stream post' });
  }
};

export const addPostComment = async (req: Request, res: Response) => {
  try {
    const comment = await lmsDB.addCommentToPost(req.params.id, req.body);
    res.json({ status: 'success', comment });
  } catch (err) {
    logger.error('Failed to add comment:', err);
    res.status(500).json({ status: 'error', message: 'Failed to add comment' });
  }
};

export const addAssignment = async (req: Request, res: Response) => {
  try {
    const assignment = await lmsDB.addAssignment(req.body);
    res.json({ status: 'success', assignment });
  } catch (err) {
    logger.error('Failed to create assignment:', err);
    res.status(500).json({ status: 'error', message: 'Failed to create assignment' });
  }
};

export const addQuiz = async (req: Request, res: Response) => {
  try {
    const quiz = await lmsDB.addQuiz(req.body);
    res.json({ status: 'success', quiz });
  } catch (err) {
    logger.error('Failed to create quiz:', err);
    res.status(500).json({ status: 'error', message: 'Failed to create quiz' });
  }
};

export const updateQuiz = async (req: Request, res: Response) => {
  try {
    const quiz = await lmsDB.updateQuiz(req.params.id, req.body);
    if (!quiz) {
      return res.status(404).json({ status: 'error', message: 'Quiz not found' });
    }
    res.json({ status: 'success', quiz });
  } catch (err) {
    logger.error('Failed to update quiz:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update quiz' });
  }
};

export const deleteQuiz = async (req: Request, res: Response) => {
  try {
    const deleted = await lmsDB.deleteQuiz(req.params.id);
    if (!deleted) {
      return res
        .status(400)
        .json({ status: 'error', message: 'Quiz not found or has student submissions' });
    }
    res.json({ status: 'success', message: 'Quiz deleted' });
  } catch (err) {
    logger.error('Failed to delete quiz:', err);
    res.status(500).json({ status: 'error', message: 'Failed to delete quiz' });
  }
};

export const startQuizLive = async (req: Request, res: Response) => {
  try {
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
    const { classroomId, teacherId } = req.query;
    let resources;
    if (classroomId && typeof classroomId === 'string') {
      resources = await lmsDB.getResourcesByClassroom(classroomId);
    } else if (teacherId && typeof teacherId === 'string') {
      resources = await lmsDB.getResourcesByTeacher(teacherId);
    } else {
      resources = await lmsDB.getResources();
    }
    res.json({ status: 'success', resources });
  } catch (err) {
    logger.error('Failed to fetch resources:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch resources' });
  }
};

export const addResource = async (req: Request, res: Response) => {
  try {
    const resource = await lmsDB.addResource(req.body);
    res.json({ status: 'success', resource });
  } catch (err) {
    logger.error('Failed to add resource:', err);
    res.status(500).json({ status: 'error', message: 'Failed to add resource' });
  }
};

export const updateResource = async (req: Request, res: Response) => {
  try {
    const resource = await lmsDB.updateResource(req.params.id, req.body);
    if (!resource) {
      return res.status(404).json({ status: 'error', message: 'Resource not found' });
    }
    res.json({ status: 'success', resource });
  } catch (err) {
    logger.error('Failed to update resource:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update resource' });
  }
};

export const deleteResource = async (req: Request, res: Response) => {
  try {
    const deleted = await lmsDB.deleteResource(req.params.id);
    if (!deleted) {
      return res.status(404).json({ status: 'error', message: 'Resource not found' });
    }
    res.json({ status: 'success', message: 'Resource deleted' });
  } catch (err) {
    logger.error('Failed to delete resource:', err);
    res.status(500).json({ status: 'error', message: 'Failed to delete resource' });
  }
};

export const getModules = async (req: Request, res: Response) => {
  try {
    const modules = await lmsDB.getModules();
    res.json({ status: 'success', modules });
  } catch (err) {
    logger.error('Failed to fetch modules:', err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch modules' });
  }
};

export const addModule = async (req: Request, res: Response) => {
  try {
    const module = await lmsDB.addModule(req.body);
    res.json({ status: 'success', module });
  } catch (err) {
    logger.error('Failed to add module:', err);
    res.status(500).json({ status: 'error', message: 'Failed to add module' });
  }
};

export const updateModule = async (req: Request, res: Response) => {
  try {
    const module = await lmsDB.updateModule(req.params.id, req.body);
    if (!module) {
      return res.status(404).json({ status: 'error', message: 'Module not found' });
    }
    res.json({ status: 'success', module });
  } catch (err) {
    logger.error('Failed to update module:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update module' });
  }
};

export const deleteModule = async (req: Request, res: Response) => {
  try {
    const deleted = await lmsDB.deleteModule(req.params.id);
    if (!deleted) {
      return res.status(404).json({ status: 'error', message: 'Module not found' });
    }
    res.json({ status: 'success', message: 'Module deleted' });
  } catch (err) {
    logger.error('Failed to delete module:', err);
    res.status(500).json({ status: 'error', message: 'Failed to delete module' });
  }
};

export const updateQuizMarksMode = async (req: Request, res: Response) => {
  try {
    const { revealMarksMode } = req.body;
    const quiz = await lmsDB.updateQuizMarksMode(req.params.id, revealMarksMode);
    res.json({ status: 'success', quiz });
  } catch (err) {
    logger.error('Failed to update quiz marks mode:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update quiz marks mode' });
  }
};

export const markAttendance = async (req: Request, res: Response) => {
  try {
    const { studentId, studentName, date, status, remarks } = req.body;
    const record = await lmsDB.markAttendance(
      studentId,
      studentName,
      date,
      status,
      remarks,
      req.user?.id,
    );
    res.json({ status: 'success', attendance: record });
  } catch (err) {
    logger.error('Failed to mark attendance:', err);
    res.status(500).json({ status: 'error', message: 'Failed to mark attendance' });
  }
};

export const updateStudentLocation = async (req: Request, res: Response) => {
  try {
    const {
      studentId,
      studentName,
      location,
      category,
      updatedBy,
      updatedByRole,
      busNumber,
      notes,
    } = req.body;

    if (!studentId || !location || !category) {
      return res
        .status(400)
        .json({ status: 'error', message: 'studentId, location, and category are required' });
    }

    const updated = await lmsDB.updateStudentLocation(
      studentId,
      studentName || 'Student',
      location,
      category,
      updatedBy || 'School Staff',
      updatedByRole || 'teacher',
      busNumber,
      notes,
    );

    res.json({ status: 'success', location: updated });
  } catch (err) {
    logger.error('Failed to update location:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update location' });
  }
};

export const generateQuizAi = async (req: Request, res: Response) => {
  try {
    const {
      topic,
      subject,
      gradeLevel,
      questionCount = 5,
      defaultPoints = 5,
      questionTypes = ['MCQ', 'True/False'],
      resourceTitles = [],
      resourceDescriptions = [],
      resourceUrls = [],
      resourceTypes = [],
      resourceMimeTypes = [],
    } = req.body;
    const ai = getAi();

    const generateFallbackQuiz = () => {
      const safeLen = resourceTitles.length || resourceDescriptions.length || resourceUrls.length || 0;
      const minQuestions = Math.min(questionCount, 50);

      return {
        title: `${topic} Assessment (${subject})`,
        questions: Array.from({ length: minQuestions }).map((_, i) => {
          const type: string = i % 2 === 0 ? 'MCQ' : 'True/False';
          const options =
            i % 2 === 0 ? ['Option A', 'Option B', 'Option C', 'Option D'] : ['True', 'False'];
          const correctAnswer = i % 2 === 0 ? 'Option A' : 'True';

          const refIndex = safeLen > 0 ? i % safeLen : 0;
          const refTitle = safeLen > 0 ? resourceTitles[refIndex] : undefined;
          const refDesc = safeLen > 0 ? resourceDescriptions[refIndex] : undefined;
          const refUrl = safeLen > 0 ? resourceUrls[refIndex] : undefined;
          const refType = safeLen > 0 ? resourceTypes[refIndex] : undefined;

          const refLine = refTitle
            ? `Based on ${refTitle}${refType ? ` (${refType})` : ''}${refUrl ? ` (${refUrl})` : ''}.`
            : 'Based on the provided study materials.';

          const explanation = refDesc
            ? `${refLine} Focus the question on: ${refDesc}`
            : `${refLine} Reference the provided materials or chapter notes.`;

          return {
            id: `q-${i + 1}`,
            text: `Sample question ${i + 1} regarding ${topic} for Grade ${gradeLevel}`,
            type,
            options,
            correctAnswer,
            explanation,
            points: defaultPoints,
          };
        }),
      };
    };

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

    if (!ai) {
      return res.json({ quiz: generateFallbackQuiz(), fallback: true });
    }

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
                required: ['id', 'text', 'type', 'options', 'correctAnswer', 'explanation', 'points'],
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
      return res.json({ quiz: generateFallbackQuiz(), fallback: true });
    }

    if (quizData?.questions && Array.isArray(quizData.questions) && quizData.questions.length > 0) {
      quizData.questions = quizData.questions.map((q: any, i: number) => ({
        ...q,
        id: q.id || `q-${i + 1}`,
        points: q.points || defaultPoints,
      }));
    } else {
      return res.json({ quiz: generateFallbackQuiz(), fallback: true });
    }
    res.json({ quiz: quizData });
  } catch (error: any) {
    logger.error('Quiz Generator Error:', error);
    // Deterministic fallback: avoid silently breaking the teacher flow.
    return res.json({ quiz: generateFallbackQuiz(), fallback: true });
  }
};

export const askTeacherAssistantAi = async (req: Request, res: Response) => {
  try {
    const { task, context } = req.body;
    const ai = getAi();

    if (!ai) {
      return res.json({
        text: `[Teacher Assistant Draft]\nRegarding ${task}: ${JSON.stringify(context)}\nDrafted recommendation for lesson planning and assignment feedback.`,
        fallback: true,
      });
    }

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
