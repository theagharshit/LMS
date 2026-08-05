# 🗄️ `src/db/` Directory Overview

This directory contains the core database storage engines and persistent JSON file database for the Sikshya LMS platform.

---

## 📄 Files in `src/db/`

- **`lmsDatabase.ts`**: Core database persistence engine managing domain entities (users, classrooms, stream posts, homework submissions, quizzes, attendance, parental controls, student real-time locations). Automatically syncs state changes to disk (`data_store.json`).
- **`fileStorageDB.ts`**: Dedicated file database engine responsible for indexing, verifying, and tracking uploaded PDF files and attachments.
- **`data_store.json`**: Local disk JSON file store persisting database state across server restarts.
