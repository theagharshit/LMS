/**
 * Sikshya LMS Nepal - Main Application Context State
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
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
  Badge
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
  MOCK_SCHEDULE,
  MOCK_WEEKLY_SCHEDULE,
  MOCK_ATTENDANCE,
  MOCK_MODULES,
  MOCK_PARENT_CONTROLS,
  MOCK_CALENDAR_EVENTS,
  MOCK_MESSAGES,
  MOCK_SUBJECT_PERFORMANCE
} from '../data/mockData';

interface AppContextType {
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
  submitHomework: (assignmentId: string, fileUrl: string, fileName: string, responseText: string) => void;
  gradeSubmission: (submissionId: string, grade: number, feedback: string) => void;
  
  quizzes: Quiz[];
  addQuiz: (quiz: Omit<Quiz, 'id'>) => void;
  quizSubmissions: QuizSubmission[];
  submitQuizAnswers: (quizId: string, answers: Record<string, string>, score: number, totalPoints: number) => void;
  
  attendanceRecords: AttendanceRecord[];
  markAttendance: (studentId: string, studentName: string, date: string, status: 'present' | 'absent' | 'late' | 'excused', remarks?: string) => void;
  
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
  studentProfiles: StudentProfile[];
  
  // AI Modal States
  isAiTutorOpen: boolean;
  setIsAiTutorOpen: (open: boolean) => void;
  aiTutorInitialPrompt: string;
  setAiTutorInitialPrompt: (prompt: string) => void;
  
  isAiParentSummaryOpen: boolean;
  setIsAiParentSummaryOpen: (open: boolean) => void;
  
  notifications: { id: string; title: string; body: string; time: string; read: boolean; type: string }[];
  markNotificationRead: (id: string) => void;
  unreadCount: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allUsers] = useState<User[]>(MOCK_USERS);
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]); // Default Student Aarav
  const [studentProfiles] = useState<StudentProfile[]>(MOCK_STUDENTS);
  const [activeChildId, setActiveChildId] = useState<string>('user-stu-1');
  
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark' | 'soft'>(() => {
    const saved = localStorage.getItem('sikshya_theme');
    return (saved === 'dark' || saved === 'light' || saved === 'soft') ? saved : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('sikshya_theme', theme);
  }, [theme]);
  
  const [classrooms, setClassrooms] = useState<Classroom[]>(MOCK_CLASSROOMS);
  const [streamPosts, setStreamPosts] = useState<StreamPost[]>(MOCK_STREAM_POSTS);
  const [assignments, setAssignments] = useState<Assignment[]>(MOCK_ASSIGNMENTS);
  const [submissions, setSubmissions] = useState<Submission[]>(MOCK_SUBMISSIONS);
  const [quizzes, setQuizzes] = useState<Quiz[]>(MOCK_QUIZZES);
  const [quizSubmissions, setQuizSubmissions] = useState<QuizSubmission[]>(MOCK_QUIZ_SUBMISSIONS);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(MOCK_ATTENDANCE);
  const [parentControls, setParentControls] = useState<Record<string, ParentControlSettings>>(MOCK_PARENT_CONTROLS);
  const [messages, setMessages] = useState<DirectMessage[]>(MOCK_MESSAGES);
  
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(MOCK_WEEKLY_SCHEDULE);
  
  const updateDaySchedule = (day: DayOfWeek, periods: SchedulePeriod[]) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: periods
    }));
  };

  // Readonly mock collections
  const [schedule] = useState<SchedulePeriod[]>(MOCK_SCHEDULE);
  const [modules] = useState<ModuleItem[]>(MOCK_MODULES);
  const [calendarEvents] = useState<CalendarEvent[]>(MOCK_CALENDAR_EVENTS);
  const [subjectPerformances] = useState<SubjectPerformance[]>(MOCK_SUBJECT_PERFORMANCE);
  
  // AI Assistant states
  const [isAiTutorOpen, setIsAiTutorOpen] = useState<boolean>(false);
  const [aiTutorInitialPrompt, setAiTutorInitialPrompt] = useState<string>('');
  const [isAiParentSummaryOpen, setIsAiParentSummaryOpen] = useState<boolean>(false);
  
  // Notifications
  const [notifications, setNotifications] = useState([
    { id: 'n1', title: 'New Homework Assigned', body: 'Mr. Ramesh Thapa posted Exercise 4.1 in Math Grade 8', time: '10m ago', read: false, type: 'assignment' },
    { id: 'n2', title: 'Quiz Result Published', body: 'You scored 20/20 in Algebra Mid-Term Quiz! 🎉', time: '1h ago', read: false, type: 'quiz' },
    { id: 'n3', title: 'Attendance Marked', body: 'Marked Present today at 09:42 AM', time: '2h ago', read: true, type: 'attendance' },
    { id: 'n4', title: 'Janai Purnima Holiday Notice', body: 'School will remain closed on 12th August for Raksha Bandhan', time: 'Yesterday', read: true, type: 'announcement' }
  ]);

  const activeChildList = studentProfiles.filter(s => currentUser.childrenIds?.includes(s.id));
  const activeChild = studentProfiles.find(s => s.id === activeChildId) || studentProfiles[0];

  const switchUser = (userId: string) => {
    const target = allUsers.find(u => u.id === userId);
    if (target) {
      setCurrentUser(target);
      if (target.role === 'parent' && target.childrenIds && target.childrenIds.length > 0) {
        setActiveChildId(target.childrenIds[0]);
      }
      setActiveView('dashboard');
    }
  };

  const addClassroom = (classroomData: Omit<Classroom, 'id' | 'code' | 'studentCount'>) => {
    const newId = `cls-${Date.now()}`;
    const code = `CLS${Math.floor(1000 + Math.random() * 9000)}`;
    const newCls: Classroom = {
      ...classroomData,
      id: newId,
      code,
      studentCount: 1
    };
    setClassrooms(prev => [newCls, ...prev]);
  };

  const joinClassroomByCode = (code: string): boolean => {
    const found = classrooms.find(c => c.code.toUpperCase() === code.trim().toUpperCase());
    if (found) {
      setSelectedClassroomId(found.id);
      setActiveView('classroom');
      return true;
    }
    return false;
  };

  const addStreamPost = (postData: Omit<StreamPost, 'id' | 'createdAt' | 'commentsCount'>) => {
    const newPost: StreamPost = {
      ...postData,
      id: `post-${Date.now()}`,
      createdAt: new Date().toISOString(),
      commentsCount: 0,
      comments: []
    };
    setStreamPosts(prev => [newPost, ...prev]);
  };

  const addPostComment = (postId: string, commentText: string) => {
    setStreamPosts(prev =>
      prev.map(p => {
        if (p.id === postId) {
          const newComments = [
            ...(p.comments || []),
            {
              id: `c-${Date.now()}`,
              authorName: currentUser.name,
              authorAvatar: currentUser.avatar,
              content: commentText,
              createdAt: new Date().toISOString()
            }
          ];
          return {
            ...p,
            commentsCount: newComments.length,
            comments: newComments
          };
        }
        return p;
      })
    );
  };

  const addAssignment = (asgData: Omit<Assignment, 'id' | 'createdAt'>) => {
    const newAsg: Assignment = {
      ...asgData,
      id: `asg-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setAssignments(prev => [newAsg, ...prev]);
  };

  const submitHomework = (assignmentId: string, fileUrl: string, fileName: string, responseText: string) => {
    const existingIndex = submissions.findIndex(s => s.assignmentId === assignmentId && s.studentId === currentUser.id);
    const newSub: Submission = {
      id: existingIndex >= 0 ? submissions[existingIndex].id : `sub-${Date.now()}`,
      assignmentId,
      studentId: currentUser.id,
      studentName: currentUser.name,
      studentAvatar: currentUser.avatar,
      submittedAt: new Date().toISOString(),
      status: 'submitted',
      fileUrl,
      fileName,
      responseText
    };

    if (existingIndex >= 0) {
      const updated = [...submissions];
      updated[existingIndex] = newSub;
      setSubmissions(updated);
    } else {
      setSubmissions(prev => [newSub, ...prev]);
    }
  };

  const gradeSubmission = (submissionId: string, grade: number, feedback: string) => {
    setSubmissions(prev =>
      prev.map(s => {
        if (s.id === submissionId) {
          return {
            ...s,
            status: 'graded',
            grade,
            feedback,
            annotated: true
          };
        }
        return s;
      })
    );
  };

  const addQuiz = (quizData: Omit<Quiz, 'id'>) => {
    const newQuiz: Quiz = {
      ...quizData,
      id: `quiz-${Date.now()}`
    };
    setQuizzes(prev => [newQuiz, ...prev]);
  };

  const submitQuizAnswers = (quizId: string, answers: Record<string, string>, score: number, totalPoints: number) => {
    const newSub: QuizSubmission = {
      id: `qs-${Date.now()}`,
      quizId,
      studentId: currentUser.id,
      score,
      totalPoints,
      completedAt: new Date().toISOString(),
      answers
    };
    setQuizSubmissions(prev => [newSub, ...prev]);
  };

  const markAttendance = (
    studentId: string,
    studentName: string,
    date: string,
    status: 'present' | 'absent' | 'late' | 'excused',
    remarks?: string
  ) => {
    setAttendanceRecords(prev => {
      const existingIdx = prev.findIndex(a => a.studentId === studentId && a.date === date);
      const newRec: AttendanceRecord = {
        id: existingIdx >= 0 ? prev[existingIdx].id : `att-${Date.now()}`,
        studentId,
        studentName,
        date,
        status,
        markedBy: currentUser.name,
        remarks,
        checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = newRec;
        return updated;
      }
      return [newRec, ...prev];
    });
  };

  const updateParentControls = (studentId: string, settings: Partial<ParentControlSettings>) => {
    setParentControls(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {
          studentId,
          allowTeacherDirectChat: true,
          allowPeerDiscussion: false,
          missingHomeworkAlerts: true,
          lowAttendanceAlerts: true,
          weeklyDigestEmail: true,
          screenTimeLimitMinutes: 120,
          requireApprovalForOutboundMsgs: true
        }),
        ...settings
      }
    }));
  };

  const sendMessage = (receiverId: string, receiverName: string, content: string) => {
    const newMsg: DirectMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      senderAvatar: currentUser.avatar,
      receiverId,
      receiverName,
      content,
      createdAt: new Date().toISOString(),
      read: false
    };
    setMessages(prev => [newMsg, ...prev]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        allUsers,
        switchUser,
        activeChild,
        setActiveChildId,
        activeChildList,
        activeView,
        setActiveView,
        selectedClassroomId,
        setSelectedClassroomId,
        theme,
        setTheme,
        classrooms,
        addClassroom,
        joinClassroomByCode,
        streamPosts,
        addStreamPost,
        addPostComment,
        assignments,
        addAssignment,
        submissions,
        submitHomework,
        gradeSubmission,
        quizzes,
        addQuiz,
        quizSubmissions,
        submitQuizAnswers,
        attendanceRecords,
        markAttendance,
        parentControls,
        updateParentControls,
        messages,
        sendMessage,
        weeklySchedule,
        updateDaySchedule,
        schedule,
        modules,
        calendarEvents,
        subjectPerformances,
        studentProfiles,
        isAiTutorOpen,
        setIsAiTutorOpen,
        aiTutorInitialPrompt,
        setAiTutorInitialPrompt,
        isAiParentSummaryOpen,
        setIsAiParentSummaryOpen,
        notifications,
        markNotificationRead,
        unreadCount
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
