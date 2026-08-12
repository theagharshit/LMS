import { useEffect } from 'react';
import { User } from '@lms/shared';
import { apiFetch } from '../../utils/apiFetch';

export const useSyncState = (
  authReady: boolean,
  currentUser: User,
  setCurrentUser: (user: User) => void,
  setAllUsers: (users: User[]) => void,
  setStudentProfiles: (profiles: any) => void,
  setBadgeDefinitions: (defs: any) => void,
  setClassrooms: (classrooms: any) => void,
  setStreamPosts: (posts: any) => void,
  setAssignments: (asgs: any) => void,
  setSubmissions: (subs: any) => void,
  setQuizzes: (quizzes: any) => void,
  setQuizSubmissions: (subs: any) => void,
  setAttendanceRecords: (records: any) => void,
  setParentControls: (controls: any) => void,
  setStudentLocations: (locations: any) => void,
  setMessages: (messages: any) => void,
  setTermProgress: (progress: any) => void,
  setStudentActivities: (activities: any) => void,
  setSubjectPerformances: (performances: any) => void,
  setResources: (resources: any) => void,
  setModules: (modules: any) => void,
  setTeacherAbsenceRequests?: (reqs: any) => void,
  setSubstituteRequests?: (reqs: any) => void,
  setTeacherAssignmentAuditLogs?: (logs: any) => void,
) => {
  useEffect(() => {
    if (typeof window === 'undefined' || !authReady) return;
    apiFetch('/api/db/state', {
      feedback: {
        success: false,
        error: 'Live school data is unavailable. The app is showing its last safe local state.',
        errorTitle: 'Working from cached data',
      },
    })
      .then((res) => (res && res.ok ? res.json().catch(() => null) : null))
      .then((data) => {
        if (data && data.status === 'success') {
          if (data.users?.length) {
            setAllUsers(data.users);
            const updatedCurrent = data.users.find((u: User) => u.id === currentUser.id);
            if (updatedCurrent) setCurrentUser(updatedCurrent);
          }
          if (data.studentProfiles) setStudentProfiles(data.studentProfiles);
          if (data.badgeDefinitions) setBadgeDefinitions(data.badgeDefinitions);
          if (data.classrooms) setClassrooms(data.classrooms);
          if (data.streamPosts) setStreamPosts(data.streamPosts);
          if (data.assignments) setAssignments(data.assignments);
          if (data.submissions) setSubmissions(data.submissions);
          if (data.quizzes) setQuizzes(data.quizzes);
          if (data.quizSubmissions) setQuizSubmissions(data.quizSubmissions);
          if (data.attendance) setAttendanceRecords(data.attendance);
          if (data.parentControls) setParentControls(data.parentControls);
          if (data.studentLocations) setStudentLocations(data.studentLocations);
          if (data.messages) setMessages(data.messages);
          if (data.termProgress) setTermProgress(data.termProgress);
          if (data.studentActivities) setStudentActivities(data.studentActivities);
          if (data.subjectPerformances) setSubjectPerformances(data.subjectPerformances);
          if (data.resources) setResources(data.resources);
          if (data.modules) setModules(data.modules);
          if (data.teacherAbsenceRequests && setTeacherAbsenceRequests) {
            setTeacherAbsenceRequests(data.teacherAbsenceRequests);
          }
          if (data.substituteRequests && setSubstituteRequests) {
            setSubstituteRequests(data.substituteRequests);
          }
          if (data.teacherAssignmentAuditLogs && setTeacherAssignmentAuditLogs) {
            setTeacherAssignmentAuditLogs(data.teacherAssignmentAuditLogs);
          }
        }
      })
      .catch((err) => {
        console.error('[AppContext] Failed to load DB state:', err);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, currentUser?.id]);
};
