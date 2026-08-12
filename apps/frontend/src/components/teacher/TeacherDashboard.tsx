import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { getAvatarUrl } from '@utils/avatarUtils';
import { StudentLocationTracker } from '../common/StudentLocationTracker';
import { DayOfWeek, SchedulePeriod } from '@lms/shared';
import { apiFetch } from '@utils/apiFetch';
import { toast } from '@utils/toast';
import {
  Users,
  BookOpen,
  FileCheck,
  Sparkles,
  UserCheck,
  PlusCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Send,
  MessageSquare,
  Award,
  Calendar,
  Edit3,
  Save,
  Plus,
  Trash2,
  BookMarked,
} from 'lucide-react';

interface TeacherDashboardProps {
  onOpenGradeModal: (submissionId: string) => void;
  onOpenQuizBuilderModal: () => void;
}

const DAYS_LIST: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  onOpenGradeModal,
  onOpenQuizBuilderModal,
}) => {
  const {
    currentUser,
    classrooms,
    assignments,
    submissions,
    attendanceRecords,
    studentProfiles,
    gradeSubmission,
    setActiveView,
    weeklySchedule,
    updateDaySchedule,
    substituteRequests,
    teacherAbsenceRequests,
    submitTeacherAbsenceRequest,
    updateSubstituteStatus,
  } = useApp();

  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveEndDate, setLeaveEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveReason, setLeaveReason] = useState('');

  const [gradingModalSubmissionId, setGradingModalSubmissionId] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState<number>(18);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [isAiGeneratingFeedback, setIsAiGeneratingFeedback] = useState(false);

  // Timetable upload & manager state
  const [isTimetableModalOpen, setIsTimetableModalOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<DayOfWeek>('Sunday');
  const [editablePeriods, setEditablePeriods] = useState<SchedulePeriod[]>(weeklySchedule.Sunday);
  const [timetableSaveSuccess, setTimetableSaveSuccess] = useState(false);

  const pendingGradingSubmissions = submissions.filter((s) => s.status === 'submitted');
  const strugglingStudents = studentProfiles.filter((s) => s.attendancePercentage < 80);

  const handleAiFeedbackDraft = async (studentName: string) => {
    setIsAiGeneratingFeedback(true);
    try {
      const res = await apiFetch('/api/ai/teacher-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'grade_feedback',
          context: { studentName, subject: 'Mathematics', score: gradeInput, maxScore: 20 },
        }),
        feedback: {
          success: 'A personalized feedback draft is ready.',
          error: 'AI feedback is unavailable, so a safe fallback draft was used.',
          successTitle: 'Draft generated',
        },
      });
      if (!res.ok) throw new Error('AI feedback request failed.');
      const data = await res.json();
      setFeedbackInput(data.text || `Great job ${studentName}! Clear step-by-step working.`);
    } catch (err) {
      setFeedbackInput(`Excellent effort ${studentName}! Your working is neat and logic is solid.`);
    } finally {
      setIsAiGeneratingFeedback(false);
    }
  };

  const handleSaveGrade = (subId: string) => {
    gradeSubmission(subId, gradeInput, feedbackInput || 'Good effort! Keep practicing.');
    toast.success('The grade and feedback were saved for the student.', { title: 'Grade saved' });
    setGradingModalSubmissionId(null);
    setFeedbackInput('');
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Teacher Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl natural-banner p-6 md:p-8 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[#FDEEDC] text-xs font-bold">
              <span>👨‍🏫 Class Teacher & Mathematics Faculty</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-serif">
              Welcome Back, {currentUser.name}! 🙏
            </h1>
            <p className="text-[#F9F7F2]/90 text-xs md:text-sm max-w-xl">
              You have{' '}
              <span className="font-bold text-[#FDEEDC]">
                {pendingGradingSubmissions.length} pending homework submissions
              </span>{' '}
              waiting for review and grading across your classrooms.
            </p>
          </div>

          {/* Quick Teacher Actions */}
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => {
                setEditingDay('Sunday');
                setEditablePeriods(weeklySchedule.Sunday);
                setIsTimetableModalOpen(true);
              }}
              className="px-4 py-3 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white font-extrabold text-xs flex items-center gap-2 shadow-sm hover:bg-white/30 transition-all cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-[#FDEEDC]" />
              <span>Manage Weekly Timetable</span>
            </button>

            <button
              onClick={() => setActiveView('quizzes')}
              className="px-4 py-3 rounded-2xl bg-white/20 backdrop-blur-md hover:bg-white/30 text-white font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#FDEEDC]" />
              <span>Quiz Creator & Assessment Hub</span>
            </button>

            <button
              onClick={() => setActiveView('attendance')}
              className="px-4 py-3 rounded-2xl bg-[#88A070] text-white font-extrabold text-xs flex items-center gap-2 shadow-sm hover:bg-[#4A6741] transition-all cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Mark Attendance</span>
            </button>
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="px-4 py-3 rounded-2xl bg-[#E88D67] text-white font-extrabold text-xs flex items-center gap-2 shadow-sm hover:bg-[#D87B55] transition-all cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-white" />
              <span>Request Leave / Absence</span>
            </button>
          </div>
        </div>
      </div>

      {/* Teacher Substitute Duties & Leave Requests Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Substitute Duties Assigned */}
        <div className="bg-white rounded-3xl p-6 border border-[#EDEAE2] shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-[#2D2D2A] font-serif flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#E88D67]" />
            <span>Assigned Substitute Duties</span>
          </h3>

          {substituteRequests.filter(
            (r) =>
              r.assignedSubstituteId === currentUser.id ||
              r.suggestedSubstituteId === currentUser.id,
          ).length === 0 ? (
            <p className="text-xs text-[#7A7A72]">
              You have no upcoming substitute teaching duties.
            </p>
          ) : (
            <div className="space-y-3 text-xs">
              {substituteRequests
                .filter(
                  (r) =>
                    r.assignedSubstituteId === currentUser.id ||
                    r.suggestedSubstituteId === currentUser.id,
                )
                .map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-2xl border border-[#EDEAE2] bg-[#F9F7F2] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#2D2D2A]">{req.classroomName}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7A7A72]">
                      Date & Time:{' '}
                      <strong>
                        {req.date} ({req.timeSlot})
                      </strong>
                    </p>
                    <p className="text-[11px] text-[#7A7A72]">
                      Replacing Teacher: <strong>{req.originalTeacherName}</strong>
                    </p>
                    {req.status === 'PENDING' && (
                      <div className="flex justify-end gap-2 pt-2 border-t border-[#EDEAE2]">
                        <button
                          onClick={() =>
                            updateSubstituteStatus(
                              req.id,
                              'REJECTED',
                              'Teacher unavailable',
                              currentUser.id,
                            )
                          }
                          className="px-3 py-1 rounded-xl bg-white border border-rose-200 text-rose-700 font-bold text-[10px]"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() =>
                            updateSubstituteStatus(
                              req.id,
                              'APPROVED',
                              'Teacher accepted duty',
                              currentUser.id,
                            )
                          }
                          className="px-3 py-1 rounded-xl bg-emerald-600 text-white font-bold text-[10px] shadow-xs"
                        >
                          Accept Substitute Duty
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* My Leave Requests */}
        <div className="bg-white rounded-3xl p-6 border border-[#EDEAE2] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#2D2D2A] font-serif flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#4A6741]" />
              <span>My Leave & Absence Requests</span>
            </h3>
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="text-xs font-bold text-[#E88D67] hover:underline"
            >
              + Submit Request
            </button>
          </div>

          {teacherAbsenceRequests.filter((r) => r.teacherId === currentUser.id).length === 0 ? (
            <p className="text-xs text-[#7A7A72]">You have not submitted any leave requests.</p>
          ) : (
            <div className="space-y-3 text-xs">
              {teacherAbsenceRequests
                .filter((r) => r.teacherId === currentUser.id)
                .map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-2xl border border-[#EDEAE2] bg-[#F9F7F2] space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#2D2D2A]">
                        {req.startDate} to {req.endDate}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : req.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7A7A72]">Reason: {req.reason}</p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Real-Time Student Location Tracker Control */}
      <StudentLocationTracker studentId="user-stu-1" studentName="Aarav Sharma" />

      {/* Main Grid: Grading Desk & Class Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Submissions Desk Needing Grading */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#2D2D2A] font-serif flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-[#4A6741]" />
                  Homework Submissions Queue
                </h2>
                <p className="text-xs text-[#7A7A72]">
                  Student submissions needing grading & feedback
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FDEEDC] text-[#E88D67]">
                {pendingGradingSubmissions.length} Pending Review
              </span>
            </div>

            {pendingGradingSubmissions.length === 0 ? (
              <div className="text-center py-8 text-[#7A7A72] text-xs">
                <CheckCircle className="w-10 h-10 text-[#4A6741] mx-auto mb-2" />
                <p className="font-bold text-[#2D2D2A] text-sm">Submissions Queue Clear!</p>
                <p className="text-[11px]">
                  All student submissions have been graded and returned.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingGradingSubmissions.map((sub) => {
                  const asg = assignments.find((a) => a.id === sub.assignmentId);
                  return (
                    <div
                      key={sub.id}
                      className="p-4 rounded-2xl border border-[#EDEAE2] bg-[#F9F7F2] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={getAvatarUrl(sub.studentAvatar, sub.studentName)}
                          alt={sub.studentName}
                          onError={(e) => {
                            e.currentTarget.src = getAvatarUrl(undefined, sub.studentName);
                          }}
                          className="w-10 h-10 rounded-full object-cover shrink-0"
                        />
                        <div>
                          <h3 className="font-bold text-xs text-[#2D2D2A]">{sub.studentName}</h3>
                          <p className="text-[11px] text-[#7A7A72]">
                            {asg?.title || 'Assignment'} • Submitted{' '}
                            {new Date(sub.submittedAt).toLocaleTimeString()}
                          </p>
                          {sub.fileName && (
                            <span className="inline-block text-[10px] text-[#4A6741] font-medium mt-0.5">
                              📄 {sub.fileName}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setGradingModalSubmissionId(sub.id);
                          setGradeInput(18);
                          setFeedbackInput('');
                        }}
                        className="px-4 py-2 rounded-xl bg-[#4A6741] text-white font-bold text-xs hover:bg-[#3D5535] transition-colors shadow-sm self-end sm:self-auto"
                      >
                        Grade & Feedback
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Teacher's Managed Classrooms */}
          <div className="bg-white rounded-3xl p-6 border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
            <h2 className="text-base font-bold text-[#2D2D2A] font-serif flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#4A6741]" />
              My Managed Classrooms
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {classrooms.map((cls) => (
                <div
                  key={cls.id}
                  className="p-4 rounded-2xl border border-[#EDEAE2] bg-[#F9F7F2] space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#EBF1E8] text-[#4A6741]">
                      Grade {cls.gradeLevel}-{cls.section}
                    </span>
                    <span className="text-xs font-mono text-[#7A7A72]">{cls.code}</span>
                  </div>
                  <h3 className="font-bold text-sm text-[#2D2D2A] font-serif">{cls.name}</h3>
                  <p className="text-xs text-[#7A7A72]">
                    {cls.studentCount} Students Enrolled • {cls.roomNumber}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Struggling Student Detection & Attendance Summary */}
        <div className="space-y-6">
          {/* Struggling Student Radar */}
          <div className="bg-white rounded-3xl p-6 border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-center gap-2 text-[#E88D67] font-bold text-sm font-serif">
              <AlertTriangle className="w-5 h-5" />
              <span>Struggling Student Radar</span>
            </div>
            <p className="text-xs text-[#7A7A72]">
              Students requiring teacher intervention or parent communication
            </p>

            <div className="space-y-3">
              {strugglingStudents.map((st) => (
                <div
                  key={st.id}
                  className="p-3.5 rounded-2xl bg-[#FDEEDC] border border-[#E88D67]/30 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={getAvatarUrl(st.avatar, st.name)}
                        alt={st.name}
                        onError={(e) => {
                          e.currentTarget.src = getAvatarUrl(undefined, st.name);
                        }}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <h4 className="font-bold text-xs text-[#2D2D2A]">{st.name}</h4>
                        <p className="text-[10px] text-[#7A7A72]">
                          Grade {st.gradeLevel}-{st.section}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E88D67] text-white">
                      {st.attendancePercentage}% Attendance
                    </span>
                  </div>

                  <p className="text-[11px] text-[#2D2D2A]">
                    Parent: {st.parentName} ({st.parentPhone})
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Attendance Quick Widget */}
          <div className="bg-white rounded-3xl p-6 border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#2D2D2A] font-serif">
                Today's Class Attendance
              </h3>
              <span className="text-xs font-bold text-[#4A6741] bg-[#EBF1E8] px-2.5 py-0.5 rounded-full">
                94% Present
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#F0EDE5] overflow-hidden">
              <div className="h-full bg-[#4A6741] rounded-full" style={{ width: '94%' }} />
            </div>
            <p className="text-[11px] text-[#7A7A72]">32 Present • 2 Absent • 0 Late</p>
          </div>
        </div>
      </div>

      {/* Grading Modal */}
      {gradingModalSubmissionId && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <h3 className="font-bold text-base text-slate-900">Grade Student Submission</h3>

            <div>
              <label className="block font-semibold mb-1 text-slate-700">
                Marks Awarded (Out of 20):
              </label>
              <input
                type="number"
                value={gradeInput}
                onChange={(e) => setGradeInput(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-100 rounded-xl border border-slate-200 font-bold"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-semibold text-slate-700">Constructive Feedback:</label>
                <button
                  type="button"
                  onClick={() => handleAiFeedbackDraft('Student')}
                  disabled={isAiGeneratingFeedback}
                  className="text-[11px] text-[#4A6741] font-bold hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Suggest Feedback</span>
                </button>
              </div>
              <textarea
                value={feedbackInput}
                onChange={(e) => setFeedbackInput(e.target.value)}
                rows={3}
                placeholder="Write detailed feedback or click AI Suggest..."
                className="w-full p-2.5 bg-slate-100 rounded-xl border border-slate-200 focus:outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setGradingModalSubmissionId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveGrade(gradingModalSubmissionId)}
                className="px-5 py-2 rounded-xl bg-[#4A6741] text-white font-bold hover:bg-[#3D5535]"
              >
                Save & Return Grade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Weekly Timetable Manager Modal */}
      {isTimetableModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#EDEAE2] pb-3">
              <div>
                <h3 className="font-bold text-lg text-[#2D2D2A] font-serif flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#4A6741]" />
                  School Timetable & Bag Packing Editor
                </h3>
                <p className="text-xs text-[#7A7A72]">
                  Upload and update periods for Grade 8-A. Students automatically see these changes
                  upon viewing their dashboard for each day.
                </p>
              </div>

              <button
                onClick={() => setIsTimetableModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-[#F9F7F2] text-xs font-bold text-[#7A7A72] hover:bg-[#EDEAE2]"
              >
                Close
              </button>
            </div>

            {/* Day Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {DAYS_LIST.map((day) => (
                <button
                  key={day}
                  onClick={() => {
                    setEditingDay(day);
                    setEditablePeriods(weeklySchedule[day] || []);
                    setTimetableSaveSuccess(false);
                  }}
                  className={`px-4 py-2 rounded-2xl font-bold text-xs shrink-0 transition-all ${
                    editingDay === day
                      ? 'bg-[#4A6741] text-white shadow-sm'
                      : 'bg-[#F9F7F2] text-[#7A7A72] border border-[#E5E1D8] hover:text-[#2D2D2A]'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>

            {/* Success Notification */}
            {timetableSaveSuccess && (
              <div className="p-3 bg-[#EBF1E8] border border-[#88A070] text-[#4A6741] rounded-2xl text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#4A6741]" />
                <span>
                  Weekly timetable updated successfully for {editingDay}! Students will instantly
                  see the reflected period routine and bag packing list.
                </span>
              </div>
            )}

            {/* Editable Periods List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#2D2D2A]">
                  Scheduled Periods for {editingDay} ({editablePeriods.length} Periods)
                </span>
                <button
                  onClick={() => {
                    const nextNum = editablePeriods.length + 1;
                    const newP: SchedulePeriod = {
                      id: `${editingDay.toLowerCase()}-p${Date.now()}`,
                      periodNumber: nextNum,
                      startTime: '02:30 PM',
                      endTime: '03:15 PM',
                      subject: 'New Subject',
                      teacherName: currentUser.name,
                      room: 'Room 204',
                      requiredBooks: 'Textbook & Notebook',
                    };
                    setEditablePeriods([...editablePeriods, newP]);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#E88D67] text-white text-xs font-bold flex items-center gap-1 hover:bg-[#D87B55]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Period</span>
                </button>
              </div>

              {editablePeriods.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#7A7A72] bg-[#F9F7F2] rounded-2xl">
                  No periods scheduled for {editingDay}. Click "Add Period" to create one.
                </div>
              ) : (
                editablePeriods.map((period, idx) => (
                  <div
                    key={period.id || idx}
                    className="p-4 rounded-2xl border border-[#E5E1D8] bg-[#F9F7F2] space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#4A6741] text-white text-xs font-black flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-xs text-[#2D2D2A]">Period {idx + 1}</span>
                      </div>

                      <button
                        onClick={() =>
                          setEditablePeriods(editablePeriods.filter((_, i) => i !== idx))
                        }
                        className="text-rose-600 hover:text-rose-800 p-1"
                        title="Remove Period"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-[#7A7A72] uppercase mb-1">
                          Subject Name
                        </label>
                        <input
                          type="text"
                          value={period.subject}
                          onChange={(e) => {
                            const updated = [...editablePeriods];
                            updated[idx].subject = e.target.value;
                            setEditablePeriods(updated);
                          }}
                          className="w-full p-2 bg-white rounded-xl border border-[#E5E1D8] font-bold text-[#2D2D2A]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[#7A7A72] uppercase mb-1">
                          Start Time
                        </label>
                        <input
                          type="text"
                          value={period.startTime}
                          onChange={(e) => {
                            const updated = [...editablePeriods];
                            updated[idx].startTime = e.target.value;
                            setEditablePeriods(updated);
                          }}
                          className="w-full p-2 bg-white rounded-xl border border-[#E5E1D8] font-mono text-[#2D2D2A]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[#7A7A72] uppercase mb-1">
                          End Time
                        </label>
                        <input
                          type="text"
                          value={period.endTime}
                          onChange={(e) => {
                            const updated = [...editablePeriods];
                            updated[idx].endTime = e.target.value;
                            setEditablePeriods(updated);
                          }}
                          className="w-full p-2 bg-white rounded-xl border border-[#E5E1D8] font-mono text-[#2D2D2A]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[#7A7A72] uppercase mb-1">
                          Teacher Name
                        </label>
                        <input
                          type="text"
                          value={period.teacherName}
                          onChange={(e) => {
                            const updated = [...editablePeriods];
                            updated[idx].teacherName = e.target.value;
                            setEditablePeriods(updated);
                          }}
                          className="w-full p-2 bg-white rounded-xl border border-[#E5E1D8] text-[#2D2D2A]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[#7A7A72] uppercase mb-1">
                          Room / Location
                        </label>
                        <input
                          type="text"
                          value={period.room}
                          onChange={(e) => {
                            const updated = [...editablePeriods];
                            updated[idx].room = e.target.value;
                            setEditablePeriods(updated);
                          }}
                          className="w-full p-2 bg-white rounded-xl border border-[#E5E1D8] text-[#2D2D2A]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[#E88D67] uppercase mb-1">
                          🎒 Books / Copy to Pack
                        </label>
                        <input
                          type="text"
                          value={period.requiredBooks || ''}
                          placeholder="e.g. Textbook & Exercise Copy"
                          onChange={(e) => {
                            const updated = [...editablePeriods];
                            updated[idx].requiredBooks = e.target.value;
                            setEditablePeriods(updated);
                          }}
                          className="w-full p-2 bg-white rounded-xl border border-[#EDEAE2] text-[#2D2D2A] font-medium"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-[#EDEAE2]">
              <button
                onClick={() => setIsTimetableModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-[#F9F7F2] font-bold text-xs text-[#7A7A72] hover:bg-[#EDEAE2]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateDaySchedule(editingDay, editablePeriods);
                  toast.success(`${editingDay}'s timetable was updated.`, {
                    title: 'Timetable saved',
                  });
                  setTimetableSaveSuccess(true);
                  setTimeout(() => setTimetableSaveSuccess(false), 3500);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#4A6741] text-white font-bold text-xs hover:bg-[#3D5535] shadow-sm flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Save Timetable for {editingDay}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Teacher Leave Request Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#EDEAE2] shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-[#2D2D2A] font-serif flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#E88D67]" />
              Submit Faculty Leave Request
            </h3>
            <p className="text-xs text-[#7A7A72]">
              Submit your absence dates. Once approved by administration, substitute requests will
              be initialized for your classes.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#2D2D2A] mb-1">Start Date *</label>
                <input
                  type="date"
                  value={leaveStartDate}
                  onChange={(e) => setLeaveStartDate(e.target.value)}
                  className="w-full p-2.5 bg-[#F9F7F2] rounded-xl border border-[#EDEAE2]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#2D2D2A] mb-1">End Date *</label>
                <input
                  type="date"
                  value={leaveEndDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                  className="w-full p-2.5 bg-[#F9F7F2] rounded-xl border border-[#EDEAE2]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#2D2D2A] mb-1">Reason for Leave *</label>
                <textarea
                  rows={3}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="e.g., Medical treatment, personal emergency, university exam..."
                  className="w-full p-2.5 bg-[#F9F7F2] rounded-xl border border-[#EDEAE2]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#EDEAE2]">
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#7A7A72]"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!leaveStartDate || !leaveEndDate || !leaveReason.trim()) {
                    toast.warning('Please provide Start Date, End Date, and Reason.');
                    return;
                  }
                  await submitTeacherAbsenceRequest(
                    leaveStartDate,
                    leaveEndDate,
                    leaveReason.trim(),
                  );
                  setIsLeaveModalOpen(false);
                  setLeaveReason('');
                }}
                className="px-4 py-2 rounded-xl bg-[#E88D67] text-white font-bold text-xs"
              >
                Submit Leave Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
