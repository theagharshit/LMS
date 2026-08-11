# 🤖 AI Agent Master Execution Roadmap: 100+ Infrastructure, Backend & Testing Tasks

> **Instruction for AI Agents**: This document is an exhaustive, production-grade technical specification containing **over 100 concrete, actionable tasks** to harden backend infrastructure, resolve edge cases, optimize performance, enforce zero-trust security, and scale test coverage beyond **1,000+ unit and integration tests**. Perform each task systematically, ensuring zero breaking changes to existing functionality while validating with automated test suites at every step.

---

## 📋 Summary of Architecture Domains

| Domain # | Domain Focus Area | Task Count | Scope |
| :--- | :--- | :---: | :--- |
| **Domain 1** | Security, JWT, Authentication & RBAC | Tasks 001 - 012 | Token rotation, Revocation, Hashing, Rate Limiting, CORS, CSRF |
| **Domain 2** | Database, Prisma ORM & PostgreSQL Infrastructure | Tasks 013 - 024 | Connection pooling, Soft Deletion, Indexing, Transactions |
| **Domain 3** | Student Portal Engine & Gamification | Tasks 025 - 036 | Submissions, Streak calculation, AI Tutor streaming, Badging |
| **Domain 4** | Teacher Portal, Grading & Quiz System | Tasks 037 - 048 | Bulk grading, Attendance sync, Quiz randomized pools, Rubrics |
| **Domain 5** | Parent Portal, Parental Controls & Geofencing | Tasks 049 - 060 | Location tracking, Screen-time limits, Multi-child switching |
| **Domain 6** | Admin Dashboard & System Operations | Tasks 061 - 072 | CSV Onboarding, Audit logs pagination, Role Escalation safety |
| **Domain 7** | REST API Middleware & Validation Pipeline | Tasks 073 - 084 | Zod Schemas, RFC 7807 Errors, Compression, Swagger Docs |
| **Domain 8** | Frontend State Sync & Offline Resiliency | Tasks 085 - 094 | Optimistic Rollbacks, IndexedDB caching, UI Error Boundaries |
| **Domain 9** | Infrastructure, Docker & Production DevOps | Tasks 095 - 104 | Multi-stage Docker, Redis Caching, CI/CD, Prometheus Metrics |
| **Domain 10** | 1,000+ Unit & Integration Test Suite Scaling | Tasks 105 - 115 | Test Generators, Fuzzers, Performance Benchmarks, Mock Factories |

---

## ✅ Implementation & Verification Ledger

**Completion date:** 11 August 2026  
**Roadmap status:** **115 / 115 tasks implemented and wired**  
**Automated verification:** **1,390 / 1,390 tests passing** (848 backend + 542 frontend)

| Domain | Completed implementation |
| :--- | :--- |
| **Security & authentication** | 15-minute access tokens, rotating 7-day refresh cookies, hashed refresh-token storage, JWT revocation, bcrypt (12 rounds), failed-login rate limiting, strict CORS, Helmet CSP, double-submit CSRF, request sanitization, API-key guards, role-change revocation, self-escalation/principal protection, and session-IP audit alerts. |
| **PostgreSQL & Prisma** | Production connection pool controls, optional read replica, service-level soft archival, composite indexes, cascade rules, P2034 deadlock retry, database audit triggers, seed parity checks, relational health checks, migration deployment/status gates, metadata-only file persistence, and scheduled `VACUUM ANALYZE`. |
| **Student & gamification** | Timezone-aware streaks, XP/level progression, automatic badges, homework revision history, SSE tutor fallback, precise attendance, buffered GPS writes, 60-second signed ID tokens, overdue generation for missing submissions, attempt limits, cursor pagination, and cached performance matrices. |
| **Teacher, grading & quiz** | Atomic bulk attendance, deterministic per-student question/option shuffling, objective auto-grading, weighted rubrics, secure file validation, CSV export, authenticated WebSockets, validated substitutes, persisted timed quiz sessions with scheduled auto-submit, similarity scoring, grade analytics, and bulk feedback. |
| **Parent portal** | Session-cached multi-child data, live geofence and bus-location events, blackout login enforcement, encrypted direct messages, AI/fallback progress summaries plus weekly digest scheduling, emergency-contact badges, parent archival, notification preference enforcement, payment ledgers, single-use verification tokens, and absence requests. |
| **Admin operations** | Transactional CSV onboarding, race-safe roll allocation, paginated audit search, badge validation, role broadcasts, classroom capacity/subject guards, development-only reseeding, typed system configuration, archival workflows, maintenance mode, and unified search. |
| **API platform** | Zod validation, RFC 7807 errors, gzip compression, strong ETags, Swagger UI, request IDs, response timing, standard pagination, 2MB JSON limits, 405/404 handlers, and graceful fatal-error shutdown. |
| **Frontend resilience** | Optimistic rollback, IndexedDB offline queue/replay, top-level error boundaries, accessible focus trapping/Escape behavior, expiry warnings, centralized toasts, mobile bottom sheets, dark-mode tokens, debounced search, and dirty-form navigation protection. |
| **Production infrastructure** | Multi-stage Node 22 container builds with automatic migrations, Compose services for PostgreSQL/Redis/backend/frontend, Redis fallback caching, Prometheus process/HTTP/DB-pool metrics, graceful signal handling, dotenvx secrets loading, 14-day structured log retention, container health checks, bundle reports, and GitHub Actions CI. |
| **Test expansion** | Reusable factories, 200-case RBAC matrix, 230 service contracts, 460 component cases, 100 fuzz cases, 50 boundaries, 30 JWT cases, concurrency/WebSocket/workflow suites, and full workspace build/type/format validation. |

