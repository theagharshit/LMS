import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { UserCheck, Bell, School, Pencil, X, Clock, CalendarDays, HelpCircle } from 'lucide-react';
import { getAvatarUrl } from '@utils/avatarUtils';

type StatusKey = 'present' | 'absent' | 'late' | 'excused' | 'unmarked';

const STATUS_CONFIG: Record<
  StatusKey,
  { label: string; description: string; color: string; pill: string; icon: string }
> = {
  present: {
    label: 'Present',
    description: 'Student attended on time',
    color: 'bg-[#4A6741] text-white',
    pill: 'bg-[#EBF1E8] text-[#4A6741]',
    icon: '✅',
  },
  absent: {
    label: 'Absent',
    description: 'Student did not attend class',
    color: 'bg-[#E88D67] text-white',
    pill: 'bg-[#FDEEDC] text-[#E88D67]',
    icon: '❌',
  },
  late: {
    label: 'Late / Tardy',
    description: 'Student arrived after class started (tardy)',
    color: 'bg-amber-600 text-white',
    pill: 'bg-amber-100 text-amber-800',
    icon: '⏰',
  },
  excused: {
    label: 'Leave / Excused',
    description: 'Approved absence (medical, family, etc.)',
    color: 'bg-[#88A070] text-white',
    pill: 'bg-[#EBF1E8]/60 text-[#4A6741]',
    icon: '📋',
  },
  unmarked: {
    label: 'Unmarked',
    description: 'Not yet marked for this day',
    color: 'bg-gray-200 text-gray-500',
    pill: 'bg-gray-100 text-gray-500',
    icon: '—',
  },
};

