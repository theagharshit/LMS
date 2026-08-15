import type {
  AdminAuditLog,
  Assignment,
  AttendanceRecord,
  BadgeDefinition,
  CalendarEvent,
  Classroom,
  DirectMessage,
  ModuleItem,
  ParentControlSettings,
  Quiz,
  QuizSubmission,
  SchedulePeriod,
  SchoolAnnouncement,
  StreamPost,
  StudentActivity,
  StudentLocationRecord,
  StudentProfile,
  StudyResource,
  SubjectPerformance,
  Submission,
  SubstituteRequest,
  TeacherAbsenceRequest,
  TeacherAssignmentAuditLog,
  TermProgress,
  User,
  WeeklySchedule,
} from '@lms/shared';

/**
 * Optional state embedded by the server before React starts. Production does not
 * provide a fallback: when this value is absent, every collection starts empty
 * and is populated by the authenticated database-state request.
 */
export interface DatabaseBootstrapState {
  currentUser?: User;
  users?: User[];
  studentProfiles?: StudentProfile[];
  badgeDefinitions?: BadgeDefinition[];
  classrooms?: Classroom[];
  streamPosts?: StreamPost[];
  assignments?: Assignment[];
  submissions?: Submission[];
  quizzes?: Quiz[];
  quizSubmissions?: QuizSubmission[];
  attendanceRecords?: AttendanceRecord[];
  parentControls?: Record<string, ParentControlSettings>;
  studentLocations?: StudentLocationRecord[];
  messages?: DirectMessage[];
  termProgress?: TermProgress[];
  studentActivities?: StudentActivity[];
  subjectPerformances?: SubjectPerformance[];
  resources?: StudyResource[];
  modules?: ModuleItem[];
  teacherAbsenceRequests?: TeacherAbsenceRequest[];
  substituteRequests?: SubstituteRequest[];
  teacherAssignmentAuditLogs?: TeacherAssignmentAuditLog[];
  weeklySchedule?: WeeklySchedule;
  schedule?: SchedulePeriod[];
  calendarEvents?: CalendarEvent[];
  adminAuditLogs?: AdminAuditLog[];
  schoolAnnouncements?: SchoolAnnouncement[];
}

declare global {
  interface Window {
    __LMS_DATABASE_BOOTSTRAP__?: DatabaseBootstrapState;
  }
}

export const readDatabaseBootstrap = (): DatabaseBootstrapState | undefined =>
  typeof window === 'undefined' ? undefined : window.__LMS_DATABASE_BOOTSTRAP__;
