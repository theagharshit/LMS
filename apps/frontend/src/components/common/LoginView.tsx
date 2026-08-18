import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { apiFetch } from '@utils/apiFetch';
import {
  LogIn,
  Key,
  ShieldCheck,
  School,
  Lock,
  Crown,
  GraduationCap,
  User,
  Users,
  Zap,
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { establishSession, setActiveView, devSwitchUser } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tokenPreview, setTokenPreview] = useState<string | null>(null);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          ...(password ? { password } : {}),
        }),
        feedback: {
          success: 'Welcome back.',
          error: 'Sign-in failed. Please try again.',
          successTitle: 'Signed in',
        },
      });

      if (!res.ok) {
        throw new Error('Authentication request failed');
      }

      const data = await res.json();
      if (data.token && data.user) {
        setTokenPreview(data.token);
        establishSession(data.user, data.token);
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

  const handleQuickPersonaLogin = async (role: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await devSwitchUser(role);
      setActiveView('dashboard');
      if (onLoginSuccess) onLoginSuccess();
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

        {/* Quick 1-Click Persona Backdoor Switcher */}
        <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3 text-slate-200">
          <div className="flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-indigo-400">
              <Zap className="w-4 h-4 text-indigo-400" />
              <span>Instant 1-Click Persona Access (No Login Required)</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
              Dev Backdoor
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickPersonaLogin('admin')}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-800 hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/40 text-slate-200 hover:text-amber-300 transition cursor-pointer gap-1.5"
            >
              <Crown className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-[11px]">Principal / Admin</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickPersonaLogin('teacher')}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-800 hover:bg-emerald-500/20 border border-slate-700 hover:border-emerald-500/40 text-slate-200 hover:text-emerald-300 transition cursor-pointer gap-1.5"
            >
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-[11px]">Teacher</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickPersonaLogin('student')}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-800 hover:bg-indigo-500/20 border border-slate-700 hover:border-indigo-500/40 text-slate-200 hover:text-indigo-300 transition cursor-pointer gap-1.5"
            >
              <User className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold text-[11px]">Student</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickPersonaLogin('parent')}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/40 text-slate-200 hover:text-rose-300 transition cursor-pointer gap-1.5"
            >
              <Users className="w-4 h-4 text-rose-400" />
              <span className="font-semibold text-[11px]">Parent</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleLogin}>
          <p className="text-xs font-bold text-[#7A7A72] uppercase tracking-wider flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-[#4A6741]" />
            Or Sign in with credentials
          </p>
          <label className="block text-xs font-bold text-[#2D2D2A]">
            Email address
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="e.g. admin@lms.com"
              className="mt-1.5 w-full rounded-xl border border-[#E5E1D8] bg-[#F9F7F2] px-3.5 py-3 text-sm font-normal outline-none focus:ring-2 focus:ring-[#4A6741]/30"
            />
          </label>
          <label className="block text-xs font-bold text-[#2D2D2A]">
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="mt-1.5 w-full rounded-xl border border-[#E5E1D8] bg-[#F9F7F2] px-3.5 py-3 text-sm font-normal outline-none focus:ring-2 focus:ring-[#4A6741]/30"
            />
          </label>
          <button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="w-full rounded-xl bg-[#4A6741] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#3D5535] disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

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
          Standard Bearer Token Authorization Header attaches to all backend API endpoints.
        </div>
      </div>
    </div>
  );
};
