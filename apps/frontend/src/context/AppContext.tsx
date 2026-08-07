/**
 * Sikshya LMS Nepal - Main Application Context State
 */

import React, { createContext, useContext, useEffect } from 'react';
import { User } from '@lms/shared';
import { apiFetch } from '../utils/apiFetch';
import { AppContextType } from './AppContextType';

import { useAuthState } from './hooks/useAuthState';
import { useUIState } from './hooks/useUIState';
import { useAcademicState } from './hooks/useAcademicState';
import { useTrackingState } from './hooks/useTrackingState';
import { useCommunicationState } from './hooks/useCommunicationState';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authState = useAuthState();
  const uiState = useUIState();
  const academicState = useAcademicState(authState.currentUser);
  const trackingState = useTrackingState(authState.currentUser);
  const communicationState = useCommunicationState(authState.currentUser);

  // Define cross-domain functions
  const switchUser = (userId: string) => {
    const target = authState.allUsers.find((u) => u.id === userId);
    if (target) {
      authState.setCurrentUser(target);
      if (target.role === 'parent' && target.childrenIds && target.childrenIds.length > 0) {
        authState.setActiveChildId(target.childrenIds[0]);
      }
      uiState.setActiveView('dashboard');
    }
  };

  const joinClassroomByCode = (code: string): boolean => {
    const found = academicState.classrooms.find(
      (c) => c.code.toUpperCase() === code.trim().toUpperCase(),
    );
    if (found) {
      uiState.setSelectedClassroomId(found.id);
      uiState.setActiveView('classroom');
      return true;
    }
    return false;
  };

  // Fetch live state from PostgreSQL database on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    apiFetch('/api/db/state')
      .then((res) => (res && res.ok ? res.json().catch(() => null) : null))
      .then((data) => {
        if (data && data.status === 'success') {
          if (data.users?.length) {
            authState.setAllUsers(data.users);
            const updatedCurrent = data.users.find((u: User) => u.id === authState.currentUser.id);
            if (updatedCurrent) authState.setCurrentUser(updatedCurrent);
          }
          if (data.studentProfiles) authState.setStudentProfiles(data.studentProfiles);
          if (data.badgeDefinitions) academicState.setBadgeDefinitions(data.badgeDefinitions);
          if (data.classrooms) academicState.setClassrooms(data.classrooms);
          if (data.streamPosts) academicState.setStreamPosts(data.streamPosts);
          if (data.assignments) academicState.setAssignments(data.assignments);
          if (data.submissions) academicState.setSubmissions(data.submissions);
          if (data.quizzes) academicState.setQuizzes(data.quizzes);
          if (data.quizSubmissions) academicState.setQuizSubmissions(data.quizSubmissions);
          if (data.attendance) trackingState.setAttendanceRecords(data.attendance);
          if (data.parentControls) trackingState.setParentControls(data.parentControls);
          if (data.studentLocations) trackingState.setStudentLocations(data.studentLocations);
          if (data.messages) communicationState.setMessages(data.messages);
          if (data.termProgress) academicState.setTermProgress(data.termProgress);
          if (data.studentActivities) academicState.setStudentActivities(data.studentActivities);
          if (data.subjectPerformances)
            academicState.setSubjectPerformances(data.subjectPerformances);
        }
      })
      .catch((err) => {
        console.error('[AppContext] Failed to load DB state:', err);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const assignBadge = async (studentProfileId: string, badgeDefinitionId: string, remarks?: string) => {
    try {
      const res = await apiFetch('/api/db/student-badges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentProfileId,
          badgeDefinitionId,
          assignedBy: authState.currentUser.name,
          remarks
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && data.badge) {
          const updatedProfiles = authState.studentProfiles.map(p => {
            if (p.id === studentProfileId) {
              const def = academicState.badgeDefinitions.find(bd => bd.id === badgeDefinitionId);
              if (!def) return p;
              return {
                ...p,
                badges: [
                  ...p.badges,
                  { ...data.badge, badgeDefinition: def }
                ]
              };
            }
            return p;
          });
          authState.setStudentProfiles(updatedProfiles);
        }
      }
    } catch (err) {
      console.error('[AppContext] Failed to assign badge', err);
    }
  };

  const value: AppContextType = {
    // Auth State
    currentUser: authState.currentUser,
    allUsers: authState.allUsers,
    switchUser,
    activeChild: authState.activeChild,
    setActiveChildId: authState.setActiveChildId,
    activeChildList: authState.activeChildList,

    // UI State
    activeView: uiState.activeView,
    setActiveView: uiState.setActiveView,
    selectedClassroomId: uiState.selectedClassroomId,
    setSelectedClassroomId: uiState.setSelectedClassroomId,
    theme: uiState.theme,
    setTheme: uiState.setTheme,
    isAiTutorOpen: uiState.isAiTutorOpen,
    setIsAiTutorOpen: uiState.setIsAiTutorOpen,
    aiTutorInitialPrompt: uiState.aiTutorInitialPrompt,
    setAiTutorInitialPrompt: uiState.setAiTutorInitialPrompt,
    isAiParentSummaryOpen: uiState.isAiParentSummaryOpen,
    setIsAiParentSummaryOpen: uiState.setIsAiParentSummaryOpen,

    // Academic State
    classrooms: academicState.classrooms,
    addClassroom: academicState.addClassroom,
    joinClassroomByCode,
    streamPosts: academicState.streamPosts,
    addStreamPost: academicState.addStreamPost,
    addPostComment: academicState.addPostComment,
    assignments: academicState.assignments,
    addAssignment: academicState.addAssignment,
    submissions: academicState.submissions,
    submitHomework: academicState.submitHomework,
    gradeSubmission: academicState.gradeSubmission,
    quizzes: academicState.quizzes,
    addQuiz: academicState.addQuiz,
    quizSubmissions: academicState.quizSubmissions,
    submitQuizAnswers: academicState.submitQuizAnswers,
    subjectPerformances: academicState.subjectPerformances,
    termProgress: academicState.termProgress,
    studentActivities: academicState.studentActivities,
    studentProfiles: authState.studentProfiles,
    badgeDefinitions: academicState.badgeDefinitions,
    assignBadge,

    // Tracking State
    attendanceRecords: trackingState.attendanceRecords,
    markAttendance: trackingState.markAttendance,
    parentControls: trackingState.parentControls,
    updateParentControls: trackingState.updateParentControls,
    studentLocations: trackingState.studentLocations,
    updateStudentLocation: trackingState.updateStudentLocation,
    weeklySchedule: trackingState.weeklySchedule,
    updateDaySchedule: trackingState.updateDaySchedule,
    schedule: trackingState.schedule,
    modules: trackingState.modules,
    calendarEvents: trackingState.calendarEvents,

    // Communication State
    messages: communicationState.messages,
    sendMessage: communicationState.sendMessage,
    notifications: communicationState.notifications,
    markNotificationRead: communicationState.markNotificationRead,
    unreadCount: communicationState.unreadCount,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
