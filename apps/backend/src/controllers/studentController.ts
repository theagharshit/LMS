import { Request, Response } from 'express';
import { lmsDB } from '@db/lmsDatabase';
import { getAi } from '@utils/aiClient';
import { logger } from '@utils/logger';

export const submitHomework = async (req: Request, res: Response) => {
  try {
    const { assignmentId, fileName, fileUrl, studentId, notes } = req.body;
    const sub = await lmsDB.submitHomework(assignmentId, fileName, fileUrl, studentId, notes);
    res.json({ status: 'success', submission: sub });
  } catch (err) {
    logger.error('Failed to submit homework:', err);
    res.status(500).json({ status: 'error', message: 'Failed to submit homework' });
  }
};

export const submitQuiz = async (req: Request, res: Response) => {
  try {
    const sub = await lmsDB.submitQuiz(req.body);
    res.json({ status: 'success', quizSubmission: sub });
  } catch (err) {
    logger.error('Failed to submit quiz:', err);
    res.status(500).json({ status: 'error', message: 'Failed to submit quiz' });
  }
};

export const getStudentLocation = async (req: Request, res: Response) => {
  const record = await lmsDB.getStudentLocationById(req.params.studentId);
  if (!record) {
    return res
      .status(404)
      .json({ status: 'error', message: 'Student location record not found' });
  }
  res.json({ status: 'success', location: record });
};

export const askAiTutor = async (req: Request, res: Response) => {
  try {
    const { prompt, subject, gradeLevel, language = 'English/Nepali' } = req.body;
    const ai = getAi();

    if (!ai) {
      return res.json({
        text: `[Sikshya AI Tutor Mode]\nHere is guidance on "${prompt}" for Grade ${gradeLevel} ${subject}:\n1. Review key concepts in your textbook.\n2. Work through example problems step-by-step.\n3. Ask your teacher during class discussion or message them in Sikshya LMS!`,
        fallback: true,
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        systemInstruction: `You are Sikshya AI, a friendly, encouraging, and highly knowledgeable AI Tutor for students in Nepalese schools (Grades 1 to 12). 
Subject context: ${subject || 'General'}.
Grade level: Grade ${gradeLevel || '7'}.
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
    const { assignmentTitle, assignmentDescription, questionText, gradeLevel } = req.body;
    const ai = getAi();

    if (!ai) {
      return res.json({
        text: `Key Steps to Solve "${assignmentTitle}":\n1. Identify the core principles involved.\n2. Note down given facts and what needs to be calculated or written.\n3. Break down into 2-3 manageable steps.`,
        fallback: true,
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Assignment: ${assignmentTitle}\nDescription: ${assignmentDescription}\nStudent's Query: ${questionText}`,
      config: {
        systemInstruction: `You are an AI Homework Helper for Grade ${gradeLevel || '8'} students in Nepal. Break down concepts into simple, understandable learning steps with helpful analogies and guidance without writing the full final essay/homework for them. Encourage critical thinking.`,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    logger.error('Homework Helper Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate homework assistance' });
  }
};
