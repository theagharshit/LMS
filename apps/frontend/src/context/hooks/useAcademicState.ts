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
} from '@lms/shared';
import { apiFetch } from '../../utils/apiFetch';
import type { DatabaseBootstrapState } from '../databaseBootstrap';

export const useAcademicState = (currentUser: User, bootstrap?: DatabaseBootstrapState) => {
  const [badgeDefinitions, setBadgeDefinitions] = useState<BadgeDefinition[]>(
    () => bootstrap?.badgeDefinitions || [],
  );
  const [classrooms, setClassrooms] = useState<Classroom[]>(() => bootstrap?.classrooms || []);
  const [streamPosts, setStreamPosts] = useState<StreamPost[]>(() => bootstrap?.streamPosts || []);
  const [assignments, setAssignments] = useState<Assignment[]>(() => bootstrap?.assignments || []);
  const [submissions, setSubmissions] = useState<Submission[]>(() => bootstrap?.submissions || []);
  const [quizzes, setQuizzes] = useState<Quiz[]>(() => bootstrap?.quizzes || []);
  const [quizSubmissions, setQuizSubmissions] = useState<QuizSubmission[]>(
    () => bootstrap?.quizSubmissions || [],
  );

  const [subjectPerformances, setSubjectPerformances] = useState<SubjectPerformance[]>(
    () => bootstrap?.subjectPerformances || [],
  );
  const [termProgress, setTermProgress] = useState<TermProgress[]>(
    () => bootstrap?.termProgress || [],
  );
  const [studentActivities, setStudentActivities] = useState<StudentActivity[]>(
    () => bootstrap?.studentActivities || [],
  );
  const [resources, setResources] = useState<StudyResource[]>(() => bootstrap?.resources || []);
  const [modules, setModules] = useState<ModuleItem[]>(() => bootstrap?.modules || []);

  const addClassroom = async (classroomData: Omit<Classroom, 'id' | 'code' | 'studentCount'>) => {
    const response = await apiFetch('/api/db/classrooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(classroomData),
      feedback: {
        success: `Classroom “${classroomData.name}” was created.`,
        error: `Could not create classroom “${classroomData.name}”.`,
      },
    }).catch(() => null);
    if (!response?.ok) return;
    const data = await response.json();
    if (data.classroom) setClassrooms((prev) => [data.classroom, ...prev]);
  };

  const addStreamPost = async (
    postData: Omit<
      StreamPost,
      | 'id'
      | 'createdAt'
      | 'commentsCount'
      | 'authorId'
      | 'authorName'
      | 'authorAvatar'
      | 'authorRole'
    >,
  ) => {
    const response = await apiFetch('/api/db/stream-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData),
      feedback: {
        success: 'Announcement published to the classroom stream.',
        error: 'Could not publish the classroom announcement.',
      },
    }).catch(() => null);
    if (!response?.ok) return;
    const data = await response.json();
    if (data.post) setStreamPosts((prev) => [data.post, ...prev]);
  };

  const addPostComment = async (postId: string, commentText: string) => {
    const response = await apiFetch(`/api/db/stream-posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: commentText }),
      feedback: { success: 'Comment posted.', error: 'Could not post your comment.' },
    }).catch(() => null);
    if (!response?.ok) return;
    const data = await response.json();
    if (!data.comment) return;
    setStreamPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        const comments = [...(post.comments || []), data.comment];
        return { ...post, comments, commentsCount: comments.length };
      }),
    );
  };

  const addAssignment = async (asgData: Omit<Assignment, 'id' | 'createdAt'>) => {
    const response = await apiFetch('/api/db/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(asgData),
      feedback: {
        success: `Assignment “${asgData.title}” was published.`,
        error: `Could not publish assignment “${asgData.title}”.`,
      },
    }).catch(() => null);
    if (!response?.ok) return;
    const data = await response.json();
    if (data.assignment) setAssignments((prev) => [data.assignment, ...prev]);
  };

  const submitHomework = async (
    assignmentId: string,
    fileUrl: string,
    fileName: string,
    responseText: string,
  ) => {
    const existingIndex = submissions.findIndex(
      (s) => s.assignmentId === assignmentId && s.studentId === currentUser.id,
    );
    const response = await apiFetch('/api/db/submissions', {
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
        success: 'Homework submitted successfully.',
        error: 'Your homework could not be submitted. Please try again.',
      },
    }).catch(() => null);
    if (!response?.ok) return;
    const data = await response.json();
    const saved = data.submission as Submission;
    if (!saved?.id) return;
    if (existingIndex >= 0)
      setSubmissions((items) => items.map((item) => (item.id === saved.id ? saved : item)));
    else setSubmissions((items) => [saved, ...items]);
  };

  const gradeSubmission = async (submissionId: string, grade: number, feedback: string) => {
    const response = await apiFetch(`/api/db/submissions/${submissionId}/grade`, {
      method: 'PATCH',
      body: JSON.stringify({ grade, feedback }),
      feedback: {
        success: 'Grade and feedback saved.',
        error: 'Could not save the grade.',
      },
    }).catch(() => null);
    if (!response?.ok) return;
    const data = await response.json();
    if (data.submission)
      setSubmissions((items) =>
        items.map((submission) =>
          submission.id === submissionId ? { ...submission, ...data.submission } : submission,
        ),
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

  const addQuiz = async (quizData: Omit<Quiz, 'id'>) => {
    const response = await apiFetch('/api/db/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quizData),
      feedback: {
        success: `Quiz “${quizData.title}” was created.`,
        error: `Could not create quiz “${quizData.title}”.`,
      },
    }).catch(() => null);
    if (!response?.ok) return undefined;
    const result = await response.json();
    if (result.quiz) setQuizzes((items) => [result.quiz, ...items]);
    return result.quiz as Quiz | undefined;
  };

  const updateQuiz = (quizId: string, updates: Partial<Omit<Quiz, 'id'>>) => {
    const previous = quizzes.find((quiz) => quiz.id === quizId);
    setQuizzes((prev) => prev.map((q) => (q.id === quizId ? { ...q, ...updates } : q)));

    apiFetch(`/api/db/quizzes/${quizId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
      .then(async (response) => {
        if (!response.ok) {
          if (previous)
            setQuizzes((items) => items.map((item) => (item.id === quizId ? previous : item)));
          return;
        }
        const result = await response.json();
        if (result.quiz) {
          setQuizzes((items) => items.map((item) => (item.id === quizId ? result.quiz : item)));
        }
      })
      .catch((err) => {
        if (previous)
          setQuizzes((items) => items.map((item) => (item.id === quizId ? previous : item)));
        console.error('[AppContext] Failed to update quiz', err);
      });
  };

  const startQuizLive = (quizId: string) => {
    setQuizzes((prev) =>
      prev.map((q) =>
        q.id === quizId
          ? {
              ...q,
              status: 'live' as const,
              published: true,
              liveStartedAt: new Date().toISOString(),
            }
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

  const addResource = async (data: Omit<StudyResource, 'id' | 'createdAt'>) => {
    const response = await apiFetch('/api/db/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => null);
    if (!response?.ok) return undefined;
    const result = await response.json();
    if (result.resource) setResources((items) => [result.resource, ...items]);
    return result.resource as StudyResource | undefined;
  };

  const updateResource = (
    id: string,
    updates: Partial<Omit<StudyResource, 'id' | 'createdAt'>>,
  ) => {
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

  const addModule = async (
    data: Omit<ModuleItem, 'id' | 'completedByStudentIds'> & { completedByStudentIds?: string[] },
  ) => {
    const response = await apiFetch('/api/db/modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => null);
    if (!response?.ok) return undefined;
    const result = await response.json();
    if (result.module) setModules((items) => [result.module, ...items]);
    return result.module as ModuleItem | undefined;
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

  const submitQuizAnswers = async (
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

    const response = await apiFetch('/api/db/quiz-submissions', {
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
    }).catch(() => null);
    if (!response?.ok) return;
    const result = await response.json();
    if (result.quizSubmission) setQuizSubmissions((items) => [result.quizSubmission, ...items]);
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
