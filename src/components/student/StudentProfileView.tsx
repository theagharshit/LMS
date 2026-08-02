import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Flame,
  CheckCircle2,
  TrendingUp,
  UserCheck,
  Printer,
  Trophy,
  Medal,
  Clock,
  Zap,
  Calendar,
  Award,
  BookOpen
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';

export const StudentProfileView: React.FC = () => {
  const { currentUser, studentProfiles } = useApp();

  const studentData = studentProfiles.find(s => s.id === currentUser.id) || {
    id: currentUser.id || 'user-stu-1',
    name: currentUser.name || 'Aarav Sharma',
    avatar: currentUser.avatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80',
    gradeLevel: 8,
    section: 'A',
    rollNumber: 14,
    attendancePercentage: 96.5,
    streakDays: 14,
    parentName: 'Bina Sharma',
    parentPhone: '+977 9841234567'
  };

  const [streakCount, setStreakCount] = useState<number>(studentData.streakDays || 14);
  const [isCheckedInToday, setIsCheckedInToday] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'progress' | 'attendance' | 'activities' | 'badges'>('progress');

  const handleCheckIn = () => {
    if (isCheckedInToday) return;
    setStreakCount(prev => prev + 1);
    setIsCheckedInToday(true);
  };

  const termProgressData = [
    { term: '1st Term', score: 88 },
    { term: 'Mid Term', score: 91 },
    { term: '2nd Term', score: 93 },
    { term: '3rd Term', score: 96 }
  ];

  const subjectPerformanceData = [
    { subject: 'Maths', score: 95 },
    { subject: 'Science', score: 92 },
    { subject: 'Computer', score: 98 },
    { subject: 'English', score: 94 },
    { subject: 'Nepali', score: 88 },
    { subject: 'Social', score: 90 }
  ];

  const activities = [
    {
      id: 'act-1',
      title: 'Inter-House Science Exhibition 2026',
      category: 'Science & Tech',
      position: '1st Place 🥇',
      date: 'May 2026',
      description: 'Built automated solar drip irrigation model.'
    },
    {
      id: 'act-2',
      title: 'All-Nepal Junior Chess Championship',
      category: 'Mind Games',
      position: 'Runner-Up 🥈',
      date: 'April 2026',
      description: 'Secured 2nd rank among 64 Valley participants.'
    },
    {
      id: 'act-3',
      title: 'Intra-School Nepali Poetry Recitation',
      category: 'Literature',
      position: '2nd Place 🥈',
      date: 'Baisakh 2083',
      description: 'Recited original poem "Himal ko Chhaya".'
    },
    {
      id: 'act-4',
      title: 'Annual Inter-House Football Tournament',
      category: 'Sports',
      position: 'Semi-Finalist ⚽',
      date: 'Falgun 2082',
      description: 'Led Machhapuchhre Green House football squad.'
    }
  ];

  const badgesList = [
    { id: 'b-1', title: 'Streak Legend', desc: '14+ continuous check-in days', icon: Flame, color: 'text-amber-500 bg-amber-50' },
    { id: 'b-2', title: 'Academic Titan', desc: 'A+ grade in Math & Science', icon: Trophy, color: 'text-emerald-600 bg-emerald-50' },
    { id: 'b-3', title: '100% Attendance', desc: 'Perfect attendance in Jestha', icon: UserCheck, color: 'text-blue-600 bg-blue-50' },
    { id: 'b-4', title: 'Quiz Master', desc: 'Top scorer in 5 quizzes', icon: Zap, color: 'text-purple-600 bg-purple-50' }
  ];

  const weekDays = [
    { day: 'M', checked: true },
    { day: 'T', checked: true },
    { day: 'W', checked: true },
    { day: 'T', checked: true },
    { day: 'F', checked: true },
    { day: 'S', checked: isCheckedInToday, isToday: true },
    { day: 'S', checked: false }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 text-[#2D2D2A]">
      
      {/* 1. MINIMALIST STUDENT IDENTIFICATION CARD */}
      <div className="bg-white rounded-2xl p-6 border border-[#EDEAE2] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <img
            src={studentData.avatar}
            alt={studentData.name}
            className="w-16 h-16 rounded-2xl object-cover border border-[#EDEAE2]"
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-serif text-[#2D2D2A]">{studentData.name}</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF1E8] text-[#4A6741]">
                Grade {studentData.gradeLevel}-{studentData.section}
              </span>
            </div>
            <p className="text-xs text-[#7A7A72]">
              Roll No: <strong className="text-[#2D2D2A]">#{studentData.rollNumber}</strong> • Reg ID: <strong className="text-[#2D2D2A]">STU-2026-0814</strong> • House: <strong className="text-[#4A6741]">Machhapuchhre Green</strong>
            </p>
            <p className="text-[11px] text-[#7A7A72]">
              Mount Everest Secondary School • Guardian: {studentData.parentName}
            </p>
          </div>
        </div>

        <button
          onClick={() => alert(`Printing ID card for ${studentData.name}`)}
          className="px-3.5 py-2 rounded-xl bg-[#F9F7F2] hover:bg-[#F0EDE5] border border-[#EDEAE2] text-xs font-bold text-[#2D2D2A] flex items-center gap-2 transition-colors cursor-pointer shrink-0"
        >
          <Printer className="w-4 h-4 text-[#7A7A72]" />
          <span>Print Student ID</span>
        </button>
      </div>

      {/* 2. COMPACT STATS & STREAK MAINTAINER */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Streak & Maintenance */}
        <div className="md:col-span-2 bg-white rounded-2xl p-4 border border-[#EDEAE2] flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Flame className="w-4 h-4 fill-amber-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-[#7A7A72]">Current Streak</p>
                <p className="text-base font-bold text-[#2D2D2A]">{streakCount} Days Active 🔥</p>
              </div>
            </div>

            {/* Weekday dots */}
            <div className="flex gap-1.5 pt-1">
              {weekDays.map((wd, i) => (
                <div
                  key={i}
                  className={`w-6 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center border ${
                    wd.checked
                      ? 'bg-amber-500 text-white border-amber-500'
                      : wd.isToday
                      ? 'bg-amber-50 border-amber-300 text-amber-700'
                      : 'bg-[#F9F7F2] border-[#EDEAE2] text-[#7A7A72]'
                  }`}
                  title={wd.day}
                >
                  {wd.day}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleCheckIn}
            disabled={isCheckedInToday}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
              isCheckedInToday
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
            }`}
          >
            {isCheckedInToday ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Checked In</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Maintain Streak</span>
              </>
            )}
          </button>
        </div>

        {/* Attendance */}
        <div className="bg-white rounded-2xl p-4 border border-[#EDEAE2] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#4A6741] flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-[#7A7A72]">Attendance</p>
            <p className="text-base font-bold text-[#2D2D2A]">96.5% Present</p>
            <p className="text-[11px] text-[#7A7A72]">112 of 117 days</p>
          </div>
        </div>

        {/* GPA Academic Standing */}
        <div className="bg-white rounded-2xl p-4 border border-[#EDEAE2] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-[#7A7A72]">GPA & Standing</p>
            <p className="text-base font-bold text-[#2D2D2A]">GPA 3.88</p>
            <p className="text-[11px] text-[#7A7A72]">Class Rank #3</p>
          </div>
        </div>

      </div>

      {/* 3. MINIMALIST TABS */}
      <div className="flex border-b border-[#EDEAE2] gap-6 text-xs font-bold text-[#7A7A72]">
        {[
          { id: 'progress', label: 'Academic Progress', icon: TrendingUp },
          { id: 'attendance', label: 'Attendance Log', icon: Clock },
          { id: 'activities', label: 'Activities & Wins', icon: Trophy },
          { id: 'badges', label: 'Badges & Honors', icon: Medal }
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`pb-2.5 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                isActive
                  ? 'border-[#4A6741] text-[#4A6741]'
                  : 'border-transparent hover:text-[#2D2D2A]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: ACADEMIC PROGRESS */}
      {activeTab === 'progress' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Term Trend Line Chart */}
          <div className="bg-white rounded-2xl p-5 border border-[#EDEAE2] space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#7A7A72]">Term Examination Progress</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={termProgressData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE5" />
                  <XAxis dataKey="term" tick={{ fontSize: 11, fill: '#7A7A72' }} />
                  <YAxis domain={[70, 100]} tick={{ fontSize: 11, fill: '#7A7A72' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFF', borderRadius: '12px', border: '1px solid #EDEAE2', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="score" stroke="#4A6741" strokeWidth={2} fill="#EBF1E8" name="Score %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Subject Scores Bar Chart */}
          <div className="bg-white rounded-2xl p-5 border border-[#EDEAE2] space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#7A7A72]">Subject Performance</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectPerformanceData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE5" />
                  <XAxis dataKey="subject" tick={{ fontSize: 10, fill: '#7A7A72' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#7A7A72' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFF', borderRadius: '12px', border: '1px solid #EDEAE2', fontSize: '12px' }} />
                  <Bar dataKey="score" fill="#4A6741" radius={[4, 4, 0, 0]} name="Score (%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-2xl p-6 border border-[#EDEAE2] space-y-4">
          <div className="flex justify-between items-center border-b border-[#EDEAE2] pb-3">
            <h3 className="font-bold text-sm text-[#2D2D2A]">Attendance Overview</h3>
            <span className="text-xs font-bold text-[#4A6741]">96.5% Overall</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-xl bg-[#F9F7F2] border border-[#EDEAE2]">
              <p className="text-xl font-bold text-[#4A6741]">112 Days</p>
              <p className="text-xs text-[#7A7A72] mt-0.5">Present</p>
            </div>
            <div className="p-4 rounded-xl bg-[#F9F7F2] border border-[#EDEAE2]">
              <p className="text-xl font-bold text-amber-600">3 Days</p>
              <p className="text-xs text-[#7A7A72] mt-0.5">Approved Leave</p>
            </div>
            <div className="p-4 rounded-xl bg-[#F9F7F2] border border-[#EDEAE2]">
              <p className="text-xl font-bold text-rose-600">2 Days</p>
              <p className="text-xs text-[#7A7A72] mt-0.5">Absent</p>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-xs font-bold text-[#7A7A72] uppercase tracking-wider mb-2">Recent Approved Absence Log</p>
            <div className="p-3 rounded-xl bg-[#F9F7F2] border border-[#EDEAE2] flex justify-between items-center text-xs">
              <div>
                <p className="font-bold text-[#2D2D2A]">Medical Leave (Fever)</p>
                <p className="text-[11px] text-[#7A7A72]">12 June 2026 • Verified by Class Teacher</p>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Approved</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ACTIVITIES & WINS */}
      {activeTab === 'activities' && (
        <div className="bg-white rounded-2xl p-6 border border-[#EDEAE2] space-y-4">
          <h3 className="font-bold text-sm text-[#2D2D2A]">Activities Participated & Won</h3>
          
          <div className="space-y-3">
            {activities.map(act => (
              <div key={act.id} className="p-4 rounded-xl bg-[#F9F7F2] border border-[#EDEAE2] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#2D2D2A] text-sm">{act.title}</span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {act.position}
                    </span>
                  </div>
                  <p className="text-[#7A7A72] mt-1">{act.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] font-medium text-[#7A7A72]">{act.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: BADGES */}
      {activeTab === 'badges' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {badgesList.map(b => {
            const Icon = b.icon;
            return (
              <div key={b.id} className="bg-white p-4 rounded-2xl border border-[#EDEAE2] flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${b.color} shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#2D2D2A]">{b.title}</h4>
                  <p className="text-[11px] text-[#7A7A72]">{b.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
