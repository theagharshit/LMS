export type ToastKind = 'success' | 'warning' | 'error' | 'info';

export type ToastOptions = {
  title?: string;
  duration?: number;
  id?: string;
};

export type ToastEventDetail = ToastOptions & {
  message: string;
  kind: ToastKind;
};

export const TOAST_EVENT = 'sikshya:toast';

export function showToast(
  message: string,
  kind: ToastKind = 'info',
  options: ToastOptions = {},
) {
  if (typeof window === 'undefined' || !message.trim()) return;
  window.dispatchEvent(
    new CustomEvent<ToastEventDetail>(TOAST_EVENT, {
      detail: { message: message.trim(), kind, ...options },
    }),
  );
}

export const toast = {
  success: (message: string, options?: ToastOptions) => showToast(message, 'success', options),
  warning: (message: string, options?: ToastOptions) => showToast(message, 'warning', options),
  error: (message: string, options?: ToastOptions) => showToast(message, 'error', options),
  info: (message: string, options?: ToastOptions) => showToast(message, 'info', options),
};
