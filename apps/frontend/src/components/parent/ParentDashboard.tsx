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

            {isBelowGrade7 && (
              <button
                onClick={onOpenParentalControls}
                className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-[#FDEEDC] border border-white/20 font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4 text-[#FDEEDC]" />
                <span>Grade &lt; 7 Parental Safety</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {pendingMessages.length > 0 && (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-amber-900">
            <MessageSquare className="h-5 w-5" />
            <h2 className="font-serif text-sm font-bold">Student messages awaiting approval</h2>
          </div>
          <div className="space-y-3">
            {pendingMessages.map((message) => (
              <div key={message.id} className="rounded-2xl border border-amber-200 bg-white p-4">
                <p className="text-[11px] font-bold text-[#7A7A72]">
                  {message.senderName} → {message.receiverName}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-xs text-[#2D2D2A]">{message.content}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => reviewMessage(message.id, 'approved')}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#4A6741] px-3 py-2 text-xs font-bold text-white"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve & send
                  </button>
                  <button
                    onClick={() => reviewMessage(message.id, 'rejected')}
                    className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Real-Time "Where is My Child?" Location Tracking Card */}
      <StudentLocationTracker studentId={activeChild.id} studentName={activeChild.name} />

      {/* Child Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-white border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-1">
          <p className="text-[10px] font-bold uppercase text-[#7A7A72]">Today's Attendance</p>
          <div className="flex items-center gap-2 text-[#4A6741] font-extrabold text-base">
            <CheckCircle2 className="w-5 h-5 text-[#4A6741]" />
            <span className="capitalize">{todayAttendance?.status || 'Not marked'}</span>
          </div>
          <p className="text-[11px] text-[#7A7A72]">
            {activeChild.attendancePercentage}% Total Attendance Rate
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
