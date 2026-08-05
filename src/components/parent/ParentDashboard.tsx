import React from 'react';
import { useApp } from '../../context/AppContext';
import { StudentLocationTracker } from '../common/StudentLocationTracker';
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
  BookOpen
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
    parentControls
  } = useApp();

  const childControls = parentControls[activeChild.id] || {
    studentId: activeChild.id,
    allowTeacherDirectChat: true,
    allowPeerDiscussion: false,
    missingHomeworkAlerts: true,
    lowAttendanceAlerts: true,
    weeklyDigestEmail: true,
    screenTimeLimitMinutes: 120,
    requireApprovalForOutboundMsgs: true
  };

  const isBelowGrade7 = activeChild.gradeLevel < 7;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Parent Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl natural-banner p-6 md:p-8 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[#FDEEDC] text-xs font-bold">
              <Heart className="w-3.5 h-3.5 text-[#E88D67] fill-[#E88D67]" />
              <span>Parent Portal • Mount Everest Sec. School</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-serif">
              Namaste, Bina Sharma! 🙏
            </h1>
            <p className="text-[#F9F7F2]/90 text-xs md:text-sm max-w-xl">
              Viewing learning progress & activity for <span className="font-bold underline text-[#FDEEDC]">{activeChild.name}</span> (Grade {activeChild.gradeLevel}-{activeChild.section}).
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


      {/* Real-Time "Where is My Child?" Location Tracking Card */}
      <StudentLocationTracker studentId={activeChild.id} studentName={activeChild.name} />

      {/* Child Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="p-4 rounded-3xl bg-white border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-1">
          <p className="text-[10px] font-bold uppercase text-[#7A7A72]">Today's Attendance</p>
          <div className="flex items-center gap-2 text-[#4A6741] font-extrabold text-base">
            <CheckCircle2 className="w-5 h-5 text-[#4A6741]" />
            <span>Present at 09:42 AM</span>
          </div>
          <p className="text-[11px] text-[#7A7A72]">{activeChild.attendancePercentage}% Total Attendance Rate</p>
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
            <span>1 Homework Due</span>
          </div>
          <p className="text-[11px] text-[#7A7A72]">Due tomorrow at 5:00 PM</p>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-1">
          <p className="text-[10px] font-bold uppercase text-[#7A7A72]">Academic Standing</p>
          <div className="flex items-center gap-2 text-[#4A6741] font-extrabold text-base">
            <Award className="w-5 h-5 text-[#4A6741]" />
            <span>Grade A+ (92% Avg)</span>
          </div>
          <p className="text-[11px] text-[#7A7A72]">Consistently top performer</p>
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
              {assignments.map(asg => {
                const sub = submissions.find(s => s.assignmentId === asg.id && s.studentId === activeChild.id);
                return (
                  <div key={asg.id} className="p-4 rounded-2xl border border-[#EDEAE2] bg-[#F9F7F2] space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-[#E88D67] uppercase">{asg.subject}</span>
                        <h3 className="font-bold text-xs text-[#2D2D2A]">{asg.title}</h3>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        sub?.status === 'graded' ? 'bg-[#EBF1E8] text-[#4A6741]' : 'bg-[#FDEEDC] text-[#E88D67]'
                      }`}>
                        {sub?.status === 'graded' ? `Graded (${sub.grade}/${asg.totalPoints})` : 'In Progress'}
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
                  <span className="font-bold text-[#4A6741]">Allowed ✓</span>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-white font-medium">
                  <span>Peer Public Discussions:</span>
                  <span className="font-bold text-[#E88D67]">Restricted 🔒</span>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-white font-medium">
                  <span>Daily Screen Time Cap:</span>
                  <span className="font-bold text-[#E88D67]">120 Minutes</span>
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
              <h3 className="font-bold text-sm text-[#2D2D2A] font-serif">Parent Notifications Settings</h3>
              <p className="text-xs text-[#7A7A72]">Receiving instant alerts for homework deadlines, attendance updates & term results.</p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
