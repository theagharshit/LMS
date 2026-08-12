import { loadEnv } from '@utils/envResolver';

// Automatically finds and loads the root .env file
loadEnv();

import {
  User,
  StudentProfile,
  Classroom,
  StreamPost,
  Assignment,
  Submission,
  Quiz,
  QuizSubmission,
  AttendanceRecord,
  ParentControlSettings,
  StudentLocationRecord,
  DirectMessage,
  NotificationPreference,
  NotificationItem,
} from '@lms/shared';

import {
  userService,
  classroomService,
  assignmentService,
  quizService,
  badgeService,
  communicationService,
  attendanceService,
  locationService,
  parentService,
  notificationService,
  resourceService,
  moduleService,
} from './services';

/**
 * LMSDatabaseService Facade Class
 * Delegates all database operations to specialized domain services while preserving
 * 100% backward compatibility across all controllers and test suites.
 */
export class LMSDatabaseService {
  // --- USER SERVICE DELEGATES ---
  public getUsers(): Promise<User[]> {
    return userService.getUsers();
  }

  public getStudentProfiles(): Promise<StudentProfile[]> {
    return userService.getStudentProfiles();
  }

  public getSubjectPerformances() {
    return userService.getSubjectPerformances();
  }

  public getTermProgress() {
    return userService.getTermProgress();
  }

  public getStudentActivities() {
    return userService.getStudentActivities();
  }

  public addStudentProfile(data: any) {
    return userService.addStudentProfile(data);
  }

  public updateStudentProfile(id: string, data: any) {
    return userService.updateStudentProfile(id, data);
  }

  public deleteStudentProfile(id: string) {
    return userService.deleteStudentProfile(id);
  }

  public addTeacherProfile(data: any) {
    return userService.addTeacherProfile(data);
  }

  public updateTeacherProfile(id: string, data: any) {
    return userService.updateTeacherProfile(id, data);
  }

  public deleteTeacherProfile(id: string) {
    return userService.deleteTeacherProfile(id);
  }

  public addParentProfile(data: any) {
    return userService.addParentProfile(data);
  }

  public deleteParentProfile(id: string) {
    return userService.deleteParentProfile(id);
  }

  // --- CLASSROOM SERVICE DELEGATES ---
  public getClassrooms(): Promise<Classroom[]> {
    return classroomService.getClassrooms();
  }

  public addClassroom(
    classroom: Omit<Classroom, 'id' | 'code' | 'studentCount'>,
  ): Promise<Classroom> {
    return classroomService.addClassroom(classroom);
  }

  public deleteClassroom(id: string) {
    return classroomService.deleteClassroom(id);
  }

  public getStreamPosts(): Promise<StreamPost[]> {
    return classroomService.getStreamPosts();
  }

  public addStreamPost(
    post: Omit<StreamPost, 'id' | 'createdAt' | 'commentsCount'>,
  ): Promise<StreamPost> {
    return classroomService.addStreamPost(post);
  }

  public addCommentToPost(
    streamPostId: string,
    comment: { authorName: string; authorAvatar: string; content: string },
  ) {
    return classroomService.addCommentToPost(streamPostId, comment);
  }

  // --- ASSIGNMENT SERVICE DELEGATES ---
  public getAssignments(): Promise<Assignment[]> {
    return assignmentService.getAssignments();
  }

  public addAssignment(assignment: Omit<Assignment, 'id' | 'createdAt'>): Promise<Assignment> {
    return assignmentService.addAssignment(assignment);
  }

  public getSubmissions(): Promise<Submission[]> {
    return assignmentService.getSubmissions();
  }

  public submitHomework(
    assignmentId: string,
    fileName: string,
    fileUrl: string,
    studentId: string,
    notes?: string,
  ): Promise<Submission> {
    return assignmentService.submitHomework(assignmentId, fileName, fileUrl, studentId, notes);
  }

  // --- QUIZ SERVICE DELEGATES ---
  public getQuizzes(): Promise<Quiz[]> {
    return quizService.getQuizzes();
  }

  public addQuiz(quiz: Omit<Quiz, 'id' | 'createdAt'>): Promise<Quiz> {
    return quizService.addQuiz(quiz);
  }

  public updateQuiz(id: string, quiz: Partial<Omit<Quiz, 'id' | 'createdAt'>>): Promise<Quiz | null> {
    return quizService.updateQuiz(id, quiz);
  }

  public startQuizLive(id: string): Promise<Quiz | null> {
    return quizService.startQuizLive(id);
  }

  public deleteQuiz(id: string): Promise<boolean> {
    return quizService.deleteQuiz(id);
  }

  public updateQuizMarksMode(
    id: string,
    revealMarksMode: 'immediate' | 'later',
  ): Promise<Quiz | null> {
    return quizService.updateQuizMarksMode(id, revealMarksMode);
  }

  public getQuizSubmissions(): Promise<QuizSubmission[]> {
    return quizService.getQuizSubmissions();
  }

  public submitQuiz(
    submission: Omit<QuizSubmission, 'id' | 'completedAt'>,
  ): Promise<QuizSubmission> {
    return quizService.submitQuiz(submission);
  }

  // --- RESOURCE SERVICE DELEGATES ---
  public getResources(): Promise<StudyResource[]> {
    return resourceService.getAllResources();
  }

  public getResourcesByClassroom(classroomId: string): Promise<StudyResource[]> {
    return resourceService.getResourcesByClassroom(classroomId);
  }

