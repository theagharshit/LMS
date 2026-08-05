# 🧪 Sikshya LMS - Production-Grade Test Suite Architecture

This directory contains the automated testing suite for **Sikshya LMS**, powered by **Vitest**, **React Testing Library**, **jsdom**, and **Supertest**.

---

## 🏗️ Directory Architecture

```text
tests/
├── README.md                           # Master test suite guide
├── setup.ts                            # Vitest + jsdom + jest-dom global setup
├── unit/                               # Isolated unit tests for utility & data modules
│   ├── logger.test.ts                  # src/utils/logger.ts
│   ├── fileStorageDB.test.ts           # src/db/fileStorageDB.ts
│   ├── fileMiddleware.test.ts          # src/middlewares/fileMiddleware.ts
│   └── mockData.test.ts                # src/data/mockData.ts
├── context/                            # React Context state provider tests
│   └── AppContext.test.tsx             # src/context/AppContext.tsx
├── api/                                # Express backend HTTP endpoint tests
│   └── server.test.ts                  # server.ts
├── components/                         # UI component rendering & interaction tests
│   ├── App.test.tsx                    # src/App.tsx
│   ├── common/                         # Shared widgets (Header, Sidebar, Messages, Calendar)
│   ├── student/                        # Student Portal components & AI Tutor
│   ├── teacher/                        # Teacher Portal components & Attendance
│   └── parent/                         # Parent Portal components & Controls
└── roles/                              # 4-Role End-to-End permission & workflow suites
    ├── student.test.ts                 # Role 1: Student actions & classroom stream
    ├── teacher.test.ts                 # Role 2: Teacher actions & homework queue
    ├── parent.test.ts                  # Role 3: Parent actions & bilingual digest
    └── admin.test.ts                   # Role 4: Admin actions & FileStorageDB audit
```

---

## ⚡ Running Tests

```bash
# Run all test suites once
npm test

# Run tests in watch mode
npm run test:watch

# Run 4-role specific test suites
npm run test:roles

# Run test coverage report
npm run test:coverage
```

---

## 🎯 4 User Roles Standards

Every feature in Sikshya LMS must enforce role-based access controls:
1. **Student (`student.test.ts`)**: Homework submission, classroom stream participation, AI tutor assistance, taking online quizzes.
2. **Teacher (`teacher.test.ts`)**: Homework grading queue, attendance marking, timetable management, AI quiz creation.
3. **Parent (`parent.test.ts`)**: Child performance digests, bilingual AI summary, parental controls.
4. **Admin (`admin.test.ts`)**: System configuration, role authorizations, `FileStorageDB` asset auditing.

---

## ➕ Adding Tests for New Features

When adding new features:
1. **Components**: Create a corresponding test file in `tests/components/<role>/<ComponentName>.test.tsx`.
2. **Backend Routes**: Add HTTP assertions to `tests/api/server.test.ts`.
3. **Role Workflows**: Add role permission checks into `tests/roles/<role>.test.ts`.
