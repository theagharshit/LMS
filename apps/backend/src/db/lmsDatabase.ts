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

  // --- BADGE SERVICE DELEGATES ---
  public getBadgeDefinitions() {
    return badgeService.getBadgeDefinitions();
  }

  public assignBadge(
    studentProfileId: string,
    badgeDefinitionId: string,
    assignedBy: string,
    remarks?: string,
  ) {
    return badgeService.assignBadge(studentProfileId, badgeDefinitionId, assignedBy, remarks);
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
  ): Promise<AttendanceRecord> {
    return attendanceService.markAttendance(studentId, studentName, date, status, remarks);
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
}

export const lmsDB = new LMSDatabaseService();
export * from './services';
