import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CalendarDays,
  UserCheck,
  History,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Filter,
  ArrowRight,
  ShieldCheck,
  User,
  BookOpen,
  Calendar,
  X,
} from 'lucide-react';
import { toast } from '../../utils/toast';

export const TeacherSubstitutesAndLeavesView: React.FC = () => {
  const {
    currentUser,
    teacherAbsenceRequests,
    substituteRequests,
    teacherAssignmentAuditLogs,
    updateSubstituteStatus,
    submitTeacherAbsenceRequest,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'leaves' | 'substitutes' | 'history'>('leaves');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'leave' | 'substitute'>('all');

  // Leave Modal State
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveEndDate, setLeaveEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveReason, setLeaveReason] = useState('');

  // Filter data for current logged-in teacher
  const myLeaves = teacherAbsenceRequests.filter((r) => r.teacherId === currentUser.id);

  const mySubDuties = substituteRequests.filter(
    (r) => r.assignedSubstituteId === currentUser.id || r.suggestedSubstituteId === currentUser.id,
  );

  const myAuditLogs = teacherAssignmentAuditLogs.filter(
    (log) => log.targetTeacherId === currentUser.id || log.actorId === currentUser.id,
  );

  const pendingLeaves = myLeaves.filter((r) => r.status === 'pending').length;
  const approvedLeaves = myLeaves.filter((r) => r.status === 'approved').length;
  const pendingSubDuties = mySubDuties.filter((r) => r.status === 'PENDING').length;

  const filteredLogs = myAuditLogs.filter((log) => {
    if (historyFilter === 'leave') return log.action.includes('ABSENCE');
    if (historyFilter === 'substitute') return log.action.includes('SUBSTITUTE');
    return true;
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header Banner */}
      <div className="natural-banner rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[#FDEEDC] text-xs font-bold mb-2">
            <UserCheck className="w-3.5 h-3.5 text-[#FDEEDC]" />
            <span>Faculty Absence & Substitution Governance Hub</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold font-serif text-white">
            Assigned Subs & Leave Requests
          </h1>
          <p className="text-xs text-[#F9F7F2]/90 mt-1 max-w-xl">
            Detailed tracking for faculty leave applications, substitute coverage status, assigned
            substitute duties, and chronological audit history.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setIsLeaveModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-[#E88D67] hover:bg-[#D87B55] text-white font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <CalendarDays className="w-4 h-4" />
            <span>+ Request Leave / Absence</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-white border border-[#EDEAE2] shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-[#FDEEDC] text-[#E88D67]">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] text-[#7A7A72] font-semibold">Total Leaves Applied</p>
            <h3 className="text-xl font-bold text-[#2D2D2A] font-serif">{myLeaves.length}</h3>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-[#EDEAE2] shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-[#EBF1E8] text-[#4A6741]">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] text-[#7A7A72] font-semibold">Approved Leaves</p>
            <h3 className="text-xl font-bold text-emerald-700 font-serif">{approvedLeaves}</h3>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-[#EDEAE2] shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-100 text-amber-800">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] text-[#7A7A72] font-semibold">Pending Review</p>
            <h3 className="text-xl font-bold text-amber-800 font-serif">{pendingLeaves}</h3>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-[#EDEAE2] shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-[#EBF1E8] text-[#4A6741]">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] text-[#7A7A72] font-semibold">Sub Duties Assigned</p>
            <h3 className="text-xl font-bold text-[#4A6741] font-serif">
              {mySubDuties.length} ({pendingSubDuties} New)
            </h3>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl p-6 border border-[#EDEAE2] shadow-xs space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-[#EDEAE2] gap-2 overflow-x-auto text-xs font-bold pb-1">
          <button
            onClick={() => setActiveTab('leaves')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'leaves'
                ? 'bg-[#4A6741] text-white shadow-sm'
                : 'text-[#7A7A72] hover:bg-[#F9F7F2]'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>My Leaves & Substitute Coverage Check ({myLeaves.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('substitutes')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'substitutes'
                ? 'bg-[#E88D67] text-white shadow-sm'
                : 'text-[#7A7A72] hover:bg-[#F9F7F2]'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Assigned Sub Duties ({mySubDuties.length})</span>
            {pendingSubDuties > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-white text-[#E88D67] text-[10px] font-extrabold animate-pulse">
                {pendingSubDuties} New
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#4A6741] text-white shadow-sm'
                : 'text-[#7A7A72] hover:bg-[#F9F7F2]'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Detailed History Check & Audit Logs</span>
          </button>
        </div>

        {/* TAB 1: MY LEAVES & SUBSTITUTE COVERAGE CHECK */}
        {activeTab === 'leaves' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-[#2D2D2A] font-serif">
                  My Faculty Leave Applications & Substitute Coverage Details
                </h3>
                <p className="text-xs text-[#7A7A72]">
                  Track application dates, admin approval status, and substitute teacher assignments
                  for all your classes during leave.
                </p>
              </div>
            </div>

            {myLeaves.length === 0 ? (
              <div className="p-12 text-center bg-[#F9F7F2] rounded-3xl border border-[#EDEAE2] space-y-3">
                <CalendarDays className="w-10 h-10 text-[#7A7A72] mx-auto opacity-40" />
                <h4 className="font-bold text-sm text-[#2D2D2A]">No Leave Applications Found</h4>
                <p className="text-xs text-[#7A7A72] max-w-md mx-auto">
                  You have not submitted any leave requests yet. Click "+ Request Leave / Absence"
                  above to apply for leave.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {myLeaves.map((leave) => {
                  const linkedSubs = substituteRequests.filter(
                    (sub) =>
                      sub.teacherAbsenceRequestId === leave.id ||
                      (sub.originalTeacherId === currentUser.id &&
                        sub.date >= leave.startDate &&
                        sub.date <= leave.endDate),
                  );

                  return (
                    <div
                      key={leave.id}
                      className="p-5 rounded-2xl border border-[#EDEAE2] bg-[#F9F7F2] space-y-4 shadow-xs"
                    >
                      {/* Leave Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EDEAE2] pb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#2D2D2A] font-serif">
                              Leave Period: {leave.startDate} to {leave.endDate}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-[#EBF1E8] text-[#4A6741] text-[10px] font-bold">
                              📅 {leave.startDate === leave.endDate ? '1 Day' : 'Multi-day Leave'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#7A7A72] flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Applied on: {new Date(leave.createdAt).toLocaleString()}</span>
                          </p>
                        </div>

                        <span
                          className={`px-3.5 py-1 rounded-full text-xs font-extrabold uppercase ${
                            leave.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : leave.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {leave.status === 'approved'
                            ? `Approved ${leave.reviewedByAdminName ? `by ${leave.reviewedByAdminName}` : ''}`
                            : leave.status === 'rejected'
                              ? `Rejected ${leave.reviewedByAdminName ? `by ${leave.reviewedByAdminName}` : ''}`
                              : '⏳ Pending Admin Review'}
                        </span>
                      </div>

                      {/* Leave Reason */}
                      <div className="p-3.5 rounded-xl bg-white border border-[#EDEAE2] text-xs">
                        <strong className="text-[#2D2D2A]">Reason for Absence:</strong>{' '}
                        <span className="text-[#7A7A72]">{leave.reason}</span>
                      </div>

                      {/* Substitute Coverage Details */}
                      <div className="space-y-2 pt-1">
                        <h4 className="font-bold text-xs text-[#2D2D2A] font-serif flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-[#4A6741]" />
                          <span>Substitute Teacher Coverage Status:</span>
                        </h4>

                        {linkedSubs.length === 0 ? (
                          <div className="p-3.5 rounded-xl bg-white border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>
                              {leave.status === 'pending'
                                ? 'Substitute coverage requests will be auto-generated upon admin leave approval.'
                                : 'No substitute teacher assigned yet for this leave period.'}
                            </span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            {linkedSubs.map((sub) => (
                              <div
                                key={sub.id}
                                className="p-4 rounded-xl bg-white border border-[#EDEAE2] space-y-2.5 shadow-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-[#2D2D2A] font-serif">
                                    {sub.classroomName}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                      sub.status === 'APPROVED'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : sub.status === 'REJECTED'
                                          ? 'bg-rose-100 text-rose-800'
                                          : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {sub.status === 'APPROVED'
                                      ? 'Sub Confirmed ✅'
                                      : sub.status === 'REJECTED'
                                        ? 'Sub Declined ❌'
                                        : 'Sub Pending ⏳'}
                                  </span>
                                </div>

                                <p className="text-[11px] text-[#7A7A72]">
                                  Subject: <strong>{sub.subjectName}</strong>
                                </p>
                                <p className="text-[11px] text-[#7A7A72]">
                                  Duty Date & Time:{' '}
                                  <strong>
                                    {sub.date} ({sub.timeSlot})
                                  </strong>
                                </p>

                                <div className="pt-2 border-t border-[#EDEAE2] flex items-center justify-between text-[11px]">
                                  <span className="text-[#7A7A72]">Assigned Substitute:</span>
                                  <span className="font-bold text-[#4A6741]">
                                    {sub.assignedSubstituteName || sub.suggestedSubstituteName || (
                                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold inline-flex items-center gap-1 border border-amber-300">
                                        <AlertCircle className="w-3 h-3 text-amber-700" />
                                        <span>Choose Teacher</span>
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ASSIGNED SUBSTITUTE DUTIES */}
        {activeTab === 'substitutes' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-base text-[#2D2D2A] font-serif flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#E88D67]" />
                <span>Substitute Teaching Duties Assigned to Me</span>
              </h3>
              <p className="text-xs text-[#7A7A72]">
                Review substitute duties requested by administration or colleagues, and confirm your
                availability.
              </p>
            </div>

            {mySubDuties.length === 0 ? (
              <div className="p-12 text-center bg-[#F9F7F2] rounded-3xl border border-[#EDEAE2] space-y-3">
                <UserCheck className="w-10 h-10 text-[#7A7A72] mx-auto opacity-40" />
                <h4 className="font-bold text-sm text-[#2D2D2A]">No Substitute Duties Assigned</h4>
                <p className="text-xs text-[#7A7A72] max-w-md mx-auto">
                  You currently have no substitute teaching assignments. When administration assigns
                  you to cover a class, details will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {mySubDuties.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-5 rounded-2xl border border-[#EDEAE2] bg-[#F9F7F2] space-y-3 shadow-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EDEAE2] pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-[#2D2D2A] font-serif">
                          {sub.classroomName}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#EBF1E8] text-[#4A6741] text-[10px] font-bold">
                          {sub.subjectName}
                        </span>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                          sub.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : sub.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <p className="text-[10px] text-[#7A7A72] font-semibold">
                          Duty Date & Time Slot:
                        </p>
                        <p className="font-bold text-[#2D2D2A]">
                          {sub.date} ({sub.timeSlot})
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#7A7A72] font-semibold">
                          Replacing Teacher:
                        </p>
                        <p className="font-bold text-[#2D2D2A]">{sub.originalTeacherName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#7A7A72] font-semibold">
                          Requested By Admin:
                        </p>
                        <p className="font-bold text-[#4A6741]">{sub.createdByAdminName}</p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-[#EDEAE2] text-xs">
                      <strong className="text-[#2D2D2A]">Reason for Coverage:</strong>{' '}
                      <span className="text-[#7A7A72]">{sub.reason}</span>
                    </div>

                    {sub.status === 'PENDING' && (
                      <div className="flex justify-end gap-2 pt-2 border-t border-[#EDEAE2]">
                        <button
                          onClick={async () => {
                            await updateSubstituteStatus(
                              sub.id,
                              'REJECTED',
                              'Declined by substitute teacher',
                            );
                            toast.info('Substitute duty declined.', { title: 'Duty updated' });
                          }}
                          className="px-4 py-2 rounded-xl bg-white border border-rose-200 text-rose-700 font-bold text-xs hover:bg-rose-50 cursor-pointer"
                        >
                          Decline Duty
                        </button>
                        <button
                          onClick={async () => {
                            await updateSubstituteStatus(
                              sub.id,
                              'APPROVED',
                              'Accepted by substitute teacher',
                              currentUser.id,
                            );
                            toast.success('Substitute duty confirmed and accepted!', {
                              title: 'Duty confirmed',
                            });
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-xs cursor-pointer"
                        >
                          Accept & Confirm Duty ✅
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DETAILED HISTORY CHECK & AUDIT LOGS */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#EDEAE2] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#2D2D2A] font-serif flex items-center gap-2">
                  <History className="w-5 h-5 text-[#4A6741]" />
                  <span>Faculty Assignment & Leave Audit Trail History</span>
                </h3>
                <p className="text-xs text-[#7A7A72]">
                  Complete timestamped audit log of all your leave applications, admin reviews, and
                  substitute duty modifications.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Filter className="w-3.5 h-3.5 text-[#7A7A72]" />
                <select
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value as any)}
                  className="p-2 rounded-xl border border-[#EDEAE2] bg-[#F9F7F2] font-semibold text-[#2D2D2A]"
                >
                  <option value="all">All Events</option>
                  <option value="leave">Leave Actions Only</option>
                  <option value="substitute">Substitute Duties Only</option>
                </select>
              </div>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="p-12 text-center bg-[#F9F7F2] rounded-3xl border border-[#EDEAE2] space-y-3">
                <History className="w-10 h-10 text-[#7A7A72] mx-auto opacity-40" />
                <h4 className="font-bold text-sm text-[#2D2D2A]">No Audit Entries Recorded</h4>
                <p className="text-xs text-[#7A7A72]">
                  Audit entries will automatically populate here whenever actions are taken on leave
                  or substitute assignments.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-2xl border border-[#EDEAE2] bg-[#F9F7F2] space-y-2 text-xs shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            log.action.includes('APPROVE')
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.action.includes('REJECT')
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-[#EBF1E8] text-[#4A6741]'
                          }`}
                        >
                          {log.action}
                        </span>
                        <span className="font-bold text-[#2D2D2A]">
                          {log.actorName} ({log.actorRole})
                        </span>
                      </div>

                      <span className="text-[10px] text-[#7A7A72] flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-[#7A7A72]" />
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-[#2D2D2A] text-xs">{log.details}</p>
                    {log.reason && (
                      <p className="text-[11px] text-[#7A7A72] italic bg-white p-2.5 rounded-xl border border-[#EDEAE2]">
                        Reason: "{log.reason}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Leave Application Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 border border-[#EDEAE2] shadow-2xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-[#EDEAE2] pb-3">
              <h3 className="font-bold text-base text-[#2D2D2A] font-serif flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[#E88D67]" />
                <span>Submit Faculty Leave Request</span>
              </h3>
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                className="p-1 rounded-full text-[#7A7A72] hover:bg-[#F9F7F2]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

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
                  toast.success('Leave request submitted successfully!', {
                    title: 'Request Sent',
                  });
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
