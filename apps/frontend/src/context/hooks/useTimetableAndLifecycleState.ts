import { useState, useEffect, useCallback } from 'react';
import {
  User,
  TimetableSlot,
  SchoolTimingConfig,
  AcademicTerm,
  SchoolHoliday,
  AcademicYear,
} from '@lms/shared';
import { apiFetch } from '../../utils/apiFetch';
import { toast } from '@utils/toast';

const DEFAULT_TIMING_CONFIG: SchoolTimingConfig = {
  schoolStartTime: '08:45',
  schoolEndTime: '15:15',
  periodDurationMinutes: 45,
  periodsPerDay: 6,
  breaks: [
    {
      id: 'break-assembly',
      name: 'Morning Assembly & Prayer',
      type: 'assembly',
      startTime: '08:45',
      endTime: '09:00',
      afterPeriod: 0,
      sequence: 1,
    },
    {
      id: 'break-tiffin',
      name: 'Morning Snack & Tiffin Break',
      type: 'snack',
      startTime: '10:30',
      endTime: '10:45',
      afterPeriod: 2,
      sequence: 2,
    },
    {
      id: 'break-lunch',
      name: 'Mid-Day Lunch & Canteen',
      type: 'lunch',
      startTime: '12:15',
      endTime: '13:00',
      afterPeriod: 4,
      sequence: 3,
    },
    {
      id: 'break-dismissal',
      name: 'School Dismissal & Bus Departures',
      type: 'dismissal',
      startTime: '15:15',
      endTime: '15:30',
      afterPeriod: 6,
      sequence: 4,
    },
  ],
};

