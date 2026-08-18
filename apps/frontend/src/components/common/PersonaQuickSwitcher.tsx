import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getAvatarUrl } from '../../utils/avatarUtils';
import {
  Shield,
  GraduationCap,
  Users,
  User,
  Crown,
  ChevronDown,
  Sparkles,
  Zap,
  CheckCircle2,
  LockOpen,
} from 'lucide-react';

export const PersonaQuickSwitcher: React.FC = () => {
  const { currentUser, allUsers, devSwitchUser, switchUser } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const personas = [
    {
      role: 'admin',
      label: 'Admin / Executive',
      icon: Crown,
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20',
      activeColor: 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20',
      description: 'Full Governance & Master Hub',
    },
    {
      role: 'teacher',
      label: 'Teacher Faculty',
      icon: GraduationCap,
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20',
      activeColor: 'bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/20',
      description: 'Grading, Attendance & Classes',
    },
    {
      role: 'student',
      label: 'Student Learner',
      icon: User,
      color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20',
      activeColor: 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/20',
      description: 'Quizzes, Lessons & Schedule',
    },
    {
      role: 'parent',
      label: 'Parent / Guardian',
      icon: Users,
      color: 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20',
      activeColor: 'bg-rose-600 text-white font-bold shadow-lg shadow-rose-500/20',
      description: 'Child Progress & Timetable',
    },
  ];

  const handleInstantSwitch = async (roleOrId: string) => {
    try {
      setIsSwitching(true);
      await devSwitchUser(roleOrId);
    } finally {
      setIsSwitching(false);
      setIsOpen(false);
    }
  };

  return (
    <aside
      aria-label="Developer Persona Switcher"
      className="bg-slate-950/95 border-b border-slate-800 text-slate-200 px-4 py-2 text-xs backdrop-blur-md sticky top-0 z-50 shadow-md"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Indicator & Quick Role Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-semibold tracking-wide uppercase text-[10px]">
            <Zap className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>Dev Persona Switcher</span>
          </div>

          <div className="flex items-center gap-1.5">
            {personas.map((p) => {
              const Icon = p.icon;
              const isActive = currentUser.role === p.role;
              return (
                <button
                  key={p.role}
                  disabled={isSwitching}
                  onClick={() => handleInstantSwitch(p.role)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs transition-all cursor-pointer ${
                    isActive ? p.activeColor : `${p.color} border-slate-700 text-slate-300`
                  }`}
                  title={`Instant switch to ${p.label}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="capitalize">{p.role}</span>
                  {isActive && <CheckCircle2 className="w-3 h-3 ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Active User Details & Dropdown for specific accounts */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2 px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-200 transition cursor-pointer"
            >
              <img
                src={getAvatarUrl(currentUser.avatar, currentUser.name)}
                alt={currentUser.name}
                onError={(e) => {
                  e.currentTarget.src = getAvatarUrl(undefined, currentUser.name);
                }}
                className="w-4 h-4 rounded-full object-cover"
              />
              <span className="font-semibold truncate max-w-[140px] text-white">
                {currentUser.name || 'Select Account'}
              </span>
              <span className="text-[10px] text-slate-400 capitalize px-1.5 py-0.5 rounded bg-slate-800">
                {currentUser.role}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-100 max-h-96 overflow-y-auto">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Available Accounts ({allUsers.length})</span>
                  <LockOpen className="w-3 h-3 text-indigo-400" />
                </div>
                {allUsers.map((u) => {
                  const isCurrent = currentUser.id === u.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => handleInstantSwitch(u.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition cursor-pointer ${
                        isCurrent
                          ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                          : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={getAvatarUrl(u.avatar, u.name)}
                          alt={u.name}
                          onError={(e) => {
                            e.currentTarget.src = getAvatarUrl(undefined, u.name);
                          }}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <div>
                          <div className="font-medium text-white truncate max-w-[150px]">
                            {u.name}
                          </div>
                          <div className="text-[10px] text-slate-400 capitalize">
                            {u.role} {u.gradeLevel ? `• Grade ${u.gradeLevel}` : ''}
                          </div>
                        </div>
                      </div>
                      {isCurrent && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
