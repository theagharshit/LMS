import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Use cross-environment __dirname for ESM (tsx) and CJS (esbuild)
const _filename = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
const _dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(_filename);
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
  CalendarEvent,
  DirectMessage,
  SubjectPerformance,
} from '../types';
import {
  MOCK_USERS,
  MOCK_STUDENTS,
  MOCK_CLASSROOMS,
  MOCK_STREAM_POSTS,
  MOCK_ASSIGNMENTS,
  MOCK_SUBMISSIONS,
  MOCK_QUIZZES,
  MOCK_QUIZ_SUBMISSIONS,
  MOCK_ATTENDANCE,
  MOCK_PARENT_CONTROLS,
  MOCK_CALENDAR_EVENTS,
  MOCK_MESSAGES,
  MOCK_SUBJECT_PERFORMANCE,
} from '../data/mockData';
import { logger } from '../utils/logger';

interface DatabaseSchema {
  users: User[];
  studentProfiles: StudentProfile[];
  classrooms: Classroom[];
  streamPosts: StreamPost[];
  assignments: Assignment[];
  submissions: Submission[];
  quizzes: Quiz[];
  quizSubmissions: QuizSubmission[];
  attendance: AttendanceRecord[];
  parentControls: Record<string, ParentControlSettings>;
  studentLocations: StudentLocationRecord[];
  calendarEvents: CalendarEvent[];
  messages: DirectMessage[];
  subjectPerformances: SubjectPerformance[];
}

class LMSDatabaseService {
  private dbPath: string;
  private data: DatabaseSchema;

  constructor() {
    // Save data store json file in src/db/data_store.json
    this.dbPath = path.resolve(_dirname, 'data_store.json');
    this.data = this.loadDatabase();
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (fs.existsSync(this.dbPath)) {
        const fileContent = fs.readFileSync(this.dbPath, 'utf-8');
        const parsed = JSON.parse(fileContent);
        logger.info(`[LMSDatabase] Loaded database from ${this.dbPath}`);
        return this.ensureInitialLocations(parsed);
      }
    } catch (err) {
      logger.warn(`[LMSDatabase] Failed to read disk DB, initializing fresh instance: ${err}`);
    }

    // Seed database if empty or missing
    const seeded = this.ensureInitialLocations({
      users: MOCK_USERS,
      studentProfiles: MOCK_STUDENTS,
      classrooms: MOCK_CLASSROOMS,
      streamPosts: MOCK_STREAM_POSTS,
      assignments: MOCK_ASSIGNMENTS,
      submissions: MOCK_SUBMISSIONS,
      quizzes: MOCK_QUIZZES,
      quizSubmissions: MOCK_QUIZ_SUBMISSIONS,
      attendance: MOCK_ATTENDANCE,
      parentControls: MOCK_PARENT_CONTROLS,
      studentLocations: [],
      calendarEvents: MOCK_CALENDAR_EVENTS,
      messages: MOCK_MESSAGES,
      subjectPerformances: MOCK_SUBJECT_PERFORMANCE,
    });

