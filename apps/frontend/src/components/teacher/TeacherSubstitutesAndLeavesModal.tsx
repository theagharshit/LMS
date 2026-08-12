import React, { useState } from 'react';
import {
  CalendarDays,
  UserCheck,
  History,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  FileText,
  User,
  BookOpen,
  Filter,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import {
  TeacherAbsenceRequest,
  SubstituteRequest,
  TeacherAssignmentAuditLog,
  User as UserType,
} from '@lms/shared';
import { toast } from '../../utils/toast';

interface TeacherSubstitutesAndLeavesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType;
  teacherAbsenceRequests: TeacherAbsenceRequest[];
  substituteRequests: SubstituteRequest[];
  teacherAssignmentAuditLogs: TeacherAssignmentAuditLog[];
  updateSubstituteStatus: (
    requestId: string,
    status: 'APPROVED' | 'REJECTED' | 'CANCELLED',
    responseNotes?: string,
    assignedSubstituteId?: string,
  ) => Promise<void>;
  onRequestNewLeave: () => void;
}

export const TeacherSubstitutesAndLeavesModal: React.FC<TeacherSubstitutesAndLeavesModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  teacherAbsenceRequests,
  substituteRequests,
  teacherAssignmentAuditLogs,
  updateSubstituteStatus,
  onRequestNewLeave,
}) => {
  const [activeTab, setActiveTab] = useState<'leaves' | 'substitutes' | 'history'>('leaves');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'leave' | 'substitute'>('all');

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-[#EDEAE2] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-[#2D2D2A] text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#FDEEDC] text-xs font-bold mb-1">
              <UserCheck className="w-3.5 h-3.5 text-[#E88D67]" />
              <span>Faculty Absence & Substitution Management</span>
            </div>
            <h2 className="text-xl font-bold font-serif text-white flex items-center gap-2">
              Assigned Subs & Leave Requests Hub
            </h2>
            <p className="text-xs text-[#F9F7F2]/80 mt-0.5">
              Comprehensive history check, leave approval status, and substitute teacher duty
              management.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#F9F7F2] border-b border-[#EDEAE2] text-xs shrink-0">
          <div className="p-3 rounded-2xl bg-white border border-[#EDEAE2] flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#FDEEDC] text-[#E88D67]">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-[#7A7A72] font-semibold">Total Leaves Applied</p>
              <h4 className="font-bold text-[#2D2D2A] text-sm">{myLeaves.length}</h4>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-[#EDEAE2] flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#EBF1E8] text-[#4A6741]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-[#7A7A72] font-semibold">Approved Leaves</p>
              <h4 className="font-bold text-emerald-700 text-sm">{approvedLeaves}</h4>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-[#EDEAE2] flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-[#7A7A72] font-semibold">Pending Review</p>
              <h4 className="font-bold text-amber-800 text-sm">{pendingLeaves}</h4>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-[#EDEAE2] flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#EBF1E8] text-[#4A6741]">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-[#7A7A72] font-semibold">Sub Duties for Me</p>
              <h4 className="font-bold text-[#4A6741] text-sm">
                {mySubDuties.length} ({pendingSubDuties} Pending)
              </h4>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#EDEAE2] bg-white px-6 pt-3 gap-2 overflow-x-auto text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveTab('leaves')}
            className={`px-4 py-2.5 rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'leaves'
                ? 'border-[#4A6741] text-[#4A6741] bg-[#EBF1E8]/40'
                : 'border-transparent text-[#7A7A72] hover:bg-[#F9F7F2]'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>My Leaves & Sub Coverage Check ({myLeaves.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('substitutes')}
            className={`px-4 py-2.5 rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'substitutes'
                ? 'border-[#E88D67] text-[#E88D67] bg-amber-50/50'
                : 'border-transparent text-[#7A7A72] hover:bg-[#F9F7F2]'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Assigned Sub Duties ({mySubDuties.length})</span>
            {pendingSubDuties > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#E88D67] text-white text-[10px] font-extrabold animate-pulse">
                {pendingSubDuties} New
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'history'
                ? 'border-[#4A6741] text-[#4A6741] bg-[#EBF1E8]/40'
                : 'border-transparent text-[#7A7A72] hover:bg-[#F9F7F2]'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Detailed History Check & Audit Logs</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 grow">
          {/* TAB 1: MY LEAVES & SUBSTITUTE COVERAGE CHECK */}
          {activeTab === 'leaves' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[#2D2D2A] font-serif">
                    My Faculty Leave Applications & Substitute Coverage Details
                  </h3>
                  <p className="text-xs text-[#7A7A72]">
                    Track when you applied for leave, admin approval status, and which substitute
                    teacher was assigned for your classes.
                  </p>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    onRequestNewLeave();
                  }}
                  className="px-4 py-2 rounded-xl bg-[#E88D67] hover:bg-[#D87B55] text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <CalendarDays className="w-4 h-4 text-white" />
                  <span>+ Request New Leave</span>
                </button>
              </div>

              {myLeaves.length === 0 ? (
                <div className="p-8 text-center bg-[#F9F7F2] rounded-3xl border border-[#EDEAE2] space-y-2">
                  <CalendarDays className="w-8 h-8 text-[#7A7A72] mx-auto opacity-50" />
                  <p className="text-xs text-[#7A7A72] font-semibold">
                    No leave applications recorded.
                  </p>
                  <p className="text-[11px] text-[#7A7A72]">
                    When you submit a leave request, admin review and substitute teacher assignments
                    will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myLeaves.map((leave) => {
                    // Find substitute requests linked to this leave or matching dates
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
                              <span className="px-2 py-0.5 rounded-full bg-[#EBF1E8] text-[#4A6741] text-[10px] font-bold">
                                📅 {leave.startDate === leave.endDate ? '1 Day' : 'Multi-day Leave'}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#7A7A72] flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Applied on: {new Date(leave.createdAt).toLocaleString()}</span>
                            </p>
                          </div>

                          <span
                            className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
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
                        <div className="p-3 rounded-xl bg-white border border-[#EDEAE2] text-xs">
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
                            <div className="p-3 rounded-xl bg-white border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              <span>
                                {leave.status === 'pending'
                                  ? 'Substitute coverage will be auto-generated upon admin leave approval.'
                                  : 'No substitute teacher assigned yet for this leave period.'}
                              </span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              {linkedSubs.map((sub) => (
                                <div
                                  key={sub.id}
                                  className="p-3.5 rounded-xl bg-white border border-[#EDEAE2] space-y-2 shadow-xs"
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

                                  <div className="pt-1.5 border-t border-[#EDEAE2] flex items-center justify-between text-[11px]">
                                    <span className="text-[#7A7A72]">Assigned Sub:</span>
                                    <span className="font-bold text-[#4A6741]">
                                      {sub.assignedSubstituteName ||
                                        sub.suggestedSubstituteName || (
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
                <h3 className="font-bold text-sm text-[#2D2D2A] font-serif flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#E88D67]" />
                  <span>Substitute Teaching Duties Assigned to Me</span>
                </h3>
                <p className="text-xs text-[#7A7A72]">
                  Review substitute duties requested by administration or colleagues, and confirm
                  your availability.
                </p>
              </div>

              {mySubDuties.length === 0 ? (
                <div className="p-8 text-center bg-[#F9F7F2] rounded-3xl border border-[#EDEAE2] space-y-2">
                  <UserCheck className="w-8 h-8 text-[#7A7A72] mx-auto opacity-50" />
                  <p className="text-xs text-[#7A7A72] font-semibold">
                    No substitute duties assigned to you.
                  </p>
                  <p className="text-[11px] text-[#7A7A72]">
                    When administration assigns you to cover a colleague's class, details will
                    appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  {mySubDuties.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-5 rounded-2xl border border-[#EDEAE2] bg-[#F9F7F2] space-y-3 shadow-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EDEAE2] pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#2D2D2A] font-serif">
                            {sub.classroomName}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-[#EBF1E8] text-[#4A6741] text-[10px] font-bold">
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

                      <div className="p-3 rounded-xl bg-white border border-[#EDEAE2] text-xs">
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
                  <h3 className="font-bold text-sm text-[#2D2D2A] font-serif flex items-center gap-2">
                    <History className="w-4 h-4 text-[#4A6741]" />
                    <span>Faculty Assignment & Leave Audit Trail History</span>
                  </h3>
                  <p className="text-xs text-[#7A7A72]">
                    Complete timestamped audit log of all your leave applications, approvals, and
                    substitute duty changes.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <Filter className="w-3.5 h-3.5 text-[#7A7A72]" />
                  <select
                    value={historyFilter}
                    onChange={(e) => setHistoryFilter(e.target.value as any)}
                    className="p-1.5 rounded-xl border border-[#EDEAE2] bg-[#F9F7F2] font-semibold text-[#2D2D2A]"
                  >
                    <option value="all">All Events</option>
                    <option value="leave">Leave Actions Only</option>
                    <option value="substitute">Substitute Duties Only</option>
                  </select>
                </div>
              </div>

              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center bg-[#F9F7F2] rounded-3xl border border-[#EDEAE2] space-y-2">
                  <History className="w-8 h-8 text-[#7A7A72] mx-auto opacity-50" />
                  <p className="text-xs text-[#7A7A72] font-semibold">
                    No audit history entries found.
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
                        <p className="text-[11px] text-[#7A7A72] italic bg-white p-2 rounded-xl border border-[#EDEAE2]">
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

        {/* Footer */}
        <div className="p-4 bg-[#F9F7F2] border-t border-[#EDEAE2] flex items-center justify-between text-xs shrink-0">
          <span className="text-[#7A7A72] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#4A6741]" />
            <span>Faculty Absence & Duty Verification Verified</span>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#2D2D2A] hover:bg-[#1A1A18] text-white font-bold cursor-pointer transition-all shadow-xs"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