  public getResourcesByTeacher(teacherId: string): Promise<StudyResource[]> {
    return resourceService.getResourcesByTeacher(teacherId);
  }

  public addResource(data: Omit<StudyResource, 'id' | 'createdAt'>): Promise<StudyResource> {
    return resourceService.addResource(data);
  }

  public updateResource(
    id: string,
    data: Partial<Omit<StudyResource, 'id' | 'createdAt'>>,
  ): Promise<StudyResource | null> {
    return resourceService.updateResource(id, data);
  }

  public deleteResource(id: string): Promise<boolean> {
    return resourceService.deleteResource(id);
  }

  // --- MODULE SERVICE DELEGATES ---
  public getModules(): Promise<ModuleItem[]> {
    return moduleService.getModules();
  }

  public addModule(
    data: Omit<ModuleItem, 'id' | 'completedByStudentIds'> & { completedByStudentIds?: string[] },
  ): Promise<ModuleItem> {
    return moduleService.addModule(data);
  }

  public updateModule(id: string, data: Partial<Omit<ModuleItem, 'id'>>): Promise<ModuleItem | null> {
    return moduleService.updateModule(id, data);
  }

  public deleteModule(id: string): Promise<boolean> {
    return moduleService.deleteModule(id);
  }

  // --- BADGE SERVICE DELEGATES ---
  public getBadgeDefinitions() {
    return badgeService.getBadgeDefinitions();
  }

  public assignBadge(
    studentProfileId: string,
    badgeDefinitionId: string,
    assignedById?: string,
    remarks?: string,
  ) {
    return badgeService.assignBadge(studentProfileId, badgeDefinitionId, assignedById, remarks);
  }

  public createBadgeDefinition(data: any) {
    return badgeService.createBadgeDefinition(data);
  }

  public deleteBadgeDefinition(id: string) {
    return badgeService.deleteBadgeDefinition(id);
  }

  // --- COMMUNICATION SERVICE DELEGATES ---
  public getDirectMessages(): Promise<DirectMessage[]> {
    return communicationService.getDirectMessages();
  }

  public addDirectMessage(msg: Omit<DirectMessage, 'id' | 'createdAt'>): Promise<DirectMessage> {
    return communicationService.addDirectMessage(msg);
  }

  // --- ATTENDANCE SERVICE DELEGATES ---
  public getAttendance(): Promise<AttendanceRecord[]> {
    return attendanceService.getAttendance();
  }

  public markAttendance(
    studentId: string,
    studentName: string,
    date: string,
    status: 'present' | 'absent' | 'late' | 'excused',
    remarks?: string,
    markedById?: string,
  ): Promise<AttendanceRecord> {
    return attendanceService.markAttendance(
      studentId,
      studentName,
      date,
      status,
      remarks,
      markedById,
    );
  }

  // --- LOCATION SERVICE DELEGATES ---
  public getStudentLocations(): Promise<StudentLocationRecord[]> {
    return locationService.getStudentLocations();
  }

  public getStudentLocationById(studentId: string): Promise<StudentLocationRecord | undefined> {
    return locationService.getStudentLocationById(studentId);
  }

  public updateStudentLocation(
    studentId: string,
    studentName: string,
    location: string,
    category: StudentLocationRecord['category'],
    updatedBy: string,
    updatedByRole: 'teacher' | 'admin',
    busNumber?: string,
    notes?: string,
  ): Promise<StudentLocationRecord> {
    return locationService.updateStudentLocation(
      studentId,
      studentName,
      location,
      category,
      updatedBy,
      updatedByRole,
      busNumber,
      notes,
    );
  }

  // --- PARENT SERVICE DELEGATES ---
  public getParentControls(): Promise<Record<string, ParentControlSettings>> {
    return parentService.getParentControls();
  }

  public updateParentControls(
    studentId: string,
    settings: ParentControlSettings,
  ): Promise<ParentControlSettings> {
    return parentService.updateParentControls(studentId, settings);
  }

  // --- NOTIFICATION SERVICE DELEGATES ---
  public getNotificationPreferences(userId: string): Promise<NotificationPreference> {
    return notificationService.getNotificationPreferences(userId);
  }

  public updateNotificationPreferences(
    userId: string,
    prefs: Partial<NotificationPreference>,
  ): Promise<NotificationPreference> {
    return notificationService.updateNotificationPreferences(userId, prefs);
  }

  public getUserNotifications(userId: string): Promise<NotificationItem[]> {
    return notificationService.getUserNotifications(userId);
  }

  public markNotificationAsRead(id: string): Promise<boolean> {
    return notificationService.markAsRead(id);
  }

  public markAllNotificationsAsRead(userId: string): Promise<boolean> {
    return notificationService.markAllAsRead(userId);
  }

  public dispatchNotification(data: any): Promise<NotificationItem | null> {
    return notificationService.dispatchNotification(data);
  }

  public dispatchBroadcastNotification(data: any): Promise<number> {
    return notificationService.dispatchBroadcastNotification(data);
  }

  public deleteNotification(id: string): Promise<boolean> {
    return notificationService.deleteNotification(id);
  }

  public clearReadNotifications(userId: string): Promise<boolean> {
    return notificationService.clearReadNotifications(userId);
  }
}

export const lmsDB = new LMSDatabaseService();
export * from './services';
