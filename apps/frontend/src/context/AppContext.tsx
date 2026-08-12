/**
 * Sikshya LMS Nepal - Main Application Context State (Modularized Orchestrator)
 */

import React, { createContext, useContext } from 'react';
import { apiFetch } from '../utils/apiFetch';
import { AppContextType } from './AppContextType';

import { useAuthState } from './hooks/useAuthState';
import { useUIState } from './hooks/useUIState';
import { useAcademicState } from './hooks/useAcademicState';
import { useTrackingState } from './hooks/useTrackingState';
import { useCommunicationState } from './hooks/useCommunicationState';
import { useAdminState } from './hooks/useAdminState';
import { useSyncState } from './hooks/useSyncState';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authState = useAuthState();
  const uiState = useUIState();
  const academicState = useAcademicState(authState.currentUser);
  const trackingState = useTrackingState(authState.currentUser);
  const communicationState = useCommunicationState(authState.currentUser, authState.authReady);

  const adminState = useAdminState(
    authState.currentUser,
    authState.setStudentProfiles,
    authState.setAllUsers,
    academicState.setBadgeDefinitions,
    academicState.setClassrooms,
    authState.studentProfiles,
    authState.allUsers,
    academicState.badgeDefinitions,
    academicState.classrooms,
  );

  useSyncState(
    authState.authReady,
    authState.currentUser,
    authState.setCurrentUser,
    authState.setAllUsers,
    authState.setStudentProfiles,
    academicState.setBadgeDefinitions,
    academicState.setClassrooms,
    academicState.setStreamPosts,
    academicState.setAssignments,
    academicState.setSubmissions,
    academicState.setQuizzes,
    academicState.setQuizSubmissions,
    trackingState.setAttendanceRecords,
    trackingState.setParentControls,
    trackingState.setStudentLocations,
    communicationState.setMessages,
    academicState.setTermProgress,
    academicState.setStudentActivities,
    academicState.setSubjectPerformances,
    academicState.setResources,
    academicState.setModules,
    adminState.setTeacherAbsenceRequests,
    adminState.setSubstituteRequests,
    adminState.setTeacherAssignmentAuditLogs,
  );

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

  const joinClassroomByCode = async (code: string): Promise<boolean> => {
    // First check if already enrolled (classroom already in state for this student)
    const alreadyIn = academicState.classrooms.find(
      (c) =>
        c.code.toUpperCase() === code.trim().toUpperCase() &&
        (c.enrolledStudentIds?.includes(authState.currentUser.id) ?? false),
    );
    if (alreadyIn) {
      uiState.setSelectedClassroomId(alreadyIn.id);
      uiState.setActiveView('classroom');
      return true;
    }

    // Otherwise call the backend to enroll and get the updated classroom
    const res = await apiFetch('/api/db/classrooms/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim().toUpperCase() }),
    }).catch(() => null);

    if (!res?.ok) return false;

    const data = await res.json().catch(() => null);
    const classroom = data?.classroom;
    if (!classroom) return false;

    // Add or update classroom in local state so it's immediately visible
    academicState.setClassrooms((prev) => {
      const idx = prev.findIndex((c) => c.id === classroom.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = classroom;
        return updated;
      }
      return [...prev, classroom];
    });

    uiState.setSelectedClassroomId(classroom.id);
    uiState.setActiveView('classroom');
    return true;
  };

  const updateStudentIdCardPhoto = (studentId: string, idCardPhotoUrl: string) => {
    authState.updateStudentIdCardPhoto(studentId, idCardPhotoUrl);
    apiFetch(`/api/db/students/${studentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idCardPhotoUrl }),
    }).catch((err) => console.error('[AppContext] Failed to save ID card photo', err));
  };

  const assignBadge = async (
    studentProfileId: string,
    badgeDefinitionId: string,
    remarks?: string,
  ) => {
    try {
      const res = await apiFetch('/api/db/student-badges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentProfileId,
          badgeDefinitionId,
          remarks,
        }),
        feedback: {
          success: 'The badge was awarded to the student.',
          error: 'Could not award this badge.',
        },
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.status === 'success' && data.badge) {
          const updatedProfiles = authState.studentProfiles.map((p) => {
            if (p.id === studentProfileId) {
              const def = academicState.badgeDefinitions.find((bd) => bd.id === badgeDefinitionId);
              if (!def) return p;
              return {
                ...p,
                badges: [...p.badges, { ...data.badge, badgeDefinition: def }],
              };
            }
            return p;
          });
          authState.setStudentProfiles(updatedProfiles);
          adminState.addAuditLog(
            'Awarded Badge',
            'badge',
            `Awarded badge ID ${badgeDefinitionId} to student ID ${studentProfileId}.`,
          );
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
    isCompletedQuizzesOpen: uiState.isCompletedQuizzesOpen,
    setIsCompletedQuizzesOpen: uiState.setIsCompletedQuizzesOpen,

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
    updateQuiz: academicState.updateQuiz,
    startQuizLive: academicState.startQuizLive,
    deleteQuiz: academicState.deleteQuiz,
    updateQuizMarksMode: academicState.updateQuizMarksMode,
    quizSubmissions: academicState.quizSubmissions,
    submitQuizAnswers: academicState.submitQuizAnswers,
    resources: academicState.resources,
    addResource: academicState.addResource,
    updateResource: academicState.updateResource,
    deleteResource: academicState.deleteResource,
    addModule: academicState.addModule,
    updateModule: academicState.updateModule,
    deleteModule: academicState.deleteModule,
    subjectPerformances: academicState.subjectPerformances,
    termProgress: academicState.termProgress,
    studentActivities: academicState.studentActivities,
    studentProfiles: authState.studentProfiles,
    updateStudentIdCardPhoto,
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
    modules: academicState.modules,
    calendarEvents: trackingState.calendarEvents,

    // Communication State
    messages: communicationState.messages,
    sendMessage: communicationState.sendMessage,
    notifications: communicationState.notifications,
    notificationPreferences: communicationState.notificationPreferences,
    updateNotificationPreferences: communicationState.updateNotificationPreferences,
    markNotificationRead: communicationState.markNotificationRead,
    markAllNotificationsRead: communicationState.markAllNotificationsRead,
    deleteNotification: communicationState.deleteNotification,
    clearReadNotifications: communicationState.clearReadNotifications,
    dispatchNotification: communicationState.dispatchNotification,
    unreadCount: communicationState.unreadCount,

    // Admin State
    adminAuditLogs: adminState.adminAuditLogs,
    schoolAnnouncements: adminState.schoolAnnouncements,
    addStudentProfile: adminState.addStudentProfile,
    updateStudentProfile: adminState.updateStudentProfile,
    deleteStudentProfile: adminState.deleteStudentProfile,
    addTeacherProfile: adminState.addTeacherProfile,
    updateTeacherProfile: adminState.updateTeacherProfile,
    deleteTeacherProfile: adminState.deleteTeacherProfile,
    addParentProfile: adminState.addParentProfile,
    updateParentChildren: adminState.updateParentChildren,
    deleteParentProfile: adminState.deleteParentProfile,
    addBadgeDefinition: adminState.addBadgeDefinition,
    deleteBadgeDefinition: adminState.deleteBadgeDefinition,
    deleteClassroom: adminState.deleteClassroom,
    addAnnouncement: adminState.addAnnouncement,
    deleteAnnouncement: adminState.deleteAnnouncement,
    addAuditLog: adminState.addAuditLog,

    // Teacher Subject Assignments, Substitutes, Absence Requests & Audit Logs
    substituteRequests: adminState.substituteRequests,
    teacherAbsenceRequests: adminState.teacherAbsenceRequests,
    teacherAssignmentAuditLogs: adminState.teacherAssignmentAuditLogs,
    assignSubjectToTeacher: adminState.assignSubjectToTeacher,
    deassignSubjectFromTeacher: adminState.deassignSubjectFromTeacher,
    reassignSubject: adminState.reassignSubject,
    fetchEligibleSubstitutes: adminState.fetchEligibleSubstitutes,
    createSubstituteRequest: adminState.createSubstituteRequest,
    updateSubstituteStatus: adminState.updateSubstituteStatus,
    submitTeacherAbsenceRequest: adminState.submitTeacherAbsenceRequest,
    reviewTeacherAbsenceRequest: adminState.reviewTeacherAbsenceRequest,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
