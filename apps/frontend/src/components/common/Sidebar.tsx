import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  BookOpen,
  FileCheck,
  Award,
  Calendar,
  MessageSquare,
  ShieldAlert,
  UserCheck,
  TrendingUp,
  FolderOpen,
  Sparkles,
  HelpCircle,
  PlusCircle,
  LogOut,
  Sliders,
  CheckSquare,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { currentUser, activeView, setActiveView, activeChild, substituteRequests } = useApp();

  const isStudent = currentUser.role === 'student';
  const isTeacher = currentUser.role === 'teacher';
  const isParent = currentUser.role === 'parent';
  const isAdmin = currentUser.role === 'admin';

  const pendingSubDutiesCount = isTeacher
    ? (substituteRequests || []).filter(
        (r) =>
          (r.assignedSubstituteId === currentUser.id ||
            r.suggestedSubstituteId === currentUser.id) &&
          r.status === 'PENDING',
      ).length
    : 0;

  interface NavItem {
    id: string;
    label: string;
    icon: React.ForwardRefExoticComponent<any>;
    badge?: string;
  }

  // Navigation Items per Role
  const studentNav: NavItem[] = [
    { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { id: 'classroom', label: 'Classrooms & Notes', icon: BookOpen },
    { id: 'profile', label: 'Student Profile & ID', icon: UserCheck },
    { id: 'calendar', label: 'Academic Calendar', icon: Calendar },
  ];

  const teacherNav: NavItem[] = [
    { id: 'dashboard', label: 'Teacher Hub', icon: LayoutDashboard },
    { id: 'classroom', label: 'Classrooms', icon: BookOpen },
    ...(import.meta.env.DEV ? [{ id: 'quizzes', label: 'Quiz Creator & AI', icon: Sparkles }] : []),
    {
      id: 'subs-leaves',
      label: 'Assigned Subs & Leaves',
      icon: UserCheck,
      badge: pendingSubDutiesCount > 0 ? `${pendingSubDutiesCount} New` : undefined,
    },
    { id: 'attendance', label: 'Attendance Register', icon: UserCheck },
    { id: 'progress', label: 'Student Analytics', icon: TrendingUp },
    { id: 'calendar', label: 'Academic Calendar', icon: Calendar },
  ];

  const parentNav: NavItem[] = [
    { id: 'dashboard', label: 'Child Overview', icon: LayoutDashboard },
    { id: 'progress', label: 'AI Progress Digest', icon: TrendingUp },
    { id: 'assignments', label: 'Homework & Exams', icon: FileCheck },
    ...(import.meta.env.DEV
      ? [
          {
            id: 'parental-controls',
            label: 'Parental Controls',
            icon: ShieldAlert,
            badge: activeChild.gradeLevel < 7 ? 'Grade < 7' : undefined,
          },
        ]
      : []),
    { id: 'calendar', label: 'School Calendar', icon: Calendar },
    { id: 'messages', label: 'Teacher Messages', icon: MessageSquare },
  ];

  const adminNav: NavItem[] = [
    { id: 'dashboard', label: 'Admin Hub', icon: ShieldAlert },
    { id: 'calendar', label: 'Academic Calendar', icon: Calendar },
  ];

  const navItems = isStudent ? studentNav : isTeacher ? teacherNav : isAdmin ? adminNav : parentNav;

  return (
    <aside className="w-64 bg-[#F0EDE5] border border-[#E5E1D8] flex flex-col justify-between p-4 h-[calc(100vh-89px)] sticky top-[73px] rounded-2xl transition-colors shrink-0 hidden lg:flex overflow-y-auto">
      {/* Top Navigation Links */}
      <div className="space-y-6">
        {/* User Role Banner */}
        {import.meta.env.DEV ? (
          <div className="px-3.5 py-2.5 rounded-2xl bg-[#F9F7F2] border border-[#E5E1D8]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A7A72]">
              Current Context
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-[#88A070]" />
              <span className="font-bold text-xs text-[#2D2D2A] capitalize">
                {isStudent
                  ? `Student: ${currentUser.name}`
                  : isTeacher
                    ? `Teacher: ${currentUser.name}`
                    : isAdmin
                      ? `Admin: ${currentUser.name}`
                      : `Parent: Bina Sharma`}
              </span>
            </div>
            {isParent && (
              <p className="text-[11px] text-[#E88D67] font-medium mt-1">
                Viewing: {activeChild.name} (Grade {activeChild.gradeLevel})
              </p>
            )}
          </div>
        ) : (
          <div className="px-3.5 py-3 rounded-2xl bg-[#4A6741] shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#F0EDE5]/80">
              Welcome Back
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-bold text-sm text-white capitalize">
                {(() => {
                  const parts = currentUser.name.split(' ');
                  if (parts.length > 1 && /^(mr|mrs|ms|dr|prof)\.?$/i.test(parts[0])) {
                    return `${parts[0]} ${parts[1]}`;
                  }
                  return parts[0];
                })()}{' '}
                👋
              </span>
            </div>
            {isParent && (
              <p className="text-[11px] text-[#F0EDE5]/90 font-medium mt-1">
                Viewing: {activeChild.name}
              </p>
            )}
          </div>
        )}

        {/* Navigation list */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-white text-[#4A6741] shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-[#EDEAE2]'
                    : 'text-[#7A7A72] hover:bg-[#E5E1D8]/40 hover:text-[#2D2D2A]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#4A6741]' : 'text-[#7A7A72]'}`}
                  />
                  <span className="whitespace-nowrap truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FDEEDC] text-[#E88D67] whitespace-nowrap shrink-0 ml-1">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer Info */}
      <div className="pt-4 border-t border-[#E5E1D8] space-y-2 mb-20">
        <div className="px-3 py-2.5 rounded-xl bg-[#EBF1E8] text-[#2D2D2A] text-xs border border-[#4A6741]/20">
          <p className="font-bold text-[11px] text-[#4A6741]">🇳🇵 CDC Nepal Standard</p>
          <p className="text-[10px] text-[#7A7A72] mt-0.5">
            Aligned with National Examination Board Guidelines
          </p>
        </div>
      </div>
    </aside>
  );
};