export const AttendanceRegister: React.FC = () => {
  const {
    studentProfiles,
    attendanceRecords,
    markAttendance,
    currentUser,
    allUsers,
    classrooms,
    calendarEvents,
    dispatchNotification,
  } = useApp();

  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  // Determine teacher's classrooms
  const teacherClassrooms = useMemo(() => {
    if (currentUser.role === 'admin') {
      return classrooms;
    }
    return classrooms;
  }, [classrooms, currentUser]);

  const [selectedClassroomId, setSelectedClassroomId] = useState<string>(
    () => teacherClassrooms[0]?.id || '',
  );

  const activeClassroom = useMemo(() => {
    return (
      classrooms.find((c) => c.id === selectedClassroomId) || teacherClassrooms[0] || classrooms[0]
    );
  }, [classrooms, selectedClassroomId, teacherClassrooms]);

  // Filter students enrolled in active classroom
  const classroomStudents = useMemo(() => {
    const enrolledIds = activeClassroom?.enrolledStudentIds;
    if (!enrolledIds || enrolledIds.length === 0) return [];
    return studentProfiles.filter((s) => enrolledIds.includes(s.id));
  }, [studentProfiles, activeClassroom]);

  const [alertSentStatus, setAlertSentStatus] = useState<Record<string, boolean>>({});

  const getStudentStatus = (studentId: string): StatusKey => {
    const rec = attendanceRecords.find((a) => a.studentId === studentId && a.date === selectedDate);
    if (!rec) return 'unmarked';
    return rec.status as StatusKey;
  };

  const handleStatusChange = (
    studentId: string,
    studentName: string,
    status: 'present' | 'absent' | 'late' | 'excused',
  ) => {
    markAttendance(studentId, studentName, selectedDate, status, '');

    // The API sends the canonical alert to the student and every active guardian.
    if (status === 'absent' || status === 'late') {
      setAlertSentStatus((prev) => ({ ...prev, [studentId]: true }));
    }
  };

  const handleSendParentAlert = (studentName: string, studentId: string) => {
    const title = `🚨 Urgent Attendance Reminder: ${studentName}`;
    const body = `${studentName} was marked Absent in ${activeClassroom?.name || 'Class'} on ${selectedDate}. Please verify with ${currentUser.schoolName}.`;

    const parentUsers = allUsers.filter(
      (u) => u.role === 'parent' && u.childrenIds?.includes(studentId),
    );
    for (const parentUser of parentUsers)
      dispatchNotification({
        recipientId: parentUser.id,
        title,
        body,
        category: 'CRITICAL',
        severity: 'urgent',
        type: 'attendance',
      });

    setAlertSentStatus((prev) => ({ ...prev, [studentId]: true }));
  };

  // Compute live statistics
  const stats = useMemo(() => {
    const counts: Record<StatusKey, number> = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      unmarked: 0,
    };

    classroomStudents.forEach((student) => {
      const st = getStudentStatus(student.id);
      counts[st]++;
    });

    return counts;
  }, [classroomStudents, attendanceRecords, selectedDate]);

  const isToday = selectedDate === today;
  const isPastDate = selectedDate < today;
  const selectedHoliday = calendarEvents.find(
    (event) => event.type === 'holiday' && event.date === selectedDate,
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="natural-banner rounded-3xl p-6 md:p-8 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[#FDEEDC] text-xs font-bold mb-2">
            <School className="w-3.5 h-3.5" />
            <span>{currentUser.schoolName} Attendance Register</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-serif">
            Daily Student Attendance Register
          </h1>
          <p className="text-xs md:text-sm text-[#F9F7F2]/90 mt-1">
            Mark daily attendance per subject class · Automatic safety alerts for Absent / Late
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {/* Edit Mode Toggle */}
          <button
            onClick={() => {
              setIsEditMode((prev) => !prev);
              if (isEditMode) setSelectedDate(today); // reset to today on exit
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              isEditMode
                ? 'bg-white text-[#4A6741] shadow-sm'
                : 'bg-white/20 border border-white/30 text-white hover:bg-white/30'
            }`}
          >
            {isEditMode ? (
              <>
                <X className="w-3.5 h-3.5" />
                Exit Edit Mode
              </>
            ) : (
              <>
                <Pencil className="w-3.5 h-3.5" />
                Edit Past Date
              </>
            )}
          </button>

          {/* Date picker — only shown in edit mode or always for today */}
          {isEditMode ? (
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl px-3.5 py-2">
              <CalendarDays className="w-3.5 h-3.5 text-white" />
              <input
                type="date"
                value={selectedDate}
                max={today}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white font-bold text-xs focus:outline-none"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 text-[#F9F7F2] text-xs font-bold">
              <CalendarDays className="w-3.5 h-3.5" />
              {new Date(today + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit mode notice */}
      {isEditMode && isPastDate && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-center gap-3 text-amber-800 text-xs font-semibold">
          <Pencil className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Edit Mode Active</strong> — You are editing attendance for{' '}
            <strong>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </strong>
            . Changes will overwrite existing records for that date.
          </span>
        </div>
      )}

      {selectedHoliday && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-xs font-semibold text-amber-800">
          <strong>{selectedHoliday.title}</strong> is a declared school holiday. Attendance is
          locked and excluded from attendance-rate calculations.
        </div>
      )}

      {/* Classroom Selection Bar */}
      <div className="bg-white rounded-3xl p-4 border border-[#EDEAE2] shadow-xs flex items-center gap-2 overflow-x-auto text-xs">
        <span className="font-bold text-[#7A7A72] shrink-0 flex items-center gap-1.5 px-2">
          <School className="w-4 h-4 text-[#4A6741]" />
          My Classrooms:
        </span>
        {teacherClassrooms.map((cls) => {
          const isSel = cls.id === activeClassroom?.id;
          return (
            <button
              key={cls.id}
              onClick={() => setSelectedClassroomId(cls.id)}
              className={`px-4 py-2 rounded-2xl font-bold shrink-0 transition-all cursor-pointer flex items-center gap-2 ${
                isSel
                  ? 'bg-[#4A6741] text-white shadow-sm'
                  : 'bg-[#F9F7F2] text-[#7A7A72] border border-[#EDEAE2] hover:bg-[#EBF1E8]'
              }`}
            >
              <span>{cls.name}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${isSel ? 'bg-white/20' : 'bg-[#EDEAE2]'}`}
              >
                {cls.subject}
              </span>
            </button>
          );
        })}
      </div>

      {/* Roster Card */}
      <div className="bg-white rounded-3xl p-6 border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-base font-bold text-[#2D2D2A] font-serif flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#4A6741]" />
              Class Roster — {activeClassroom?.name || 'Classroom'}{' '}
              <span className="text-[#7A7A72] font-normal text-sm">
                ({activeClassroom?.subject})
              </span>
            </h2>
            <p className="text-xs text-[#7A7A72]">
              {isToday && !isEditMode ? 'Today' : selectedDate} • {classroomStudents.length}{' '}
              enrolled students
            </p>
          </div>

          {/* Stats + Legend toggle */}
          <div className="flex items-center gap-2 text-xs font-bold flex-wrap">
            {(Object.keys(STATUS_CONFIG) as StatusKey[])
              .filter((k) => k !== 'unmarked' || stats.unmarked > 0)
              .map((k) => (
                <span key={k} className={`px-3 py-1 rounded-full ${STATUS_CONFIG[k].pill}`}>
                  {stats[k]} {STATUS_CONFIG[k].label.split(' ')[0]}
                </span>
              ))}
            <button
              onClick={() => setShowLegend((p) => !p)}
              className="w-6 h-6 rounded-full bg-[#F9F7F2] border border-[#EDEAE2] text-[#7A7A72] flex items-center justify-center hover:bg-[#EDEAE2] transition-all cursor-pointer"
              title="Status Legend"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Inline Legend */}
        {showLegend && (
          <div className="bg-[#F9F7F2] border border-[#EDEAE2] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {(Object.keys(STATUS_CONFIG) as StatusKey[]).map((k) => (
              <div key={k} className="flex items-start gap-2">
                <span className="text-base leading-none">{STATUS_CONFIG[k].icon}</span>
                <div>
                  <p className="font-bold text-[#2D2D2A]">{STATUS_CONFIG[k].label}</p>
                  <p className="text-[#7A7A72]">{STATUS_CONFIG[k].description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Student Attendance List */}
        <div className="space-y-3">
          {classroomStudents.map((student) => {
            const status = getStudentStatus(student.id);
            const isUnmarked = status === 'unmarked';

            return (
              <div
                key={student.id}
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                  isUnmarked
                    ? 'border-[#EDEAE2] bg-[#F9F7F2]'
                    : status === 'present'
                      ? 'border-[#C8DBC4] bg-[#F5FAF4]'
                      : status === 'absent'
                        ? 'border-[#F5C9B2] bg-[#FFF8F5]'
                        : status === 'late'
                          ? 'border-amber-200 bg-amber-50/50'
                          : 'border-[#EDEAE2] bg-[#F9F7F2]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={getAvatarUrl(student.avatar, student.name)}
                      alt={student.name}
                      onError={(e) => {
                        e.currentTarget.src = getAvatarUrl(undefined, student.name);
                      }}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    {/* Status dot */}
                    {!isUnmarked && (
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white text-[7px] flex items-center justify-center ${
                          status === 'present'
                            ? 'bg-[#4A6741]'
                            : status === 'absent'
                              ? 'bg-[#E88D67]'
                              : status === 'late'
                                ? 'bg-amber-500'
                                : 'bg-[#88A070]'
                        }`}
                      />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-[#2D2D2A] flex items-center gap-2">
                      {student.name}
                      <span className="text-[10px] text-[#7A7A72] font-normal">
                        Roll #{student.rollNumber}
                      </span>
                      {isUnmarked && (
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">
                          Not Marked
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-[#7A7A72]">
                      Parent: {student.parentName} · {student.parentPhone}
                    </p>
                  </div>
                </div>

                {/* Status Toggles */}
                <div className="flex flex-wrap items-center gap-2">
                  {(
                    [{ id: 'present' }, { id: 'absent' }, { id: 'late' }, { id: 'excused' }] as {
                      id: StatusKey;
                    }[]
                  ).map(({ id }) => {
                    const cfg = STATUS_CONFIG[id];
                    const isSel = status === id;
                    return (
                      <button
                        key={id}
                        disabled={Boolean(selectedHoliday)}
                        onClick={() =>
                          handleStatusChange(
                            student.id,
                            student.name,
                            id as 'present' | 'absent' | 'late' | 'excused',
                          )
                        }
                        title={cfg.description}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                          isSel
                            ? `${cfg.color} shadow-sm scale-105`
                            : 'bg-white text-[#7A7A72] border border-[#E5E1D8] hover:bg-[#EDEAE2]'
                        }`}
                      >
                        {id === 'late' ? (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Late
                          </span>
                        ) : (
                          cfg.label.split(' ')[0]
                        )}
                      </button>
                    );
                  })}

                  {/* Send Reminder if Absent */}
                  {status === 'absent' && (
                    <button
                      onClick={() => handleSendParentAlert(student.name, student.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                        alertSentStatus[student.id]
                          ? 'bg-[#EBF1E8] text-[#4A6741]'
                          : 'bg-[#FDEEDC] text-[#E88D67] hover:bg-[#FDEEDC]/80'
                      }`}
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>
                        {alertSentStatus[student.id] ? 'Parent Alert Sent ✓' : 'Notify Parent'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
