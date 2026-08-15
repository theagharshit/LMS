import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Maximize2,
  Minimize2,
  GraduationCap,
  Sparkles,
  BookOpen,
  RefreshCw,
  Sun,
  Coffee,
  Utensils,
  LogOut,
  CalendarCheck,
  CalendarX,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TimetableSlot, SchoolTimingConfig } from '@lms/shared';
import { toast } from '@utils/toast';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_INDEX_MAP: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const SUBJECT_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  math: { bg: 'bg-indigo-900/30', border: 'border-indigo-500/40', text: 'text-indigo-300', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  mathematics: { bg: 'bg-indigo-900/30', border: 'border-indigo-500/40', text: 'text-indigo-300', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  science: { bg: 'bg-emerald-900/30', border: 'border-emerald-500/40', text: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  physics: { bg: 'bg-emerald-900/30', border: 'border-emerald-500/40', text: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  chemistry: { bg: 'bg-emerald-900/30', border: 'border-emerald-500/40', text: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  biology: { bg: 'bg-emerald-900/30', border: 'border-emerald-500/40', text: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  english: { bg: 'bg-amber-900/30', border: 'border-amber-500/40', text: 'text-amber-300', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  nepali: { bg: 'bg-purple-900/30', border: 'border-purple-500/40', text: 'text-purple-300', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  social: { bg: 'bg-rose-900/30', border: 'border-rose-500/40', text: 'text-rose-300', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  computer: { bg: 'bg-sky-900/30', border: 'border-sky-500/40', text: 'text-sky-300', badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  opt: { bg: 'bg-teal-900/30', border: 'border-teal-500/40', text: 'text-teal-300', badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
};

const getSubjectTheme = (subjectName?: string) => {
  if (!subjectName) return { bg: 'bg-slate-800/40', border: 'border-slate-700', text: 'text-slate-300', badge: 'bg-slate-700 text-slate-300 border-slate-600' };
  const lower = subjectName.toLowerCase();
  for (const [key, theme] of Object.entries(SUBJECT_COLORS)) {
    if (lower.includes(key)) return theme;
  }
  return { bg: 'bg-blue-900/20', border: 'border-blue-500/30', text: 'text-blue-300', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
};

export const AdminTimetableHub: React.FC = () => {
  const {
    classrooms,
    allUsers,
    timetableSlots,
    academicYears,
    academicTerms,
    schoolHolidays,
    schoolTimingConfig,
    saveTimetableSlot,
    deleteTimetableSlot,
    validateTimetableClash,
    updateSchoolTimingConfig,
    saveAcademicTerm,
    deleteAcademicTerm,
    saveSchoolHoliday,
    deleteSchoolHoliday,
    executeAcademicRollover,
  } = useApp();

  const [activeView, setActiveView] = useState<'matrix' | 'cohort' | 'teacher' | 'room'>('matrix');
  const [selectedCohort, setSelectedCohort] = useState<string>('Grade 8 - Section A');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Modals
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [isBellScheduleModalOpen, setIsBellScheduleModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isHolidaysModalOpen, setIsHolidaysModalOpen] = useState(false);
  const [isRolloverModalOpen, setIsRolloverModalOpen] = useState(false);

  // Timing Config local editing state
  const [timingConfig, setTimingConfig] = useState<SchoolTimingConfig>(schoolTimingConfig);

  useEffect(() => {
    setTimingConfig(schoolTimingConfig);
  }, [schoolTimingConfig]);

  // Slot Form State
  const [slotForm, setSlotForm] = useState<{
    id?: string;
    classroomId: string;
    teacherId: string;
    dayOfWeek: number;
    periodNumber: number;
    startTime: string;
    endTime: string;
    roomNumber: string;
    requiredBooks: string;
  }>({
    classroomId: '',
    teacherId: '',
    dayOfWeek: 0,
    periodNumber: 1,
    startTime: '09:00',
    endTime: '09:45',
    roomNumber: '',
    requiredBooks: '',
  });

  const [clashWarning, setClashWarning] = useState<string | null>(null);
  const [isCheckingClash, setIsCheckingClash] = useState(false);

  // Terms & Rollover Form
  const [newTermName, setNewTermName] = useState('');
  const [newTermStart, setNewTermStart] = useState('');
  const [newTermEnd, setNewTermEnd] = useState('');
  const [newTermSeq, setNewTermSeq] = useState(1);

  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayDesc, setNewHolidayDesc] = useState('');

  const [rolloverTargetYear, setRolloverTargetYear] = useState('');
  const [rolloverPassPercent, setRolloverPassPercent] = useState(40);
  const [isPerformingRollover, setIsPerformingRollover] = useState(false);
  const [rolloverResult, setRolloverResult] = useState<any>(null);

  const teachers = useMemo(() => allUsers.filter((u) => u.role === 'teacher'), [allUsers]);
  const activeYear = useMemo(() => academicYears.find((y) => y.isActive) || academicYears[0], [academicYears]);

  // Unique Cohorts from classrooms
  const cohorts = useMemo(() => {
    const set = new Set<string>();
    classrooms.forEach((c) => {
      if (c.gradeLevel && c.section) set.add(`Grade ${c.gradeLevel} - Section ${c.section}`);
      else if (c.name) set.add(c.name);
    });
    return Array.from(set);
  }, [classrooms]);

  // Unique Rooms from classrooms & slots
  const rooms = useMemo(() => {
    const set = new Set<string>();
    classrooms.forEach((c) => c.roomNumber && set.add(c.roomNumber));
    timetableSlots.forEach((s) => s.roomNumber && set.add(s.roomNumber));
    return Array.from(set).sort();
  }, [classrooms, timetableSlots]);

  const handleOpenAddSlot = (dayOfWeek?: number, periodNumber?: number) => {
    const selectedClass = classrooms.find((c) =>
      selectedCohort ? `${c.gradeLevel ? `Grade ${c.gradeLevel} - Section ${c.section}` : c.name}` === selectedCohort : true,
    ) || classrooms[0];

    const defDay = dayOfWeek !== undefined ? dayOfWeek : 0;
    const defPeriod = periodNumber || 1;

    // Approximate default times based on period
    const startHour = 9 + Math.floor((defPeriod - 1) * 0.75);
    const startMin = ((defPeriod - 1) * 45) % 60;
    const endHour = 9 + Math.floor(defPeriod * 0.75);
    const endMin = (defPeriod * 45) % 60;
    const startFormatted = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
    const endFormatted = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

    setSlotForm({
      classroomId: selectedClass?.id || '',
      teacherId: selectedClass?.teacherId || (teachers[0]?.id ?? ''),
      dayOfWeek: defDay,
      periodNumber: defPeriod,
      startTime: startFormatted,
      endTime: endFormatted,
      roomNumber: selectedClass?.roomNumber || 'Room 101',
      requiredBooks: '',
    });
    setClashWarning(null);
    setIsSlotModalOpen(true);
  };

  const handleEditSlot = (slot: TimetableSlot) => {
    setSlotForm({
      id: slot.id,
      classroomId: slot.classroomId,
      teacherId: slot.teacherId,
      dayOfWeek: slot.dayOfWeek,
      periodNumber: slot.periodNumber,
      startTime: slot.startTime,
      endTime: slot.endTime,
      roomNumber: slot.roomNumber,
      requiredBooks: slot.requiredBooks || '',
    });
    setClashWarning(null);
    setIsSlotModalOpen(true);
  };

  const handleCheckClash = async () => {
    if (!slotForm.classroomId || !slotForm.teacherId || !slotForm.roomNumber) return;
    const cls = classrooms.find((c) => c.id === slotForm.classroomId);
    if (!cls || !activeYear) return;

    setIsCheckingClash(true);
    const result = await validateTimetableClash({
      academicYearId: activeYear.id,
      dayOfWeek: slotForm.dayOfWeek,
      periodNumber: slotForm.periodNumber,
      teacherId: slotForm.teacherId,
      cohortId: (cls as any).cohortId || cls.id,
      roomNumber: slotForm.roomNumber,
      id: slotForm.id,
    });
    setIsCheckingClash(false);

    if (!result.valid && result.conflicts && result.conflicts.length > 0) {
      const c = result.conflicts[0];
      setClashWarning(
        `Clash detected! ${c.teacher?.name || 'Teacher'} is already scheduled in ${c.classroom?.name || 'Room'} for Period ${c.periodNumber} on this day.`,
      );
    } else {
      setClashWarning(null);
      toast.success('No scheduling conflict found! Time slot is valid.');
    }
  };

  const handleSaveSlot = async () => {
    if (!slotForm.classroomId) {
      toast.error('Please select a classroom');
      return;
    }
    const success = await saveTimetableSlot({
      ...slotForm,
      academicYearId: activeYear?.id,
    });
    if (success) {
      setIsSlotModalOpen(false);
    }
  };

  const handleSeedDefaults = async () => {
    if (classrooms.length === 0) {
      toast.error('No classrooms found to generate timetable.');
      return;
    }

    let createdCount = 0;
    for (let day = 0; day < 6; day++) {
      for (let p = 1; p <= 6; p++) {
        const cls = classrooms[(day + p) % classrooms.length];
        if (!cls) continue;

        // Check if slot already exists
        const exists = timetableSlots.some(
          (s) => s.dayOfWeek === day && s.periodNumber === p && s.classroomId === cls.id,
        );
        if (exists) continue;

        const startH = 9 + Math.floor((p - 1) * 0.75);
        const startM = ((p - 1) * 45) % 60;
        const endH = 9 + Math.floor(p * 0.75);
        const endM = (p * 45) % 60;

        await saveTimetableSlot({
          classroomId: cls.id,
          teacherId: cls.teacherId,
          dayOfWeek: day,
          periodNumber: p,
          startTime: `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`,
          endTime: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
          roomNumber: cls.roomNumber || `Room 10${(p % 4) + 1}`,
          requiredBooks: `${cls.subject} Textbook`,
        });
        createdCount++;
      }
    }
    toast.success(`Generated ${createdCount} default schedule slots across 6 days!`);
  };

  const handleAddTerm = async () => {
    if (!newTermName || !newTermStart || !newTermEnd) {
      toast.error('Please fill in all term fields.');
      return;
    }
    const ok = await saveAcademicTerm({
      name: newTermName,
      startsAt: newTermStart,
      endsAt: newTermEnd,
      sequence: Number(newTermSeq),
      academicYearId: activeYear?.id,
    });
    if (ok) {
      setNewTermName('');
      setNewTermStart('');
      setNewTermEnd('');
      setNewTermSeq(academicTerms.length + 2);
    }
  };

  const handleAddHoliday = async () => {
    if (!newHolidayName || !newHolidayDate) {
      toast.error('Please provide holiday name and date.');
      return;
    }
    const ok = await saveSchoolHoliday({
      name: newHolidayName,
      date: newHolidayDate,
      description: newHolidayDesc,
      academicYearId: activeYear?.id,
    });
    if (ok) {
      setNewHolidayName('');
      setNewHolidayDate('');
      setNewHolidayDesc('');
    }
  };

  const handleExecuteRollover = async () => {
    if (!activeYear || !rolloverTargetYear) {
      toast.error('Please select both source and target academic years.');
      return;
    }
    setIsPerformingRollover(true);
    const res = await executeAcademicRollover({
      fromAcademicYearId: activeYear.id,
      toAcademicYearId: rolloverTargetYear,
      passPercentage: Number(rolloverPassPercent),
      graduationGrade: 10,
    });
    setIsPerformingRollover(false);
    if (res.success) {
      setRolloverResult(res.data);
    }
  };

  // Filter slots according to active view
  const filteredSlots = useMemo(() => {
    return timetableSlots.filter((slot) => {
      if (activeView === 'cohort' && selectedCohort) {
        const cls = classrooms.find((c) => c.id === slot.classroomId);
        if (!cls) return false;
        const cName = cls.gradeLevel && cls.section ? `Grade ${cls.gradeLevel} - Section ${cls.section}` : cls.name;
        return cName === selectedCohort;
      }
      if (activeView === 'teacher' && selectedTeacherId) {
        return slot.teacherId === selectedTeacherId;
      }
      if (activeView === 'room' && selectedRoom) {
        return slot.roomNumber === selectedRoom;
      }
      return true;
    });
  }, [timetableSlots, activeView, selectedCohort, selectedTeacherId, selectedRoom, classrooms]);

  return (
    <div className={`space-y-6 ${isFullScreen ? 'fixed inset-0 z-50 bg-slate-950 p-6 overflow-y-auto' : ''}`}>
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Master Timetable & Academic Engine</h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  Academic Year: <span className="font-semibold text-indigo-400">{activeYear?.name || '2026/2027'}</span> • Zero-conflict scheduling & Bell Schedule
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleOpenAddSlot()}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition shadow-lg shadow-indigo-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Period Slot
            </button>
            <button
              onClick={() => setIsBellScheduleModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium rounded-xl transition cursor-pointer"
            >
              <Clock className="w-4 h-4 text-emerald-400" />
              Bell Schedule
            </button>
            <button
              onClick={() => setIsTermsModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium rounded-xl transition cursor-pointer"
            >
              <CalendarCheck className="w-4 h-4 text-amber-400" />
              Terms ({academicTerms.length})
            </button>
            <button
              onClick={() => setIsHolidaysModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium rounded-xl transition cursor-pointer"
            >
              <CalendarX className="w-4 h-4 text-rose-400" />
              Holidays ({schoolHolidays.length})
            </button>
            <button
              onClick={() => setIsRolloverModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium rounded-xl transition cursor-pointer"
            >
              <GraduationCap className="w-4 h-4 text-purple-400" />
              Academic Rollover
            </button>
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 rounded-xl transition cursor-pointer"
              title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* View Switcher & Filter Ribbon */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveView('matrix')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeView === 'matrix' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Master Grid
            </button>
            <button
              onClick={() => setActiveView('cohort')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeView === 'cohort' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              By Cohort / Grade
            </button>
            <button
              onClick={() => setActiveView('teacher')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeView === 'teacher' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              By Teacher
            </button>
            <button
              onClick={() => setActiveView('room')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeView === 'room' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              By Room
            </button>
          </div>

          {/* Secondary Filters based on active view */}
          <div className="flex items-center gap-3">
            {activeView === 'cohort' && (
              <select
                value={selectedCohort}
                onChange={(e) => setSelectedCohort(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
              >
                {cohorts.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            {activeView === 'teacher' && (
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
              >
                <option value="">Select a Teacher</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}

            {activeView === 'room' && (
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
              >
                <option value="">Select a Room</option>
                {rooms.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}

            {timetableSlots.length === 0 && (
              <button
                onClick={handleSeedDefaults}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Auto-Fill Sample Schedule
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Routine / Daily Schedule Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-x-auto">
        {/* Bell Schedule Banner Overview */}
        <div className="mb-6 p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-white">Daily Operational Hours:</span>
            <span>{schoolTimingConfig.schoolStartTime} – {schoolTimingConfig.schoolEndTime}</span>
            <span className="text-slate-600">|</span>
            <span>{schoolTimingConfig.periodDurationMinutes} mins / period</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {schoolTimingConfig.breaks.map((b) => (
              <span
                key={b.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium"
              >
                {b.type === 'assembly' && <Sun className="w-3 h-3 text-amber-400" />}
                {b.type === 'snack' && <Coffee className="w-3 h-3 text-orange-400" />}
                {b.type === 'lunch' && <Utensils className="w-3 h-3 text-emerald-400" />}
                {b.type === 'dismissal' && <LogOut className="w-3 h-3 text-rose-400" />}
                <span>{b.name}:</span>
                <span className="text-slate-400 font-mono">{b.startTime} {b.endTime ? `- ${b.endTime}` : ''}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Timetable Table Grid */}
        <div className="min-w-[800px]">
          <div className="grid grid-cols-7 gap-3 mb-3 text-center font-semibold text-xs text-slate-400 uppercase tracking-wider">
            <div className="p-2 bg-slate-950/40 rounded-lg">Period / Time</div>
            {DAYS.map((day) => (
              <div key={day} className="p-2 bg-slate-950/40 rounded-lg text-slate-300">
                {day}
              </div>
            ))}
          </div>

          {/* Periods 1 through 6 with Interleaved Breaks */}
          {[1, 2, 3, 4, 5, 6].map((pNum) => {
            const breakAfter = schoolTimingConfig.breaks.find((b) => b.afterPeriod === pNum - 1 && pNum > 1);

            return (
              <React.Fragment key={`period-group-${pNum}`}>
                {/* Break row if applicable */}
                {breakAfter && (
                  <div className="my-2 p-2.5 bg-indigo-950/20 border border-indigo-500/20 rounded-xl flex items-center justify-center gap-3 text-xs text-indigo-300">
                    {breakAfter.type === 'snack' && <Coffee className="w-4 h-4 text-orange-400" />}
                    {breakAfter.type === 'lunch' && <Utensils className="w-4 h-4 text-emerald-400" />}
                    <span className="font-semibold uppercase tracking-wider">{breakAfter.name}</span>
                    <span className="font-mono text-slate-400 font-normal">({breakAfter.startTime} - {breakAfter.endTime})</span>
                  </div>
                )}

                <div className="grid grid-cols-7 gap-3 mb-3">
                  {/* Period Header Column */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-center items-center text-center">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Period {pNum}</span>
                    <span className="text-[11px] text-slate-500 mt-1 font-mono">
                      {pNum === 1 && '09:00 - 09:45'}
                      {pNum === 2 && '09:45 - 10:30'}
                      {pNum === 3 && '10:45 - 11:30'}
                      {pNum === 4 && '11:30 - 12:15'}
                      {pNum === 5 && '13:00 - 13:45'}
                      {pNum === 6 && '13:45 - 14:30'}
                    </span>
                  </div>

                  {/* 6 Day Columns for this Period */}
                  {DAYS.map((day) => {
                    const dayIdx = DAY_INDEX_MAP[day];
                    const slotsForCell = filteredSlots.filter(
                      (s) => s.dayOfWeek === dayIdx && s.periodNumber === pNum,
                    );

                    return (
                      <div
                        key={`${day}-${pNum}`}
                        className="min-h-[90px] bg-slate-950/40 border border-slate-800/60 rounded-xl p-2 flex flex-col justify-between hover:border-slate-700 transition relative group"
                      >
                        {slotsForCell.length > 0 ? (
                          <div className="space-y-1.5">
                            {slotsForCell.map((slot) => {
                              const theme = getSubjectTheme(slot.subject?.name || slot.classroom?.name);
                              return (
                                <div
                                  key={slot.id}
                                  className={`p-2 rounded-lg border ${theme.bg} ${theme.border} text-left relative group/card cursor-pointer transition-all hover:scale-[1.02]`}
                                  onClick={() => handleEditSlot(slot)}
                                >
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span className={`text-xs font-bold ${theme.text} truncate`}>
                                      {slot.subject?.name || slot.classroom?.name || 'Class'}
                                    </span>
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900/60 text-slate-300">
                                      {slot.roomNumber}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                                    <span className="truncate">{slot.teacher?.name || 'Assigned Teacher'}</span>
                                    {slot.cohort?.name && (
                                      <span className="text-[10px] text-indigo-400 font-medium truncate">
                                        {slot.cohort.name}
                                      </span>
                                    )}
                                  </div>
                                  {slot.requiredBooks && (
                                    <div className="text-[10px] text-slate-500 mt-1 truncate flex items-center gap-1">
                                      <BookOpen className="w-3 h-3" />
                                      {slot.requiredBooks}
                                    </div>
                                  )}
                                  {/* Delete Quick Action */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteTimetableSlot(slot.id);
                                    }}
                                    className="absolute top-1.5 right-1.5 opacity-0 group-hover/card:opacity-100 p-1 text-slate-400 hover:text-rose-400 bg-slate-900/90 rounded transition cursor-pointer"
                                    title="Remove Slot"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenAddSlot(dayIdx, pNum)}
                            className="w-full h-full flex flex-col items-center justify-center text-slate-600 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition py-4 cursor-pointer"
                          >
                            <Plus className="w-4 h-4 mb-1" />
                            <span className="text-[11px]">Assign Class</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* MODAL: Add / Edit Timetable Slot */}
      {isSlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {slotForm.id ? 'Edit Period Slot' : 'Schedule New Period Slot'}
                  </h3>
                  <p className="text-xs text-slate-400">Configure clash-free timetable period for cohort & teacher</p>
                </div>
              </div>
              <button
                onClick={() => setIsSlotModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {clashWarning && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Schedule Conflict Detected:</span>
                  {clashWarning}
                </div>
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Classroom / Subject & Cohort</label>
                <select
                  value={slotForm.classroomId}
                  onChange={(e) => {
                    const cId = e.target.value;
                    const c = classrooms.find((cls) => cls.id === cId);
                    setSlotForm((prev) => ({
                      ...prev,
                      classroomId: cId,
                      teacherId: c?.teacherId || prev.teacherId,
                      roomNumber: c?.roomNumber || prev.roomNumber,
                    }));
                  }}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500"
                >
                  <option value="">Select a Classroom</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.gradeLevel ? `Grade ${c.gradeLevel}-${c.section}` : c.code || ''})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Instructor</label>
                  <select
                    value={slotForm.teacherId}
                    onChange={(e) => setSlotForm((prev) => ({ ...prev, teacherId: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Teacher</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Room / Facility</label>
                  <input
                    type="text"
                    value={slotForm.roomNumber}
                    onChange={(e) => setSlotForm((prev) => ({ ...prev, roomNumber: e.target.value }))}
                    placeholder="e.g. Room 204 / Lab B"
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Day of Week</label>
                  <select
                    value={slotForm.dayOfWeek}
                    onChange={(e) => setSlotForm((prev) => ({ ...prev, dayOfWeek: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500"
                  >
                    {DAYS.map((day, idx) => (
                      <option key={day} value={idx}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Period Number</label>
                  <select
                    value={slotForm.periodNumber}
                    onChange={(e) => setSlotForm((prev) => ({ ...prev, periodNumber: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                      <option key={num} value={num}>
                        Period {num}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Start Time (HH:mm)</label>
                  <input
                    type="time"
                    value={slotForm.startTime}
                    onChange={(e) => setSlotForm((prev) => ({ ...prev, startTime: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">End Time (HH:mm)</label>
                  <input
                    type="time"
                    value={slotForm.endTime}
                    onChange={(e) => setSlotForm((prev) => ({ ...prev, endTime: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Required Books / Materials</label>
                <input
                  type="text"
                  value={slotForm.requiredBooks}
                  onChange={(e) => setSlotForm((prev) => ({ ...prev, requiredBooks: e.target.value }))}
                  placeholder="e.g. NCERT Science Textbook & Lab Journal"
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleCheckClash}
                disabled={isCheckingClash}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isCheckingClash ? 'Checking...' : 'Validate Clashes'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSlotModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSlot}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-indigo-500/20 cursor-pointer"
                >
                  {slotForm.id ? 'Save Changes' : 'Create Slot'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Bell Schedule & Breaks Config */}
      {isBellScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Bell Schedule & School Timing</h3>
                  <p className="text-xs text-slate-400">Configure daily periods, morning assembly, and lunch breaks</p>
                </div>
              </div>
              <button
                onClick={() => setIsBellScheduleModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">School Starts</label>
                  <input
                    type="time"
                    value={timingConfig.schoolStartTime}
                    onChange={(e) =>
                      setTimingConfig((prev) => ({ ...prev, schoolStartTime: e.target.value }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">School Ends</label>
                  <input
                    type="time"
                    value={timingConfig.schoolEndTime}
                    onChange={(e) =>
                      setTimingConfig((prev) => ({ ...prev, schoolEndTime: e.target.value }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Period Length (Mins)</label>
                  <input
                    type="number"
                    value={timingConfig.periodDurationMinutes}
                    onChange={(e) =>
                      setTimingConfig((prev) => ({
                        ...prev,
                        periodDurationMinutes: Number(e.target.value),
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
                  <Coffee className="w-4 h-4 text-amber-400" />
                  Scheduled Breaks & Intermissions
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {timingConfig.breaks.map((b, idx) => (
                    <div
                      key={b.id || idx}
                      className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-semibold text-slate-200">{b.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Type: {b.type} • {b.startTime} - {b.endTime} • After Period {b.afterPeriod ?? 0}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const updated = timingConfig.breaks.filter((_, i) => i !== idx);
                          setTimingConfig((prev) => ({ ...prev, breaks: updated }));
                        }}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsBellScheduleModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  updateSchoolTimingConfig(timingConfig);
                  setIsBellScheduleModalOpen(false);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Save Schedule Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Academic Terms */}
      {isTermsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Academic Terms</h3>
                  <p className="text-xs text-slate-400">Configure Trimesters or Semesters for active year</p>
                </div>
              </div>
              <button
                onClick={() => setIsTermsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <div className="font-semibold text-slate-300">Add New Term</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Term Name (e.g. Term 1)"
                    value={newTermName}
                    onChange={(e) => setNewTermName(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5"
                  />
                  <input
                    type="number"
                    placeholder="Sequence #"
                    value={newTermSeq}
                    onChange={(e) => setNewTermSeq(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Start Date</label>
                    <input
                      type="date"
                      value={newTermStart}
                      onChange={(e) => setNewTermStart(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">End Date</label>
                    <input
                      type="date"
                      value={newTermEnd}
                      onChange={(e) => setNewTermEnd(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddTerm}
                  className="w-full mt-2 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition cursor-pointer"
                >
                  Save New Term
                </button>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto">
                <div className="text-slate-400 font-semibold">Active Terms ({academicTerms.length})</div>
                {academicTerms.map((term) => (
                  <div
                    key={term.id}
                    className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-white">
                        {term.name} <span className="text-slate-500 font-normal">#{term.sequence}</span>
                      </div>
                      <div className="text-slate-400 text-[11px] font-mono">
                        {term.startsAt ? term.startsAt.slice(0, 10) : 'N/A'} to {term.endsAt ? term.endsAt.slice(0, 10) : 'N/A'}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteAcademicTerm(term.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Holidays Calendar */}
      {isHolidaysModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg">
                  <CalendarX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">School Holidays Calendar</h3>
                  <p className="text-xs text-slate-400">Non-instructional days excluded from attendance penalty</p>
                </div>
              </div>
              <button
                onClick={() => setIsHolidaysModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <div className="font-semibold text-slate-300">Add School Holiday</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Holiday Name (e.g. Dashain Festival)"
                    value={newHolidayName}
                    onChange={(e) => setNewHolidayName(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5"
                  />
                  <input
                    type="date"
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Optional description / notes"
                  value={newHolidayDesc}
                  onChange={(e) => setNewHolidayDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5"
                />
                <button
                  onClick={handleAddHoliday}
                  className="w-full mt-2 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium transition cursor-pointer"
                >
                  Add Holiday
                </button>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto">
                <div className="text-slate-400 font-semibold">Registered Holidays ({schoolHolidays.length})</div>
                {schoolHolidays.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-white">{h.name}</div>
                      <div className="text-slate-400 text-[11px] font-mono">{h.date?.slice(0, 10)}</div>
                    </div>
                    <button
                      onClick={() => deleteSchoolHoliday(h.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Academic Rollover & Progression */}
      {isRolloverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Year-End Academic Rollover</h3>
                  <p className="text-xs text-slate-400">Promote students, graduate senior classes, archive terms</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsRolloverModalOpen(false);
                  setRolloverResult(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {rolloverResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 space-y-2">
                  <div className="font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    Academic Rollover Completed Successfully!
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 mt-2">
                    <div>Students Promoted: <span className="font-semibold text-white">{rolloverResult.summary?.promoted ?? 0}</span></div>
                    <div>Students Graduated: <span className="font-semibold text-white">{rolloverResult.summary?.graduated ?? 0}</span></div>
                    <div>Classrooms Archived: <span className="font-semibold text-white">{rolloverResult.summary?.classroomsArchived ?? 0}</span></div>
                    <div>New Classrooms: <span className="font-semibold text-white">{rolloverResult.summary?.newClassroomsCreated ?? 0}</span></div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsRolloverModalOpen(false);
                    setRolloverResult(null);
                  }}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-[11px] leading-relaxed">
                  ⚠️ <strong>Important:</strong> Rollover will automatically calculate student progress, generate official Report Cards, promote students in grades 1–9 to the next grade level, graduate Grade 10 students, and archive the old academic year.
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Current Academic Year (Source)</label>
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-mono">
                    {activeYear?.name || '2026/2027'} (Active)
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Target Academic Year</label>
                  <select
                    value={rolloverTargetYear}
                    onChange={(e) => setRolloverTargetYear(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Target Academic Year</option>
                    {academicYears
                      .filter((y) => y.id !== activeYear?.id)
                      .map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.name} ({y.startsAt?.slice(0, 10)} - {y.endsAt?.slice(0, 10)})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Passing Percentage Threshold (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={rolloverPassPercent}
                    onChange={(e) => setRolloverPassPercent(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRolloverModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isPerformingRollover || !rolloverTargetYear}
                    onClick={handleExecuteRollover}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2 cursor-pointer"
                  >
                    {isPerformingRollover ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Executing Rollover...
                      </>
                    ) : (
                      'Execute Rollover'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
