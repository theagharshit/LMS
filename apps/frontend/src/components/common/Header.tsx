import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { getAvatarUrl } from '../../utils/avatarUtils';
import {
  GraduationCap,
  Bell,
  Search,
  Sparkles,
  Sun,
  Moon,
  Users,
  ChevronDown,
  UserCheck,
  BookOpen,
  ShieldAlert,
  Heart,
  MessageSquare,
} from 'lucide-react';

interface HeaderProps {
  onToggleNotifications: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleNotifications }) => {
  const {
    currentUser,
    allUsers,
    switchUser,
    activeChild,
    setActiveChildId,
    activeChildList,
    theme,
    setTheme,
    unreadCount,
    setIsAiTutorOpen,
    setIsAiParentSummaryOpen,
    activeView,
    setActiveView,
    logout,
  } = useApp();

  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const roleDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[#F0EDE5]/95 backdrop-blur-md border-b border-[#E5E1D8] px-4 py-2.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView('dashboard')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-10 h-10 rounded-xl bg-[#4A6741] flex items-center justify-center text-white shadow-sm group-hover:bg-[#3D5535] transition-colors">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg leading-none tracking-tight text-[#2D2D2A] font-serif">
                  शिक्षा <span className="text-[#4A6741]">Sikshya</span>
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#EBF1E8] text-[#4A6741]">
                  Nepal LMS
                </span>
              </div>
              <p className="text-[11px] text-[#7A7A72]">{currentUser.schoolName}</p>
            </div>
          </button>
        </div>

        {/* Center: Search Bar */}
        {import.meta.env.DEV && (
          <div className="hidden md:flex flex-1 max-w-md relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A7A72]" />
            <input
              type="text"
              placeholder="Search for lessons, assignments, or teachers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 text-sm bg-[#F9F7F2] border border-[#E5E1D8] rounded-full focus:outline-none focus:ring-2 focus:ring-[#4A6741]/40 text-[#2D2D2A] placeholder-[#7A7A72]"
            />
          </div>
        )}

        {/* Right: Role Switcher, AI Tools, Child Selector, Notifications & Theme */}
        <div className="flex items-center gap-2.5">
          {/* Parent-specific Child Selector */}
          {currentUser.role === 'parent' && activeChildList.length > 0 && (
            <div className="hidden sm:flex items-center gap-1 bg-[#FDEEDC] border border-[#E88D67]/30 rounded-full px-2.5 py-1 text-xs">
              <Heart className="w-3.5 h-3.5 text-[#E88D67] fill-[#E88D67]" />
              <span className="font-medium text-[#2D2D2A]">Child:</span>
              <div className="flex gap-1 ml-1">
                {activeChildList.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => setActiveChildId(child.id)}
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-all ${
                      activeChild?.id === child.id
                        ? 'bg-[#E88D67] text-white shadow-sm'
                        : 'text-[#7A7A72] hover:bg-[#E88D67]/10'
                    }`}
                  >
                    {child.name.split(' ')[0]} (Grade {child.gradeLevel})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI Helper Trigger */}
          {currentUser.role === 'parent' ? (
            <button
              onClick={() => setIsAiParentSummaryOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#E88D67] hover:bg-[#D87B55] text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>AI Parent Digest</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAiTutorOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#4A6741] hover:bg-[#3D5535] text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FDEEDC]" />
              <span>Sikshya AI Tutor</span>
            </button>
          )}

          {/* Theme Switcher */}
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-2 text-[#7A7A72] hover:bg-[#E5E1D8]/50 rounded-full transition-colors"
            title="Toggle Theme"
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4 text-[#E88D67]" />
            )}
          </button>

          {/* Notification Bell */}
          <button
            onClick={onToggleNotifications}
            className="relative p-2 text-[#7A7A72] hover:bg-[#E5E1D8]/50 rounded-full transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-[#E88D67] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Live Role Switcher Pill */}
          <div className="relative" ref={roleDropdownRef}>
            <button
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-full border border-[#E5E1D8] bg-white hover:bg-[#F9F7F2] transition-all text-xs text-[#2D2D2A]"
            >
              <img
                src={getAvatarUrl(currentUser.avatar, currentUser.name)}
                alt={currentUser.name}
                onError={(e) => {
                  e.currentTarget.src = getAvatarUrl(undefined, currentUser.name);
                }}
                className="w-6 h-6 rounded-full object-cover border border-[#4A6741]"
              />
              <div className="text-left hidden sm:block">
                <p className="font-semibold text-xs leading-none text-[#2D2D2A]">
                  {currentUser.name}
                </p>
                <p className="text-[10px] capitalize text-[#4A6741] font-medium">
                  {currentUser.role}{' '}
                  {currentUser.gradeLevel ? `(Grade ${currentUser.gradeLevel})` : ''}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#7A7A72]" />
            </button>

            {/* Dropdown Menu */}
            {isRoleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#EDEAE2] py-2 z-50 text-[#2D2D2A] animate-in fade-in slide-in-from-top-2 duration-150">
                {currentUser.role === 'student' && (
                  <div className="px-2 pb-2 mb-1 border-b border-[#EDEAE2]">
                    <button
                      onClick={() => {
                        setActiveView('profile');
                        setIsRoleDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-[#4A6741] bg-[#EBF1E8] hover:bg-[#3D5535] hover:text-white transition-colors"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>View Student Profile & ID Card</span>
                    </button>
                  </div>
                )}
                <div className="px-3 py-1.5 border-b border-[#EDEAE2]">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A7A72]">
                    Accounts
                  </p>
                </div>
                <div className="p-1 space-y-1 border-t border-[#EDEAE2]">
                  {allUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        switchUser(user.id);
                        setIsRoleDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors ${
                        currentUser.id === user.id
                          ? 'bg-[#EBF1E8] text-[#4A6741] font-bold'
                          : 'hover:bg-[#F9F7F2]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={getAvatarUrl(user.avatar, user.name)}
                          alt={user.name}
                          onError={(e) => {
                            e.currentTarget.src = getAvatarUrl(undefined, user.name);
                          }}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-semibold text-xs text-[#2D2D2A]">{user.name}</p>
                          <p className="text-[10px] text-[#7A7A72] capitalize">
                            {user.role} {user.gradeLevel ? `• Grade ${user.gradeLevel}` : ''}
                          </p>
                        </div>
                      </div>
                      {currentUser.id === user.id && (
                        <UserCheck className="w-4 h-4 text-[#4A6741]" />
                      )}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      logout();
                      setActiveView('login');
                      setIsRoleDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
