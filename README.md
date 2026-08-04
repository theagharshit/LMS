# 🎓 Sikshya LMS - Next-Gen Learning Management System

**Sikshya LMS** is a modern, AI-powered Learning Management System tailored for schools in Nepal (Grades 1 to 12). It integrates real-time learning tools, student/teacher messaging, CDC Nepal Curriculum context, parent digests, and Google Gemini AI assistants.

---

## 🚀 Quick Start

### 1. Installation

```bash
# Clone repository & install dependencies
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
PORT=3001
GEMINI_API_KEY=your_google_gemini_api_key_here
NODE_ENV=development
LOG_LEVEL=normal
```

> **Note**: If `GEMINI_API_KEY` is omitted, AI endpoints will operate seamlessly in fallback demonstration mode.

---

## ⚡ Available NPM Commands

| Command | Environment | Log Level | Description |
| :--- | :--- | :--- | :--- |
| `npm run dev` | `development` | `normal` | Start dev server with concise, minimal status logging |
| `npm run dev:v` | `development` | `verbose` (`-v`) | Start dev server with **highly detailed** request/response & AI logs |
| `npm run build` | `production` | - | Build production bundle for frontend (Vite) and backend server (Esbuild) |
| `npm run prod` | `production` | `normal` | Run production build with concise status logging |
| `npm run prod:v` | `production` | `verbose` (`-v`) | Run production build with **highly detailed** logging |
| `npm start` | `production` | `normal` | Alias for `npm run prod` |
| `npm run lint` | - | - | Type-check TypeScript codebase without emitting files |
| `npm run clean` | - | - | Remove build artifacts (`dist/` folder) |

---

## 📊 Dual-Environment & Dual-Level Logging System

Sikshya LMS features an integrated logging architecture supporting **2 Environments** and **2 Logging Verbosity Modes**:

### 1. Environments
- **`development`**: Formatted console logging with colored HTTP status codes and interactive timing metrics.
- **`production`**: Structured log output optimized for production servers and log aggregators.

### 2. Log Modes
- **Normal Mode (`LOG_LEVEL=normal` / `npm run dev`)**:
  Provides concise, clean `[OK]` status lines without cluttering your console:
  ```text
  [OK] Server running on http://0.0.0.0:3001
  [OK] GET /api/health 200 - 4ms
  [OK] POST /api/ai/tutor 200 - 342ms
  ```

- **Verbose Mode (`LOG_LEVEL=verbose` / `npm run dev:v`)**:
  Provides **highly detailed** logging including:
  - Full HTTP timestamps & client IPs
  - Request headers & formatted JSON payloads
  - Execution duration breakdown (ms)
  - Stack traces for errors and AI model parameters
  ```text
  ------------------- HTTP REQUEST DETAILED LOG -------------------
  Timestamp : 2026-08-03T20:05:00.000Z
  Method    : POST
  URL       : /api/ai/tutor
  Status    : 200
  Duration  : 412ms
  Client IP : ::ffff:127.0.0.1
  Headers   : {"user-agent":"Mozilla/5.0...","content-type":"application/json"}
  Body      : {
    "prompt": "Explain Pythagoras Theorem",
    "subject": "Mathematics",
    "gradeLevel": "8"
  }
  -----------------------------------------------------------------
  ```

---

## 🤖 AI Endpoints & Features

Sikshya LMS integrates Google Gemini AI (`gemini-3.6-flash`) for school workflows:

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | System health check and API operational status |
| `/api/ai/tutor` | `POST` | Grade-specific AI tutor with step-by-step guidance |
| `/api/ai/homework-helper` | `POST` | Homework hint assistant without giving away direct answers |
| `/api/ai/quiz-generator` | `POST` | Structured CDC Nepal Curriculum quiz generator for teachers |
| `/api/ai/parent-summary` | `POST` | Bilingual (English & Nepali Devanagari) student progress summaries for parents |
| `/api/ai/teacher-assistant` | `POST` | Lesson plans, announcements, and grading feedback assistant |

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Lucide React, Recharts, TailwindCSS v4, Framer Motion
- **Backend**: Node.js, Express.js, `tsx`, Esbuild
- **AI SDK**: `@google/genai` (Gemini 3.6 Flash model)
- **Build Tooling**: Vite 6, TypeScript 5.8

---

## 📜 License

MIT License - Developed for Sikshya LMS.
