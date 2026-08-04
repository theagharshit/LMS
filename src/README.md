# 📁 `src/` Directory Overview

This is the primary source directory for the **Sikshya LMS** application codebase.

---

## 📂 Subdirectories

- **[`components/`](./components/README.md)**: Contains all UI components organized by user role (`common/`, `parent/`, `student/`, `teacher/`).
- **[`context/`](./context/README.md)**: Holds global React Context (`AppContext.tsx`) managing application-wide state.
- **[`data/`](./data/README.md)**: Mock datasets and seed records for Nepal CDC Curriculum classrooms, students, teachers, and homework.
- **[`db/`](./db/README.md)**: Dedicated database engines (such as `fileStorageDB.ts`) for server-side persistence.
- **[`middlewares/`](./middlewares/README.md)**: Express backend middleware modules (such as `fileMiddleware.ts`) for request processing and security.
- **[`utils/`](./utils/README.md)**: Helper utilities and logging abstractions (`logger.ts`).

---

## 📄 Root Files in `src/`

- **`App.tsx`**: Main application component routing views (Student, Teacher, Parent) based on active tab and modal states.
- **`main.tsx`**: Entry point bootstrapping React 19 root and wrapping the application with `AppProvider`.
- **`index.css`**: Global design system CSS containing natural Earth tones, glassmorphism tokens, and custom scrollbars.
- **`types.ts`**: Core TypeScript interface and type definitions used across the entire system.