    this.saveDatabase(seeded);
    return seeded;
  }

  private ensureInitialLocations(data: DatabaseSchema): DatabaseSchema {
    if (!data.studentLocations || data.studentLocations.length === 0) {
      data.studentLocations = [
        {
          id: 'loc-1',
          studentId: 'user-stu-1',
          studentName: 'Aarav Sharma',
          currentLocation: 'In Math Class (Room 204)',
          category: 'in_class',
          updatedBy: 'Mr. Ramesh Thapa',
          updatedByRole: 'teacher',
          updatedAt: new Date(Date.now() - 15 * 60000).toISOString(),
          notes: 'Active participation in Algebra lecture',
        },
        {
          id: 'loc-2',
          studentId: 'user-stu-2',
          studentName: 'Sunita Sharma',
          currentLocation: 'School Canteen (Lunch Time)',
          category: 'canteen_lunch',
          updatedBy: 'Duty Teacher Saraswati',
          updatedByRole: 'teacher',
          updatedAt: new Date(Date.now() - 10 * 60000).toISOString(),
          notes: 'Having healthy lunch at school cafeteria',
        },
      ];
    }
    return data;
  }

  private saveDatabase(dataToSave?: DatabaseSchema) {
    try {
      const payload = dataToSave || this.data;
      fs.writeFileSync(this.dbPath, JSON.stringify(payload, null, 2), 'utf-8');
      logger.info(`[LMSDatabase] Database saved to disk successfully.`);
    } catch (err) {
      logger.error(`[LMSDatabase] Failed to write database to disk`, err as Error);
    }
  }

  // --- Users & Profiles ---
  public getUsers(): User[] {
    return this.data.users;
  }

  public getStudentProfiles(): StudentProfile[] {
    return this.data.studentProfiles;
  }

  // --- Classrooms ---
  public getClassrooms(): Classroom[] {
    return this.data.classrooms;
  }

  public addClassroom(classroom: Omit<Classroom, 'id' | 'code' | 'studentCount'>): Classroom {
    const id = `cls-${Date.now()}`;
    const code = `CLS${Math.floor(1000 + Math.random() * 9000)}`;
    const newClassroom: Classroom = {
      ...classroom,
      id,
      code,
      studentCount: 30,
    };
    this.data.classrooms.unshift(newClassroom);
    this.saveDatabase();
    return newClassroom;
  }

  // --- Stream Posts ---
  public getStreamPosts(): StreamPost[] {
    return this.data.streamPosts;
  }

  public addStreamPost(post: Omit<StreamPost, 'id' | 'createdAt' | 'commentsCount'>): StreamPost {
    const newPost: StreamPost = {
      ...post,
      id: `post-${Date.now()}`,
      createdAt: 'Just now',
      commentsCount: 0,
      comments: [],
    };
    this.data.streamPosts.unshift(newPost);
    this.saveDatabase();
    return newPost;
  }

  // --- Homework & Submissions ---
  public getAssignments(): Assignment[] {
    return this.data.assignments;
  }

  public getSubmissions(): Submission[] {
    return this.data.submissions;
  }

  public submitHomework(
    assignmentId: string,
    fileName: string,
    fileUrl: string,
    studentId: string,
    notes?: string,
  ): Submission {
    const existingIndex = this.data.submissions.findIndex(
      (s) => s.assignmentId === assignmentId && s.studentId === studentId,
    );
    const newSubmission: Submission = {
      id: existingIndex >= 0 ? this.data.submissions[existingIndex].id : `sub-${Date.now()}`,
      assignmentId,
      studentId,
      studentName: 'Aarav Sharma',
      studentAvatar:
        'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
      fileName,
      fileUrl,
      submittedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'submitted',
      responseText: notes,
    };

    if (existingIndex >= 0) {
      this.data.submissions[existingIndex] = newSubmission;
    } else {
      this.data.submissions.unshift(newSubmission);
    }

    this.saveDatabase();
    return newSubmission;
  }

  // --- Quizzes ---
  public getQuizzes(): Quiz[] {
    return this.data.quizzes;
  }

  public addQuiz(quiz: Omit<Quiz, 'id' | 'createdAt'>): Quiz {
    const newQuiz: Quiz = {
      ...quiz,
      id: `quiz-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.data.quizzes.unshift(newQuiz);
    this.saveDatabase();
    return newQuiz;
  }

  // --- Attendance ---
  public getAttendance(): AttendanceRecord[] {
    return this.data.attendance;
  }

  public markAttendance(
    studentId: string,
    studentName: string,
    date: string,
    status: 'present' | 'absent' | 'late' | 'excused',
    remarks?: string,
  ): AttendanceRecord {
    const existingIndex = this.data.attendance.findIndex(
      (a) => a.studentId === studentId && a.date === date,
    );
    const record: AttendanceRecord = {
      id: existingIndex >= 0 ? this.data.attendance[existingIndex].id : `att-${Date.now()}`,
      studentId,
      studentName,
      date,
      status,
      remarks,
      markedBy: 'System',
    };

    if (existingIndex >= 0) {
      this.data.attendance[existingIndex] = record;
    } else {
      this.data.attendance.unshift(record);
    }

    this.saveDatabase();
    return record;
  }

  // --- Parent Controls ---
  public getParentControls(): Record<string, ParentControlSettings> {
    return this.data.parentControls;
  }

  public updateParentControls(
    studentId: string,
    settings: ParentControlSettings,
  ): ParentControlSettings {
    this.data.parentControls[studentId] = settings;
    this.saveDatabase();
    return settings;
  }

  // --- "Where is Student?" Real-Time Tracker ---
  public getStudentLocations(): StudentLocationRecord[] {
    return this.data.studentLocations;
  }

  public getStudentLocationById(studentId: string): StudentLocationRecord | undefined {
    return this.data.studentLocations.find((l) => l.studentId === studentId);
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
  ): StudentLocationRecord {
    const existingIndex = this.data.studentLocations.findIndex((l) => l.studentId === studentId);
    const newRecord: StudentLocationRecord = {
      id: existingIndex >= 0 ? this.data.studentLocations[existingIndex].id : `loc-${Date.now()}`,
      studentId,
      studentName,
      currentLocation: location,
      category,
      updatedBy,
      updatedByRole,
      updatedAt: new Date().toISOString(),
      busNumber,
      notes,
    };

    if (existingIndex >= 0) {
      this.data.studentLocations[existingIndex] = newRecord;
    } else {
      this.data.studentLocations.unshift(newRecord);
    }

    this.saveDatabase();
    logger.info(`[LMSDatabase] Updated real-time location for ${studentName}: "${location}"`);
    return newRecord;
  }
}

export const lmsDB = new LMSDatabaseService();
