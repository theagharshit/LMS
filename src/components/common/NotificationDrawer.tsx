import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, Bell, Check, FileCheck, CheckSquare, UserCheck, Megaphone } from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const { notifications, markNotificationRead } = useApp();

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'assignment':
        return <FileCheck className="w-4 h-4 text-[#4A6741]" />;
      case 'quiz':
        return <CheckSquare className="w-4 h-4 text-[#E88D67]" />;
      case 'attendance':
        return <UserCheck className="w-4 h-4 text-[#88A070]" />;
      default:
        return <Megaphone className="w-4 h-4 text-[#E88D67]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/20 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-sm bg-white h-full shadow-xl border-l border-[#EDEAE2] flex flex-col animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-[#E5E1D8] flex items-center justify-between bg-[#F0EDE5]/50">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#4A6741]" />
            <h3 className="font-bold text-[#2D2D2A] font-serif text-base">Notifications</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#7A7A72] hover:text-[#2D2D2A] rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F9F7F2]">
          {notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => markNotificationRead(item.id)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                item.read
                  ? 'bg-white/60 border-[#EDEAE2] opacity-75'
                  : 'bg-white border-[#88A070]/50 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-[#F0EDE5] shadow-xs">
                  {getIcon(item.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-[#2D2D2A]">{item.title}</h4>
                    <span className="text-[10px] text-[#7A7A72]">{item.time}</span>
                  </div>
                  <p className="text-xs text-[#7A7A72] mt-1 leading-snug">{item.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#E5E1D8] text-center bg-white">
          <p className="text-[11px] text-[#7A7A72]">All updates delivered in real-time</p>
        </div>
      </div>
    </div>
  );
};
