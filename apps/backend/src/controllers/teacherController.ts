import { Request, Response } from 'express';
import { Type } from '@google/genai';
import { lmsDB } from '@db/lmsDatabase';
import { getAi } from '@utils/aiClient';
import { logger } from '@utils/logger';

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

export const markAttendance = async (req: Request, res: Response) => {
  try {
    const { studentId, studentName, date, status, remarks } = req.body;
    const record = await lmsDB.markAttendance(studentId, studentName, date, status, remarks);
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
      questionTypes = ['MCQ', 'True/False'],
    } = req.body;
    const ai = getAi();

    if (!ai) {
      return res.json({
        quiz: {
          title: `${topic} Assessment (${subject})`,
          questions: Array.from({ length: Math.min(questionCount, 5) }).map((_, i) => ({
            id: `q-${i + 1}`,
            text: `Sample question ${i + 1} regarding ${topic} for Grade ${gradeLevel}`,
            type: i % 2 === 0 ? 'MCQ' : 'True/False',
            options:
              i % 2 === 0 ? ['Option A', 'Option B', 'Option C', 'Option D'] : ['True', 'False'],
            correctAnswer: i % 2 === 0 ? 'Option A' : 'True',
            explanation: 'Reference your chapter notes for explanation.',
          })),
        },
        fallback: true,
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Generate a ${questionCount}-question quiz for Subject: ${subject}, Topic: "${topic}", Grade Level: ${gradeLevel}. Allowed types: ${questionTypes.join(', ')}.`,
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
                },
                required: ['id', 'text', 'type', 'options', 'correctAnswer', 'explanation'],
              },
            },
          },
          required: ['title', 'questions'],
        },
        systemInstruction:
          'You are an expert Nepalese curriculum quiz designer. Generate structured, accurate quiz questions based on the CDC Nepal Curriculum standard.',
      },
    });

    const quizData = JSON.parse(response.text || '{}');
    res.json({ quiz: quizData });
  } catch (error: any) {
    logger.error('Quiz Generator Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate quiz' });
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