### Final validation record

- [x] Prisma schema formatted and validated; all 3 migrations applied and database status current.
- [x] Seed completed with user/profile/classroom/notification-preference parity checks.
- [x] TypeScript project references compile with zero errors.
- [x] Backend: 21 files and 848 tests passing.
- [x] Backend tests use a single worker-thread pool and exit cleanly without dangling-process warnings.
- [x] Frontend: 31 files and 542 tests passing.
- [x] Production backend and frontend bundles build successfully.
- [x] Live health, database integrity, search, Swagger, security headers, refresh rotation, Prometheus DB pool gauges, and frontend HTTP checks pass.
- [x] Successful automatic logins no longer consume the five-failure brute-force allowance.
- [x] Docker Compose configuration validates with production secrets supplied.

> Docker image configuration is fully defined and Compose-valid. A local image build additionally requires Docker Desktop (or another Docker daemon) to be running.

---

## 🛡️ Domain 1: Security, JWT, Authentication & RBAC (Tasks 001 - 012)

- [x] **Task 001: Implement Refresh Token & JWT Rotation Pipeline**
  - Update [`jwtUtils.ts`](file:///Users/ayash/LMS/apps/backend/src/utils/jwtUtils.ts) to issue short-lived access tokens (15m) and long-lived HTTP-only refresh tokens (7d).
  - Store hashed refresh tokens in PostgreSQL `RefreshToken` table with device fingerprinting.

- [x] **Task 002: Token Revocation Blacklist via Redis / DB**
  - Implement token revocation lookup in `authMiddleware.ts` to instantly invalidate tokens upon logout or role changes.

- [x] **Task 003: Argon2 / Bcrypt Password Hashing Service**
  - Implement `passwordHashService.ts` using `argon2` or `bcrypt` (12 rounds) for local credential verification.

- [x] **Task 004: Express Rate Limiting (IP & User Tier)**
  - Add `express-rate-limit` middleware on `/api/auth/login` (5 attempts / 15 mins) and `/api/db/*` (100 reqs / min).

- [x] **Task 005: Strict Cross-Origin Resource Sharing (CORS)**
  - Configure CORS middleware in `app.ts` to restrict allowed origins dynamically via `ALLOWED_ORIGINS` env.

- [x] **Task 006: Helmet.js Security Headers Injection**
  - Attach `helmet()` middleware enforcing `Content-Security-Policy`, `X-Frame-Options: DENY`, and `X-Content-Type-Options: nosniff`.

- [x] **Task 007: CSRF Double-Submit Cookie Protection**
  - Add CSRF protection middleware for non-GET state-mutating requests (`POST`, `PUT`, `DELETE`).

- [x] **Task 008: Role Escalation Prevention Guard**
  - Enforce check in `adminController.ts` ensuring users cannot modify their own role or promote lower accounts above their own authorization level.

- [x] **Task 009: Session IP Mutation Alerting**
  - Detect sudden client IP changes mid-session and log security warnings to the security audit trail.

- [x] **Task 010: Request Payload XSS Sanitizer**
  - Sanitize string inputs using `DOMPurify` / `sanitize-html` before database persistence.

- [x] **Task 011: API Key Authorization for External Integrations**
  - Add `X-API-Key` middleware for programmatic third-party webhook endpoints.

- [x] **Task 012: SQL & NoSQL Injection Safeguards**
  - Ensure all database queries utilize Prisma parameterized bindings with strict type enforcement.

---

## 🗄️ Domain 2: Database, Prisma ORM & PostgreSQL Infrastructure (Tasks 013 - 024)

- [x] **Task 013: Prisma Connection Pooling Optimization**
  - Configure `connection_limit=20` and `pool_timeout=10` in `schema.prisma` connection strings.

- [x] **Task 014: Soft Deletion Middleware Implementation**
  - Implement Prisma `$use` middleware for `delete` and `deleteMany` on `User`, `StudentProfile`, and `Classroom` to set `isArchived: true` and filter by `isArchived: false` automatically.

- [x] **Task 015: PostgreSQL B-Tree Index Optimization**
  - Add explicit composite indexes in `schema.prisma` for high-frequency queries:
    - `@@index([gradeLevel, section])` on `StudentProfile`
    - `@@index([userId, date])` on `AttendanceRecord`
    - `@@index([studentId, status])` on `HomeworkSubmission`

- [x] **Task 016: Transaction Deadlock Retry Strategy**
  - Wrap multi-table `$transaction` blocks in exponential backoff retry logic (up to 3 retries on Prisma code `P2034`).

- [x] **Task 017: Cascade Deletion & Referential Safeguards**
  - Explicitly define `onDelete: Cascade` / `onDelete: SetNull` across foreign keys in `schema.prisma`.

- [x] **Task 018: Database Audit Log Trigger Integration**
  - Create `AuditTrail` table in `schema.prisma` storing `table_name`, `action`, `previous_data`, `new_data`, and `changed_by`.

- [x] **Task 019: Automated Database Seeding Consistency Verification**
  - Enhance `prisma/seed.ts` to validate entity count parity across `User`, `StudentProfile`, `Classroom`, and `NotificationPreference`.

- [x] **Task 020: Read-Replica Router Support**
  - Configure Prisma Client extension to route read-only queries (`findMany`, `findUnique`) to read replicas when `DATABASE_READ_URL` is set.

- [x] **Task 021: Foreign Key Integrity Health Checker**
  - Create `/api/system/db-health` route validating orphaned records across all relations.

- [x] **Task 022: Database Migration History Lock Guard**
  - Add CI check executing `npx prisma migrate status` ensuring pending migrations fail builds.

- [x] **Task 023: Large Object Binary Payload (BLOB) Externalization**
  - Ensure file contents reside in FileStorageDB or S3 compatible storage, storing only metadata pointers in PostgreSQL.

- [x] **Task 024: Automated Database Vacuuming & Analyze Task**
  - Implement cron schedule executing `VACUUM ANALYZE` on heavy transactional tables.

---

## 🎓 Domain 3: Student Portal Engine & Gamification (Tasks 025 - 036)

- [x] **Task 025: Atomic Streak Calculation Engine**
  - Calculate `streakDays` based on daily consecutive logins and homework submissions in user local timezone.

- [x] **Task 026: XP Points & Level Progression System**
  - Implement XP formula (`Level = floor(sqrt(XP / 100))`) automatically updating user profile upon quiz completion.

- [x] **Task 027: Automated Badge Award Triggers**
  - Trigger badge evaluation whenever a student reaches milestones (e.g., 100% attendance for 30 days, 5 consecutive A+ quizzes).

- [x] **Task 028: Homework Submission Versioning & History**
  - Store revision history for submitted homework drafts in `HomeworkVersion` table.

- [x] **Task 029: AI Tutor Streaming Response Fallback**
  - Implement SSE (Server-Sent Events) streaming response handler with automatic fallback to static cached answers when Gemini API rate limits are hit.

- [x] **Task 030: Attendance Percentage Rounding Precision**
  - Calculate `attendancePercentage` to 2 decimal places (`round((presentDays / totalDays) * 100, 2)`).

- [x] **Task 031: Location Ping Batching Buffer**
  - Buffer student GPS location updates in memory/Redis before writing to `StudentLocationRecord` DB table every 60 seconds.

- [x] **Task 032: Student ID Card Digital QR Token Generation**
  - Generate dynamic cryptographic JWT-signed QR payload for student digital ID cards expiring every 60 seconds.

- [x] **Task 033: Homework Overdue Auto-Flagger**
  - Background task setting `status: 'overdue'` for unsubmitted assignments past deadline.

- [x] **Task 034: Quiz Attempt Limit Enforcer**
  - Reject quiz submission attempts if `attemptsCount >= quiz.maxAttempts`.

- [x] **Task 035: Classroom Stream Announcement Feed Pagination**
  - Implement cursor-based pagination (`limit`, `cursor`) on `/api/db/stream-posts`.

- [x] **Task 036: Student Profile Performance Matrix Aggregator**
  - Aggregate term progress, subject performance, and attendance into a single cached JSON payload.

---

## 👩‍🏫 Domain 4: Teacher Portal, Grading & Quiz System (Tasks 037 - 048)

- [x] **Task 037: Atomic Bulk Attendance Register Persistence**
  - Save full classroom attendance registers (30+ students) in a single atomic database call.

- [x] **Task 038: Quiz Question Randomized Pool Engine**
  - Implement randomized question ordering and option shuffling per student attempt.

- [x] **Task 039: Auto-Grading Engine for Objective Questions**
  - Instantly score Multiple Choice, True/False, and Fill-in-the-Blank question types upon submission.

- [x] **Task 040: Teacher Rubric Auto-Evaluation Calculator**
  - Calculate weighted essay scores based on teacher criteria breakdown (Structure 30%, Content 50%, Grammar 20%).

- [x] **Task 041: Assignment Attachment File Type Validation**
  - Restrict teacher and student upload file types to `.pdf`, `.docx`, `.png`, `.jpg` up to 25MB.

- [x] **Task 042: Class Progress CSV/Excel Exporter**
  - Generate downloadable CSV reports for classroom attendance, quiz scores, and term progress.

- [x] **Task 043: Live Classroom Announcement Broadcast WebSocket**
  - Push live announcements to connected students in real-time via WebSocket broadcast.

- [x] **Task 044: Teacher Substitute Assignment Handler**
  - Support delegating classroom management to secondary substitute teacher IDs.

- [x] **Task 045: Quiz Time Window Enforcement**
  - Auto-submit active quiz sessions when deadline timestamp is reached.

- [x] **Task 046: Homework Plagiarism / Similarity Checker Placeholder**
  - Integrate text comparison algorithm to flag duplicate homework text submissions.

- [x] **Task 047: Grade Book Analytics Aggregator**
  - Calculate mean, median, standard deviation, and class highest/lowest scores for teacher dashboards.

- [x] **Task 048: Bulk Student Feedback Dispatcher**
  - Send feedback notes to targeted groups of students in a single action.

---

## 👨‍👩‍👧 Domain 5: Parent Portal, Parental Controls & Geofencing (Tasks 049 - 060)

- [x] **Task 049: Multi-Child Account Switching Cache**
  - Cache multi-child metadata in parent session state for instant child profile switching.

- [x] **Task 050: Geofence Safe-Zone Alert Dispatcher**
  - Trigger instant push notifications to parents when student GPS location leaves school geofence boundaries.

- [x] **Task 051: Screen Time & Portal Access Schedule Rules**
  - Restrict student app login hours based on parent-defined blackout windows (e.g., 10 PM - 6 AM).

- [x] **Task 052: Parent-Teacher Direct Message Encrypted Storage**
  - Persist direct messaging threads with end-to-end payload sanitization.

- [x] **Task 053: AI Weekly Child Progress Digest Generator**
  - Generate automated weekly summary paragraphs summarizing attendance, academic achievements, and areas for improvement.

- [x] **Task 054: Emergency Primary Contact Red Flag Badge Sync**
  - Ensure emergency phone numbers render with high-visibility badges across parent and admin portals.

- [x] **Task 055: Disconnected Parent Account Archival**
  - Retain historic parent profiles in archived state (`isArchived: true`) when children graduate or unenroll.

- [x] **Task 056: Granular Notification Preference Filter**
  - Respect individual toggle settings (`enableAcademic`, `enableCommunication`, `enableReminders`) prior to dispatching alerts.

- [x] **Task 057: Parent Fee Payment & Invoice History Ledger**
  - Store payment history records linked to student profiles.

- [x] **Task 058: Real-Time Bus Location Tracking Sync**
  - Sync vehicle location coordinate streams to parent tracking maps.

- [x] **Task 059: Parent Account Verification Token Generator**
  - Send email verification tokens to parents upon account linking.

- [x] **Task 060: Child Absence Request Submission Handler**
  - Allow parents to submit formal leave applications directly to class teachers.

---

## 🛠️ Domain 6: Admin Dashboard & System Operations (Tasks 061 - 072)

- [x] **Task 061: Bulk CSV Student & Parent Import Engine**
  - Parse CSV file uploads, validate row formats, and create student + parent records inside a single batch transaction.

- [x] **Task 062: Auto Roll Number Allocator**
  - Auto-calculate next sequential roll number (`max(rollNumber) + 1`) per Grade & Section.

- [x] **Task 063: Admin Audit Trail Search & Pagination API**
  - Endpoint `/api/db/audit-logs` supporting filtering by `performedBy`, `category`, `startDate`, and `endDate`.

- [x] **Task 064: Badge Definition Validation Rules Engine**
  - Validate custom badge titles, criteria syntax, and icon identifiers before saving definitions.

- [x] **Task 065: System Notification Broadcast Dispatcher**
  - Broadcast system-wide announcements to target roles (`all`, `students`, `teachers`, `parents`).

- [x] **Task 066: Classroom Capacity Limit Guard**
  - Prevent enrolling students into classrooms exceeding `maxCapacity` threshold.

- [x] **Task 067: Teacher Subject & Classroom Allocation Validator**
  - Ensure teachers are assigned only to classrooms matching their target subjects.

- [x] **Task 068: Database Seed & Reset API Endpoint (Dev Mode Only)**
  - Endpoint `/api/system/reseed` protected by strict `NODE_ENV === 'development'` check.

- [x] **Task 069: System Configuration Key-Value Store**
  - Create `SystemConfig` table for storing school name, academic year, and term start/end dates.

- [x] **Task 070: User Account Deactivation & Archival Workflow**
  - Archive user accounts without breaking foreign key links to past attendance or grade records.

- [x] **Task 071: Admin Emergency System Maintenance Mode Flag**
  - Support setting `maintenance_mode = true` in `SystemConfig` to block non-admin logins during database migrations.

- [x] **Task 072: Global Search Indexing Engine**
  - Endpoint `/api/db/search?q=query` returning unified search results across students, teachers, parents, and classrooms.

---

## ⚡ Domain 7: REST API Middleware & Validation Pipeline (Tasks 073 - 084)

- [x] **Task 073: Zod Schema Request Validation Middleware**
  - Implement `validateBody(schema)` middleware validating incoming REST payloads against strict Zod definitions.

- [x] **Task 074: RFC 7807 Standard Error Response Formatter**
  - Format all API errors as `application/problem+json` containing `type`, `title`, `status`, `detail`, and `instance`.

- [x] **Task 075: Compression Middleware (Gzip / Brotli)**
  - Attach `compression()` middleware to compress JSON responses over 1KB.

- [x] **Task 076: ETag HTTP Caching Header Generator**
  - Add ETag generation middleware for static database GET requests to return HTTP `304 Not Modified`.

- [x] **Task 077: OpenAPI 3.0 / Swagger Auto-Doc Generator**
  - Auto-generate Swagger UI docs at `/api/docs` from Zod schemas and route definitions.

- [x] **Task 078: Request Correlation ID Tracing Middleware**
  - Attach unique `X-Request-ID` UUID header to every incoming HTTP request for distributed logging.

- [x] **Task 079: Response Time Header (`X-Response-Time`)**
  - Inject execution duration header in milliseconds on all outgoing API responses.

- [x] **Task 080: Standard Pagination Metadata Formatter**
  - Wrap paginated responses in standard structure: `{ data: [], meta: { total, page, pageSize, totalPages } }`.

- [x] **Task 081: Payload Size Limiter Middleware**
  - Limit standard JSON body parsing to 2MB (except file upload routes capped at 25MB).

- [x] **Task 082: HTTP Method Not Allowed (405) Catch-All Handler**
  - Return HTTP 405 when valid endpoint is requested with unsupported HTTP method.

- [x] **Task 083: Route Not Found (404) JSON Handler**
  - Return formatted JSON 404 response for unmapped routes instead of default HTML pages.

- [x] **Task 084: Unhandled Rejection & Uncaught Exception Global Handlers**
  - Register process listeners to log uncaught errors and execute graceful shutdown.

---

## 🎨 Domain 8: Frontend State Sync & Offline Resiliency (Tasks 085 - 094)

- [x] **Task 085: Optimistic UI Updates with State Rollback**
  - Update UI state immediately upon user action and roll back gracefully if API call fails.

- [x] **Task 086: Offline IndexedDB Sync Engine**
  - Store pending attendance and quiz responses in IndexedDB when offline and sync upon reconnecting.

- [x] **Task 087: React Error Boundary Fallback Components**
  - Wrap top-level route views in styled Error Boundary components with "Retry" action buttons.

- [x] **Task 088: Keyboard Navigation & ARIA Accessibility**
  - Add keyboard shortcuts (`Esc` to close modals, `Tab` focus trapping) and ARIA attributes.

- [x] **Task 089: Automatic Session Expiry Warning Modal**
  - Display countdown modal 2 minutes prior to JWT access token expiration with "Extend Session" button.

- [x] **Task 090: Global Toast Notification Dispatcher**
  - Centralize toast notification alerts for success, warning, and error events.

- [x] **Task 091: Responsive Mobile Modal Drawer Adaptor**
  - Convert desktop dialog modals into mobile slide-up bottom sheets on screens `< 640px`.

- [x] **Task 092: Dynamic Theme Color Tokens (Dark Mode)**
  - Ensure all tailwind / vanilla CSS elements consume custom CSS variables for dark mode support.

- [x] **Task 093: Data Fetching Debounce & Throttle Helpers**
  - Debounce search inputs (300ms) to prevent unnecessary API requests during typing.

- [x] **Task 094: Form Unsaved Changes Prompt**
  - Intercept tab navigation and window unload when forms contain dirty, unsaved state.

---

## 🐳 Domain 9: Infrastructure, Docker & Production DevOps (Tasks 095 - 104)

- [x] **Task 095: Multi-Stage Dockerfile Optimization**
  - Create minimal multi-stage `Dockerfile` producing slim node production images (< 200MB).

- [x] **Task 096: Docker Compose Stack with PostgreSQL & Redis**
  - Create `docker-compose.yml` orchestrating `backend`, `frontend`, `postgres`, and `redis` with volume mounts.

- [x] **Task 097: Redis Distributed Cache Layer**
  - Cache query results (`getUsers`, `getStudentProfiles`) in Redis with TTL invalidation on updates.

- [x] **Task 098: Prometheus Health & Metrics Endpoint**
  - Expose `/metrics` route exporting process CPU, memory usage, HTTP requests, and DB connection pool stats.

- [x] **Task 099: Graceful SIGTERM / SIGINT Shutdown Handler**
  - Handle termination signals by closing HTTP server, draining DB pools, and flushing log buffers cleanly.

- [x] **Task 100: GitHub Actions CI/CD Pipeline Workflow**
  - `.github/workflows/ci.yml` running linting, formatting, type-checking, building, and full test suites on pull requests.

- [x] **Task 101: Environment Secrets Encryption Guard**
  - Ensure sensitive keys are loaded via `@dotenvx/dotenvx` with `.env.vault` support.

- [x] **Task 102: Log Rotation Engine**
  - Implement daily log rotation writing structured logs to `/var/log/lms/app.log` up to 14 days retention.

- [x] **Task 103: Container Health Check Script**
  - Add HEALTHCHECK instructions in Dockerfile polling `/api/health` every 30 seconds.

- [x] **Task 104: Production Bundle Size Analyzer**
  - Add `rollup-plugin-visualizer` to monitor frontend JS bundle distributions.

---

## 🧪 Domain 10: 1,000+ Unit & Integration Test Suite Scaling Plan (Tasks 105 - 115)

> **Goal**: Expand test coverage to **>1,000 automated unit, integration, and functional tests** across backend and frontend workspaces.

- [x] **Task 105: Automated Mock Data Factory Generators (`tests/factories/`)**
  - Build factory functions (`createMockUser()`, `createMockStudentProfile()`, `createMockClassroom()`, `createMockQuiz()`) generating random valid entities.

- [x] **Task 106: Parameterized API Integration Test Matrix Generator**
  - Generate automated test suites covering all REST endpoints (`GET`, `POST`, `PUT`, `DELETE`) across all 5 user roles (`admin`, `principal`, `teacher`, `student`, `parent`).
  - Expected tests: **40 endpoints × 5 roles = 200 role-permission test assertions**.

- [x] **Task 107: Database Service Unit Test Suite Scaling**
  - Create dedicated unit test files for each DB service:
    - `userService.test.ts` (50 tests)
    - `academicService.test.ts` (50 tests)
    - `notificationService.test.ts` (40 tests)
    - `trackingService.test.ts` (40 tests)
    - `quizService.test.ts` (50 tests)
    - Expected tests: **230 unit tests**.

- [x] **Task 108: Frontend Component Unit & Render Tests**
  - Write Vitest + React Testing Library tests for every UI component:
    - Admin Components (100 tests)
    - Student Components (100 tests)
    - Teacher Components (100 tests)
    - Parent Components (80 tests)
    - Common & Shared Components (80 tests)
    - Expected tests: **460 component tests**.

- [x] **Task 109: Fuzz Testing for Input Sanitization & Edge Cases**
  - Implement fuzz tests sending invalid JSON, oversized strings, boundary integers, and SQL injection strings to all POST/PUT routes.
  - Expected tests: **100 fuzz tests**.

- [x] **Task 110: Edge Case & Boundary Value Unit Tests**
  - Test boundary conditions (empty strings, leap year DOB, max roll numbers, 0% & 100% attendance, NULL optional fields).
  - Expected tests: **50 boundary tests**.

- [x] **Task 111: Authentication & JWT Edge Case Tests**
  - Test expired tokens, malformed headers, altered signatures, missing claims, and revoked tokens.
  - Expected tests: **30 security tests**.

- [x] **Task 112: Live Concurrent Transaction Stress Tests**
  - Test simultaneous database enrollment transactions to verify zero deadlocks or race conditions.
  - Expected tests: **15 concurrency tests**.

- [x] **Task 113: WebSocket Real-Time Event Tests**
  - Mock WebSocket server and test client connection, authentication, room join, and broadcast delivery.
  - Expected tests: **15 socket tests**.

- [x] **Task 114: E2E Workflows & Role Persona Journeys**
  - Test full user flows (Student enroll -> Parent link -> Class assign -> Quiz complete -> Grade record -> Badge award).
  - Expected tests: **15 E2E workflow tests**.

- [x] **Task 115: Comprehensive Test Coverage Target Aggregator**
  ```
  ┌─────────────────────────────────────────────────────────────┐
  │  TEST SUITE DOMAIN                                  COUNT   │
  ├─────────────────────────────────────────────────────────────┤
  │  1. Parameterized RBAC Endpoint Matrix             200      │
  │  2. DB Services Unit Tests                         230      │
  │  3. Frontend Component Tests                       460      │
  │  4. Fuzz & Input Sanitization Tests                100      │
  │  5. Boundary & Edge Case Tests                      50      │
  │  6. Security & JWT Validation Tests                 30      │
  │  7. Concurrency & Transaction Stress Tests          15      │
  │  8. Real-Time WebSocket Tests                       15      │
  │  9. End-to-End User Persona Workflows              15      │
  ├─────────────────────────────────────────────────────────────┤
  │  TOTAL PLANNED AUTOMATED TEST COVERAGE            1,115 TESTS│
  └─────────────────────────────────────────────────────────────┘
  ```

---

## ⚡ AI Agent Execution Command Guide

When executing tasks from this roadmap, run the following commands to validate code formatting, builds, and test suites:

```bash
# 1. Format all workspace files
npm run format

# 2. Compile workspace apps (Backend & Frontend)
npm run build

# 3. Execute all Backend Unit & Integration Tests
npm run test -w lms-backend

# 4. Execute all Frontend Component & Functional Tests
npm run test -w lms-frontend

# 5. Run full workspace test suite
npm run test -w lms-backend && npm run test -w lms-frontend
```

---

## 🏆 Target Quality Standard
- **Zero Lint Errors**
- **Zero Build Failures**
- **100% Passing Test Rate across 1,000+ Automated Tests**
