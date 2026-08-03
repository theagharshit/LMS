import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { logger } from "./src/utils/logger";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3001;

  // HTTP Request Logging Middleware
  app.use(logger.httpMiddleware());

  app.use(express.json({ limit: "10mb" }));

  // Initialize Gemini AI SDK lazily / safely
  const getAi = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.warn("GEMINI_API_KEY is not set. AI features will operate in fallback mode.");
      return null;
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", message: "Sikshya LMS API Operational", timestamp: new Date().toISOString() });
  });

  // AI Tutor Route
  app.post("/api/ai/tutor", async (req, res) => {
    try {
      const { prompt, subject, gradeLevel, language = "English/Nepali" } = req.body;
      const ai = getAi();
      
      if (!ai) {
        return res.json({
          text: `[Sikshya AI Tutor Mode]\nHere is guidance on "${prompt}" for Grade ${gradeLevel} ${subject}:\n1. Review key concepts in your textbook.\n2. Work through example problems step-by-step.\n3. Ask your teacher during class discussion or message them in Sikshya LMS!`,
          fallback: true
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          systemInstruction: `You are Sikshya AI, a friendly, encouraging, and highly knowledgeable AI Tutor for students in Nepalese schools (Grades 1 to 12). 
Subject context: ${subject || 'General'}.
Grade level: Grade ${gradeLevel || '7'}.
Language preference: ${language}.
Provide step-by-step explanations, helpful hints, and encouraging feedback suitable for school students. Include Nepalese cultural/curricular context where appropriate (e.g. CDC Nepal Curriculum standard, National Examination Board concepts). Do NOT give direct final answers to graded homework questions directly without guiding steps. Use Markdown formatting with clean headings and bullet points.`,
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("AI Tutor Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI tutor response" });
    }
  });

  // AI Homework Helper
  app.post("/api/ai/homework-helper", async (req, res) => {
    try {
      const { assignmentTitle, assignmentDescription, questionText, gradeLevel } = req.body;
      const ai = getAi();

      if (!ai) {
        return res.json({
          text: `Key Steps to Solve "${assignmentTitle}":\n1. Identify the core principles involved.\n2. Note down given facts and what needs to be calculated or written.\n3. Break down into 2-3 manageable steps.`,
          fallback: true
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Assignment: ${assignmentTitle}\nDescription: ${assignmentDescription}\nStudent's Query: ${questionText}`,
        config: {
          systemInstruction: `You are an AI Homework Helper for Grade ${gradeLevel || '8'} students in Nepal. Break down concepts into simple, understandable learning steps with helpful analogies and guidance without writing the full final essay/homework for them. Encourage critical thinking.`
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Homework Helper Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate homework assistance" });
    }
  });

  // AI Quiz Generator for Teachers
  app.post("/api/ai/quiz-generator", async (req, res) => {
    try {
      const { topic, subject, gradeLevel, questionCount = 5, questionTypes = ["MCQ", "True/False"] } = req.body;
      const ai = getAi();

      if (!ai) {
        // Fallback generator
        return res.json({
          quiz: {
            title: `${topic} Assessment (${subject})`,
            questions: Array.from({ length: Math.min(questionCount, 5) }).map((_, i) => ({
              id: `q-${i + 1}`,
              text: `Sample question ${i + 1} regarding ${topic} for Grade ${gradeLevel}`,
              type: i % 2 === 0 ? "MCQ" : "True/False",
              options: i % 2 === 0 ? ["Option A", "Option B", "Option C", "Option D"] : ["True", "False"],
              correctAnswer: i % 2 === 0 ? "Option A" : "True",
              explanation: "Reference your chapter notes for explanation."
            }))
          },
          fallback: true
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Generate a ${questionCount}-question quiz for Subject: ${subject}, Topic: "${topic}", Grade Level: ${gradeLevel}. Allowed types: ${questionTypes.join(", ")}.`,
        config: {
          responseMimeType: "application/json",
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
                      items: { type: Type.STRING }
                    },
                    correctAnswer: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                  },
                  required: ["id", "text", "type", "options", "correctAnswer", "explanation"]
                }
              }
            },
            required: ["title", "questions"]
          },
          systemInstruction: "You are an expert Nepalese curriculum quiz designer. Generate structured, accurate quiz questions based on the CDC Nepal Curriculum standard."
        }
      });

      const quizData = JSON.parse(response.text || "{}");
      res.json({ quiz: quizData });
    } catch (error: any) {
      console.error("Quiz Generator Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate quiz" });
    }
  });

  // AI Parent Summary Generator
  app.post("/api/ai/parent-summary", async (req, res) => {
    try {
      const { studentName, gradeLevel, attendanceRate, recentGrades, pendingHomeworkCount, teacherNotes, language = "English & Nepali" } = req.body;
      const ai = getAi();

      if (!ai) {
        return res.json({
          summary: `Weekly Digest for ${studentName} (Grade ${gradeLevel}):\n• Attendance: ${attendanceRate}%\n• Pending Homework: ${pendingHomeworkCount} item(s)\n• Overall Grade Status: ${recentGrades || 'Good progress'}\n• Teacher Note: ${teacherNotes || 'Consistently attentive in class.'}`,
          nepaliSummary: `${studentName} को साप्ताहिकी प्रगति विवरण तयार छ। उपस्थिती: ${attendanceRate}%`,
          fallback: true
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Summarize student academic & attendance progress for Parent Dashboard.
Student: ${studentName}, Grade: ${gradeLevel}
Attendance: ${attendanceRate}%
Recent Grades: ${JSON.stringify(recentGrades)}
Pending Homework: ${pendingHomeworkCount}
Teacher Notes: ${teacherNotes}
Language: ${language}`,
        config: {
          systemInstruction: `You are an AI Parent Communication Assistant for Nepalese Schools. Create a heartwarming, clear, actionable summary for parents in both English and polite Nepali (Devanagari script). Highlight achievements, note pending homework, and give 2 clear action points for parents at home.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              englishSummary: { type: Type.STRING },
              nepaliSummary: { type: Type.STRING },
              highlights: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              actionPointsForParents: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["englishSummary", "nepaliSummary", "highlights", "actionPointsForParents"]
          }
        }
      });

      const summaryData = JSON.parse(response.text || "{}");
      res.json(summaryData);
    } catch (error: any) {
      console.error("Parent Summary Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate parent summary" });
    }
  });

  // AI Teacher Assistant
  app.post("/api/ai/teacher-assistant", async (req, res) => {
    try {
      const { task, context } = req.body; // e.g. task: "write_announcement" | "grade_feedback" | "lesson_plan"
      const ai = getAi();

      if (!ai) {
        return res.json({
          text: `[Teacher Assistant Draft]\nRegarding ${task}: ${JSON.stringify(context)}\nDrafted recommendation for lesson planning and assignment feedback.`,
          fallback: true
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Task: ${task}\nContext: ${JSON.stringify(context)}`,
        config: {
          systemInstruction: `You are Sikshya AI Teacher Assistant for Nepalese schools. Help teachers quickly draft constructive assignment feedback, engaging classroom announcements, differentiated lesson plans, or parent notes. Keep tone professional, supportive, and clear.`
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Teacher Assistant Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate teacher assistant response" });
    }
  });

  // Vite or Production Static Setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`Server running on http://0.0.0.0:${PORT}`);
    logger.info(`Environment: ${logger.getEnvironment()} | Log Level: ${logger.getLogLevel()}`);
  });
}

startServer();
