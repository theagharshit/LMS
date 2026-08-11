import { queueOfflineRequest } from './offlineSync';

const csrfToken = () => {
  if (typeof document === 'undefined') return null;
  return (
    document.cookie
      .split('; ')
      .find((item) => item.startsWith('csrf_token='))
      ?.split('=')[1] || null
  );
};

const nativeFetch = () => {
  if (typeof window !== 'undefined' && typeof window.fetch === 'function')
    return window.fetch.bind(window);
  if (typeof globalThis.fetch === 'function') return globalThis.fetch.bind(globalThis);
  return null;
};

export const apiFetch = async (url: string, options?: RequestInit): Promise<Response> => {
  try {
    const fetcher = nativeFetch();
    if (!fetcher) throw new Error('Fetch is unavailable.');
    const fetchOptions: RequestInit = { credentials: 'include', ...(options || {}) };
    const headers = new Headers(fetchOptions.headers || {});
    if (fetchOptions.body && !headers.has('Content-Type'))
      headers.set('Content-Type', 'application/json');
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('lms_jwt_token');
      if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    }
    const csrf = csrfToken();
    if (csrf && !headers.has('X-CSRF-Token')) headers.set('X-CSRF-Token', decodeURIComponent(csrf));
    fetchOptions.headers = headers;

    let response = await fetcher(url, fetchOptions);
    if (response.status === 401 && !url.startsWith('/api/auth/')) {
      const refresh = await fetcher('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: csrf ? { 'X-CSRF-Token': decodeURIComponent(csrf) } : undefined,
      });
      if (refresh.ok) {
        const session = await refresh.json();
        localStorage.setItem('lms_jwt_token', session.accessToken);
        headers.set('Authorization', `Bearer ${session.accessToken}`);
        response = await fetcher(url, fetchOptions);
      }
    }
    return response;
  } catch (error) {
    const shouldQueue =
      /attendance|quiz-submissions|quizzes\/[^/]+\/grade/.test(url) &&
      ['POST', 'PUT', 'PATCH'].includes(options?.method || 'GET');
    if (shouldQueue) {
      await queueOfflineRequest(url, options || {});
      if (typeof window !== 'undefined')
        window.dispatchEvent(
          new CustomEvent('sikshya:toast', {
            detail: {
              message: 'You are offline. This change will sync automatically.',
              kind: 'warning',
            },
          }),
        );
      return new Response(JSON.stringify({ status: 'queued', offline: true }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.error('[apiFetch] Error:', error);
    return new Response(JSON.stringify({ status: 'error', message: 'Network request failed' }), {
      status: 503,
      headers: { 'Content-Type': 'application/problem+json' },
    });
  }
};