export const useTimetableAndLifecycleState = (currentUser: User | null) => {
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [academicTerms, setAcademicTerms] = useState<AcademicTerm[]>([]);
  const [schoolHolidays, setSchoolHolidays] = useState<SchoolHoliday[]>([]);
  const [schoolTimingConfig, setSchoolTimingConfig] = useState<SchoolTimingConfig>(() => {
    try {
      const stored = localStorage.getItem('lms_school_timing_config');
      return stored ? JSON.parse(stored) : DEFAULT_TIMING_CONFIG;
    } catch {
      return DEFAULT_TIMING_CONFIG;
    }
  });

  const fetchTimetableSlots = useCallback(async (params?: { studentId?: string; teacherId?: string; academicYearId?: string }) => {
    try {
      const query = new URLSearchParams();
      if (params?.studentId) query.set('studentId', params.studentId);
      if (params?.teacherId) query.set('teacherId', params.teacherId);
      if (params?.academicYearId) query.set('academicYearId', params.academicYearId);

      const res = await apiFetch(`/api/db/timetable/slots${query.toString() ? `?${query.toString()}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        if (data.slots) {
          setTimetableSlots(data.slots);
        }
      }
    } catch (err) {
      console.error('Failed to fetch timetable slots:', err);
    }
  }, []);

  const fetchAcademicYears = useCallback(async () => {
    try {
      const res = await apiFetch('/api/db/academic-years');
      if (res.ok) {
        const data = await res.json();
        if (data.academicYears) {
          setAcademicYears(data.academicYears);
        }
      }
    } catch (err) {
      console.error('Failed to fetch academic years:', err);
    }
  }, []);

  const fetchAcademicTerms = useCallback(async (academicYearId?: string) => {
    try {
      const query = academicYearId ? `?academicYearId=${academicYearId}` : '';
      const res = await apiFetch(`/api/db/terms${query}`);
      if (res.ok) {
        const data = await res.json();
        if (data.terms) {
          setAcademicTerms(data.terms);
        }
      }
    } catch (err) {
      console.error('Failed to fetch academic terms:', err);
    }
  }, []);

  const fetchSchoolHolidays = useCallback(async (academicYearId?: string) => {
    try {
      const query = academicYearId ? `?academicYearId=${academicYearId}` : '';
      const res = await apiFetch(`/api/db/holidays${query}`);
      if (res.ok) {
        const data = await res.json();
        if (data.holidays) {
          setSchoolHolidays(data.holidays);
        }
      }
    } catch (err) {
      console.error('Failed to fetch school holidays:', err);
    }
  }, []);

  const fetchBellSchedule = useCallback(async () => {
    try {
      const res = await apiFetch('/api/db/bell-schedule');
      if (res.ok) {
        const data = await res.json();
        if (data.entries && data.entries.length > 0) {
          setSchoolTimingConfig((prev) => ({
            ...prev,
            breaks: data.entries.map((e: any) => ({
              id: e.id,
              name: e.name,
              type: e.type,
              startTime: e.startTime,
              endTime: e.endTime,
              sequence: e.sequence,
            })),
          }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch bell schedule:', err);
    }
  }, []);

  // Initial load when user exists
  useEffect(() => {
    if (currentUser?.id) {
      fetchTimetableSlots();
      fetchAcademicYears();
      fetchAcademicTerms();
      fetchSchoolHolidays();
      fetchBellSchedule();
    }
  }, [currentUser?.id, fetchTimetableSlots, fetchAcademicYears, fetchAcademicTerms, fetchSchoolHolidays, fetchBellSchedule]);

  const saveTimetableSlot = async (slot: Partial<TimetableSlot>): Promise<boolean> => {
    try {
      const res = await apiFetch('/api/db/timetable/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slot),
        feedback: {
          success: 'Timetable period slot saved successfully.',
          error: 'Could not save timetable period slot.',
        },
      });
      if (res.ok) {
        await fetchTimetableSlots();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Save slot error:', err);
      return false;
    }
  };

  const deleteTimetableSlot = async (slotId: string): Promise<boolean> => {
    try {
      const res = await apiFetch(`/api/db/timetable/slots/${slotId}`, {
        method: 'DELETE',
        feedback: {
          success: 'Timetable slot removed.',
          error: 'Could not remove timetable slot.',
        },
      });
      if (res.ok) {
        setTimetableSlots((prev) => prev.filter((s) => s.id !== slotId));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Delete slot error:', err);
      return false;
    }
  };

  const validateTimetableClash = async (data: {
    academicYearId: string;
    dayOfWeek: number;
    periodNumber: number;
    teacherId: string;
    cohortId: string;
    roomNumber: string;
    id?: string;
  }) => {
    try {
      const res = await apiFetch('/api/db/timetable/validate-clash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const body = await res.json();
        return { valid: body.valid, conflicts: body.conflicts || [] };
      }
      return { valid: false, conflicts: [] };
    } catch (err) {
      return { valid: false, conflicts: [] };
    }
  };

  const updateSchoolTimingConfig = async (newConfig: SchoolTimingConfig) => {
    setSchoolTimingConfig(newConfig);
    try {
      localStorage.setItem('lms_school_timing_config', JSON.stringify(newConfig));
      // Also persist bell schedule entries to backend
      if (newConfig.breaks && newConfig.breaks.length > 0) {
        await apiFetch('/api/db/bell-schedule', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entries: newConfig.breaks.map((b, idx) => ({
              name: b.name,
              type: b.type,
              sequence: b.sequence || idx + 1,
              startTime: b.startTime,
              endTime: b.endTime || b.startTime,
            })),
          }),
        });
      }
      toast.success('School schedule & breaks configuration updated.');
    } catch (err) {
      console.error('Failed to persist school timing config:', err);
    }
  };

  const saveAcademicTerm = async (term: Partial<AcademicTerm>): Promise<boolean> => {
    try {
      const url = term.id ? `/api/db/terms/${term.id}` : '/api/db/terms';
      const method = term.id ? 'PUT' : 'POST';
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(term),
        feedback: {
          success: `Term "${term.name}" saved.`,
          error: `Could not save term "${term.name}".`,
        },
      });
      if (res.ok) {
        await fetchAcademicTerms();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Save term error:', err);
      return false;
    }
  };

  const deleteAcademicTerm = async (termId: string): Promise<boolean> => {
    try {
      const res = await apiFetch(`/api/db/terms/${termId}`, {
        method: 'DELETE',
        feedback: {
          success: 'Academic term deleted.',
          error: 'Could not delete academic term.',
        },
      });
      if (res.ok) {
        setAcademicTerms((prev) => prev.filter((t) => t.id !== termId));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Delete term error:', err);
      return false;
    }
  };

  const saveSchoolHoliday = async (holiday: Partial<SchoolHoliday>): Promise<boolean> => {
    try {
      const res = await apiFetch('/api/db/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(holiday),
        feedback: {
          success: `Holiday "${holiday.name}" added.`,
          error: `Could not add holiday "${holiday.name}".`,
        },
      });
      if (res.ok) {
        await fetchSchoolHolidays();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Save holiday error:', err);
      return false;
    }
  };

  const deleteSchoolHoliday = async (holidayId: string): Promise<boolean> => {
    try {
      const res = await apiFetch(`/api/db/holidays/${holidayId}`, {
        method: 'DELETE',
        feedback: {
          success: 'Holiday removed.',
          error: 'Could not remove holiday.',
        },
      });
      if (res.ok) {
        setSchoolHolidays((prev) => prev.filter((h) => h.id !== holidayId));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Delete holiday error:', err);
      return false;
    }
  };

  const executeAcademicRollover = async (params: {
    fromAcademicYearId: string;
    toAcademicYearId: string;
    passPercentage?: number;
    graduationGrade?: number;
  }): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
      const res = await apiFetch('/api/db/academic-rollover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        feedback: {
          success: 'Academic rollover executed successfully!',
          error: 'Academic rollover failed.',
        },
      });
      if (res.ok) {
        const data = await res.json();
        await fetchAcademicYears();
        await fetchTimetableSlots();
        return { success: true, data: data.data };
      } else {
        const err = await res.json();
        return { success: false, error: err.message || 'Rollover failed' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during rollover' };
    }
  };

  return {
    timetableSlots,
    setTimetableSlots,
    academicYears,
    academicTerms,
    schoolHolidays,
    schoolTimingConfig,
    fetchTimetableSlots,
    fetchAcademicYears,
    fetchAcademicTerms,
    fetchSchoolHolidays,
    fetchBellSchedule,
    saveTimetableSlot,
    deleteTimetableSlot,
    validateTimetableClash,
    updateSchoolTimingConfig,
    saveAcademicTerm,
    deleteAcademicTerm,
    saveSchoolHoliday,
    deleteSchoolHoliday,
    executeAcademicRollover,
  };
};
