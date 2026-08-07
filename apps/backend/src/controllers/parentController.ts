import { Request, Response } from 'express';
import { Type } from '@google/genai';
import { lmsDB } from '@db/lmsDatabase';
import { getAi } from '@utils/aiClient';
import { logger } from '@utils/logger';

export const updateParentControls = async (req: Request, res: Response) => {
  try {
    const { studentId, settings } = req.body;
    const updated = await lmsDB.updateParentControls(studentId, settings);
    res.json({ status: 'success', parentControls: updated });
  } catch (err) {
    logger.error('Failed to update parent controls:', err);
    res.status(500).json({ status: 'error', message: 'Failed to update parent controls' });
  }
};

export const sendDirectMessage = async (req: Request, res: Response) => {
  try {
    const msg = await lmsDB.addDirectMessage(req.body);
    res.json({ status: 'success', message: msg });
  } catch (err) {
    logger.error('Failed to send message:', err);
    res.status(500).json({ status: 'error', message: 'Failed to send message' });
  }
};

export const generateParentSummaryAi = async (req: Request, res: Response) => {
  try {
    const {
      studentName,
      gradeLevel,
      attendanceRate,
      recentGrades,
      pendingHomeworkCount,
      teacherNotes,
      language = 'English & Nepali',
    } = req.body;
    const ai = getAi();

    if (!ai) {
      return res.json({
        summary: `Weekly Digest for ${studentName} (Grade ${gradeLevel}):\n• Attendance: ${attendanceRate}%\n• Pending Homework: ${pendingHomeworkCount} item(s)\n• Overall Grade Status: ${recentGrades || 'Good progress'}\n• Teacher Note: ${teacherNotes || 'Consistently attentive in class.'}`,
        nepaliSummary: `${studentName} को साप्ताहिकी प्रगति विवरण तयार छ। उपस्थिती: ${attendanceRate}%`,
        fallback: true,
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Summarize student academic & attendance progress for Parent Dashboard.
Student: ${studentName}, Grade: ${gradeLevel}
Attendance: ${attendanceRate}%
Recent Grades: ${JSON.stringify(recentGrades)}
Pending Homework: ${pendingHomeworkCount}
Teacher Notes: ${teacherNotes}
Language: ${language}`,
      config: {
        systemInstruction: `You are an AI Parent Communication Assistant for Nepalese Schools. Create a heartwarming, clear, actionable summary for parents in both English and polite Nepali (Devanagari script). Highlight achievements, note pending homework, and give 2 clear action points for parents at home.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            englishSummary: { type: Type.STRING },
            nepaliSummary: { type: Type.STRING },
            highlights: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            actionPointsForParents: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['englishSummary', 'nepaliSummary', 'highlights', 'actionPointsForParents'],
        },
      },
    });

    const summaryData = JSON.parse(response.text || '{}');
    res.json(summaryData);
  } catch (error: any) {
    logger.error('Parent Summary Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate parent summary' });
  }
};
