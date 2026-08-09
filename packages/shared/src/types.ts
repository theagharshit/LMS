/**
 * Sikshya LMS Nepal - Core Type Definitions
 */

export type UserRole = 'student' | 'teacher' | 'parent' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  schoolName: string;
  gradeLevel?: number; // e.g. 8 for Grade 8
  section?: string; // e.g. 'A'
  rollNumber?: number;
  // Parent specific
  childrenIds?: string[];
  // Teacher specific
  subjectsTaught?: string[];
}

export interface StudentProfile extends User {
  attendancePercentage: number;
  streakDays: number;
  xpPoints: number;
  badges: StudentBadge[];
  gradeLevel: number;
  section: string;
  parentName: string;
  parentPhone: string;
}

export interface BadgeDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  isAutomatic: boolean;
  criteria?: string;
}

export interface StudentBadge {
  id: string;
  earnedDate: string;
  badgeDefinitionId: string;
  badgeDefinition: BadgeDefinition;
  studentProfileId: string;
  assignedBy?: string;
  remarks?: string;
}

export interface Classroom {
  id: string;
  name: string;
  subject: string;
  gradeLevel: number;
  section: string;
  teacherId: string;
  teacherName: string;
  teacherAvatar: string;
  roomNumber: string;
  colorTheme: string;
  bannerImage: string;
  studentCount: number;
  enrolledStudentIds?: string[];
  meetLink?: string;
  code: string;
}

export interface StreamPost {
  id: string;
  classroomId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: UserRole;
  content: string;
  createdAt: string;
  pinned?: boolean;
  attachments?: Attachment[];
  commentsCount: number;
  comments?: PostComment[];
}

export interface PostComment {
  id: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  title: string;
  type: 'pdf' | 'video' | 'link' | 'image' | 'doc';
  url: string;
  size?: string;
}

export interface ModuleItem {
  id: string;
  classroomId: string;
  unitName: string;
  title: string;
  description: string;
  attachments: Attachment[];
  completedByStudentIds: string[];
  durationMinutes: number;
}

export interface Assignment {
  id: string;
  classroomId: string;
  classroomName: string;
  subject: string;
  title: string;
  instructions: string;
  dueDate: string; // ISO string
  dueTime: string;
  totalPoints: number;
  attachments: Attachment[];
  createdAt: string;
  rubric?: string[];
}

export interface SubmissionHistoryItem {
  id: string;
  version: number;
  submittedAt: string;
  fileUrl?: string;
  fileName?: string;
  responseText?: string;
  status: 'submitted' | 'graded' | 'late' | 'pending';
  grade?: number;
  feedback?: string;
  isLate?: boolean;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  studentAvatar: string;
  submittedAt: string;
  status: 'submitted' | 'graded' | 'late' | 'pending';
  fileUrl?: string;
  fileName?: string;
  responseText?: string;
  grade?: number;
  feedback?: string;
  annotated?: boolean;
  isLate?: boolean;
  history?: SubmissionHistoryItem[];
}

export interface QuizQuestion {
  id?: string;
  text: string;
  type: 'MCQ' | 'True/False' | 'ShortAnswer';
  options?: string[];
  correctAnswer: string;
  explanation: string;
  points: number;
}

export interface Quiz {
  id: string;
  classroomId: string;
  classroomName: string;
  subject: string;
  title: string;
  description: string;
  durationMinutes: number;
  dueDate: string;
  totalQuestions: number;
  questions: QuizQuestion[];
  published: boolean;
  createdAt?: string;
}

export interface QuizSubmission {
  id: string;
  quizId: string;
  studentId: string;
  score: number;
  totalPoints: number;
  completedAt: string;
  answers: Record<string, string>; // questionId -> answer
}

export type DayOfWeek =
  'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface SchedulePeriod {
  id: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  subject: string;
  teacherName: string;
  room: string;
  classroomId?: string;
  isCurrent?: boolean;
  requiredBooks?: string; // Textbook & notebook packing advice for students
}

export type WeeklySchedule = Record<DayOfWeek, SchedulePeriod[]>;

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent' | 'late' | 'excused';
  markedBy: string;
  remarks?: string;
  checkInTime?: string;
}

export interface ParentControlSettings {
  studentId: string;
  allowTeacherDirectChat: boolean;
  allowPeerDiscussion: boolean;
  missingHomeworkAlerts: boolean;
  lowAttendanceAlerts: boolean;
  weeklyDigestEmail: boolean;
  screenTimeLimitMinutes: number;
  requireApprovalForOutboundMsgs: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'assignment' | 'quiz' | 'live_class' | 'holiday' | 'parent_meeting' | 'exam';
  date: string; // YYYY-MM-DD
  time?: string;
  description: string;
  subject?: string;
  nepaliDateBS?: string; // e.g. "2083 Kartik 15"
}

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderAvatar: string;
  receiverId: string;
  receiverName: string;
  content: string;
  createdAt: string;
  read: boolean;
  approvedByParent?: boolean;
}

export interface SubjectPerformance {
  id: string;
  studentId: string;
  subject: string;
  scorePercentage: number;
  grade: string; // A+, A, B+, B, C+
  assignmentsCompleted: number;
  totalAssignments: number;
  quizzesScoreAvg: number;
  teacherRemark: string;
}

export interface StoredFileRecord {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  sizeFormatted: string;
  uploadedBy: string;
  classroomId?: string;
  checksum: string;
  integrityStatus: 'verified' | 'scanning' | 'quarantined';
  uploadedAt: string;
  downloadUrl: string;
}

export type LocationStatusCategory =
  | 'in_class'
  | 'canteen_lunch'
  | 'en_route_bus'
  | 'library'
  | 'sports_ground'
  | 'assembly_hall'
  | 'dismissed_home';

export interface StudentLocationRecord {
  id: string;
  studentId: string;
  studentName: string;
  currentLocation: string;
  category: LocationStatusCategory;
  busNumber?: string;
  updatedBy: string;
  updatedByRole: 'teacher' | 'admin';
  updatedAt: string;
  notes?: string;
}

export interface TermProgress {
  id: string;
  studentId: string;
  term: string;
  score: number;
}

export interface StudentActivity {
  id: string;
  studentId: string;
  title: string;
  category: string;
  position: string;
  date: string;
  description: string;
}
