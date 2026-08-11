import { useEffect } from 'react';

const focusable =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const DialogAccessibilityManager = () => {
  useEffect(() => {
    let previousFocus: HTMLElement | null = null;
    const focusDialog = () => {
      const dialog = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]');
      if (!dialog) return;
      if (!previousFocus) previousFocus = document.activeElement as HTMLElement | null;
      if (!dialog.contains(document.activeElement))
        dialog.querySelector<HTMLElement>(focusable)?.focus();
    };
    const observer = new MutationObserver(focusDialog);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const dialog = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]');
      if (!dialog) return;
      const items = [...dialog.querySelectorAll<HTMLElement>(focusable)].filter(
        (item) => item.offsetParent !== null,
      );
      if (!items.length) return;
      const first = items[0];
      const last = items.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', trap);
    return () => {
      observer.disconnect();
      document.removeEventListener('keydown', trap);
      previousFocus?.focus();
    };
  }, []);
  return null;
};
