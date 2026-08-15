import React from 'react';
import { useApp } from '../../context/AppContext';
import { StudentLocationTracker } from '../common/StudentLocationTracker';
import { DirectMessage } from '@lms/shared';
import { apiFetch } from '@utils/apiFetch';
import {
  Heart,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldAlert,
  FileCheck,
  TrendingUp,
  AlertTriangle,
  Award,
  ChevronRight,
  BookOpen,
  MessageSquare,
  XCircle,
  Calendar,
  Coffee,
  Utensils,
  MapPin,
  User,
} from 'lucide-react';

interface ParentDashboardProps {
  onOpenParentalControls: () => void;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ onOpenParentalControls }) => {
  const {
    activeChild,
    activeChildList,
    setActiveChildId,
    setIsAiParentSummaryOpen,
    assignments,
    submissions,
    parentControls,
    currentUser,
    attendanceRecords,
    subjectPerformances,
    classrooms,
    timetableSlots,
    weeklySchedule,
    schoolTimingConfig,
  } = useApp();
  const [pendingMessages, setPendingMessages] = React.useState<DirectMessage[]>([]);

  React.useEffect(() => {
    if (currentUser.role !== 'parent') return;
    apiFetch('/api/db/messages/pending-approval', { feedback: false })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        setPendingMessages(Array.isArray(data.pendingMessages) ? data.pendingMessages : []);
      })
      .catch(() => undefined);
  }, [currentUser.id, currentUser.role]);

  const reviewMessage = async (messageId: string, decision: 'approved' | 'rejected') => {
    const response = await apiFetch(`/api/db/messages/${messageId}/approval`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
      feedback: {
        success:
          decision === 'approved'
            ? 'The message was approved and sent.'
            : 'The message was rejected.',
        error: 'The message review could not be saved.',
      },
    }).catch(() => null);
    if (response?.ok)
      setPendingMessages((messages) => messages.filter((message) => message.id !== messageId));
  };

  if (!activeChild)
    return (
      <div className="rounded-3xl border border-[#EDEAE2] bg-white p-8 text-center text-sm text-[#7A7A72]">
        No active child is linked to this parent account.
      </div>
    );

  const childControls = parentControls[activeChild.id];
  const childClassroomIds = new Set(
    classrooms
      .filter((classroom) => classroom.enrolledStudentIds?.includes(activeChild.id))
      .map((classroom) => classroom.id),
  );
  const childAssignments = assignments.filter((assignment) =>
    childClassroomIds.has(assignment.classroomId),
  );
  const pendingAssignments = childAssignments.filter(
    (assignment) =>
      !submissions.some(
        (submission) =>
          submission.assignmentId === assignment.id &&
          submission.studentId === activeChild.id &&
          ['submitted', 'graded'].includes(submission.status),
      ),
  );
  const nextDue = [...pendingAssignments].sort((left, right) =>
    `${left.dueDate}T${left.dueTime}`.localeCompare(`${right.dueDate}T${right.dueTime}`),
  )[0];
  const today = new Date().toISOString().slice(0, 10);
  const todayAttendance = attendanceRecords.find(
    (record) => record.studentId === activeChild.id && record.date === today,
  );
  const childPerformance = subjectPerformances.filter(
    (performance) => performance.studentId === activeChild.id,
  );
  const academicAverage = childPerformance.length
    ? childPerformance.reduce((sum, performance) => sum + performance.scorePercentage, 0) /
      childPerformance.length
    : null;

  const isBelowGrade7 = activeChild.gradeLevel < 7;

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDayName = daysOfWeek[new Date().getDay()];
  const todayDayIdx = new Date().getDay();

  const childDbSlots = timetableSlots.filter((s) => {
    if (s.dayOfWeek !== todayDayIdx) return false;
    if (s.cohort?.gradeLevel && activeChild.gradeLevel) {
      return s.cohort.gradeLevel === activeChild.gradeLevel;
    }
    return true;
  });

  const childTodayPeriods = React.useMemo(() => {
    if (childDbSlots.length > 0) {
      return childDbSlots.map((s) => ({
        id: s.id,
        periodNumber: s.periodNumber,
        startTime: s.startTime,
        endTime: s.endTime,
        subject: s.subject?.name || s.classroom?.name || 'Class',
        teacherName: s.teacher?.name || 'Teacher',
        room: s.roomNumber || 'Room 101',
      })).sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return weeklySchedule[todayDayName as keyof typeof weeklySchedule] || [];
  }, [childDbSlots, weeklySchedule, todayDayName]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Parent Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl natural-banner p-6 md:p-8 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[#FDEEDC] text-xs font-bold">
              <Heart className="w-3.5 h-3.5 text-[#E88D67] fill-[#E88D67]" />
              <span>Parent Portal • {currentUser.schoolName}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-serif">
              Namaste, {currentUser.name}! 🙏
            </h1>
            <p className="text-[#F9F7F2]/90 text-xs md:text-sm max-w-xl">
              Viewing learning progress & activity for{' '}
              <span className="font-bold underline text-[#FDEEDC]">{activeChild.name}</span> (Grade{' '}
              {activeChild.gradeLevel}-{activeChild.section}).
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => setIsAiParentSummaryOpen(true)}
              className="px-4 py-3 rounded-2xl bg-[#E88D67] hover:bg-[#D87B55] text-white font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span>Generate AI Bilingual Digest</span>
            </button>
            <button
              onClick={onOpenParentalControls}
              className="px-4 py-3 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-extrabold text-xs flex items-center gap-2 border border-white/30 backdrop-blur-md transition-all cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 text-[#FDEEDC]" />
              <span>Parental Safeguards</span>
            </button>
          </div>
        </div>

        {/* Multi-Child Selector Tabs */}
        {activeChildList.length > 1 && (
          <div className="mt-6 pt-4 border-t border-white/20 flex flex-wrap gap-2">
            {activeChildList.map((child) => (
              <button
                key={child.id}
                onClick={() => setActiveChildId(child.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  child.id === activeChild.id
                    ? 'bg-white text-[#4A6741] shadow-sm'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {child.name} (Grade {child.gradeLevel}-{child.section})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Parent Action Required Alert (Pending Message Approvals) */}
      {pendingMessages.length > 0 && (
        <section className="bg-amber-50 rounded-3xl p-6 border border-amber-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-amber-950 font-serif">
                Action Required: Outbound Message Approvals ({pendingMessages.length})
              </h3>
              <p className="text-xs text-amber-700">
                Messages from students under Grade 7 require parental authorization prior to
                delivery.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {pendingMessages.map((msg) => (
              <div
                key={msg.id}
                className="p-4 rounded-2xl bg-white border border-amber-200/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#2D2D2A]">To: {msg.receiverName}</span>
                    <span className="text-[10px] text-[#7A7A72]">
                      ({new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                    </span>
                  </div>
                  <p className="text-xs text-[#52524E] italic bg-[#F9F7F2] p-2.5 rounded-xl border border-[#EDEAE2]">
                    "{msg.content}"
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => reviewMessage(msg.id, 'approved')}
                    className="px-3 py-1.5 bg-[#4A6741] hover:bg-[#3D5535] text-white text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve
                  </button>
                  <button
                    onClick={() => reviewMessage(msg.id, 'rejected')}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Real-Time Location Tracker Card */}
      <StudentLocationTracker
        studentId={activeChild.id}
        studentName={activeChild.name}
        showUpdateButton={false}
      />

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-white border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-1">
          <p className="text-[10px] font-bold uppercase text-[#7A7A72]">Today's Attendance</p>
          <div className="flex items-center gap-2 font-extrabold text-base">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                todayAttendance?.status === 'present'
                  ? 'bg-[#4A6741]'
                  : todayAttendance?.status === 'absent'
                    ? 'bg-red-500'
                    : 'bg-amber-500'
              }`}
            />
            <span className="capitalize text-[#2D2D2A]">
              {todayAttendance?.status ?? 'Not Marked Yet'}
            </span>
          </div>
          <p className="text-[11px] text-[#7A7A72]">
            Overall Rate:{' '}
            <strong className="text-[#2D2D2A]">{activeChild.attendancePercentage}%</strong>
          </p>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-1">
          <p className="text-[10px] font-bold uppercase text-[#7A7A72]">Learning Streak</p>
          <div className="flex items-center gap-2 text-[#E88D67] font-extrabold text-base">
            <span className="text-xl">🔥</span>
            <span>{activeChild.streakDays} Consecutive Days</span>
          </div>
          <p className="text-[11px] text-[#7A7A72]">Active daily on Sikshya LMS</p>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-1">
          <p className="text-[10px] font-bold uppercase text-[#7A7A72]">Pending Homework</p>
          <div className="flex items-center gap-2 text-[#4A6741] font-extrabold text-base">
            <FileCheck className="w-5 h-5 text-[#4A6741]" />
            <span>{pendingAssignments.length} Homework Due</span>
          </div>
          <p className="text-[11px] text-[#7A7A72]">
            {nextDue ? `Next due ${nextDue.dueDate} at ${nextDue.dueTime}` : 'No pending homework'}
          </p>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-1">
          <p className="text-[10px] font-bold uppercase text-[#7A7A72]">Academic Standing</p>
          <div className="flex items-center gap-2 text-[#4A6741] font-extrabold text-base">
            <Award className="w-5 h-5 text-[#4A6741]" />
            <span>
              {academicAverage === null
                ? 'No marks published'
                : `${academicAverage.toFixed(1)}% Average`}
            </span>
          </div>
          <p className="text-[11px] text-[#7A7A72]">Based on published subject performance</p>
        </div>
      </div>

      {/* Main Grid: Homework Tracker & Parental Controls Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Homework & Exam Monitor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Schedule Card */}
          <div className="bg-white rounded-3xl p-6 border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#2D2D2A] font-serif flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#4A6741]" />
                Today's Class Schedule ({todayDayName})
              </h2>
            </div>

            {childTodayPeriods.length === 0 ? (
              <p className="text-xs text-[#7A7A72] py-4 text-center">No scheduled classes for today.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {childTodayPeriods.map((period) => (
                  <div key={period.id} className="p-3 bg-[#F9F7F2] border border-[#EDEAE2] rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-[#4A6741] uppercase">Period {period.periodNumber}</span>
                      <h4 className="font-bold text-xs text-[#2D2D2A]">{period.subject}</h4>
                      <p className="text-[11px] text-[#7A7A72] mt-0.5 flex items-center gap-2">
                        <span>{period.startTime} - {period.endTime}</span>
                        <span>•</span>
                        <span>{period.room}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#2D2D2A] font-serif flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#E88D67]" />
                Child's Homework Submissions & Teacher Feedback
              </h2>
            </div>

            <div className="space-y-3">
              {childAssignments.map((asg) => {
                const sub = submissions.find(
                  (s) => s.assignmentId === asg.id && s.studentId === activeChild.id,
                );
                return (
                  <div
                    key={asg.id}
                    className="p-4 rounded-2xl border border-[#EDEAE2] bg-[#F9F7F2] space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-[#E88D67] uppercase">
                          {asg.subject}
                        </span>
                        <h3 className="font-bold text-xs text-[#2D2D2A]">{asg.title}</h3>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          sub?.status === 'graded'
                            ? 'bg-[#EBF1E8] text-[#4A6741]'
                            : 'bg-[#FDEEDC] text-[#E88D67]'
                        }`}
                      >
                        {sub?.status === 'graded'
                          ? `Graded (${sub.grade}/${asg.totalPoints})`
                          : 'In Progress'}
                      </span>
                    </div>

                    {sub?.feedback && (
                      <p className="text-xs text-[#2D2D2A] italic bg-white p-2.5 rounded-xl border border-[#EDEAE2]">
                        Teacher Feedback: "{sub.feedback}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Grade < 7 Controls Quick Status */}
        <div className="space-y-6">
          {isBelowGrade7 ? (
            <div className="bg-[#FDEEDC] rounded-3xl p-6 border border-[#E88D67]/30 space-y-4">
              <div className="flex items-center gap-2 text-[#E88D67] font-bold text-sm font-serif">
                <ShieldAlert className="w-5 h-5 text-[#E88D67]" />
                <span>Grade &lt; 7 Parental Safety Controls</span>
              </div>
              <p className="text-xs text-[#2D2D2A]">
                Safety protections active for {activeChild.name} (Grade {activeChild.gradeLevel}):
              </p>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 rounded-xl bg-white font-medium">
                  <span>Teacher Direct Chat:</span>
                  <span className="font-bold text-[#4A6741]">
                    {childControls
                      ? childControls.allowTeacherDirectChat
                        ? 'Allowed'
                        : 'Restricted'
                      : 'Not configured'}
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-white font-medium">
                  <span>Peer Public Discussions:</span>
                  <span className="font-bold text-[#E88D67]">
                    {childControls
                      ? childControls.allowPeerDiscussion
                        ? 'Allowed'
                        : 'Restricted'
                      : 'Not configured'}
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-white font-medium">
                  <span>Daily Screen Time Cap:</span>
                  <span className="font-bold text-[#E88D67]">
                    {childControls
                      ? `${childControls.screenTimeLimitMinutes} Minutes`
                      : 'Not configured'}
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-white font-medium">
                  <span>Outbound Msg Approval:</span>
                  <span className="font-bold text-[#4A6741]">Required ✓</span>
                </div>
              </div>

              <button
                onClick={onOpenParentalControls}
                className="w-full py-2.5 rounded-2xl bg-[#E88D67] text-white font-bold text-xs hover:bg-[#D87B55] transition-colors shadow-sm"
              >
                Configure Safety Permissions
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-6 border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-3">
              <h3 className="font-bold text-sm text-[#2D2D2A] font-serif">
                Parent Notifications Settings
              </h3>
              <p className="text-xs text-[#7A7A72]">
                Receiving instant alerts for homework deadlines, attendance updates & term results.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
