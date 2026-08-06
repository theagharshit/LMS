export const apiFetch = (url: string, options?: RequestInit) => {
  if (
    typeof window === 'undefined' ||
    !window.location ||
    !window.location.origin ||
    window.location.origin === 'null'
  ) {
    return Promise.resolve(new Response());
  }
  try {
    return window.fetch(url, options).catch(() => new Response());
  } catch {
    return Promise.resolve(new Response());
  }
};
