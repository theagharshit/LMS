import { useState } from 'react';
import {
  User,
  AttendanceRecord,
  ParentControlSettings,
  StudentLocationRecord,
  SchedulePeriod,
  CalendarEvent,
  WeeklySchedule,
  DayOfWeek,
  LocationStatusCategory,
} from '@lms/shared';
import { apiFetch } from '../../utils/apiFetch';
import type { DatabaseBootstrapState } from '../databaseBootstrap';

export const useTrackingState = (currentUser: User, bootstrap?: DatabaseBootstrapState) => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(
    () => bootstrap?.attendanceRecords || [],
  );
  const [parentControls, setParentControls] = useState<Record<string, ParentControlSettings>>(
    () => bootstrap?.parentControls || {},
  );
  const [studentLocations, setStudentLocations] = useState<StudentLocationRecord[]>(
    () => bootstrap?.studentLocations || [],
  );
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(
    bootstrap?.weeklySchedule || {
      Sunday: [],
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
    },
  );

  const [schedule, setSchedule] = useState<SchedulePeriod[]>(() => bootstrap?.schedule || []);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(
    () => bootstrap?.calendarEvents || [],
  );

  const markAttendance = async (
    studentId: string,
    studentName: string,
    date: string,
    status: 'present' | 'absent' | 'late' | 'excused',
    remarks?: string,
  ) => {
    const response = await apiFetch('/api/db/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId,
        date,
        status,
        remarks,
      }),
      feedback: {
        success: `${studentName}'s attendance was marked ${status}.`,
        error: `Could not save ${studentName}'s attendance.`,
      },
    }).catch(() => null);
    if (!response?.ok) return;
    const data = await response.json();
    const saved = data.attendance as AttendanceRecord;
    if (!saved?.id) return;
    setAttendanceRecords((prev) => {
      const existingIdx = prev.findIndex((record) => record.id === saved.id);
      if (existingIdx < 0) return [saved, ...prev];
      const updated = [...prev];
      updated[existingIdx] = saved;
      return updated;
    });
  };

  const updateParentControls = (studentId: string, settings: Partial<ParentControlSettings>) => {
    if (!parentControls[studentId]) return;
    apiFetch('/api/db/parent-controls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, settings }),
      feedback: {
        success: 'Parental control settings updated.',
        error: 'Could not update parental control settings.',
      },
    })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (data.parentControls)
          setParentControls((prev) => ({ ...prev, [studentId]: data.parentControls }));
      })
      .catch((err) => console.error('[AppContext] Failed to persist parent controls', err));
  };

  const updateStudentLocation = async (
    studentId: string,
    studentName: string,
    location: string,
    category: LocationStatusCategory,
    busNumber?: string,
    notes?: string,
  ) => {
    const response = await apiFetch('/api/db/student-locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId,
        location,
        category,
        busNumber,
        notes,
      }),
      feedback: {
        success: `${studentName}'s location was updated.`,
        error: `Could not update ${studentName}'s location.`,
      },
    }).catch(() => null);
    if (!response?.ok) return;
    const data = await response.json();
    const saved = data.location as StudentLocationRecord;
    if (!saved?.id) return;
    setStudentLocations((prev) => {
      const index = prev.findIndex((record) => record.studentId === studentId);
      if (index < 0) return [saved, ...prev];
      const copy = [...prev];
      copy[index] = saved;
      return copy;
    });
  };

  const updateDaySchedule = async (day: DayOfWeek, periods: SchedulePeriod[]) => {
    const dayOfWeek = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ].indexOf(day);
    const response = await apiFetch(`/api/db/timetable/days/${dayOfWeek}`, {
      method: 'PUT',
      body: JSON.stringify({
        teacherId: currentUser.id,
        periods: periods
          .filter((period) => period.classroomId)
          .map((period) => ({
            classroomId: period.classroomId,
            periodNumber: period.periodNumber,
            startTime: period.startTime,
            endTime: period.endTime,
            roomNumber: period.room,
            requiredBooks: period.requiredBooks,
          })),
      }),
      feedback: {
        success: `${day}'s timetable was saved.`,
        error: `${day}'s timetable could not be saved.`,
      },
    }).catch(() => null);
    if (!response?.ok) return;
    const data = await response.json();
    const savedPeriods: SchedulePeriod[] = (data.slots || []).map((slot: any) => ({
      id: slot.id,
      periodNumber: slot.periodNumber,
      startTime: slot.startTime,
      endTime: slot.endTime,
      subject: slot.subject.name,
      teacherName: slot.teacher.name,
      room: slot.roomNumber,
      classroomId: slot.classroomId,
      requiredBooks: slot.requiredBooks || undefined,
    }));
    setWeeklySchedule((prev) => ({
      ...prev,
      [day]: [...prev[day].filter((period) => !period.classroomId), ...savedPeriods].sort(
        (left, right) => left.startTime.localeCompare(right.startTime),
      ),
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
    setSchedule,
    calendarEvents,
    setCalendarEvents,
  };
};
