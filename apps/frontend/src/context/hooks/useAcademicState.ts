import { useState } from 'react';
import {
  User,
  Classroom,
  StreamPost,
  Assignment,
  Submission,
  Quiz,
  QuizSubmission,
  SubjectPerformance,
  TermProgress,
  StudentActivity,
  BadgeDefinition,
  MOCK_BADGE_DEFINITIONS,
  MOCK_CLASSROOMS,
  MOCK_STREAM_POSTS,
  MOCK_ASSIGNMENTS,
  MOCK_SUBMISSIONS,
  MOCK_QUIZZES,
  MOCK_QUIZ_SUBMISSIONS,
  MOCK_SUBJECT_PERFORMANCE,
} from '@lms/shared';
import { apiFetch } from '../../utils/apiFetch';

export const useAcademicState = (currentUser: User) => {
  const [badgeDefinitions, setBadgeDefinitions] =
    useState<BadgeDefinition[]>(MOCK_BADGE_DEFINITIONS);
  const [classrooms, setClassrooms] = useState<Classroom[]>(MOCK_CLASSROOMS);
  const [streamPosts, setStreamPosts] = useState<StreamPost[]>(MOCK_STREAM_POSTS);
  const [assignments, setAssignments] = useState<Assignment[]>(MOCK_ASSIGNMENTS);
  const [submissions, setSubmissions] = useState<Submission[]>(MOCK_SUBMISSIONS);
  const [quizzes, setQuizzes] = useState<Quiz[]>(MOCK_QUIZZES);
  const [quizSubmissions, setQuizSubmissions] = useState<QuizSubmission[]>(MOCK_QUIZ_SUBMISSIONS);

  const [subjectPerformances, setSubjectPerformances] =
    useState<SubjectPerformance[]>(MOCK_SUBJECT_PERFORMANCE);
  const [termProgress, setTermProgress] = useState<TermProgress[]>([]);
  const [studentActivities, setStudentActivities] = useState<StudentActivity[]>([]);

  const addClassroom = (classroomData: Omit<Classroom, 'id' | 'code' | 'studentCount'>) => {
    const newId = `cls-${Date.now()}`;
    const code = `CLS${Math.floor(1000 + Math.random() * 9000)}`;
    const newCls: Classroom = {
      ...classroomData,
      id: newId,
      code,
      studentCount: 1,
    };
    setClassrooms((prev) => [newCls, ...prev]);

    apiFetch('/api/db/classrooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(classroomData),
    }).catch((err) => console.error('[AppContext] Failed to persist classroom', err));
  };

  const addStreamPost = (postData: Omit<StreamPost, 'id' | 'createdAt' | 'commentsCount'>) => {
    const newPost: StreamPost = {
      ...postData,
      id: `post-${Date.now()}`,
      createdAt: new Date().toISOString(),
      commentsCount: 0,
      comments: [],
    };
    setStreamPosts((prev) => [newPost, ...prev]);

    apiFetch('/api/db/stream-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData),
    }).catch((err) => console.error('[AppContext] Failed to persist stream post', err));
  };

  const addPostComment = (postId: string, commentText: string) => {
    const newComment = {
      id: `c-${Date.now()}`,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar || '',
      content: commentText,
      createdAt: new Date().toISOString(),
    };

    setStreamPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const newComments = [...(p.comments || []), newComment];
          return {
            ...p,
            commentsCount: newComments.length,
            comments: newComments,
          };
        }
        return p;
      }),
    );

    apiFetch(`/api/db/stream-posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newComment),
    }).catch((err) => console.error('[AppContext] Failed to persist comment', err));
  };

  const addAssignment = (asgData: Omit<Assignment, 'id' | 'createdAt'>) => {
    const newAsg: Assignment = {
      ...asgData,
      id: `asg-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setAssignments((prev) => [newAsg, ...prev]);

    apiFetch('/api/db/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(asgData),
    }).catch((err) => console.error('[AppContext] Failed to persist assignment', err));
  };

  const submitHomework = (
    assignmentId: string,
    fileUrl: string,
    fileName: string,
    responseText: string,
  ) => {
    const existingIndex = submissions.findIndex(
      (s) => s.assignmentId === assignmentId && s.studentId === currentUser.id,
    );
    const existing = existingIndex >= 0 ? submissions[existingIndex] : null;

    // Check if late based on assignment due date
    const targetAsg = assignments.find((a) => a.id === assignmentId);
    let isLate = false;
    const now = new Date();
    if (targetAsg?.dueDate) {
      const dueStr = `${targetAsg.dueDate}T${targetAsg.dueTime || '23:59'}:00`;
      const dueParsed = new Date(dueStr);
      if (!isNaN(dueParsed.getTime()) && now > dueParsed) {
        isLate = true;
      }
    }

    const previousHistory = existing?.history ? [...existing.history] : [];
    if (existing && previousHistory.length === 0) {
      previousHistory.push({
        id: `${existing.id}-v1`,
        version: 1,
        submittedAt: existing.submittedAt || new Date().toISOString(),
        fileUrl: existing.fileUrl,
        fileName: existing.fileName,
        responseText: existing.responseText,
        status: existing.status,
        grade: existing.grade,
        feedback: existing.feedback,
        isLate: existing.isLate || false,
      });
    }

    const nextVersion = previousHistory.length > 0 ? previousHistory.length + 1 : 1;
    const currentAttemptId = existing ? `${existing.id}-v${nextVersion}` : `sub-${Date.now()}-v1`;

    const newHistoryItem = {
      id: currentAttemptId,
      version: nextVersion,
      submittedAt: now.toISOString(),
      fileUrl,
      fileName,
      responseText,
      status: isLate ? ('late' as const) : ('submitted' as const),
      isLate,
    };

    const updatedHistory = [newHistoryItem, ...previousHistory];

    const newSub: Submission = {
      id: existing ? existing.id : `sub-${Date.now()}`,
      assignmentId,
      studentId: currentUser.id,
      studentName: currentUser.name,
      studentAvatar: currentUser.avatar,
      submittedAt: now.toISOString(),
      status: isLate ? 'late' : 'submitted',
      fileUrl,
      fileName,
      responseText,
      isLate,
      history: updatedHistory,
    };

    if (existingIndex >= 0) {
      const updated = [...submissions];
      updated[existingIndex] = newSub;
      setSubmissions(updated);
    } else {
      setSubmissions((prev) => [newSub, ...prev]);
    }

    apiFetch('/api/db/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignmentId,
        fileName,
        fileUrl,
        studentId: currentUser.id,
        notes: responseText,
      }),
    }).catch((err) => console.error('[AppContext] Failed to persist submission', err));
  };

  const gradeSubmission = (submissionId: string, grade: number, feedback: string) => {
    setSubmissions((prev) =>
      prev.map((s) => {
        if (s.id === submissionId) {
          return {
            ...s,
            status: 'graded',
            grade,
            feedback,
            annotated: true,
          };
        }
        return s;
      }),
    );
  };

  const updateQuizMarksMode = (quizId: string, revealMarksMode: 'immediate' | 'later') => {
    setQuizzes((prev) => prev.map((q) => (q.id === quizId ? { ...q, revealMarksMode } : q)));

    apiFetch(`/api/db/quizzes/${quizId}/marks-mode`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revealMarksMode }),
    }).catch((err) => console.error('[AppContext] Failed to update quiz marks mode', err));
  };

  const addQuiz = (quizData: Omit<Quiz, 'id'>) => {
    const newQuiz: Quiz = {
      ...quizData,
      id: `quiz-${Date.now()}`,
    };
    setQuizzes((prev) => [newQuiz, ...prev]);

    apiFetch('/api/db/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quizData),
    }).catch((err) => console.error('[AppContext] Failed to persist quiz', err));
  };

  const submitQuizAnswers = (
    quizId: string,
    answers: Record<string, string>,
    score: number,
    totalPoints: number,
  ) => {
    const newSub: QuizSubmission = {
      id: `qs-${Date.now()}`,
      quizId,
      studentId: currentUser.id,
      score,
      totalPoints,
      completedAt: new Date().toISOString(),
      answers,
    };
    setQuizSubmissions((prev) => [newSub, ...prev]);

    apiFetch('/api/db/quiz-submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quizId,
        studentId: currentUser.id,
        score,
        totalPoints,
        answers,
      }),
    }).catch((err) => console.error('[AppContext] Failed to persist quiz submission', err));
  };

  return {
    badgeDefinitions,
    setBadgeDefinitions,
    classrooms,
    setClassrooms,
    addClassroom,
    streamPosts,
    setStreamPosts,
    addStreamPost,
    addPostComment,
    assignments,
    setAssignments,
    addAssignment,
    submissions,
    setSubmissions,
    submitHomework,
    gradeSubmission,
    quizzes,
    setQuizzes,
    addQuiz,
    updateQuizMarksMode,
    quizSubmissions,
    setQuizSubmissions,
    submitQuizAnswers,
    subjectPerformances,
    setSubjectPerformances,
    termProgress,
    setTermProgress,
    studentActivities,
    setStudentActivities,
  };
};
