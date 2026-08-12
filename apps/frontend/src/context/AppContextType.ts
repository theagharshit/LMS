import {
  User,
  StudentProfile,
  Classroom,
  StreamPost,
  Assignment,
  Submission,
  Quiz,
  QuizSubmission,
  SchedulePeriod,
  DayOfWeek,
  WeeklySchedule,
  AttendanceRecord,
  ParentControlSettings,
  CalendarEvent,
  ModuleItem,
  DirectMessage,
  SubjectPerformance,
  StudentLocationRecord,
  LocationStatusCategory,
  TermProgress,
  StudentActivity,
  BadgeDefinition,
  AdminAuditLog,
  SchoolAnnouncement,
  NotificationItem,
  NotificationPreference,
  StudyResource,
  SubstituteRequest,
  SubstituteRequestStatus,
  TeacherAbsenceRequest,
  EligibleSubstituteTeacher,
  TeacherAssignmentAuditLog,
} from '@lms/shared';

export interface AppContextType {
  currentUser: User;
  allUsers: User[];
  switchUser: (userId: string) => void;
  activeChild: StudentProfile;
  setActiveChildId: (id: string) => void;
  activeChildList: StudentProfile[];

  // Navigation & UI State
  activeView: string;
  setActiveView: (view: string) => void;
  selectedClassroomId: string | null;
  setSelectedClassroomId: (id: string | null) => void;
  theme: 'light' | 'dark' | 'soft';
  setTheme: (theme: 'light' | 'dark' | 'soft') => void;

  // Data lists & mutations
  classrooms: Classroom[];
  addClassroom: (classroom: Omit<Classroom, 'id' | 'code' | 'studentCount'>) => void;
  joinClassroomByCode: (code: string) => Promise<boolean>;

  streamPosts: StreamPost[];
  addStreamPost: (post: Omit<StreamPost, 'id' | 'createdAt' | 'commentsCount'>) => void;
  addPostComment: (postId: string, commentText: string) => void;

  assignments: Assignment[];
  addAssignment: (asg: Omit<Assignment, 'id' | 'createdAt'>) => void;

  submissions: Submission[];
  submitHomework: (
    assignmentId: string,
    fileUrl: string,
    fileName: string,
    responseText: string,
  ) => void;
  gradeSubmission: (submissionId: string, grade: number, feedback: string) => void;

  quizzes: Quiz[];
  addQuiz: (quiz: Omit<Quiz, 'id'>) => Quiz;
  updateQuiz: (quizId: string, updates: Partial<Omit<Quiz, 'id'>>) => void;
  startQuizLive: (quizId: string) => void;
  deleteQuiz: (quizId: string) => void;
  updateQuizMarksMode: (quizId: string, revealMarksMode: 'immediate' | 'later') => void;
  quizSubmissions: QuizSubmission[];
  submitQuizAnswers: (
    quizId: string,
    answers: Record<string, string>,
    score: number,
    totalPoints: number,
    startedAt?: string,
    timeSpentSeconds?: number,
  ) => void;

  resources: StudyResource[];
  addResource: (data: Omit<StudyResource, 'id' | 'createdAt'>) => StudyResource;
  updateResource: (id: string, updates: Partial<Omit<StudyResource, 'id' | 'createdAt'>>) => void;
  deleteResource: (id: string) => void;
  addModule: (
    data: Omit<ModuleItem, 'id' | 'completedByStudentIds'> & { completedByStudentIds?: string[] },
  ) => ModuleItem;
  updateModule: (id: string, updates: Partial<Omit<ModuleItem, 'id'>>) => void;
  deleteModule: (id: string) => void;

  attendanceRecords: AttendanceRecord[];
  markAttendance: (
    studentId: string,
    studentName: string,
    date: string,
    status: 'present' | 'absent' | 'late' | 'excused',
    remarks?: string,
  ) => void;

  parentControls: Record<string, ParentControlSettings>;
  updateParentControls: (studentId: string, settings: Partial<ParentControlSettings>) => void;

  messages: DirectMessage[];
  sendMessage: (receiverId: string, receiverName: string, content: string) => void;

  // Timetable Schedule Data
  weeklySchedule: WeeklySchedule;
  updateDaySchedule: (day: DayOfWeek, periods: SchedulePeriod[]) => void;
  schedule: SchedulePeriod[];
  modules: ModuleItem[];
  calendarEvents: CalendarEvent[];
  subjectPerformances: SubjectPerformance[];
  termProgress: TermProgress[];
  studentActivities: StudentActivity[];
  studentProfiles: StudentProfile[];
  updateStudentIdCardPhoto: (studentId: string, idCardPhotoUrl: string) => void;
  badgeDefinitions: BadgeDefinition[];
  assignBadge: (
    studentProfileId: string,
    badgeDefinitionId: string,
    remarks?: string,
  ) => Promise<void>;

