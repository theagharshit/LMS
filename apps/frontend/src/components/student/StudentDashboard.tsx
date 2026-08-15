import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DayOfWeek, SchedulePeriod, isQuizTakeable, isQuizVisibleToStudents } from '@lms/shared';
import {
  Sparkles,
  Flame,
  CheckCircle,
  Clock,
  FileText,
  ChevronRight,
  BookOpen,
  TrendingUp,
  PlayCircle,
  CheckSquare,
  Briefcase,
  BookMarked,
  MapPin,
  User,
  CalendarDays,
  Award,
  Hourglass,
  Coffee,
  Utensils,
  Sun,
  LogOut,
} from 'lucide-react';

interface StudentDashboardProps {
  onOpenAssignmentModal: (assignmentId: string) => void;
  onOpenQuizModal: (quizId: string) => void;
}

const DAYS_OF_WEEK: DayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  onOpenAssignmentModal,
  onOpenQuizModal,
}) => {
  const {
    currentUser,
    weeklySchedule,
    timetableSlots,
    schoolTimingConfig,
    assignments,
    submissions,
    quizzes,
    quizSubmissions,
    studentProfiles,
    subjectPerformances,
    setIsAiTutorOpen,
    setAiTutorInitialPrompt,
    setActiveView,
    setSelectedClassroomId,
    classrooms,
    setIsCompletedQuizzesOpen,
  } = useApp();

  // Dynamic system time & day tracking (updates every second)
  const [now, setNow] = React.useState<Date>(new Date());
  const [timeMode, setTimeMode] = useState<string>('real');

  React.useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000); // refresh every second for accurate clock
    return () => clearInterval(timer);
  }, []);

  const currentDayNum = now.getDay(); // 0 = Sunday, 1 = Monday, ...
  const systemTodayName: DayOfWeek = DAYS_OF_WEEK[currentDayNum];

  // Selected day defaults to today
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(systemTodayName);
  const [activeTaskTab, setActiveTaskTab] = useState<'homework' | 'quizzes'>('homework');

  const studentData = studentProfiles.find((s) => s.id === currentUser.id) || studentProfiles[0];
  if (!studentData)
    return (
      <div className="rounded-3xl border border-[#EDEAE2] bg-white p-8 text-center text-sm text-[#7A7A72]">
        Student profile data is not available for this account.
      </div>
    );

  // Get periods for selected day from DB timetable slots or fallback to weeklySchedule
  const dayIndex = DAYS_OF_WEEK.indexOf(selectedDay);
  const dbSlotsForDay = timetableSlots.filter((s) => {
    if (s.dayOfWeek !== dayIndex) return false;
    if (s.cohort?.gradeLevel && studentData?.gradeLevel) {
      return s.cohort.gradeLevel === studentData.gradeLevel;
    }
    return true;
  });

  const currentDayPeriods: SchedulePeriod[] = React.useMemo(() => {
    if (dbSlotsForDay.length > 0) {
      return dbSlotsForDay.map((s) => ({
        id: s.id,
        periodNumber: s.periodNumber,
        startTime: s.startTime,
        endTime: s.endTime,
        subject: s.subject?.name || s.classroom?.name || 'Class',
        teacherName: s.teacher?.name || 'Teacher',
        room: s.roomNumber || 'Room 101',
        classroomId: s.classroomId,
        requiredBooks: s.requiredBooks || undefined,
      })).sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return weeklySchedule[selectedDay] || [];
  }, [dbSlotsForDay, weeklySchedule, selectedDay]);

  // Parse time like "10:00 AM" into minutes from midnight
  const parseTimeToMinutes = (timeStr: string): number | null => {
    if (!timeStr) return null;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3]?.toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  // Determine current effective minutes based on user's timezone clock or simulation selection
  const getEffectiveMinutes = (): number => {
    if (timeMode !== 'real') return parseTimeToMinutes(timeMode) ?? 0;
    // Real time from user's device/browser clock
    return now.getHours() * 60 + now.getMinutes();
  };

  const effectiveMinutes = getEffectiveMinutes();

  // Helper to check if a specific period is active
  const isPeriodActiveAtMinutes = (period: SchedulePeriod, day: DayOfWeek): boolean => {
    // Only check active state if selected day matches today or if simulating
    if (day !== systemTodayName && timeMode === 'real') return false;
    const startM = parseTimeToMinutes(period.startTime);
    const endM = parseTimeToMinutes(period.endTime);
    if (startM !== null && endM !== null) {
      return effectiveMinutes >= startM && effectiveMinutes < endM;
    }
    return false;
  };

  // Find currently active period for selected day (if any)
  const activePeriod = currentDayPeriods.find((p) => isPeriodActiveAtMinutes(p, selectedDay));

  // Find currently active break (if any)
  const activeBreak = (schoolTimingConfig?.breaks || []).find((b) => {
    if (selectedDay !== systemTodayName && timeMode === 'real') return false;
    const startM = parseTimeToMinutes(b.startTime);
    const endM = b.endTime ? parseTimeToMinutes(b.endTime) : (startM !== null ? startM + 30 : null);
    if (startM !== null && endM !== null) {
      return effectiveMinutes >= startM && effectiveMinutes < endM;
    }
    return false;
  });

  const isPeriodHighlighted = (period: SchedulePeriod): boolean => {
    return activePeriod?.id === period.id;
  };

  // Homework status calculation
  const pendingAssignments = assignments.filter((asg) => {
    const sub = submissions.find(
      (s) => s.assignmentId === asg.id && s.studentId === currentUser.id,
    );
    return !sub || sub.status === 'pending';
  });

  const visibleQuizzes = quizzes.filter(isQuizVisibleToStudents);

  // Quiz status calculation
  const availableQuizzes = visibleQuizzes.filter((q) => {
    const sub = quizSubmissions.find((qs) => qs.quizId === q.id && qs.studentId === currentUser.id);
    return !sub && isQuizTakeable(q);
  });

  const recentGrades = submissions.filter(
    (s) => s.studentId === currentUser.id && s.status === 'graded',
  );

  const handleAiSubjectHelp = (subject: string) => {
    setAiTutorInitialPrompt(
      `Help me understand key concepts and practice questions for ${subject}.`,
    );
    setIsAiTutorOpen(true);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Simplified Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl natural-banner p-6 md:p-8 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[#FDEEDC] text-xs font-bold">
              <span>
                🇳🇵 Grade {studentData.gradeLevel} '{studentData.section}' • Roll No.{' '}
                {studentData.rollNumber}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-serif">
              नमस्ते, {studentData.name}! 🙏
            </h1>
            <p className="text-[#F9F7F2]/90 text-xs md:text-sm max-w-xl">
              Here is your daily schedule and learning tasks for {studentData.schoolName}.
            </p>
          </div>

          {/* Key Stats Pills */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/15 backdrop-blur-md border border-white/20 px-3.5 py-2.5 rounded-2xl flex items-center gap-2.5">
              <Flame className="w-5 h-5 text-[#FDEEDC]" />
              <div>
                <p className="text-[10px] text-white/80 font-medium">Streak</p>
                <p className="text-sm font-black text-[#FDEEDC]">{studentData.streakDays} Days</p>
              </div>
            </div>

            <div className="bg-white/15 backdrop-blur-md border border-white/20 px-3.5 py-2.5 rounded-2xl flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 text-white" />
              <div>
                <p className="text-[10px] text-white/80 font-medium">Attendance</p>
                <p className="text-sm font-black text-white">{studentData.attendancePercentage}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container: Schedule & Core Learning Tasks */}
      <div className="space-y-6">
        {/* Daily Classroom Timetable & Bag Packing Guide */}
        <div className="bg-white rounded-3xl p-6 border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EDEAE2] pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-[#2D2D2A] font-serif flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#4A6741]" />
                  School Timetable & Bag Packing Guide
                </h2>

                {/* Accurate User Timezone Clock (Dev Only) */}
                {import.meta.env.DEV && (
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-[#EBF1E8] text-[#4A6741] border border-[#88A070]/40 flex items-center gap-1.5 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-[#4A6741] animate-pulse"></span>
                    <span>
                      Clock:{' '}
                      {now.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Time Mode Simulator / Selector (Dev Only) */}
            {import.meta.env.DEV && (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className="flex items-center gap-1.5 bg-[#F9F7F2] p-1.5 rounded-2xl border border-[#EDEAE2]">
                  <Clock className="w-3.5 h-3.5 text-[#E88D67] ml-1" />
                  <select
                    value={timeMode}
                    onChange={(e) => setTimeMode(e.target.value as any)}
                    className="text-xs font-bold text-[#2D2D2A] bg-transparent focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="real">⏱️ Real Clock</option>
                    {currentDayPeriods.map((period) => (
                      <option key={period.id} value={period.startTime}>
                        {period.startTime} — {period.subject}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Day Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {DAYS_OF_WEEK.map((day) => {
              const isToday = day === systemTodayName;
              const isSelected = day === selectedDay;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-3.5 py-2 rounded-2xl font-bold text-xs shrink-0 transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#4A6741] text-white shadow-sm ring-2 ring-[#4A6741]/20'
                      : 'bg-[#F9F7F2] text-[#7A7A72] border border-[#E5E1D8] hover:bg-[#F0EDE5] hover:text-[#2D2D2A]'
                  }`}
                >
                  <span>{day}</span>
                  {isToday && (
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-white text-[#4A6741]' : 'bg-[#E88D67] text-white'
                      }`}
                    >
                      TODAY
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Status Banner for Today */}
          {selectedDay === systemTodayName && (
            <div
              className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 transition-all ${
                activePeriod
                  ? 'bg-[#EBF1E8] border-[#88A070] text-[#4A6741]'
                  : 'bg-[#F9F7F2] border-[#EDEAE2] text-[#7A7A72]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${activePeriod ? 'bg-[#4A6741] animate-ping' : activeBreak ? 'bg-amber-500 animate-ping' : 'bg-slate-400'}`}
                ></span>
                <span>
                  {activePeriod ? (
                    <>
                      Live Class in Session:{' '}
                      <strong className="text-[#2D2D2A]">
                        Period {activePeriod.periodNumber} ({activePeriod.subject})
                      </strong>{' '}
                      • {activePeriod.startTime} - {activePeriod.endTime}
                    </>
                  ) : activeBreak ? (
                    <>
                      🔔 <strong>Current Break: {activeBreak.name}</strong> ({activeBreak.startTime} - {activeBreak.endTime || 'Ongoing'})
                    </>
                  ) : currentDayPeriods.length > 0 &&
                    effectiveMinutes <
                      Math.min(
                        ...currentDayPeriods.map(
                          (period) => parseTimeToMinutes(period.startTime) ?? 1440,
                        ),
                      ) ? (
                    <>
                      Morning before school hours. First period starts at{' '}
                      <strong className="text-[#2D2D2A]">{currentDayPeriods[0].startTime}</strong>.
                    </>
                  ) : currentDayPeriods.length > 0 &&
                    effectiveMinutes >=
                      Math.max(
                        ...currentDayPeriods.map(
                          (period) => parseTimeToMinutes(period.endTime) ?? 0,
                        ),
                      ) ? (
                    <>School has concluded for today.</>
                  ) : (
                    <>School Recess / Transition Break. Next period starts shortly.</>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Period List for Selected Day */}
          <div className="space-y-2.5 pt-1">
            {currentDayPeriods.length === 0 ? (
              <div className="text-center py-8 bg-[#F9F7F2] rounded-2xl border border-[#EDEAE2]">
                <CalendarDays className="w-8 h-8 text-[#E88D67] mx-auto mb-2 opacity-80" />
                <p className="font-bold text-sm text-[#2D2D2A]">No scheduled periods</p>
                <p className="text-xs text-[#7A7A72] mt-0.5">
                  The school has not published timetable periods for {selectedDay}.
                </p>
              </div>
            ) : (
              currentDayPeriods.map((period) => {
                const highlighted = isPeriodHighlighted(period);
                const matchingBreakAfter = (schoolTimingConfig?.breaks || []).find(
                  (b) => b.afterPeriod === period.periodNumber,
                );

                return (
                  <React.Fragment key={period.id}>
                    <div
                      className={`p-4 rounded-2xl border transition-all ${
                        highlighted
                          ? 'bg-[#EBF1E8] border-[#88A070] shadow-sm ring-1 ring-[#88A070]/50'
                          : 'bg-[#F9F7F2] border-[#E5E1D8] hover:border-[#88A070]/60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Left: Period Number, Subject & Time */}
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-2xl font-black text-xs flex flex-col items-center justify-center shrink-0 ${
                              highlighted
                                ? 'bg-[#4A6741] text-white shadow-sm'
                                : 'bg-[#E5E1D8] text-[#2D2D2A]'
                            }`}
                          >
                            <span className="text-[9px] uppercase font-medium opacity-80">
                              Period
                            </span>
                            <span className="text-sm font-black leading-none">
                              {period.periodNumber}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-sm text-[#2D2D2A] font-serif">
                                {period.subject}
                              </h3>
                              {highlighted && (
                                <span className="text-[9px] font-black px-2.5 py-0.5 rounded-full bg-[#4A6741] text-white uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping"></span>
                                  <span>Active Period Now</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-[#7A7A72] mt-0.5 font-sans">
                              <span
                                className={`flex items-center gap-1 font-semibold ${
                                  highlighted ? 'text-[#4A6741]' : 'text-[#7A7A72]'
                                }`}
                              >
                                <Clock className="w-3.5 h-3.5" />
                                {period.startTime} - {period.endTime}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-[#7A7A72]" />
                                {period.room}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-[#7A7A72]" />
                                {period.teacherName}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right: What to pack badge */}
                        {period.requiredBooks && (
                          <div
                            className={`shrink-0 border px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs transition-colors ${
                              highlighted
                                ? 'bg-white border-[#88A070] text-[#2D2D2A] shadow-sm'
                                : 'bg-white border-[#E5E1D8] text-[#2D2D2A]'
                            }`}
                          >
                            <BookMarked className="w-4 h-4 text-[#E88D67]" />
                            <div>
                              <span className="text-[10px] font-bold text-[#7A7A72] uppercase block leading-none">
                                Pack in Bag:
                              </span>
                              <span className="font-bold text-[#2D2D2A] text-[11px]">
                                {period.requiredBooks}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Render break indicator if configured after this period */}
                    {matchingBreakAfter && (
                      <div className="flex items-center gap-3 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-800 font-semibold">
                        {matchingBreakAfter.type === 'snack' && <Coffee className="w-4 h-4 text-amber-600" />}
                        {matchingBreakAfter.type === 'lunch' && <Utensils className="w-4 h-4 text-emerald-600" />}
                        {matchingBreakAfter.type === 'dismissal' && <LogOut className="w-4 h-4 text-rose-600" />}
                        <span>{matchingBreakAfter.name}</span>
                        <span className="text-amber-600/70 font-mono font-normal">
                          ({matchingBreakAfter.startTime} {matchingBreakAfter.endTime ? `- ${matchingBreakAfter.endTime}` : ''})
                        </span>
                      </div>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>

        {/* Pending Tasks (Homework & Online Quizzes) */}
        <div className="bg-white rounded-3xl p-6 border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center justify-between border-b border-[#EDEAE2] pb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTaskTab('homework')}
                className={`pb-1 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                  activeTaskTab === 'homework'
                    ? 'border-[#4A6741] text-[#4A6741]'
                    : 'border-transparent text-[#7A7A72] hover:text-[#2D2D2A]'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Pending Homework ({pendingAssignments.length})</span>
              </button>

              <button
                onClick={() => setActiveTaskTab('quizzes')}
                className={`pb-1 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                  activeTaskTab === 'quizzes'
                    ? 'border-[#E88D67] text-[#E88D67]'
                    : 'border-transparent text-[#7A7A72] hover:text-[#2D2D2A]'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span>Available Quizzes ({availableQuizzes.length})</span>
              </button>
            </div>
          </div>

          {/* Homework List */}
          {activeTaskTab === 'homework' && (
            <div className="space-y-3">
              {pendingAssignments.length === 0 ? (
                <div className="text-center py-6 text-[#7A7A72] text-xs">
                  <CheckCircle className="w-8 h-8 text-[#4A6741] mx-auto mb-2" />
                  <p className="font-bold text-[#2D2D2A]">All Homework Submitted!</p>
                  <p className="text-[11px]">You're all caught up for today.</p>
                </div>
              ) : (
                pendingAssignments.map((asg) => (
                  <div
                    key={asg.id}
                    className="p-4 rounded-2xl border border-[#EDEAE2] bg-[#F9F7F2] hover:border-[#4A6741] transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-[#4A6741] uppercase tracking-wider">
                          {asg.subject}
                        </span>
                        <h3 className="font-bold text-xs text-[#2D2D2A] font-serif">{asg.title}</h3>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FDEEDC] text-[#E88D67] shrink-0">
                        Due {asg.dueDate}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#7A7A72] line-clamp-2">{asg.instructions}</p>

                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-[10px] text-[#7A7A72] font-semibold">
                        {asg.totalPoints} Marks
                      </span>
                      <button
                        onClick={() => onOpenAssignmentModal(asg.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#4A6741] text-white font-bold text-xs hover:bg-[#3D5535] transition-colors shadow-sm"
                      >
                        Submit Homework
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Quizzes List */}
          {activeTaskTab === 'quizzes' && (
            <div className="space-y-3">
              {quizSubmissions.some((s) => s.studentId === currentUser.id) && (
                <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>You have completed online quizzes</span>
                  </span>
                  <button
                    onClick={() => setIsCompletedQuizzesOpen(true)}
                    className="px-3 py-1 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition-colors shadow-xs"
                  >
                    My Completed Quizzes Dashboard
                  </button>
                </div>
              )}

              {visibleQuizzes.length === 0 ? (
                <div className="text-center py-6 text-[#7A7A72] text-xs">
                  <CheckCircle className="w-8 h-8 text-[#E88D67] mx-auto mb-2" />
                  <p className="font-bold text-[#2D2D2A]">No Quizzes Available!</p>
                  <p className="text-[11px]">Check back later for new online tests.</p>
                </div>
              ) : (
                visibleQuizzes.map((quiz) => {
                  const sub = quizSubmissions.find(
                    (s) => s.quizId === quiz.id && s.studentId === currentUser.id,
                  );
                  const isCompleted = Boolean(sub);
                  const totalPoints = quiz.questions.reduce((acc, q) => acc + q.points, 0);

                  return (
                    <div
                      key={quiz.id}
                      className={`p-4 rounded-2xl border transition-all space-y-2 ${
                        isCompleted
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : 'border-[#EDEAE2] bg-[#F9F7F2] hover:border-[#E88D67]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-[#E88D67] uppercase tracking-wider">
                            {quiz.subject}
                          </span>
                          <h3 className="font-bold text-xs text-[#2D2D2A] font-serif">
                            {quiz.title}
                          </h3>
                        </div>
                        {isCompleted ? (
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shrink-0 shadow-xs">
                            Attempted
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FDEEDC] text-[#E88D67] shrink-0">
                            {quiz.durationMinutes} mins
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-[#7A7A72]">{quiz.description}</p>

                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-[10px] text-[#7A7A72] font-semibold">
                          {quiz.questions.length} Questions
                        </span>

                        {isCompleted ? (
                          <button
                            onClick={() => setIsCompletedQuizzesOpen(true)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-xs hover:bg-emerald-200 transition-colors shadow-xs flex items-center gap-1.5"
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>
                              {quiz.revealMarksMode === 'later'
                                ? 'Completed • Grade Pending'
                                : `Completed • ${sub?.score}/${totalPoints} Marks`}
                            </span>
                          </button>
                        ) : isQuizTakeable(quiz) ? (
                          <button
                            onClick={() => onOpenQuizModal(quiz.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-[#E88D67] text-white font-bold text-xs hover:bg-[#D87B55] transition-colors shadow-sm flex items-center gap-1.5"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>Start Quiz</span>
                          </button>
                        ) : (
                          <span className="px-3.5 py-1.5 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 font-bold text-xs flex items-center gap-1.5">
                            <Hourglass className="w-3.5 h-3.5" />
                            Waiting to start
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
