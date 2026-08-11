import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, CircleAlert, Info, X } from 'lucide-react';
import { showToast, TOAST_EVENT, ToastEventDetail, ToastKind, ToastOptions } from '@utils/toast';

type Toast = ToastEventDetail & { key: string; duration: number };
type ToastApi = { notify: (message: string, kind?: ToastKind, options?: ToastOptions) => void };
const ToastContext = createContext<ToastApi>({ notify: showToast });

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const sequence = useRef(0);
  const timers = useRef(new Map<string, number>());
  const dismiss = useCallback(
    (key: string) => {
      const timer = timers.current.get(key);
      if (timer) window.clearTimeout(timer);
      timers.current.delete(key);
      setToasts((items) => items.filter((item) => item.key !== key));
    },
    [],
  );
  const notify = useCallback(
    (message: string, kind: ToastKind = 'info', options: ToastOptions = {}) => {
      const normalized = message.trim();
      if (!normalized) return;
      const duration = Math.min(15_000, Math.max(2_000, options.duration ?? 4_500));
      const key = options.id || `toast-${Date.now()}-${sequence.current++}`;
      setToasts((items) => {
        const withoutDuplicate = items.filter(
          (item) => item.id !== options.id && !(item.message === normalized && item.kind === kind),
        );
        return [...withoutDuplicate.slice(-4), { ...options, key, message: normalized, kind, duration }];
      });
      const existingTimer = timers.current.get(key);
      if (existingTimer) window.clearTimeout(existingTimer);
      timers.current.set(key, window.setTimeout(() => dismiss(key), duration));
    },
    [dismiss],
  );
  const value = useMemo(() => ({ notify }), [notify]);
  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<ToastEventDetail>).detail;
      if (detail?.message) notify(detail.message, detail.kind, detail);
    };
    window.addEventListener(TOAST_EVENT, listener);
    return () => {
      window.removeEventListener(TOAST_EVENT, listener);
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
    };
  }, [notify]);
  const icons = { success: CheckCircle2, warning: AlertTriangle, error: CircleAlert, info: Info };
  const defaults = {
    success: 'Success',
    warning: 'Attention needed',
    error: 'Something went wrong',
    info: 'Update',
  };
  const styles = {
    success: 'border-emerald-200 bg-emerald-50/95 text-emerald-950',
    warning: 'border-amber-200 bg-amber-50/95 text-amber-950',
    error: 'border-rose-200 bg-rose-50/95 text-rose-950',
    info: 'border-sky-200 bg-sky-50/95 text-sky-950',
  };
  const iconStyles = {
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    error: 'text-rose-600',
    info: 'text-sky-600',
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed right-4 top-20 z-[140] flex w-[min(25rem,calc(100vw-2rem))] flex-col gap-2 sm:right-6"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const Icon = icons[toast.kind];
          return (
            <div
              key={toast.key}
              role={toast.kind === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-md toast-enter ${styles[toast.kind]}`}
            >
              <Icon size={20} className={`mt-0.5 shrink-0 ${iconStyles[toast.kind]}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-5">{toast.title || defaults[toast.kind]}</p>
                <p className="mt-0.5 text-sm leading-5 opacity-85">{toast.message}</p>
              </div>
              <button
                type="button"
                className="rounded-lg p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                aria-label={`Dismiss ${toast.kind} notification`}
                onClick={() => dismiss(toast.key)}
              >
                <X size={17} />
              </button>
              <span
                className="toast-progress absolute inset-x-0 bottom-0 h-0.5 bg-current opacity-30"
                style={{ animationDuration: `${toast.duration}ms` }}
                aria-hidden="true"
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
