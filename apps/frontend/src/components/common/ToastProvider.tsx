import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  const dismiss = useCallback((key: string) => {
    const timer = timers.current.get(key);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(key);
    setToasts((items) => items.filter((item) => item.key !== key));
  }, []);
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
        return [
          ...withoutDuplicate.slice(-4),
          { ...options, key, message: normalized, kind, duration },
        ];
      });
      const existingTimer = timers.current.get(key);
      if (existingTimer) window.clearTimeout(existingTimer);
      timers.current.set(
        key,
        window.setTimeout(() => dismiss(key), duration),
      );
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
    success:
      'border-emerald-200 bg-emerald-50/95 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/95 dark:text-emerald-50',
    warning:
      'border-amber-200 bg-amber-50/95 text-amber-950 dark:border-amber-800 dark:bg-amber-950/95 dark:text-amber-50',
    error:
      'border-rose-200 bg-rose-50/95 text-rose-950 dark:border-rose-800 dark:bg-rose-950/95 dark:text-rose-50',
    info: 'border-sky-200 bg-sky-50/95 text-sky-950 dark:border-sky-800 dark:bg-sky-950/95 dark:text-sky-50',
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
        className="pointer-events-none fixed bottom-3 left-4 z-[140] flex w-[min(14rem,calc(100vw-2rem))] flex-col gap-1.5 sm:bottom-4 sm:left-6 lg:left-10 lg:w-56"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const Icon = icons[toast.kind];
          return (
            <div
              key={toast.key}
              role={toast.kind === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto relative flex items-start gap-2 overflow-hidden rounded-xl border px-2.5 py-2 shadow-lg backdrop-blur-md toast-enter ${styles[toast.kind]}`}
            >
              <Icon
                size={15}
                className={`mt-px shrink-0 ${iconStyles[toast.kind]}`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold leading-4">
                  {toast.title || defaults[toast.kind]}
                </p>
                <p className="text-[10px] leading-3.5 opacity-85">{toast.message}</p>
              </div>
              <button
                type="button"
                className="rounded-md p-0.5 opacity-60 transition hover:bg-black/5 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                aria-label={`Dismiss ${toast.kind} notification`}
                onClick={() => dismiss(toast.key)}
              >
                <X size={13} />
              </button>
              <span
                className="toast-progress absolute inset-x-0 bottom-0 h-px bg-current opacity-30"
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
