import React, { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { apiFetch } from '@utils/apiFetch';

const tokenExpiry = () => {
  try {
    const token = localStorage.getItem('lms_jwt_token');
    if (!token) return 0;
    return Number(JSON.parse(atob(token.split('.')[1])).exp || 0) * 1000;
  } catch {
    return 0;
  }
};

export const SessionExpiryWarning: React.FC = () => {
  const [remaining, setRemaining] = useState(Number.POSITIVE_INFINITY);
  useEffect(() => {
    const update = () => {
      const expiry = tokenExpiry();
      setRemaining(expiry ? Math.max(0, expiry - Date.now()) : Number.POSITIVE_INFINITY);
    };
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, []);
  if (remaining > 120_000) return null;

  const extend = async () => {
    const response = await apiFetch('/api/auth/refresh', {
      method: 'POST',
      feedback: {
        success: 'Your secure session was extended by 15 minutes.',
        error: 'We could not extend your session. Please sign in again.',
        successTitle: 'Session extended',
      },
    });
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('lms_jwt_token', data.accessToken);
      setRemaining(15 * 60 * 1000);
    }
  };
  return (
    <div
      className="fixed inset-0 z-[110] grid place-items-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expiry-title"
    >
      <section className="w-full max-w-sm rounded-3xl bg-natural-card p-6 text-center shadow-xl">
        <Clock3 className="mx-auto text-natural-secondary" size={34} aria-hidden="true" />
        <h2 id="session-expiry-title" className="mt-3 font-serif-heading text-xl text-natural-dark">
          Your session is ending
        </h2>
        <p className="mt-2 text-sm text-natural-light">
          For your security, you’ll be signed out in {Math.ceil(remaining / 1000)} seconds.
        </p>
        <button
          onClick={() => void extend()}
          className="mt-5 rounded-xl bg-natural-accent px-5 py-3 font-semibold text-white"
        >
          Extend session
        </button>
      </section>
    </div>
  );
};