  // Real-Time Student Location Tracker
  studentLocations: StudentLocationRecord[];
  updateStudentLocation: (
    studentId: string,
    studentName: string,
    location: string,
    category: LocationStatusCategory,
    updatedBy: string,
    updatedByRole: 'teacher' | 'admin',
    busNumber?: string,
    notes?: string,
  ) => void;

  // AI Modal States
  isAiTutorOpen: boolean;
  setIsAiTutorOpen: (open: boolean) => void;
  aiTutorInitialPrompt: string;
  setAiTutorInitialPrompt: (prompt: string) => void;

  isAiParentSummaryOpen: boolean;
  setIsAiParentSummaryOpen: (open: boolean) => void;

  isCompletedQuizzesOpen: boolean;
  setIsCompletedQuizzesOpen: (open: boolean) => void;

  notifications: NotificationItem[];
  notificationPreferences: NotificationPreference;
  updateNotificationPreferences: (prefs: Partial<Omit<NotificationPreference, 'userId'>>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (id: string) => void;
  clearReadNotifications: () => void;
  dispatchNotification: (data: {
    recipientId?: string;
    targetAudience?: 'all' | 'students' | 'teachers' | 'parents' | 'classroom';
    classroomId?: string;
    title: string;
    body: string;
    category: 'CRITICAL' | 'ACADEMIC' | 'COMMUNICATION';
    severity?: 'urgent' | 'high' | 'normal' | 'info';
    type?: string;
  }) => void;
  unreadCount: number;

  // Admin Management Portal API & State
  adminAuditLogs: AdminAuditLog[];
  schoolAnnouncements: SchoolAnnouncement[];
  addStudentProfile: (
    student: Omit<
      StudentProfile,
      'id' | 'attendancePercentage' | 'streakDays' | 'xpPoints' | 'badges'
    >,
  ) => void;
  updateStudentProfile: (id: string, updates: Partial<StudentProfile>) => void;
  deleteStudentProfile: (id: string) => void;
  addTeacherProfile: (teacher: Omit<User, 'id'>) => void;
  updateTeacherProfile: (id: string, updates: Partial<User>) => void;
  deleteTeacherProfile: (id: string) => void;
  addParentProfile: (parent: Omit<User, 'id'>) => void;
  updateParentChildren: (parentId: string, childrenIds: string[]) => void;
  deleteParentProfile: (id: string) => void;
  addBadgeDefinition: (badge: Omit<BadgeDefinition, 'id'>) => void;
  deleteBadgeDefinition: (id: string) => void;
  deleteClassroom: (id: string) => void;
  addAnnouncement: (announcement: Omit<SchoolAnnouncement, 'id' | 'createdAt'>) => void;
  deleteAnnouncement: (id: string) => void;
  addAuditLog: (action: string, category: AdminAuditLog['category'], details: string) => void;

  // Teacher Subject Assignments, Substitutes, Absence Requests & Audit Logs
  substituteRequests: SubstituteRequest[];
  teacherAbsenceRequests: TeacherAbsenceRequest[];
  teacherAssignmentAuditLogs: TeacherAssignmentAuditLog[];
  assignSubjectToTeacher: (
    teacherId: string,
    subjectId: string,
    classroomId?: string,
    reason?: string,
  ) => Promise<void>;
  deassignSubjectFromTeacher: (
    teacherId: string,
    subjectId: string,
    classroomId?: string,
    reason?: string,
  ) => Promise<void>;
  reassignSubject: (
    subjectId: string,
    classroomId: string,
    fromTeacherId: string,
    toTeacherId: string,
    reason?: string,
  ) => Promise<void>;
  fetchEligibleSubstitutes: (
    classroomId: string,
    subjectId: string,
    date: string,
    timeSlot: string,
  ) => Promise<EligibleSubstituteTeacher[]>;
  createSubstituteRequest: (data: {
    classroomId: string;
    subjectId: string;
    date: string;
    timeSlot: string;
    originalTeacherId: string;
    suggestedSubstituteId?: string;
    reason: string;
    teacherAbsenceRequestId?: string;
  }) => Promise<void>;
  updateSubstituteStatus: (
    requestId: string,
    status: SubstituteRequestStatus,
    responseNotes?: string,
    assignedSubstituteId?: string,
  ) => Promise<void>;
  submitTeacherAbsenceRequest: (
    startDate: string,
    endDate: string,
    reason: string,
  ) => Promise<void>;
  reviewTeacherAbsenceRequest: (
    requestId: string,
    status: 'approved' | 'rejected',
  ) => Promise<void>;
}
