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
  StudyResource,
  ModuleItem,
  MOCK_BADGE_DEFINITIONS,
  MOCK_CLASSROOMS,
  MOCK_STREAM_POSTS,
  MOCK_ASSIGNMENTS,
  MOCK_SUBMISSIONS,
  MOCK_QUIZZES,
  MOCK_QUIZ_SUBMISSIONS,
  MOCK_SUBJECT_PERFORMANCE,
  MOCK_MODULES,
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
  const [resources, setResources] = useState<StudyResource[]>([]);
  const [modules, setModules] = useState<ModuleItem[]>(MOCK_MODULES);

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
      feedback: {
        success: `Classroom “${classroomData.name}” was created.`,
        error: `Could not create classroom “${classroomData.name}”.`,
      },
    })
      .then((response) => {
        if (!response.ok) setClassrooms((items) => items.filter((item) => item.id !== newId));
      })
      .catch((err) => {
        setClassrooms((items) => items.filter((item) => item.id !== newId));
        console.error('[AppContext] Failed to persist classroom', err);
      });
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
      feedback: {
        success: 'Announcement published to the classroom stream.',
        error: 'Could not publish the classroom announcement.',
      },
    })
      .then((response) => {
        if (!response.ok) setStreamPosts((items) => items.filter((item) => item.id !== newPost.id));
      })
      .catch((err) => {
        setStreamPosts((items) => items.filter((item) => item.id !== newPost.id));
        console.error('[AppContext] Failed to persist stream post', err);
      });
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
      feedback: { success: 'Comment posted.', error: 'Could not post your comment.' },
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
      feedback: {
        success: `Assignment “${asgData.title}” was published.`,
        error: `Could not publish assignment “${asgData.title}”.`,
      },
    })
      .then((response) => {
        if (!response.ok) setAssignments((items) => items.filter((item) => item.id !== newAsg.id));
      })
      .catch((err) => {
        setAssignments((items) => items.filter((item) => item.id !== newAsg.id));
        console.error('[AppContext] Failed to persist assignment', err);
      });
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
      feedback: {
        success: isLate
          ? 'Homework submitted and marked as late.'
          : 'Homework submitted successfully.',
        error: 'Your homework could not be submitted. Please try again.',
      },
    })
      .then((response) => {
        if (!response.ok && response.status !== 202) {
          setSubmissions((items) =>
            existing
              ? items.map((item) => (item.id === existing.id ? existing : item))
              : items.filter((item) => item.id !== newSub.id),
          );
        }
      })
      .catch((err) => {
        setSubmissions((items) =>
          existing
            ? items.map((item) => (item.id === existing.id ? existing : item))
            : items.filter((item) => item.id !== newSub.id),
        );
        console.error('[AppContext] Failed to persist submission', err);
      });
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
      feedback: {
        success:
          revealMarksMode === 'immediate'
            ? 'Quiz marks will be shown immediately.'
            : 'Quiz marks will remain hidden until released.',
        error: 'Could not update the marks visibility setting.',
      },
    }).catch((err) => console.error('[AppContext] Failed to update quiz marks mode', err));
  };

  const addQuiz = (quizData: Omit<Quiz, 'id'>) => {
    const newQuiz: Quiz = {
      ...quizData,
      id: `quiz-${Date.now()}`,
      status: quizData.status || (quizData.published ? 'published' : 'draft'),
    };
    setQuizzes((prev) => [newQuiz, ...prev]);

    apiFetch('/api/db/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quizData),
      feedback: {
        success: `Quiz “${quizData.title}” was created.`,
        error: `Could not create quiz “${quizData.title}”.`,
      },
    }).catch((err) => console.error('[AppContext] Failed to persist quiz', err));

    return newQuiz;
  };

  const updateQuiz = (quizId: string, updates: Partial<Omit<Quiz, 'id'>>) => {
    setQuizzes((prev) =>
      prev.map((q) => (q.id === quizId ? { ...q, ...updates } : q)),
    );

    apiFetch(`/api/db/quizzes/${quizId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch((err) => console.error('[AppContext] Failed to update quiz', err));
  };

  const startQuizLive = (quizId: string) => {
    setQuizzes((prev) =>
      prev.map((q) =>
        q.id === quizId
          ? { ...q, status: 'live' as const, published: true, liveStartedAt: new Date().toISOString() }
          : q,
      ),
    );

    apiFetch(`/api/db/quizzes/${quizId}/start`, {
      method: 'POST',
    }).catch((err) => console.error('[AppContext] Failed to start quiz', err));
  };

  const deleteQuiz = (quizId: string) => {
    setQuizzes((prev) => prev.filter((q) => q.id !== quizId));

    apiFetch(`/api/db/quizzes/${quizId}`, {
      method: 'DELETE',
    }).catch((err) => console.error('[AppContext] Failed to delete quiz', err));
  };

  const addResource = (data: Omit<StudyResource, 'id' | 'createdAt'>) => {
    const newResource: StudyResource = {
      ...data,
      id: `res-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setResources((prev) => [newResource, ...prev]);

    apiFetch('/api/db/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch((err) => console.error('[AppContext] Failed to persist resource', err));

    return newResource;
  };

  const updateResource = (id: string, updates: Partial<Omit<StudyResource, 'id' | 'createdAt'>>) => {
    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));

    apiFetch(`/api/db/resources/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch((err) => console.error('[AppContext] Failed to update resource', err));
  };

  const deleteResource = (id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));

    apiFetch(`/api/db/resources/${id}`, {
      method: 'DELETE',
    }).catch((err) => console.error('[AppContext] Failed to delete resource', err));
  };

  const addModule = (
    data: Omit<ModuleItem, 'id' | 'completedByStudentIds'> & { completedByStudentIds?: string[] },
  ) => {
    const newModule: ModuleItem = {
      ...data,
      id: `mod-${Date.now()}`,
      completedByStudentIds: data.completedByStudentIds || [],
    };
    setModules((prev) => [newModule, ...prev]);

    apiFetch('/api/db/modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch((err) => console.error('[AppContext] Failed to persist module', err));

    return newModule;
  };

  const updateModule = (id: string, updates: Partial<Omit<ModuleItem, 'id'>>) => {
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));

    apiFetch(`/api/db/modules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch((err) => console.error('[AppContext] Failed to update module', err));
  };

  const deleteModule = (id: string) => {
    setModules((prev) => prev.filter((m) => m.id !== id));

    apiFetch(`/api/db/modules/${id}`, {
      method: 'DELETE',
    }).catch((err) => console.error('[AppContext] Failed to delete module', err));
  };

  const submitQuizAnswers = (
    quizId: string,
    answers: Record<string, string>,
    score: number,
    totalPoints: number,
    startedAt?: string,
    timeSpentSeconds?: number,
  ) => {
    const existing = quizSubmissions.find(
      (s) => s.quizId === quizId && s.studentId === currentUser.id,
    );
    if (existing) return;

    const newSub: QuizSubmission = {
      id: `qs-${Date.now()}`,
      quizId,
      studentId: currentUser.id,
      score,
      totalPoints,
      completedAt: new Date().toISOString(),
      startedAt,
      timeSpentSeconds,
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
        startedAt,
        timeSpentSeconds,
      }),
      feedback: {
        success: 'Quiz answers submitted successfully.',
        error: 'Your quiz answers could not be submitted.',
      },
    })
      .then((response) => {
        if (!response.ok && response.status !== 202)
          setQuizSubmissions((items) => items.filter((item) => item.id !== newSub.id));
      })
      .catch((err) => {
        setQuizSubmissions((items) => items.filter((item) => item.id !== newSub.id));
        console.error('[AppContext] Failed to persist quiz submission', err);
      });
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
    updateQuiz,
    startQuizLive,
    deleteQuiz,
    updateQuizMarksMode,
    quizSubmissions,
    setQuizSubmissions,
    submitQuizAnswers,
    resources,
    setResources,
    addResource,
    updateResource,
    deleteResource,
    modules,
    setModules,
    addModule,
    updateModule,
    deleteModule,
    subjectPerformances,
    setSubjectPerformances,
    termProgress,
    setTermProgress,
    studentActivities,
    setStudentActivities,
  };
};
