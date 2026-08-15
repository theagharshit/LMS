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
  phone?: string;
  secondaryPhone?: string;
  address?: string;
  occupation?: string;
  gradeLevel?: number; // e.g. 8 for Grade 8
  section?: string; // e.g. 'A'
  rollNumber?: number;
  isArchived?: boolean;
  verificationStatus?: 'pending_verification' | 'verified_enrolled';
  // Parent specific
  childrenIds?: string[];
  // Teacher specific
  subjectsTaught?: string[];
  employeeNumber?: string;
  joinedAt?: string;
  employmentStatus?: 'active' | 'on_leave' | 'left';
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  qualification?: string;
  specialization?: string;
}

export interface StudentProfile extends User {
  /** Student-uploaded image used for the printable ID card. */
  idCardPhotoUrl?: string;
  attendancePercentage: number;
  streakDays: number;
  xpPoints: number;
  badges: StudentBadge[];
  gradeLevel: number;
  section: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  parentAddress?: string;
  parentOccupation?: string;
  relationship?: string;
  parentSecondaryPhone?: string;
  dob?: string;
  gender?: string;
  bloodGroup?: string;
  medicalNotes?: string;
  admissionNumber?: string;
  admittedAt?: string;
  leftAt?: string;
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
  revealMarksMode?: 'immediate' | 'later';
  status?: 'draft' | 'published' | 'live';
  liveStartedAt?: string;
  sourceResourceIds?: string[];
  createdAt?: string;
}

export interface QuizSubmission {
  id: string;
  quizId: string;
  studentId: string;
  score: number;
  totalPoints: number;
  completedAt: string;
  startedAt?: string;
  timeSpentSeconds?: number;
  answers: Record<string, string>; // questionId -> answer
}

export interface StudyResource {
  id: string;
  classroomId: string;
  teacherId: string;
  title: string;
  description?: string;
  type: 'pdf' | 'video' | 'link' | 'image' | 'doc' | 'notes';
  url: string;
  mimeType?: string;
  sizeFormatted?: string;
  tags?: string[];
  createdAt: string;
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
  | 'dismissed_home'
  | 'laboratory';

export interface StudentLocationRecord {
  id: string;
  studentId: string;
  studentName: string;
  currentLocation: string;
  category: LocationStatusCategory;
  busNumber?: string;
  updatedBy: string;
  updatedByRole: 'teacher' | 'admin' | 'staff';
  updatedAt: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
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

export interface AdminAuditLog {
  id: string;
  action: string;
  category: 'student' | 'teacher' | 'parent' | 'classroom' | 'badge' | 'broadcast' | 'system';
  performedBy: string;
  details: string;
  timestamp: string;
}

export interface SchoolAnnouncement {
  id: string;
  title: string;
  content: string;
  priority: 'urgent' | 'high' | 'normal';
  author: string;
  createdAt: string;
  targetAudience: 'all' | 'students' | 'teachers' | 'parents';
}

export type NotificationCategory = 'CRITICAL' | 'ACADEMIC' | 'COMMUNICATION';
export type NotificationSeverity = 'urgent' | 'high' | 'normal' | 'info';
export type NotificationType =
  | 'assignment'
  | 'quiz'
  | 'attendance'
  | 'location'
  | 'announcement'
  | 'badge'
  | 'message'
  | 'general';

export interface NotificationItem {
  id: string;
  recipientId: string;
  senderId?: string;
  senderName?: string;
  senderRole?: string;
  title: string;
  body: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  type: NotificationType;
  broadcastId?: string;
  targetAudience?: string;
  read: boolean;
  createdAt: string;
  time?: string;
}

export interface NotificationPreference {
  userId: string;
  enableAcademic: boolean;
  enableCommunication: boolean;
  enableReminders: boolean;
}

export type TeacherAbsenceStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface TeacherAbsenceRequest {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherAvatar?: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: TeacherAbsenceStatus;
  reviewedByAdminId?: string;
  reviewedByAdminName?: string;
  createdAt: string;
}

export type SubstituteRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface SubstituteRequest {
  id: string;
  teacherAbsenceRequestId?: string;
  classroomId: string;
  classroomName: string;
  subjectId: string;
  subjectName: string;
  date: string;
  timeSlot: string;
  originalTeacherId: string;
  originalTeacherName: string;
  suggestedSubstituteId?: string;
  suggestedSubstituteName?: string;
  assignedSubstituteId?: string;
  assignedSubstituteName?: string;
  reason: string;
  status: SubstituteRequestStatus;
  responseNotes?: string;
  createdByAdminId: string;
  createdByAdminName: string;
  createdAt: string;
  updatedAt?: string;
}

export interface EligibleSubstituteTeacher {
  teacherId: string;
  teacherName: string;
  teacherAvatar: string;
  isQualified: boolean;
  isAvailable: boolean;
  currentWorkload: number;
  rejectionReason?: string;
}

export type AssignmentAuditLogAction =
  | 'ASSIGN_SUBJECT'
  | 'DEASSIGN_SUBJECT'
  | 'REASSIGN_SUBJECT'
  | 'TEACHER_ABSENCE_REQUEST'
  | 'APPROVE_TEACHER_ABSENCE'
  | 'REJECT_TEACHER_ABSENCE'
  | 'REQUEST_SUBSTITUTE'
  | 'APPROVE_SUBSTITUTE'
  | 'REJECT_SUBSTITUTE';

export interface TeacherAssignmentAuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  targetTeacherId: string;
  targetTeacherName: string;
  action: AssignmentAuditLogAction;
  subjectId?: string;
  subjectName?: string;
  classroomId?: string;
  classroomName?: string;
  details: string;
  reason?: string;
  createdAt: string;
}

export interface TimetableSlot {
  id: string;
  schoolId?: string;
  academicYearId?: string;
  classroomId: string;
  cohortId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  periodNumber: number;
  startTime: string; // "09:00"
  endTime: string; // "09:45"
  roomNumber: string;
  requiredBooks?: string;
  isArchived?: boolean;
  subject?: { id: string; name: string; code?: string };
  teacher?: { id: string; name: string; avatar?: string };
  classroom?: { id: string; name: string; roomNumber?: string };
  cohort?: { id: string; name: string; gradeLevel: number; section: string };
}

export interface BellScheduleBreak {
  id: string;
  name: string;
  type: 'assembly' | 'snack' | 'lunch' | 'homeroom' | 'dismissal' | 'other';
  startTime: string;
  endTime?: string;
  afterPeriod?: number;
  sequence: number;
  isArchived?: boolean;
}

export interface SchoolTimingConfig {
  schoolStartTime: string;
  schoolEndTime: string;
  periodDurationMinutes: number;
  periodsPerDay: number;
  breaks: BellScheduleBreak[];
}

export interface AcademicTerm {
  id: string;
  schoolId: string;
  academicYearId: string;
  name: string;
  sequence: number;
  startsAt?: string;
  endsAt?: string;
  isArchived?: boolean;
}

export interface SchoolHoliday {
  id: string;
  schoolId: string;
  academicYearId: string;
  name: string;
  date: string;
  description?: string;
  isArchived?: boolean;
}

export interface AcademicYear {
  id: string;
  schoolId: string;
  name: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  isArchived?: boolean;
}
