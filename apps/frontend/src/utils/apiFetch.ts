import { queueOfflineRequest } from './offlineSync';
import { toast } from './toast';

export type ApiFeedback =
  | false
  | {
      success?: string | false;
      error?: string | false;
      successTitle?: string;
      errorTitle?: string;
    };

export type ApiFetchOptions = RequestInit & { feedback?: ApiFeedback };

export const SESSION_INVALIDATED_EVENT = 'sikshya:session-invalidated';

let refreshPromise: Promise<string | null> | null = null;

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

const responseError = async (response: Response) => {
  try {
    const body = await response.clone().json();
    return String(body.detail || body.message || body.error || '').trim();
  } catch {
    return '';
  }
};

const genericSuccess = (method: string) => {
  if (method === 'DELETE') return 'The item was removed successfully.';
  if (method === 'PUT' || method === 'PATCH') return 'Your changes were saved.';
  return 'Your action completed successfully.';
};

const clearStaleSession = () => {
  if (typeof localStorage !== 'undefined') localStorage.removeItem('lms_jwt_token');
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SESSION_INVALIDATED_EVENT));
  toast.warning('Your saved session expired. Sikshya is reconnecting securely.', {
    title: 'Session renewing',
    id: 'session-invalidated',
  });
};

const refreshAccessToken = (fetcher: typeof fetch, csrf: string | null): Promise<string | null> => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = fetcher('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
    headers: csrf ? { 'X-CSRF-Token': decodeURIComponent(csrf) } : undefined,
  })
    .then(async (response) => {
      if (!response.ok) {
        clearStaleSession();
        return null;
      }
      const session = await response.json();
      const accessToken = String(session.accessToken || session.token || '');
      if (!accessToken) {
        clearStaleSession();
        return null;
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('lms_jwt_token', accessToken);
      }
      return accessToken;
    })
    .catch(() => {
      clearStaleSession();
      return null;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

export const apiFetch = async (url: string, options: ApiFetchOptions = {}): Promise<Response> => {
  const { feedback, ...requestOptions } = options;
  const method = (requestOptions.method || 'GET').toUpperCase();
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  const isPublicAuthRequest = /^\/api\/auth\/(csrf|login|refresh)$/.test(url);
  const shouldNotify =
    feedback !== false && (typeof feedback === 'object' || (isMutation && !isPublicAuthRequest));
  try {
    const fetcher = nativeFetch();
    if (!fetcher) throw new Error('Fetch is unavailable.');
    const fetchOptions: RequestInit = { credentials: 'include', ...requestOptions };
    const headers = new Headers(fetchOptions.headers || {});
    if (
      fetchOptions.body &&
      !(typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData) &&
      !headers.has('Content-Type')
    )
      headers.set('Content-Type', 'application/json');
    if (!isPublicAuthRequest && typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('lms_jwt_token');
      if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    }
    const csrf = csrfToken();
    if (csrf && !headers.has('X-CSRF-Token')) headers.set('X-CSRF-Token', decodeURIComponent(csrf));
    fetchOptions.headers = headers;

    let response = await fetcher(url, fetchOptions);
    if (response.status === 401 && !isPublicAuthRequest) {
      const accessToken = await refreshAccessToken(fetcher, csrf);
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
        response = await fetcher(url, fetchOptions);
      }
    }
    if (!response.ok && shouldNotify && feedback?.error !== false) {
      const detail = await responseError(response);
      toast.error(
        typeof feedback === 'object' && typeof feedback.error === 'string'
          ? feedback.error
          : detail || `The request could not be completed (${response.status}).`,
        {
          title:
            typeof feedback === 'object' ? feedback.errorTitle || 'Action failed' : 'Action failed',
        },
      );
    } else if (
      response.ok &&
      response.status !== 202 &&
      shouldNotify &&
      (!isPublicAuthRequest || typeof feedback === 'object') &&
      feedback?.success !== false
    ) {
      toast.success(
        typeof feedback === 'object' && typeof feedback.success === 'string'
          ? feedback.success
          : genericSuccess(method),
        {
          title: typeof feedback === 'object' ? feedback.successTitle || 'Saved' : 'Saved',
        },
      );
    }
    return response;
  } catch (error) {
    const shouldQueue =
      /attendance|quiz-submissions|quizzes\/[^/]+\/grade/.test(url) &&
      ['POST', 'PUT', 'PATCH'].includes(method);
    if (shouldQueue) {
      await queueOfflineRequest(url, requestOptions);
      toast.warning('You are offline. This change is safely queued and will sync automatically.', {
        title: 'Saved for later',
        id: 'offline-queue',
      });
      return new Response(JSON.stringify({ status: 'queued', offline: true }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.error('[apiFetch] Error:', error);
    if (shouldNotify && feedback?.error !== false) {
      toast.error(
        typeof feedback === 'object' && typeof feedback.error === 'string'
          ? feedback.error
          : 'Check your connection and try again.',
        {
          title:
            typeof feedback === 'object' ? feedback.errorTitle || 'Network error' : 'Network error',
          id: `network-error:${url}`,
        },
      );
    }
    return new Response(JSON.stringify({ status: 'error', message: 'Network request failed' }), {
      status: 503,
      headers: { 'Content-Type': 'application/problem+json' },
    });
  }
};
