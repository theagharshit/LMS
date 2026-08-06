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
  joinClassroomByCode: (code: string) => boolean;

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
  addQuiz: (quiz: Omit<Quiz, 'id'>) => void;
  quizSubmissions: QuizSubmission[];
  submitQuizAnswers: (
    quizId: string,
    answers: Record<string, string>,
    score: number,
    totalPoints: number,
  ) => void;

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

  notifications: {
    id: string;
    title: string;
    body: string;
    time: string;
    read: boolean;
    type: string;
  }[];
  markNotificationRead: (id: string) => void;
  unreadCount: number;
}
