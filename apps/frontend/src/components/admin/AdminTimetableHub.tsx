import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit2,
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
  User,
  MapPin,
  Layers,
  Building2,
  Filter,
  X,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TimetableSlot, SchoolTimingConfig } from '@lms/shared';
import { toast } from '@utils/toast';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const SUBJECT_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> =
  {
    math: {
      bg: 'bg-indigo-950/40',
      border: 'border-indigo-500/30 hover:border-indigo-400',
      text: 'text-indigo-300',
      badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    mathematics: {
      bg: 'bg-indigo-950/40',
      border: 'border-indigo-500/30 hover:border-indigo-400',
      text: 'text-indigo-300',
      badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    science: {
      bg: 'bg-emerald-950/40',
      border: 'border-emerald-500/30 hover:border-emerald-400',
      text: 'text-emerald-300',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    physics: {
      bg: 'bg-teal-950/40',
      border: 'border-teal-500/30 hover:border-teal-400',
      text: 'text-teal-300',
      badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    },
    chemistry: {
      bg: 'bg-cyan-950/40',
      border: 'border-cyan-500/30 hover:border-cyan-400',
      text: 'text-cyan-300',
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    },
    biology: {
      bg: 'bg-emerald-950/40',
      border: 'border-emerald-500/30 hover:border-emerald-400',
      text: 'text-emerald-300',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    english: {
      bg: 'bg-amber-950/40',
      border: 'border-amber-500/30 hover:border-amber-400',
      text: 'text-amber-300',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    nepali: {
      bg: 'bg-purple-950/40',
      border: 'border-purple-500/30 hover:border-purple-400',
      text: 'text-purple-300',
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    },
    social: {
      bg: 'bg-rose-950/40',
      border: 'border-rose-500/30 hover:border-rose-400',
      text: 'text-rose-300',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    },
    computer: {
      bg: 'bg-sky-950/40',
      border: 'border-sky-500/30 hover:border-sky-400',
      text: 'text-sky-300',
      badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    },
    opt: {
      bg: 'bg-teal-950/40',
      border: 'border-teal-500/30 hover:border-teal-400',
      text: 'text-teal-300',
      badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    },
  };

const getSubjectTheme = (subjectName?: string) => {
  if (!subjectName)
    return {
      bg: 'bg-slate-900/50',
      border: 'border-slate-800 hover:border-slate-700',
      text: 'text-slate-300',
      badge: 'bg-slate-800 text-slate-300 border-slate-700',
    };
  const lower = subjectName.toLowerCase();
  for (const [key, theme] of Object.entries(SUBJECT_COLORS)) {
    if (lower.includes(key)) return theme;
  }
  return {
    bg: 'bg-blue-950/40',
    border: 'border-blue-500/30 hover:border-blue-400',
    text: 'text-blue-300',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  };
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
  const activeYear = useMemo(
    () => academicYears.find((y) => y.isActive) || academicYears[0],
    [academicYears],
  );

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
    const selectedClass =
      classrooms.find((c) =>
        selectedCohort
          ? `${c.gradeLevel ? `Grade ${c.gradeLevel} - Section ${c.section}` : c.name}` ===
            selectedCohort
          : true,
      ) || classrooms[0];

    const defDay = dayOfWeek !== undefined ? dayOfWeek : 0;
    const defPeriod = periodNumber || 1;

    const startHour = 9 + Math.floor((defPeriod - 1) * 0.75);
    const startMin = ((defPeriod - 1) * 45) % 60;
    const endHour = 9 + Math.floor(defPeriod * 0.75);
    const endMin = (defPeriod * 45) % 60;
    const startFormatted = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
    const endFormatted = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

    setSlotForm({
      classroomId: selectedClass?.id || '',
      teacherId: selectedClass?.teacherId || teachers[0]?.id || '',
      dayOfWeek: defDay,
      periodNumber: defPeriod,
      startTime: startFormatted,
      endTime: endFormatted,
      roomNumber: selectedClass?.roomNumber || 'Room 101',
      requiredBooks: 'Textbook and Exercise Notebook',
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
      roomNumber: slot.roomNumber || '',
      requiredBooks: slot.requiredBooks || '',
    });
    setClashWarning(null);
    setIsSlotModalOpen(true);
  };

  // Clash Check effect
  useEffect(() => {
    if (!isSlotModalOpen || !slotForm.classroomId || !slotForm.teacherId) return;

    const timer = setTimeout(async () => {
      setIsCheckingClash(true);
      const selectedClass = classrooms.find((c) => c.id === slotForm.classroomId);
      const cohortId = selectedClass?.gradeLevel
        ? `cohort-g${selectedClass.gradeLevel}`
        : selectedClass?.id || 'cohort-general';

      const result = await validateTimetableClash({
        id: slotForm.id,
        academicYearId: activeYear?.id || 'ay-2026-2027',
        cohortId,
        teacherId: slotForm.teacherId,
        dayOfWeek: Number(slotForm.dayOfWeek),
        periodNumber: Number(slotForm.periodNumber),
        roomNumber: slotForm.roomNumber,
      });
      setIsCheckingClash(false);
      if (!result.valid && result.conflicts && result.conflicts.length > 0) {
        setClashWarning(result.conflicts.map((c: any) => c.message || c).join(' | '));
      } else {
        setClashWarning(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [
    slotForm.classroomId,
    slotForm.teacherId,
    slotForm.dayOfWeek,
    slotForm.periodNumber,
    slotForm.roomNumber,
    slotForm.id,
    isSlotModalOpen,
    validateTimetableClash,
    classrooms,
    activeYear?.id,
  ]);

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotForm.classroomId || !slotForm.teacherId) {
      toast.error('Please select both a classroom and teacher');
      return;
    }

    try {
      const selectedClass = classrooms.find((c) => c.id === slotForm.classroomId);
      const cohortId = selectedClass?.gradeLevel
        ? `cohort-g${selectedClass.gradeLevel}`
        : selectedClass?.id || 'cohort-general';

      await saveTimetableSlot({
        id: slotForm.id,
        academicYearId: activeYear?.id || 'ay-2026-2027',
        cohortId,
        classroomId: slotForm.classroomId,
        teacherId: slotForm.teacherId,
        dayOfWeek: Number(slotForm.dayOfWeek),
        periodNumber: Number(slotForm.periodNumber),
        startTime: slotForm.startTime,
        endTime: slotForm.endTime,
        roomNumber: slotForm.roomNumber,
        requiredBooks: slotForm.requiredBooks,
      });
      toast.success(slotForm.id ? 'Slot updated successfully' : 'Slot added to schedule');
      setIsSlotModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save timetable slot');
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this timetable slot?')) return;
    try {
      await deleteTimetableSlot(id);
      toast.success('Period slot removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete slot');
    }
  };

  // Seed sample full schedule
  const handleSeedDefaults = async () => {
    if (classrooms.length === 0 || teachers.length === 0) {
      toast.error('Need classrooms and teachers to populate sample timetable');
      return;
    }

    try {
      const days = [0, 1, 2, 3, 4, 5]; // Sun-Fri
      const periods = [1, 2, 3, 4, 5, 6];

      let count = 0;
      for (const d of days) {
        for (const p of periods) {
          const cls = classrooms[(d + p) % classrooms.length];
          const t = teachers[(p + d) % teachers.length];
          const startHour = 9 + Math.floor((p - 1) * 0.75);
          const startMin = ((p - 1) * 45) % 60;
          const endHour = 9 + Math.floor(p * 0.75);
          const endMin = (p * 45) % 60;

          await saveTimetableSlot({
            academicYearId: activeYear?.id || 'ay-2026-2027',
            cohortId: cls.gradeLevel ? `cohort-g${cls.gradeLevel}` : cls.id,
            classroomId: cls.id,
            teacherId: t.id,
            dayOfWeek: d,
            periodNumber: p,
            startTime: `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`,
            endTime: `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`,
            roomNumber: cls.roomNumber || `Room 10${(p % 4) + 1}`,
            requiredBooks: 'Sikshya Standard Textbook & Practice Journal',
          });
          count++;
        }
      }
      toast.success(`Generated ${count} sample clash-free timetable slots`);
    } catch (err: any) {
      toast.error('Failed to populate defaults: ' + err.message);
    }
  };

  // Filtered Slots for the Active View
  const filteredSlots = useMemo(() => {
    return timetableSlots.filter((slot) => {
      if (activeView === 'matrix') return true;
      if (activeView === 'cohort' && selectedCohort) {
        const cls = classrooms.find((c) => c.id === slot.classroomId);
        if (!cls) return false;
        const cName =
          cls.gradeLevel && cls.section
            ? `Grade ${cls.gradeLevel} - Section ${cls.section}`
            : cls.name;
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
    <div
      className={`space-y-4 ${
        isFullScreen ? 'fixed inset-0 z-50 bg-slate-950 p-6 overflow-y-auto' : ''
      }`}
    >
      {/* Sleek Integrated Control Toolbar */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-4">
        {/* Top Row: Title, Year Badge & Action Group */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight font-serif">
                  Master Timetable & Academic Scheduler
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {activeYear?.name || '2026/2027'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Zero-conflict cohort scheduling, daily bell routines & lifecycle management
              </p>
            </div>
          </div>

          {/* Quick Action Button Group */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleOpenAddSlot()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Period</span>
            </button>

            <button
              onClick={() => setIsBellScheduleModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded-xl transition cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bell Schedule</span>
            </button>

            <button
              onClick={() => setIsTermsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded-xl transition cursor-pointer"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Terms ({academicTerms.length})</span>
            </button>

            <button
              onClick={() => setIsHolidaysModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded-xl transition cursor-pointer"
            >
              <CalendarX className="w-3.5 h-3.5 text-rose-400" />
              <span>Holidays ({schoolHolidays.length})</span>
            </button>

            <button
              onClick={() => setIsRolloverModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded-xl transition cursor-pointer"
            >
              <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
              <span>Rollover</span>
            </button>

            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl transition cursor-pointer"
              title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Bottom Row: View Switchers, Context Filters & Timing Overview Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          {/* Segmented View Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveView('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeView === 'matrix'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Master Grid</span>
            </button>
            <button
              onClick={() => setActiveView('cohort')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeView === 'cohort'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>By Cohort</span>
            </button>
            <button
              onClick={() => setActiveView('teacher')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeView === 'teacher'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>By Teacher</span>
            </button>
            <button
              onClick={() => setActiveView('room')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeView === 'room'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>By Room</span>
            </button>
          </div>

          {/* Contextual Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {activeView === 'cohort' && (
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-indigo-400" />
                <select
                  value={selectedCohort}
                  onChange={(e) => setSelectedCohort(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {cohorts.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeView === 'teacher' && (
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-indigo-400" />
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="">All Teachers ({teachers.length})</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeView === 'room' && (
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-indigo-400" />
                <select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="">All Rooms ({rooms.length})</option>
                  {rooms.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
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

            {/* Daily Timing Pills */}
            <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-800 text-[11px] text-slate-400">
              <span className="flex items-center gap-1 font-mono text-slate-300">
                <Clock className="w-3 h-3 text-indigo-400" />
                {schoolTimingConfig.schoolStartTime} - {schoolTimingConfig.schoolEndTime}
              </span>
              <span>•</span>
              <span>{schoolTimingConfig.periodDurationMinutes}m / period</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Timetable Routine Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl overflow-x-auto">
        <div className="min-w-[850px]">
          {/* Day Column Headers */}
          <div className="grid grid-cols-7 gap-2.5 mb-3 text-center font-bold text-xs uppercase tracking-wider">
            <div className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-400 flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Period</span>
            </div>
            {DAYS.map((day) => (
              <div
                key={day}
                className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-200 flex items-center justify-center gap-1.5 font-semibold"
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>{day}</span>
              </div>
            ))}
          </div>

          {/* Morning Assembly Banner (if afterPeriod === 0) */}
          {schoolTimingConfig.breaks
            .filter((b) => b.afterPeriod === 0 || b.type === 'assembly')
            .map((b) => (
              <div
                key={b.id}
                className="my-2.5 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center gap-3 text-xs text-amber-300"
              >
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="font-semibold uppercase tracking-wider">{b.name}</span>
                <span className="font-mono text-amber-400/80 font-normal">
                  ({b.startTime} - {b.endTime})
                </span>
              </div>
            ))}

          {/* Periods 1 through 6 with Interleaved Breaks */}
          {[1, 2, 3, 4, 5, 6].map((pNum) => {
            const breakAfter = schoolTimingConfig.breaks.find(
              (b) => b.afterPeriod === pNum - 1 && pNum > 1,
            );

            return (
              <React.Fragment key={`period-group-${pNum}`}>
                {breakAfter && (
                  <div className="my-2.5 p-2.5 bg-indigo-950/30 border border-indigo-500/20 rounded-xl flex items-center justify-center gap-3 text-xs text-indigo-300">
                    {breakAfter.type === 'snack' && <Coffee className="w-4 h-4 text-orange-400" />}
                    {breakAfter.type === 'lunch' && (
                      <Utensils className="w-4 h-4 text-emerald-400" />
                    )}
                    {breakAfter.type === 'dismissal' && (
                      <LogOut className="w-4 h-4 text-rose-400" />
                    )}
                    <span className="font-semibold uppercase tracking-wider">
                      {breakAfter.name}
                    </span>
                    <span className="font-mono text-slate-400 font-normal">
                      ({breakAfter.startTime} - {breakAfter.endTime})
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-7 gap-2.5 mb-2.5">
                  {/* Period Time Column */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-center items-center text-center">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                      Period {pNum}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5 font-mono">
                      {pNum === 1 && '09:00 - 09:45'}
                      {pNum === 2 && '09:45 - 10:30'}
                      {pNum === 3 && '10:45 - 11:30'}
                      {pNum === 4 && '11:30 - 12:15'}
                      {pNum === 5 && '13:00 - 13:45'}
                      {pNum === 6 && '13:45 - 14:30'}
                    </span>
                  </div>

                  {/* 6 Day Cells */}
                  {DAYS.map((dayName, dIdx) => {
                    const slotsForCell = filteredSlots.filter(
                      (s) => s.dayOfWeek === dIdx && s.periodNumber === pNum,
                    );

                    return (
                      <div
                        key={`cell-${dIdx}-${pNum}`}
                        className="bg-slate-950/40 border border-slate-800/80 hover:border-slate-700/80 rounded-xl p-2 min-h-[96px] flex flex-col justify-between transition group relative"
                      >
                        {slotsForCell.length > 0 ? (
                          <div className="space-y-1.5 w-full">
                            {slotsForCell.map((slot) => {
                              const theme = getSubjectTheme(
                                slot.subject?.name || slot.classroom?.name,
                              );
                              return (
                                <div
                                  key={slot.id}
                                  className={`p-2.5 rounded-lg border transition-all ${theme.bg} ${theme.border} space-y-1.5`}
                                >
                                  <div className="flex items-start justify-between gap-1">
                                    <div className="font-bold text-xs text-white leading-tight truncate">
                                      {slot.subject?.name ||
                                        slot.classroom?.name ||
                                        'Assigned Subject'}
                                    </div>
                                    <span
                                      className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${theme.badge}`}
                                    >
                                      {slot.roomNumber || 'Room N/A'}
                                    </span>
                                  </div>

                                  <div className="text-[11px] text-slate-300 flex items-center justify-between gap-1">
                                    <span className="truncate flex items-center gap-1">
                                      <User className="w-3 h-3 text-slate-400" />
                                      {slot.teacher?.name || 'Teacher'}
                                    </span>
                                    {slot.cohort?.name && (
                                      <span className="text-[10px] text-indigo-400 font-medium truncate">
                                        {slot.cohort.name}
                                      </span>
                                    )}
                                  </div>

                                  {slot.requiredBooks && (
                                    <div className="text-[10px] text-slate-400 flex items-center gap-1 truncate pt-0.5 border-t border-slate-800/60">
                                      <BookOpen className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                      <span className="truncate">{slot.requiredBooks}</span>
                                    </div>
                                  )}

                                  {/* Quick Action Hover Bar */}
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1.5 pt-1 border-t border-slate-800/80">
                                    <button
                                      onClick={() => handleEditSlot(slot)}
                                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-indigo-300 rounded transition cursor-pointer"
                                      title="Edit Slot"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSlot(slot.id)}
                                      className="p-1 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded transition cursor-pointer"
                                      title="Delete Slot"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <button
                              onClick={() => handleOpenAddSlot(dIdx, pNum)}
                              className="w-full h-full min-h-[64px] border border-dashed border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-950/10 rounded-lg flex flex-col items-center justify-center gap-1 text-[11px] text-slate-600 hover:text-indigo-400 transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 opacity-60" />
                              <span className="text-[10px]">Schedule</span>
                            </button>
                          </div>
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

      {/* --- Modals & Dialogs --- */}

      {/* 1. Add / Edit Slot Modal */}
      {isSlotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {slotForm.id ? 'Edit Period Slot' : 'Schedule Period Slot'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configure clash-free timetable period for cohort & teacher
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSlotModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Clash Alert Warning */}
            {clashWarning && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs animate-in fade-in duration-150">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold">Scheduling Conflict Detected: </span>
                  {clashWarning}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveSlot} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Classroom / Subject & Cohort
                </label>
                <select
                  value={slotForm.classroomId}
                  onChange={(e) => {
                    const cid = e.target.value;
                    const c = classrooms.find((cls) => cls.id === cid);
                    setSlotForm((prev) => ({
                      ...prev,
                      classroomId: cid,
                      teacherId: c?.teacherId || prev.teacherId,
                      roomNumber: c?.roomNumber || prev.roomNumber,
                    }));
                  }}
                  required
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500"
                >
                  <option value="">Select a Classroom</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.gradeLevel ? `Grade ${c.gradeLevel}-${c.section}` : c.code || ''}
                      )
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Instructor</label>
                  <select
                    value={slotForm.teacherId}
                    onChange={(e) =>
                      setSlotForm((prev) => ({ ...prev, teacherId: e.target.value }))
                    }
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
                  <label className="block text-slate-300 font-medium mb-1.5">Room Number</label>
                  <input
                    type="text"
                    value={slotForm.roomNumber}
                    onChange={(e) =>
                      setSlotForm((prev) => ({ ...prev, roomNumber: e.target.value }))
                    }
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
                    onChange={(e) =>
                      setSlotForm((prev) => ({ ...prev, dayOfWeek: Number(e.target.value) }))
                    }
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
                    onChange={(e) =>
                      setSlotForm((prev) => ({ ...prev, periodNumber: Number(e.target.value) }))
                    }
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
                  <label className="block text-slate-300 font-medium mb-1.5">
                    Start Time (HH:mm)
                  </label>
                  <input
                    type="time"
                    value={slotForm.startTime}
                    onChange={(e) =>
                      setSlotForm((prev) => ({ ...prev, startTime: e.target.value }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">
                    End Time (HH:mm)
                  </label>
                  <input
                    type="time"
                    value={slotForm.endTime}
                    onChange={(e) => setSlotForm((prev) => ({ ...prev, endTime: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Required Books / Materials
                </label>
                <input
                  type="text"
                  value={slotForm.requiredBooks}
                  onChange={(e) =>
                    setSlotForm((prev) => ({ ...prev, requiredBooks: e.target.value }))
                  }
                  placeholder="e.g. NCERT Science Textbook & Lab Journal"
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSlotModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={Boolean(clashWarning) || isCheckingClash}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition shadow-lg shadow-indigo-600/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{slotForm.id ? 'Save Changes' : 'Confirm Slot'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Bell Schedule Modal */}
      {isBellScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Bell Schedule & School Timing</h3>
                  <p className="text-xs text-slate-400">
                    Configure daily periods, morning assembly, and lunch breaks
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBellScheduleModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
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
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 outline-none font-mono"
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
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Period Length (Mins)
                  </label>
                  <input
                    type="number"
                    value={timingConfig.periodDurationMinutes}
                    onChange={(e) =>
                      setTimingConfig((prev) => ({
                        ...prev,
                        periodDurationMinutes: Number(e.target.value),
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Interleaved Breaks */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-300">Daily Recess & Breaks</span>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {timingConfig.breaks.map((b) => (
                    <div
                      key={b.id}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-semibold text-slate-200">{b.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Type: {b.type} • {b.startTime} - {b.endTime} • After Period{' '}
                          {b.afterPeriod ?? 0}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setTimingConfig((prev) => ({
                            ...prev,
                            breaks: prev.breaks.filter((x) => x.id !== b.id),
                          }))
                        }
                        className="p-1 text-rose-400 hover:bg-rose-950/40 rounded transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBellScheduleModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={async () => {
                    try {
                      await updateSchoolTimingConfig(timingConfig);
                      toast.success('Bell Schedule and Operational Hours updated');
                      setIsBellScheduleModalOpen(false);
                    } catch (err: any) {
                      toast.error('Failed to update timing: ' + err.message);
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Bell Schedule</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Academic Terms Modal */}
      {isTermsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Academic Terms</h3>
                  <p className="text-xs text-slate-400">
                    Configure Trimesters or Semesters for active year
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTermsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-2 bg-slate-950 p-3.5 border border-slate-800 rounded-xl">
                <div className="font-semibold text-slate-300">Add New Term</div>
                <input
                  type="text"
                  placeholder="Term Name (e.g. 1st Trimester)"
                  value={newTermName}
                  onChange={(e) => setNewTermName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={newTermStart}
                    onChange={(e) => setNewTermStart(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1.5 outline-none font-mono"
                  />
                  <input
                    type="date"
                    value={newTermEnd}
                    onChange={(e) => setNewTermEnd(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1.5 outline-none font-mono"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (!newTermName || !newTermStart || !newTermEnd) {
                      toast.error('Please enter name, start date, and end date');
                      return;
                    }
                    try {
                      await saveAcademicTerm({
                        name: newTermName,
                        academicYearId: activeYear?.id || 'ay-2026-2027',
                        startsAt: newTermStart,
                        endsAt: newTermEnd,
                        sequence: newTermSeq,
                      });
                      toast.success('Academic term added');
                      setNewTermName('');
                      setNewTermStart('');
                      setNewTermEnd('');
                      setNewTermSeq((prev) => prev + 1);
                    } catch (err: any) {
                      toast.error('Failed to add term: ' + err.message);
                    }
                  }}
                  className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Term</span>
                </button>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto">
                <div className="text-slate-400 font-semibold">
                  Active Terms ({academicTerms.length})
                </div>
                {academicTerms.map((term) => (
                  <div
                    key={term.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-white">
                        {term.name}{' '}
                        <span className="text-slate-500 font-normal">#{term.sequence}</span>
                      </div>
                      <div className="text-slate-400 text-[11px] font-mono">
                        {term.startsAt ? term.startsAt.slice(0, 10) : 'N/A'} to{' '}
                        {term.endsAt ? term.endsAt.slice(0, 10) : 'N/A'}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteAcademicTerm(term.id)}
                      className="p-1 text-rose-400 hover:bg-rose-950/40 rounded transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Holiday Calendar Modal */}
      {isHolidaysModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl">
                  <CalendarX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">School Holidays Calendar</h3>
                  <p className="text-xs text-slate-400">
                    Non-instructional days excluded from attendance penalty
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHolidaysModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-2 bg-slate-950 p-3.5 border border-slate-800 rounded-xl">
                <div className="font-semibold text-slate-300">Register Holiday</div>
                <input
                  type="text"
                  placeholder="Holiday Name (e.g. Dashain Festival)"
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 outline-none"
                />
                <input
                  type="date"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 outline-none font-mono"
                />
                <input
                  type="text"
                  placeholder="Description / Notice"
                  value={newHolidayDesc}
                  onChange={(e) => setNewHolidayDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 outline-none"
                />
                <button
                  onClick={async () => {
                    if (!newHolidayName || !newHolidayDate) {
                      toast.error('Please enter name and date');
                      return;
                    }
                    try {
                      await saveSchoolHoliday({
                        name: newHolidayName,
                        date: newHolidayDate,
                        description: newHolidayDesc,
                      });
                      toast.success('Holiday registered');
                      setNewHolidayName('');
                      setNewHolidayDate('');
                      setNewHolidayDesc('');
                    } catch (err: any) {
                      toast.error('Failed to save holiday: ' + err.message);
                    }
                  }}
                  className="w-full py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Holiday</span>
                </button>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto">
                <div className="text-slate-400 font-semibold">
                  Registered Holidays ({schoolHolidays.length})
                </div>
                {schoolHolidays.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-white">{h.name}</div>
                      <div className="text-slate-400 text-[11px] font-mono">
                        {h.date?.slice(0, 10)}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteSchoolHoliday(h.id)}
                      className="p-1 text-rose-400 hover:bg-rose-950/40 rounded transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Academic Rollover Modal */}
      {isRolloverModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Year-End Academic Rollover</h3>
                  <p className="text-xs text-slate-400">
                    Promote students, graduate senior classes, archive terms
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsRolloverModalOpen(false);
                  setRolloverResult(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {rolloverResult ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300">
                  <div className="font-bold text-sm text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Academic Rollover Completed Successfully!
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 mt-3">
                    <div>
                      Students Promoted:{' '}
                      <span className="font-semibold text-white">
                        {rolloverResult.summary?.promoted ?? 0}
                      </span>
                    </div>
                    <div>
                      Students Graduated:{' '}
                      <span className="font-semibold text-white">
                        {rolloverResult.summary?.graduated ?? 0}
                      </span>
                    </div>
                    <div>
                      Classrooms Archived:{' '}
                      <span className="font-semibold text-white">
                        {rolloverResult.summary?.classroomsArchived ?? 0}
                      </span>
                    </div>
                    <div>
                      New Classrooms:{' '}
                      <span className="font-semibold text-white">
                        {rolloverResult.summary?.newClassroomsCreated ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsRolloverModalOpen(false);
                    setRolloverResult(null);
                  }}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-[11px] leading-relaxed flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Important:</strong> Rollover will automatically calculate student
                    progress, generate official Report Cards, promote students in grades 1–9 to the
                    next grade level, graduate Grade 10 students, and archive the old academic year.
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">
                    Current Academic Year (Source)
                  </label>
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-mono">
                    {activeYear?.name || '2026/2027'} (Active)
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">
                    Target Academic Year
                  </label>
                  <select
                    value={rolloverTargetYear}
                    onChange={(e) => setRolloverTargetYear(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 outline-none font-mono"
                  >
                    <option value="">Select or Create Next Year</option>
                    <option value="2027/2028">2027/2028 (Next Standard Year)</option>
                    <option value="2028/2029">2028/2029</option>
                    {academicYears
                      .filter((y) => !y.isActive)
                      .map((y) => (
                        <option key={y.id} value={y.name}>
                          {y.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">
                    Passing Percentage Threshold (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={rolloverPassPercent}
                    onChange={(e) => setRolloverPassPercent(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 outline-none font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsRolloverModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!rolloverTargetYear || isPerformingRollover}
                    onClick={async () => {
                      try {
                        setIsPerformingRollover(true);
                        const targetYearObj = academicYears.find(
                          (y) => y.name === rolloverTargetYear,
                        );
                        const res = await executeAcademicRollover({
                          fromAcademicYearId: activeYear?.id || 'ay-2026-2027',
                          toAcademicYearId: targetYearObj?.id || rolloverTargetYear,
                          passPercentage: Number(rolloverPassPercent),
                          graduationGrade: 10,
                        });
                        if (res.success) {
                          setRolloverResult(res.data || res);
                          toast.success('Academic rollover finished successfully');
                        } else {
                          toast.error(res.error || 'Rollover failed');
                        }
                      } catch (err: any) {
                        toast.error('Rollover error: ' + err.message);
                      } finally {
                        setIsPerformingRollover(false);
                      }
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition shadow-lg shadow-purple-600/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {isPerformingRollover ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Processing Rollover...</span>
                      </>
                    ) : (
                      <>
                        <GraduationCap className="w-4 h-4" />
                        <span>Execute Rollover</span>
                      </>
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
