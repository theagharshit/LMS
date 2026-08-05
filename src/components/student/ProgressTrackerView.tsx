import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  TrendingUp,
  Award,
  CheckCircle,
  Flame,
  Sparkles,
  BookOpen,
  ChevronRight,
} from 'lucide-react';

export const ProgressTrackerView: React.FC = () => {
  const {
    currentUser,
    subjectPerformances,
    studentProfiles,
    setIsAiTutorOpen,
    setAiTutorInitialPrompt,
  } = useApp();

  const studentData = studentProfiles.find((s) => s.id === currentUser.id) || studentProfiles[0];

  const handleAskHelpForSubject = (subjectName: string) => {
    setAiTutorInitialPrompt(
      `I need help improving my understanding and marks in ${subjectName}. Can you give me key study tips and revision concepts?`,
    );
    setIsAiTutorOpen(true);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="natural-banner rounded-3xl p-6 md:p-8 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[#FDEEDC] text-xs font-bold mb-2">
            <span>CDC Nepal Standard Evaluation</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-serif">
            {studentData.name}'s Academic Progress
          </h1>
          <p className="text-xs md:text-sm text-[#F9F7F2]/90 mt-1">
            Grade {studentData.gradeLevel}-{studentData.section} • Roll No. {studentData.rollNumber}
          </p>
        </div>

        <div className="flex gap-3">
          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center min-w-[110px]">
            <p className="text-[10px] text-[#FDEEDC] uppercase font-bold">Estimated GPA</p>
            <p className="text-2xl font-black text-white">3.85</p>
            <p className="text-[10px] font-bold text-[#FDEEDC]">Grade A+</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center min-w-[110px]">
            <p className="text-[10px] text-[#FDEEDC] uppercase font-bold">Attendance</p>
            <p className="text-2xl font-black text-white">{studentData.attendancePercentage}%</p>
            <p className="text-[10px] font-bold text-[#FDEEDC]">Regular</p>
          </div>
        </div>
      </div>

      {/* Subject Performance Breakdown Grid */}
      <div className="bg-white rounded-3xl p-6 border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-[#2D2D2A] font-serif flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#4A6741]" />
              Subject-wise Performance & Teacher Evaluation
            </h2>
            <p className="text-xs text-[#7A7A72]">
              Based on homework submissions, quizzes, and classroom participation
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subjectPerformances.map((sp, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl border border-[#EDEAE2] bg-[#F9F7F2] space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-sm text-[#2D2D2A] font-serif">{sp.subject}</h3>
                  <p className="text-[11px] text-[#7A7A72]">
                    {sp.assignmentsCompleted}/{sp.totalAssignments} Assignments Completed
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-[#4A6741]">{sp.scorePercentage}%</span>
                  <span className="ml-1 text-xs font-bold text-[#4A6741] bg-[#EBF1E8] px-2 py-0.5 rounded">
                    {sp.grade}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 rounded-full bg-[#F0EDE5] overflow-hidden">
                <div
                  className="h-full bg-[#4A6741] rounded-full transition-all"
                  style={{ width: `${sp.scorePercentage}%` }}
                />
              </div>

              <p className="text-xs text-[#2D2D2A] italic bg-white p-2.5 rounded-xl border border-[#EDEAE2]">
                "{sp.teacherRemark}"
              </p>

              <div className="flex justify-between items-center pt-1">
                <span className="text-[10px] text-[#7A7A72] font-bold">
                  Quiz Average: {sp.quizzesScoreAvg}%
                </span>
                <button
                  onClick={() => handleAskHelpForSubject(sp.subject)}
                  className="text-xs font-bold text-[#E88D67] hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Improve with AI Tutor</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Badges & Achievements Gallery */}
      <div className="bg-white rounded-3xl p-6 border border-[#EDEAE2] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
        <h2 className="text-base font-bold text-[#2D2D2A] font-serif flex items-center gap-2">
          <Award className="w-5 h-5 text-[#E88D67]" />
          Earned Learning Badges & Recognition
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {studentData.badges.map((b) => (
            <div
              key={b.id}
              className="p-4 rounded-2xl bg-[#F9F7F2] border border-[#EDEAE2] text-center space-y-1"
            >
              <span className="text-3xl block">{b.icon}</span>
              <h3 className="font-bold text-xs text-[#2D2D2A]">{b.title}</h3>
              <p className="text-[10px] text-[#7A7A72] leading-snug">{b.description}</p>
              <span className="inline-block text-[9px] font-bold text-[#E88D67] mt-1">
                Earned: {b.earnedDate}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
