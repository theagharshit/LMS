# Database normalization audit

This document records the expand/backfill/contract migration for the Sikshya LMS database. It intentionally lives outside `README_AI_AGENT.md`.

## Core dependency findings

- `User.schoolName`, `Classroom.subject`, repeated grade/section pairs, and free-form term names are shared reference data rather than attributes owned independently by every row.
- `childrenIds`, `subjectsTaught`, `substituteTeacherIds`, and `completedByStudentIds` are relationships stored as arrays. They cannot enforce referenced-row existence or relationship uniqueness.
- Classroom teacher names/avatars and assignment/quiz classroom/subject labels duplicate mutable `User`/`Classroom` data and have been removed.
- Attendance percentage, XP level, quiz question count, and formatted byte size are deterministic derived values and have been removed from storage.
- Quiz attempt totals/scores and subject-performance aggregates are retained as historical/materialized snapshots: recomputing them after question, grading-policy, or source-assessment changes would alter the historical record.
- Audit JSON, encrypted message content, API-key scopes, and flexible quiz-answer payloads remain intentionally non-relational where their atomic document/value-set behavior is the actual domain requirement.

## Migration sequence

1. `20260811143000_normalize_core_expand` creates canonical school/subject/cohort/term tables and relationship tables, adds nullable foreign keys, backfills them from legacy values, validates student cohort/roll integrity, and retains every legacy column.
2. `20260811150000_relational_integrity` adds missing ownership foreign keys, natural composite uniqueness, numeric/status checks, query indexes, and exact attachment ownership validation. It aborts on duplicates or orphans instead of deleting them.
3. `20260811153000_normalize_core_contract` verifies canonical keys, makes them required, and drops legacy arrays, duplicated labels, and deterministic derived columns only after application consumers have moved.
4. `20260811154500_stable_actor_references` replaces badge-assigner and attendance-marker names with user IDs and constrains audit actors to valid users.
5. `20260811160000_categorical_enums` promotes stable statuses, notification classifications, file-integrity states, and location categories from arbitrary text to native PostgreSQL enums.

Every forward migration is transactional. Each migration directory includes a manual `down.sql`; contract rollback recreates and backfills legacy columns before removing normalized structures.

## Normalized sources of truth

- School identity: `School`; users and classrooms reference `schoolId`.
- Curriculum identity: `Subject`; classrooms, teacher allocations, performance, and calendar events reference `subjectId`.
- Grade/section identity: `AcademicCohort`; student profiles and classrooms reference `cohortId`.
- Academic term identity: `AcademicTerm`; progress references `termId`.
- Parent/child, teacher/subject, substitute/classroom, and module/student completion: composite-key relationship tables with foreign keys.
- File uploaders, badge assigners, attendance markers, notification actors, security actors, payment parties, absence parties, and parent verification: user foreign keys.
- API responses retain existing display fields by joining canonical records; display labels are no longer independently writable facts.

## Integrity and index policy

- Student roll numbers are unique within a cohort.
- One assignment submission exists per student; quiz attempts are unique by quiz/student/attempt number; daily attendance is unique by student/date.
- Every attachment belongs to exactly one stream post, assignment, or module item.
- Foreign keys use cascade only for dependent lifecycle rows, `RESTRICT` for financial/content ownership, and `SET NULL` for optional actors whose deletion must not delete the record.
- Indexes cover foreign-key joins and observed filters: school/role/archive, cohort/archive, classroom school/cohort/subject/teacher, notification inbox, payment parent/student, absence parties/status, and quiz-attempt/session access.

## Verification completed

- All eight migrations replayed successfully from an empty PostgreSQL 17 database.
- Prisma migration status reported current and schema drift comparison reported `No difference detected`.
- Normalized seed completed with parity checks.
- Type checking and production builds passed.
- Backend: 851 tests passed. Frontend: 551 tests passed.

## Decisions intentionally pending

Requirement 20 requires business confirmation before these changes:

- Whether historical author/student/sender display snapshots on posts, comments, submissions, direct messages, and notifications should remain frozen or always join to the current user.
- Whether historical quiz totals/scores and subject-performance grade/aggregate snapshots should remain frozen after source questions or grading policy changes.
- Whether attendance days and academic-term boundaries are true date-only business concepts, or must be converted to UTC instants. Other legacy timestamp-like strings will be converted to timezone-aware instants after this is answered.
- Whether school-bus drivers should be full `User` accounts or a separate staff/transport actor entity before `StudentLocationRecord.updatedBy` is migrated from text to a foreign key.
