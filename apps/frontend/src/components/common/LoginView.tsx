import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { apiFetch } from '@utils/apiFetch';
import { LogIn, Key, ShieldCheck, UserCheck, School, ArrowRight, Lock } from 'lucide-react';
import { getAvatarUrl } from '@utils/avatarUtils';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { allUsers, switchUser, setActiveView } = useApp();
  const [selectedUserId, setSelectedUserId] = useState<string>('user-stu-1');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tokenPreview, setTokenPreview] = useState<string | null>(null);

  const handleLogin = async (userId: string) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const targetUser = allUsers.find((u) => u.id === userId);
      if (!targetUser) throw new Error('Selected user not found');

      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUser.id }),
        feedback: {
          success: `Welcome back, ${targetUser.name}.`,
          error: 'Sign-in failed. Please try again.',
          successTitle: 'Signed in',
        },
      });

      if (!res.ok) {
        throw new Error('Authentication request failed');
      }

      const data = await res.json();
      if (data.token) {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('lms_jwt_token', data.token);
        }
        setTokenPreview(data.token);
        switchUser(targetUser.id);
        setActiveView('dashboard');
        if (onLoginSuccess) onLoginSuccess();
      } else {
        throw new Error('No JWT token returned from server');
      }
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-3xl p-6 sm:p-8 border border-[#EDEAE2] shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="natural-banner rounded-2xl p-6 text-white text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-2">
            <School className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold font-serif">Sikshya LMS Portal Login</h1>
          <p className="text-xs text-[#F9F7F2]/90">
            Enterprise JWT Authentication & Role-Based Authorization
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Quick Role Switcher Cards */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-[#7A7A72] uppercase tracking-wider flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-[#4A6741]" />
            Select Account to Authenticate & Issue JWT Token:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {allUsers.map((user) => {
              const isSelected = selectedUserId === user.id;
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    setSelectedUserId(user.id);
                    handleLogin(user.id);
                  }}
                  disabled={isLoading}
                  className={`p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#4A6741] bg-[#EBF1E8] shadow-xs scale-102'
                      : 'border-[#EDEAE2] bg-[#F9F7F2] hover:bg-white hover:border-[#4A6741]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={getAvatarUrl(user.avatar, user.name)}
                      alt={user.name}
                      className="w-9 h-9 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-[#2D2D2A] truncate">{user.name}</p>
                      <p className="text-[10px] text-[#7A7A72] uppercase font-bold tracking-wider">
                        {user.role}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#4A6741] shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        {tokenPreview && (
          <div className="p-3.5 rounded-2xl bg-[#EBF1E8] border border-[#C8DBC4] text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[#4A6741]">
              <ShieldCheck className="w-4 h-4" />
              <span>JWT Authentication Active</span>
            </div>
            <p className="font-mono text-[10px] text-[#7A7A72] truncate">{tokenPreview}</p>
          </div>
        )}

        <div className="pt-2 text-center text-[11px] text-[#7A7A72] border-t border-[#EDEAE2]">
          🔒 Standard Bearer Token Authorization Header attaches to all backend API endpoints.
        </div>
      </div>
    </div>
  );
};
