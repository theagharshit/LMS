import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, ShieldAlert, Check, Clock, Bell, MessageSquare, Save } from 'lucide-react';

interface ParentalControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ParentalControlsModal: React.FC<ParentalControlsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { activeChild, parentControls, updateParentControls } = useApp();

  const currentCtrl = parentControls[activeChild.id] || {
    studentId: activeChild.id,
    allowTeacherDirectChat: true,
    allowPeerDiscussion: false,
    missingHomeworkAlerts: true,
    lowAttendanceAlerts: true,
    weeklyDigestEmail: true,
    screenTimeLimitMinutes: 120,
    requireApprovalForOutboundMsgs: true,
  };

  const [allowTeacher, setAllowTeacher] = useState(currentCtrl.allowTeacherDirectChat);
  const [allowPeer, setAllowPeer] = useState(currentCtrl.allowPeerDiscussion);
  const [screenTime, setScreenTime] = useState(currentCtrl.screenTimeLimitMinutes);
  const [missingHw, setMissingHw] = useState(currentCtrl.missingHomeworkAlerts);
  const [lowAtt, setLowAtt] = useState(currentCtrl.lowAttendanceAlerts);
  const [requireApprove, setRequireApprove] = useState(currentCtrl.requireApprovalForOutboundMsgs);

  if (!isOpen) return null;

  const handleSave = () => {
    updateParentControls(activeChild.id, {
      studentId: activeChild.id,
      allowTeacherDirectChat: allowTeacher,
      allowPeerDiscussion: allowPeer,
      screenTimeLimitMinutes: screenTime,
      missingHomeworkAlerts: missingHw,
      lowAttendanceAlerts: lowAtt,
      weeklyDigestEmail: true,
      requireApprovalForOutboundMsgs: requireApprove,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200 text-xs">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-amber-700 via-orange-700 to-rose-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="font-bold text-base">Grade &lt; 7 Parental Safety Controls</h3>
              <p className="text-xs text-amber-100">
                Configuring protections for {activeChild.name} (Grade {activeChild.gradeLevel})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-white/80 hover:text-white rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Communication Permissions */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-amber-600" />
              Communication & Social Settings
            </h4>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  Allow Teacher Direct Chat
                </p>
                <p className="text-[10px] text-slate-400">
                  Student can send direct 1-on-1 messages to verified subject teachers.
                </p>
              </div>
              <input
                type="checkbox"
                checked={allowTeacher}
                onChange={(e) => setAllowTeacher(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  Allow Peer Student Discussions
                </p>
                <p className="text-[10px] text-slate-400">
                  Allow participating in open classroom stream discussions with classmates.
                </p>
              </div>
              <input
                type="checkbox"
                checked={allowPeer}
                onChange={(e) => setAllowPeer(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  Require Parent Approval for Outbound Posts
                </p>
                <p className="text-[10px] text-slate-400">
                  Parent receives notification before student's comments go public.
                </p>
              </div>
              <input
                type="checkbox"
                checked={requireApprove}
                onChange={(e) => setRequireApprove(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded"
              />
            </div>
          </div>

          {/* Screen Time */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              Daily LMS Screen Time Limit
            </h4>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-300">Max Active Minutes / Day:</span>
              <select
                value={screenTime}
                onChange={(e) => setScreenTime(Number(e.target.value))}
                className="p-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-300 font-bold"
              >
                <option value={60}>60 Minutes (1 Hour)</option>
                <option value={120}>120 Minutes (2 Hours)</option>
                <option value={180}>180 Minutes (3 Hours)</option>
                <option value={300}>Unlimited</option>
              </select>
            </div>
          </div>

          {/* Alerts */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-amber-600" />
              Parent Safety Alert Triggers
            </h4>

            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Missing Homework SMS Alerts
              </span>
              <input
                type="checkbox"
                checked={missingHw}
                onChange={(e) => setMissingHw(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Low Attendance SMS Alerts (&lt;85%)
              </span>
              <input
                type="checkbox"
                checked={lowAtt}
                onChange={(e) => setLowAtt(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 font-bold text-slate-700 dark:text-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 flex items-center gap-1.5 shadow-md"
          >
            <Save className="w-4 h-4" />
            <span>Save Safety Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
