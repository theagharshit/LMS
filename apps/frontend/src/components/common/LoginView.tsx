import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { apiFetch } from '@utils/apiFetch';
import { LogIn, Key, ShieldCheck, School, Lock } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { establishSession, setActiveView } = useApp();
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

        <form className="space-y-4" onSubmit={handleLogin}>
          <p className="text-xs font-bold text-[#7A7A72] uppercase tracking-wider flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-[#4A6741]" />
            Sign in to your school account
          </p>
          <label className="block text-xs font-bold text-[#2D2D2A]">
            Email address
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
          🔒 Standard Bearer Token Authorization Header attaches to all backend API endpoints.
        </div>
      </div>
    </div>
  );
};
