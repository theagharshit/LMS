import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Bell,
  CheckCheck,
  FileCheck,
  CheckSquare,
  UserCheck,
  Megaphone,
  AlertTriangle,
  Award,
  MessageSquare,
  Settings,
  ShieldCheck,
  Lock,
  Filter,
  Check,
  Send,
  Trash2,
} from 'lucide-react';
import { NotificationCategory } from '@lms/shared';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDispatchModal?: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onOpenDispatchModal,
}) => {
  const {
    notifications,
    notificationPreferences,
    updateNotificationPreferences,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearReadNotifications,
    currentUser,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<
    'all' | 'CRITICAL' | 'ACADEMIC' | 'COMMUNICATION' | 'unread'
  >('all');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  if (!isOpen) return null;

  const canDispatch = currentUser?.role === 'admin' || currentUser?.role === 'teacher';

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'unread') return !n.read;
    if (activeFilter === 'all') return true;
    return n.category === activeFilter;
  });

  const getCategoryBadge = (category?: NotificationCategory) => {
    switch (category) {
      case 'CRITICAL':
        return (
          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
            <span>Critical</span>
          </span>
        );
      case 'ACADEMIC':
        return (
          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
            <FileCheck className="w-2.5 h-2.5 text-emerald-700 shrink-0" />
            <span>Academic</span>
          </span>
        );
      default:
        return (
          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
            <MessageSquare className="w-2.5 h-2.5 text-amber-700 shrink-0" />
            <span>General</span>
          </span>
        );
    }
  };

  const getIcon = (type?: string, category?: NotificationCategory) => {
    if (category === 'CRITICAL') {
      return <AlertTriangle className="w-4 h-4 text-rose-600" />;
    }
    switch (type) {
      case 'assignment':
        return <FileCheck className="w-4 h-4 text-[#4A6741]" />;
      case 'quiz':
        return <CheckSquare className="w-4 h-4 text-[#E88D67]" />;
      case 'attendance':
      case 'location':
        return <UserCheck className="w-4 h-4 text-[#88A070]" />;
      case 'badge':
        return <Award className="w-4 h-4 text-purple-600" />;
      case 'message':
        return <MessageSquare className="w-4 h-4 text-indigo-600" />;
      default:
        return <Megaphone className="w-4 h-4 text-[#E88D67]" />;
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-hidden bg-black/25 backdrop-blur-xs flex justify-end"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-[#EDEAE2] dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="p-4 border-b border-[#EDEAE2] dark:border-slate-800 flex items-center justify-between bg-[#F9F7F2] dark:bg-slate-800/80">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#4A6741] dark:text-emerald-400" />
            <div>
              <h3 className="font-extrabold text-[#2D2D2A] dark:text-white font-serif text-base leading-tight">
                Notifications Hub
              </h3>
              <p className="text-[10px] text-[#7A7A72] dark:text-slate-400">
                Categorized alerts & critical emergency dispatches
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canDispatch && onOpenDispatchModal && (
              <button
                onClick={onOpenDispatchModal}
                title="Dispatch Custom Notification"
                className="p-2 text-[#4A6741] hover:bg-[#EBF1E8] rounded-xl transition-colors font-bold text-xs flex items-center gap-1"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send Alert</span>
              </button>
            )}

            <button
              onClick={() => setIsSettingsOpen(true)}
              title="Notification Settings & Preferences"
              className="p-2 text-[#7A7A72] hover:text-[#2D2D2A] hover:bg-gray-100 rounded-xl transition-colors"
            >
              <Settings className="w-4.5 h-4.5" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-[#7A7A72] hover:text-[#2D2D2A] rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Tabs Bar */}
        <div className="p-3 border-b border-[#EDEAE2] dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-1.5 overflow-x-auto text-xs font-bold scrollbar-none">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              activeFilter === 'all'
                ? 'bg-[#4A6741] text-white shadow-xs'
                : 'bg-[#F9F7F2] dark:bg-slate-800 text-[#7A7A72] hover:text-[#2D2D2A]'
            }`}
          >
            All ({notifications.length})
          </button>

          <button
            onClick={() => setActiveFilter('CRITICAL')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1 ${
              activeFilter === 'CRITICAL'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Critical</span>
          </button>

          <button
            onClick={() => setActiveFilter('ACADEMIC')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              activeFilter === 'ACADEMIC'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-[#F9F7F2] dark:bg-slate-800 text-[#7A7A72]'
            }`}
          >
            Academic
          </button>

          <button
            onClick={() => setActiveFilter('unread')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              activeFilter === 'unread'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-[#F9F7F2] dark:bg-slate-800 text-[#7A7A72]'
            }`}
          >
            Unread ({notifications.filter((n) => !n.read).length})
          </button>
        </div>

        {/* Action Header */}
        <div className="px-4 py-2 bg-[#F9F7F2] dark:bg-slate-800/40 border-b border-[#EDEAE2] dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-[11px] text-[#7A7A72] font-semibold">
            Showing {filteredNotifications.length} items
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={markAllNotificationsRead}
              className="text-[11px] font-extrabold text-[#4A6741] dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All Read</span>
            </button>

            <button
              onClick={clearReadNotifications}
              className="text-[11px] font-extrabold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Read</span>
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F9F7F2] dark:bg-slate-950">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-16 text-[#7A7A72] space-y-2">
              <Bell className="w-8 h-8 text-[#7A7A72] mx-auto opacity-50" />
              <p className="font-bold text-xs">No notifications in this filter</p>
              <p className="text-[11px]">
                All real-time updates and emergency dispatches will appear here.
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                onClick={() => markNotificationRead(item.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 relative group ${
                  item.read
                    ? 'bg-white/60 dark:bg-slate-900/60 border-[#EDEAE2] dark:border-slate-800 opacity-80'
                    : item.category === 'CRITICAL'
                      ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-[#88A070]/60 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        item.category === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-[#F0EDE5] dark:bg-slate-800'
                      }`}
                    >
                      {getIcon(item.type, item.category)}
                    </div>
                    {getCategoryBadge(item.category)}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#7A7A72] shrink-0">
                      {item.time || 'Recently'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(item.id);
                      }}
                      title="Delete Notification"
                      className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="font-extrabold text-xs text-[#2D2D2A] dark:text-white leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-xs text-[#7A7A72] dark:text-slate-300 mt-1 leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#EDEAE2] dark:border-slate-800 text-center bg-white dark:bg-slate-900">
          <p className="text-[11px] text-[#7A7A72] font-medium flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#4A6741]" />
            <span>Critical safety and grade notifications bypass user mutes</span>
          </p>
        </div>
      </div>

      {/* Preferences Modal */}
      {isSettingsOpen && (
        <div
          onClick={() => setIsSettingsOpen(false)}
          className="fixed inset-0 z-60 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-[#EDEAE2] dark:border-slate-800 shadow-2xl space-y-6 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-[#EDEAE2] dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#4A6741]" />
                <h3 className="font-black text-base text-[#2D2D2A] dark:text-white font-serif">
                  Notification Preferences
                </h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1.5 text-[#7A7A72] hover:text-[#2D2D2A] rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Critical Alerts (Locked) */}
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-extrabold text-rose-900 dark:text-rose-200">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Critical Safety & Grade Alerts</span>
                  </div>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-tight">
                    Attendance alerts, location updates, and published quiz grades.
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-rose-200/80 dark:bg-rose-900 px-3 py-1.5 rounded-full text-rose-950 dark:text-rose-100 font-extrabold text-[10px] shrink-0">
                  <Lock className="w-3 h-3" />
                  <span>ALWAYS ON</span>
                </div>
              </div>

              {/* Academic Updates Toggle */}
              <div className="p-4 rounded-2xl bg-[#F9F7F2] dark:bg-slate-800 border border-[#EDEAE2] dark:border-slate-700 flex items-center justify-between">
                <div className="space-y-1 pr-3">
                  <span className="font-extrabold text-[#2D2D2A] dark:text-white block">
                    Academic & Homework Updates
                  </span>
                  <span className="text-[11px] text-[#7A7A72] leading-tight block">
                    Notifications for new assignments, stream announcements, and due dates.
                  </span>
                </div>

                <button
                  onClick={() =>
                    updateNotificationPreferences({
                      enableAcademic: !notificationPreferences.enableAcademic,
                    })
                  }
                  className={`w-12 h-6 rounded-full transition-colors relative p-1 shrink-0 ${
                    notificationPreferences.enableAcademic
                      ? 'bg-[#4A6741]'
                      : 'bg-gray-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      notificationPreferences.enableAcademic ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Communication & Badges Toggle */}
              <div className="p-4 rounded-2xl bg-[#F9F7F2] dark:bg-slate-800 border border-[#EDEAE2] dark:border-slate-700 flex items-center justify-between">
                <div className="space-y-1 pr-3">
                  <span className="font-extrabold text-[#2D2D2A] dark:text-white block">
                    Direct Messages & XP Badges
                  </span>
                  <span className="text-[11px] text-[#7A7A72] leading-tight block">
                    Chat notifications, earned achievement badges, and general notices.
                  </span>
                </div>

                <button
                  onClick={() =>
                    updateNotificationPreferences({
                      enableCommunication: !notificationPreferences.enableCommunication,
                    })
                  }
                  className={`w-12 h-6 rounded-full transition-colors relative p-1 shrink-0 ${
                    notificationPreferences.enableCommunication
                      ? 'bg-[#4A6741]'
                      : 'bg-gray-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      notificationPreferences.enableCommunication
                        ? 'translate-x-6'
                        : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-[#EDEAE2] dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-5 py-2.5 rounded-2xl bg-[#4A6741] text-white font-extrabold text-xs shadow-sm hover:bg-[#3D5535] transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
