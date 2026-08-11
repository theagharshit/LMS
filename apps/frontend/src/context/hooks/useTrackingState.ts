import { useState } from 'react';
import {
  User,
  AttendanceRecord,
  ParentControlSettings,
  StudentLocationRecord,
  SchedulePeriod,
  ModuleItem,
  CalendarEvent,
  WeeklySchedule,
  DayOfWeek,
  LocationStatusCategory,
  MOCK_ATTENDANCE,
  MOCK_SCHEDULE,
  MOCK_MODULES,
  MOCK_CALENDAR_EVENTS,
  MOCK_WEEKLY_SCHEDULE,
} from '@lms/shared';
import { apiFetch } from '../../utils/apiFetch';

export const useTrackingState = (currentUser: User) => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(MOCK_ATTENDANCE);
  const [parentControls, setParentControls] = useState<Record<string, ParentControlSettings>>({});
  const [studentLocations, setStudentLocations] = useState<StudentLocationRecord[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(MOCK_WEEKLY_SCHEDULE);

  // Readonly collections
  const [schedule] = useState<SchedulePeriod[]>(MOCK_SCHEDULE);
  const [modules] = useState<ModuleItem[]>(MOCK_MODULES);
  const [calendarEvents] = useState<CalendarEvent[]>(MOCK_CALENDAR_EVENTS);

  const markAttendance = (
    studentId: string,
    studentName: string,
    date: string,
    status: 'present' | 'absent' | 'late' | 'excused',
    remarks?: string,
  ) => {
    setAttendanceRecords((prev) => {
      const existingIdx = prev.findIndex((a) => a.studentId === studentId && a.date === date);
      const newRec: AttendanceRecord = {
        id: existingIdx >= 0 ? prev[existingIdx].id : `att-${Date.now()}`,
        studentId,
        studentName,
        date,
        status,
        markedBy: currentUser.name,
        remarks,
        checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = newRec;
        return updated;
      }
      return [newRec, ...prev];
    });

    apiFetch('/api/db/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId,
        studentName,
        date,
        status,
        remarks,
        markedBy: currentUser.name,
      }),
      feedback: {
        success: `${studentName}'s attendance was marked ${status}.`,
        error: `Could not save ${studentName}'s attendance.`,
      },
    }).catch((err) => console.error('[AppContext] Failed to persist attendance', err));
  };

  const updateParentControls = (studentId: string, settings: Partial<ParentControlSettings>) => {
    const newSettings = {
      ...(parentControls[studentId] || {
        studentId,
        allowTeacherDirectChat: true,
        allowPeerDiscussion: false,
        missingHomeworkAlerts: true,
        lowAttendanceAlerts: true,
        weeklyDigestEmail: true,
        screenTimeLimitMinutes: 120,
        requireApprovalForOutboundMsgs: true,
      }),
      ...settings,
    };
    setParentControls((prev) => ({
      ...prev,
      [studentId]: newSettings,
    }));

    apiFetch('/api/db/parent-controls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, settings: newSettings }),
      feedback: {
        success: 'Parental control settings updated.',
        error: 'Could not update parental control settings.',
      },
    }).catch((err) => console.error('[AppContext] Failed to persist parent controls', err));
  };

  const updateStudentLocation = (
    studentId: string,
    studentName: string,
    location: string,
    category: LocationStatusCategory,
    updatedBy: string,
    updatedByRole: 'teacher' | 'admin',
    busNumber?: string,
    notes?: string,
  ) => {
    const updatedRecord: StudentLocationRecord = {
      id: `loc-${Date.now()}`,
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

    setStudentLocations((prev) => {
      const idx = prev.findIndex((l) => l.studentId === studentId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedRecord;
        return copy;
      }
      return [updatedRecord, ...prev];
    });

    apiFetch('/api/db/student-locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedRecord),
      feedback: {
        success: `${studentName}'s location was updated.`,
        error: `Could not update ${studentName}'s location.`,
      },
    }).catch((err) =>
      console.error('[AppContext] Failed to post student location to server DB', err),
    );
  };

  const updateDaySchedule = (day: DayOfWeek, periods: SchedulePeriod[]) => {
    setWeeklySchedule((prev) => ({
      ...prev,
      [day]: periods,
    }));
  };

  return {
    attendanceRecords,
    setAttendanceRecords,
    markAttendance,
    parentControls,
    setParentControls,
    updateParentControls,
    studentLocations,
    setStudentLocations,
    updateStudentLocation,
    weeklySchedule,
    setWeeklySchedule,
    updateDaySchedule,
    schedule,
    modules,
    calendarEvents,
  };
};
